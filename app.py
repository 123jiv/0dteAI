import os
import json
import time
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Literal

import pandas as pd
import requests
import yfinance as yf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from core_0dte import (
    analyze_symbols,
    build_screener_rows,
    fetch_0dte_snapshot,
    build_prompt,
    compute_confidence_for_symbols,
    get_top_signals,
    fetch_option_chains_for_dte_range,
    compute_stock_factors,
    backtest_symbols,
    forecast_symbol,
)
from master_context import build_master_context, get_market_regime
from openai import OpenAI
from market_data import (
    get_market_data_all,
    get_fear_greed,
    get_market_news,
    get_economic_events,
    get_fred_data,
)
from politician_trades import (
    load_all_trades,
    filter_trades,
    build_summary,
    get_ticker_activity,
    get_notable_trades,
    get_politician_profile,
    warm_cache,
    cache_age_minutes,
)

app = FastAPI()
_APP_START_TIME = time.time()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ok for personal use; tighten for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


warm_cache()

@app.get("/", include_in_schema=False)
def root():
    here = os.path.dirname(os.path.abspath(__file__))
    html_path = os.path.join(here, "frontend.html")
    if not os.path.exists(html_path):
        raise HTTPException(status_code=500, detail="frontend.html not found")
    return FileResponse(html_path)


@app.get("/manifest.json", include_in_schema=False)
def manifest():
    here = os.path.dirname(os.path.abspath(__file__))
    manifest_path = os.path.join(here, "manifest.json")
    if not os.path.exists(manifest_path):
        raise HTTPException(status_code=500, detail="manifest.json not found")
    return FileResponse(manifest_path, media_type="application/manifest+json")


@app.get("/sw.js", include_in_schema=False)
def service_worker():
    here = os.path.dirname(os.path.abspath(__file__))
    sw_path = os.path.join(here, "sw.js")
    if not os.path.exists(sw_path):
        raise HTTPException(status_code=500, detail="sw.js not found")
    return FileResponse(sw_path, media_type="application/javascript")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "uptime_seconds": int(time.time() - _APP_START_TIME),
        "version": "Midori 2.0",
        "last_data_refresh": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()),
    }


# ---------- Market data (Alpaca/Polygon primary, yfinance fallback) ----------


@app.get("/api/market-data")
def api_market_data():
    return get_market_data_all()


@app.get("/api/ticker-detail")
def api_ticker_detail(symbol: str = "AAPL"):
    sym = symbol.strip().upper() or "AAPL"
    try:
        t = yf.Ticker(sym)
        info = t.info
        hist = t.history(period="1y")
        result = {
            "symbol": sym,
            "price": info.get("currentPrice") or info.get("regularMarketPrice") or 0,
            "change_pct": info.get("regularMarketChangePercent") or 0,
            "high_52w": info.get("fiftyTwoWeekHigh") or 0,
            "low_52w": info.get("fiftyTwoWeekLow") or 0,
            "pe": info.get("trailingPE") or info.get("forwardPE"),
            "market_cap": info.get("marketCap"),
            "eps": info.get("trailingEps"),
            "dividend_yield": info.get("dividendYield"),
            "volume": info.get("volume"),
            "avg_volume": info.get("averageVolume"),
        }
        if hist is not None and not hist.empty:
            result["volume"] = int(hist.iloc[-1].get("Volume", 0) or 0)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/fear-greed")
def api_fear_greed():
    return get_fear_greed()


@app.get("/api/market-regime")
def api_market_regime():
    """Market regime from SPY SMAs, RSI, VIX (yfinance only)."""
    return get_market_regime()


@app.get("/api/economic-events")
def api_economic_events():
    data = get_economic_events()
    events = data.get("events", [])
    today = data.get("date", datetime.utcnow().strftime("%Y-%m-%d"))
    high_impact = []
    for e in events:
        if not isinstance(e, dict):
            continue
        date_str = str(e.get("date", ""))[:10]
        if date_str == today or not date_str:
            high_impact.append({
                "title": e.get("title", e.get("event", "Event")),
                "time": e.get("time", ""),
                "date": date_str or today,
            })
    return {"events": high_impact[:20], "date": today}


@app.get("/api/news")
def api_news():
    return get_market_news()


@app.get("/api/fred-macro")
def api_fred_macro():
    """FRED macro indicators (US Government public domain)."""
    return get_fred_data()


@app.get("/api/chart-data")
def api_chart_data(ticker: str = "SPY", interval: str = "5m"):
    """Candlestick data for Lightweight Charts. Uses yfinance (temporary)."""
    ticker = ticker.strip().upper() or "SPY"
    interval_map = {
        "1m": ("1d", "1m"),
        "5m": ("5d", "5m"),
        "15m": ("5d", "15m"),
        "1h": ("1mo", "1h"),
        "1d": ("1y", "1d"),
    }
    period, yf_interval = interval_map.get(interval, ("5d", "5m"))
    try:
        t = yf.Ticker(ticker)
        hist = t.history(period=period, interval=yf_interval)
        if hist is None or hist.empty:
            return {"error": "No data", "candles": []}
        candles = []
        volume = []
        for idx, row in hist.iterrows():
            ts = int(idx.timestamp())
            candles.append({
                "time": ts,
                "open": round(float(row["Open"]), 4),
                "high": round(float(row["High"]), 4),
                "low": round(float(row["Low"]), 4),
                "close": round(float(row["Close"]), 4),
            })
            vol_val = float(row.get("Volume", 0) or 0)
            volume.append({
                "time": ts,
                "value": vol_val,
                "color": "#22C55E" if row["Close"] >= row["Open"] else "#F43F5E",
            })
        closes = pd.Series([c["close"] for c in candles])
        ema9 = closes.ewm(span=9).mean()
        ema21 = closes.ewm(span=21).mean()
        ema9_data = [{"time": candles[i]["time"], "value": round(float(v), 4)} for i, v in enumerate(ema9)]
        ema21_data = [{"time": candles[i]["time"], "value": round(float(v), 4)} for i, v in enumerate(ema21)]
        return {
            "ticker": ticker,
            "interval": interval,
            "candles": candles,
            "volume": volume,
            "ema9": ema9_data,
            "ema21": ema21_data,
        }
    except Exception as e:
        return {"error": str(e), "candles": []}


# ============================================
# POLITICIAN TRADES ROUTES
# ============================================


@app.get("/api/politician-trades")
def api_politician_trades(
    ticker: str = "",
    politician: str = "",
    chamber: str = "all",
    party: str = "all",
    type: str = "all",
    days: int = 30,
    limit: int = 50,
):
    try:
        limit = min(max(int(limit), 1), 500)
        days_back = int(days)

        data = load_all_trades()
        if not data or not data.get("trades"):
            return {
                "trades": [],
                "total_filtered": 0,
                "summary": {
                    "total": 0,
                    "purchases": 0,
                    "sales": 0,
                    "net_sentiment": "NEUTRAL",
                    "top_tickers": [],
                    "most_active_politicians": [],
                    "most_recent_disclosure": None,
                },
                "error": data.get("error", "No data available") if data else "No data available",
                "cache_age_minutes": cache_age_minutes(),
            }

        filtered = filter_trades(
            data["trades"],
            ticker=ticker.strip() or None,
            politician=politician.strip() or None,
            chamber=chamber,
            party=party,
            trade_type=type,
            days_back=days_back,
        )

        summary = build_summary(filtered)

        return {
            "trades": filtered[:limit],
            "total_filtered": len(filtered),
            "total_in_cache": data.get("total", 0),
            "summary": summary,
            "cache_age_minutes": cache_age_minutes(),
            "data_note": (
                "STOCK Act public disclosures. "
                "Up to 45-day lag by federal law."
            ),
        }
    except Exception as e:
        print(f"[PT] Route error: {e}")
        return {
            "trades": [],
            "total_filtered": 0,
            "error": str(e),
            "summary": {
                "total": 0,
                "purchases": 0,
                "sales": 0,
                "net_sentiment": "NEUTRAL",
                "top_tickers": [],
                "most_active_politicians": [],
                "most_recent_disclosure": None,
            },
        }


@app.get("/api/politician-trades/ticker/{ticker}")
def api_trades_by_ticker(ticker: str):
    try:
        activity = get_ticker_activity(ticker.upper(), days_back=60)
        if not activity:
            return {
                "ticker": ticker.upper(),
                "total_trades": 0,
                "message": "No recent congressional activity found",
            }
        return activity
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/politician-trades/notable")
def api_notable_trades(days: int = 14, limit: int = 5):
    try:
        trades = get_notable_trades(days_back=int(days), limit=int(limit))
        return {"trades": trades, "total": len(trades)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/politician-trades/profile/{name:path}")
def api_politician_profile(name: str):
    try:
        profile = get_politician_profile(name)
        if not profile:
            raise HTTPException(
                status_code=404,
                detail=f"Politician not found: {name}",
            )
        return profile
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/politician-trades/cache-status")
def api_pt_cache_status():
    """Debug endpoint to check cache health."""
    from politician_trades import _cache, cache_is_valid

    return {
        "cache_valid": cache_is_valid(),
        "total_trades": (
            _cache["trades"].get("total", 0)
            if _cache["trades"]
            else 0
        ),
        "house_count": _cache.get("total_house", 0),
        "senate_count": _cache.get("total_senate", 0),
        "age_minutes": cache_age_minutes(),
        "is_fetching": _cache.get("is_fetching", False),
        "last_error": _cache.get("fetch_error"),
    }


_DAILY_BRIEF_PROMPT = """You are Midori, an expert trading AI. Based on the following real market data, write a Daily Brief in exactly this structure.

Start with one greeting line: "Good morning." or "Good afternoon." or "Good evening." (match the time in the data) followed by " Here's what matters today."

Then three sections. Use the exact headers below. End each section with one line starting with 💡 (suggestion).

Format:

[Greeting] Here's what matters today.

📊 MARKET MOOD: [One label, e.g. Cautiously Bullish]
[2 sentences max explaining SPY/VIX/trend in plain English.]
💡 [One specific suggestion for this environment.]

⚡ TODAY'S FOCUS: [Most important event or condition today]
[1-2 sentences.]
💡 [One specific suggestion, e.g. avoid new 0DTE after X time.]

🎯 TOP OPPORTUNITY: [One specific setup with ticker]
[1-2 sentences on the setup.]
💡 [One specific action, e.g. watch for bounce near $X for call entry.]

Keep every section to 3 lines max. Use plain English. No jargon without explanation. Every section must end with a 💡 line.
Market data:

{context}"""


@app.get("/api/daily-brief")
def api_daily_brief():
    """Auto-generated Daily Brief for dashboard wow moment. Uses build_master_context + one AI call."""
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not set")
    try:
        ctx = build_master_context()
        prompt = _DAILY_BRIEF_PROMPT.format(context=ctx)
        client = OpenAI()
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are Midori, a concise trading AI. Reply only with the Daily Brief text. Start with a greeting (Good morning/afternoon/evening) and 'Here\\'s what matters today.' Then 📊 MARKET MOOD, ⚡ TODAY'S FOCUS, 🎯 TOP OPPORTUNITY. End each section with a line starting with 💡. No other commentary."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
        )
        brief = (resp.choices[0].message.content or "").strip()
        return {"brief": brief, "generated_at": datetime.now(timezone.utc).isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/analyze")
def analyze(
    tickers: str = "SPY,QQQ,IWM",
    focus: str = "both",      # both | calls | puts
    style: str = "balanced",  # balanced | conservative | aggressive
    timeframe: str = "intraday",
    analysis_type: str = "options",  # options | stocks | both
):
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not set")

    symbols = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not symbols:
        raise HTTPException(status_code=400, detail="No valid tickers provided")

    if analysis_type not in ("options", "stocks", "both"):
        analysis_type = "options"

    try:
        ctx = build_master_context()
        result = analyze_symbols(symbols, focus=focus, style=style, timeframe=timeframe, analysis_type=analysis_type, master_context=ctx)
        confidence = compute_confidence_for_symbols(symbols)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"tickers": symbols, "analysis_markdown": result, "confidence": confidence}


@app.get("/confidence")
def confidence_endpoint(tickers: str = "SPY,QQQ,IWM"):
    """Standalone confidence metrics for given tickers."""
    symbols = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not symbols:
        raise HTTPException(status_code=400, detail="No valid tickers provided")
    try:
        confidence = compute_confidence_for_symbols(symbols)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return {"tickers": symbols, "confidence": confidence}


@app.get("/screener")
def screener(
    tickers: str = "SPY,QQQ,IWM",
    min_volume: int = 1000,
    max_spread_pct: float = 25.0,
    timeframe: str = "intraday",  # intraday | 1-5d | multi-week | long-term
):
    symbols = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not symbols:
        raise HTTPException(status_code=400, detail="No valid tickers provided")
    if timeframe not in ("intraday", "1-5d", "multi-week", "long-term"):
        timeframe = "intraday"

    all_rows: List[Dict[str, Any]] = []
    for sym in symbols:
        try:
            rows = build_screener_rows(sym, min_volume=min_volume, max_spread_pct=max_spread_pct, timeframe=timeframe)
            all_rows.extend(rows)
        except Exception as e:
            print("Screener skipping %s: %s" % (sym, e))

    # If no contracts passed strict filters, retry with very relaxed filters (min vol 0, max spread 99%)
    if not all_rows:
        for sym in symbols:
            try:
                rows = build_screener_rows(sym, min_volume=0, max_spread_pct=99.0, timeframe=timeframe)
                all_rows.extend(rows)
            except Exception as e:
                print("Screener fallback skip %s: %s" % (sym, e))

    # If still empty (e.g. same-day expiry has no data outside market hours), try 1-5 day expirations
    if not all_rows:
        for sym in symbols:
            try:
                rows = build_screener_rows(sym, min_volume=0, max_spread_pct=99.0, timeframe="1-5d")
                all_rows.extend(rows)
            except Exception as e:
                print("Screener 1-5d fallback skip %s: %s" % (sym, e))

    # Final fallback: long-term expirations (more expirations available; helps IWM and others)
    if not all_rows:
        for sym in symbols:
            try:
                rows = build_screener_rows(sym, min_volume=0, max_spread_pct=99.0, timeframe="long-term")
                all_rows.extend(rows)
            except Exception as e:
                print("Screener long-term fallback skip %s: %s" % (sym, e))

    if not all_rows:
        return {
            "rows": [],
            "tickers": symbols,
            "suggestion": "No contracts passed your filters. Try lowering Min vol (e.g. 100) or raising Max spread % (e.g. 50) to see more contracts.",
        }

    all_rows.sort(key=lambda r: (-r["volume"], r["spread_pct"], abs(r["moneyness_pct"])))
    return {"rows": all_rows, "tickers": symbols}


@app.get("/options-screener")
def options_screener(
    tickers: str = "SPY,QQQ,IWM",
    min_volume: int = 200,
    max_spread_pct: float = 30.0,
    min_dte: int = 0,
    max_dte: int = 30,
    side: str = "both",  # both | calls | puts
    strategy: Optional[str] = None,  # covered_call | wheel | straddle
):
    """
    DTE-aware options screener across 0–365+ days.

    Returns normalized option rows with Greeks, DTE, IV, and optional strategy tags.
    """

    symbols = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not symbols:
        raise HTTPException(status_code=400, detail="No valid tickers provided")

    # Clamp DTE bounds to a reasonable window
    min_dte = max(int(min_dte), 0)
    max_dte = max(int(max_dte), min_dte)
    if max_dte > 365 * 5:
        max_dte = 365 * 5

    side_norm = (side or "both").lower()
    if side_norm not in ("both", "calls", "call", "puts", "put"):
        side_norm = "both"

    strategy_norm = (strategy or "").lower()
    valid_strategies = {"covered_call", "wheel", "straddle"}
    if strategy_norm and strategy_norm not in valid_strategies:
        strategy_norm = ""

    def annotate_strategy(row: Dict[str, Any]) -> None:
        tags = []
        opt_type = row.get("type")
        m = float(row.get("moneyness_pct") or 0.0)
        dte = int(row.get("dte") or 0)
        iv_pct = float(row.get("iv_pct") or 0.0)

        # Covered call: slightly OTM / ATM calls with some time to expiry
        if opt_type == "CALL" and -12.0 <= m <= 5.0 and dte >= 7:
            tags.append("covered_call_candidate")

        # Wheel put: OTM puts near support (positive moneyness) with some yield
        if opt_type == "PUT" and 0.0 <= m <= 18.0 and dte >= 7:
            tags.append("wheel_candidate")

        # Straddle: very near-the-money contracts with elevated IV
        if abs(m) <= 3.0 and iv_pct >= 25.0 and dte <= 45:
            tags.append("straddle_candidate")

        if tags:
            row["strategy_tags"] = tags

    all_rows: List[Dict[str, Any]] = []

    def fetch_for_symbols(
        min_vol: int, max_spread: float, use_min_dte: int = None, use_max_dte: int = None
    ) -> List[Dict[str, Any]]:
        dte_lo = use_min_dte if use_min_dte is not None else min_dte
        dte_hi = use_max_dte if use_max_dte is not None else max_dte
        rows_all: List[Dict[str, Any]] = []
        for sym in symbols:
            try:
                rows = fetch_option_chains_for_dte_range(
                    sym,
                    min_volume=min_vol,
                    max_spread_pct=max_spread,
                    min_dte=dte_lo,
                    max_dte=dte_hi,
                    call_put_filter=side_norm,
                    max_contracts=150,
                )
            except Exception as e:
                print("Options screener skipping %s: %s" % (sym, e))
                continue
            for r in rows:
                annotate_strategy(r)
            rows_all.extend(rows)
        return rows_all

    all_rows = fetch_for_symbols(min_volume, max_spread_pct)

    # If nothing passes, retry with very relaxed filters (min vol 0, max spread 80%)
    if not all_rows:
        relaxed_min_vol = 0
        relaxed_max_spread = max(max_spread_pct, 80.0)
        all_rows = fetch_for_symbols(relaxed_min_vol, relaxed_max_spread)

    # When market is closed, near-term chains are often empty; try wider DTE (0–365)
    if not all_rows and (min_dte, max_dte) != (0, 365):
        all_rows = fetch_for_symbols(0, 80.0, 0, 365)

    if not all_rows:
        return {
            "rows": [],
            "tickers": symbols,
            "summary": {
                "message": "No contracts passed even relaxed filters. Try different tickers or check market hours.",
            },
        }

    if strategy_norm:
        tag_name = {
            "covered_call": "covered_call_candidate",
            "wheel": "wheel_candidate",
            "straddle": "straddle_candidate",
        }[strategy_norm]
        filtered = [r for r in all_rows if tag_name in r.get("strategy_tags", [])]
        if filtered:
            all_rows = filtered

    # Keep the same sort order convention as /screener
    all_rows.sort(key=lambda r: (-r["volume"], r["spread_pct"], abs(r["moneyness_pct"])))

    summary = {
        "count": len(all_rows),
        "tickers": symbols,
        "min_dte": min_dte,
        "max_dte": max_dte,
        "strategy": strategy_norm or None,
        "side": side_norm,
    }

    return {"rows": all_rows, "tickers": symbols, "summary": summary}


@app.get("/stock-screener")
def stock_screener(
    tickers: str = "SPY,QQQ,IWM",
    style: str = "momentum",  # momentum | value | growth | all
    min_mom_3m: float = 5.0,
    max_pe: float = 40.0,
    min_div_yield: float = 0.0,
    min_eps_growth: float = 0.0,
):
    """
    Basic stock screener that computes simple momentum / value / growth factors per symbol.
    """

    symbols = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not symbols:
        raise HTTPException(status_code=400, detail="No valid tickers provided")

    style_norm = (style or "momentum").lower()
    if style_norm not in ("momentum", "value", "growth", "all"):
        style_norm = "momentum"

    rows: List[Dict[str, Any]] = []
    for sym in symbols:
        try:
            factors = compute_stock_factors(sym)
        except Exception as e:
            print("Stock screener skipping %s: %s" % (sym, e))
            continue

        mom_3m = factors.get("momentum_3m_pct")
        pe = factors.get("pe")
        div_yield_pct = factors.get("div_yield_pct")
        eps_growth = factors.get("eps_growth")

        passes = True
        if style_norm in ("momentum", "all"):
            if mom_3m is None or (not isinstance(mom_3m, float) and not isinstance(mom_3m, int)):
                passes = False
            else:
                passes = passes and mom_3m >= min_mom_3m and bool(factors.get("above_ma50"))
        if style_norm in ("value", "all"):
            if pe is None:
                passes = False
            else:
                passes = passes and pe <= max_pe
            if min_div_yield > 0.0:
                passes = passes and (div_yield_pct or 0.0) >= min_div_yield
        if style_norm in ("growth", "all"):
            if eps_growth is None:
                passes = False
            else:
                passes = passes and eps_growth >= min_eps_growth

        out = dict(factors)
        out["passes_style_filter"] = passes
        rows.append(out)

    return {"rows": rows, "tickers": symbols, "style": style_norm}


@app.get("/value-screener")
def value_screener(
    tickers: str = "AAPL,MSFT,JPM,XOM,PG,JNJ",
    min_market_cap_b: float = 10.0,
    max_pe: float = 25.0,
    min_div_yield: float = 0.0,
    min_eps_growth: float = 0.0,
):
    """
    Long-term value screener: min market cap (B), max P/E, min dividend yield, min EPS growth.
    """

    symbols = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not symbols:
        raise HTTPException(status_code=400, detail="No valid tickers provided")

    def _run_value_filter(
        min_cap: float,
        max_pe: float,
        min_div: float,
        min_eps: float,
    ) -> List[Dict[str, Any]]:
        out_rows: List[Dict[str, Any]] = []
        for sym in symbols:
            try:
                factors = compute_stock_factors(sym)
            except Exception as e:
                print("Value screener skipping %s: %s" % (sym, e))
                continue

            mc = factors.get("market_cap")
            mc_b = (float(mc) / 1e9) if mc else 0.0
            pe = factors.get("pe")
            div = factors.get("div_yield_pct") or 0.0
            eps_gr = factors.get("eps_growth")
            eps_gr_pct = float(eps_gr) * 100.0 if eps_gr is not None else None

            if mc_b < min_cap:
                continue
            if pe is not None and pe > max_pe:
                continue
            if div < min_div:
                continue
            if min_eps > 0 and (eps_gr_pct is None or eps_gr_pct < min_eps):
                continue

            out = dict(factors)
            out["market_cap_b"] = round(mc_b, 2)
            out["eps_growth_pct"] = round(eps_gr_pct, 1) if eps_gr_pct is not None else None
            out_rows.append(out)
        return out_rows

    rows = _run_value_filter(
        min_market_cap_b, max_pe, min_div_yield, min_eps_growth
    )

    # If nothing passes (e.g. NVDA with max P/E 25), show all tickers with relaxed filters
    # so user can see actual metrics and adjust filters
    if not rows:
        rows = _run_value_filter(0.0, 999.0, -1.0, -999.0)
        if rows:
            return {
                "rows": rows,
                "tickers": symbols,
                "relaxed": True,
                "hint": "No stocks matched your filters. Showing all tickers with relaxed filters—check P/E, div yield, etc. and adjust.",
            }
        return {"rows": [], "tickers": symbols}

    return {"rows": rows, "tickers": symbols}


@app.get("/multi-asset-scan")
def multi_asset_scan(
    tickers: str = "SPY,QQQ,IWM",
    min_volume: int = 500,
    max_spread_pct: float = 40.0,
    min_dte: int = 7,
    max_dte: int = 45,
    min_iv_pct: float = 25.0,
):
    """
    Combined stock + options scan.

    Highlights symbols with high options volume and elevated IV that may be candidates
    for straddles, strangles, or other volatility-driven strategies.
    """

    symbols = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not symbols:
        raise HTTPException(status_code=400, detail="No valid tickers provided")

    min_dte = max(int(min_dte), 0)
    max_dte = max(int(max_dte), min_dte)
    if max_dte > 365 * 5:
        max_dte = 365 * 5

    scans: List[Dict[str, Any]] = []

    for sym in symbols:
        try:
            factors = compute_stock_factors(sym)
        except Exception as e:
            print("Multi-asset scan stock skip %s: %s" % (sym, e))
            continue

        try:
            contracts = fetch_option_chains_for_dte_range(
                sym,
                min_volume=min_volume,
                max_spread_pct=max_spread_pct,
                min_dte=min_dte,
                max_dte=max_dte,
                call_put_filter="both",
                max_contracts=200,
            )
        except Exception as e:
            print("Multi-asset scan options skip %s: %s" % (sym, e))
            continue

        if not contracts:
            continue

        vols = [c.get("volume") or 0 for c in contracts]
        ivs = [c.get("iv_pct") or 0.0 for c in contracts]
        total_volume = int(sum(vols))
        avg_iv = float(sum(ivs) / len(ivs)) if ivs else 0.0
        max_iv = float(max(ivs)) if ivs else 0.0

        if max_iv < min_iv_pct:
            continue

        # Choose a few near-ATM contracts as examples
        near_atm = sorted(
            contracts,
            key=lambda c: abs(c.get("moneyness_pct") or 0.0),
        )[:4]

        scan_row = {
            "symbol": sym,
            "last_price": factors.get("last_price"),
            "momentum_3m_pct": factors.get("momentum_3m_pct"),
            "momentum_6m_pct": factors.get("momentum_6m_pct"),
            "above_ma50": factors.get("above_ma50"),
            "above_ma200": factors.get("above_ma200"),
            "total_option_volume": total_volume,
            "avg_iv_pct": avg_iv,
            "max_iv_pct": max_iv,
            "sample_contracts": near_atm,
        }
        scans.append(scan_row)

    return {
        "scans": scans,
        "tickers": symbols,
        "filters": {
            "min_volume": min_volume,
            "max_spread_pct": max_spread_pct,
            "min_dte": min_dte,
            "max_dte": max_dte,
            "min_iv_pct": min_iv_pct,
        },
    }


@app.get("/backtest")
def backtest(
    tickers: str,
    years: int = 3,
    holding_days: int = 5,
    direction: str = "long",  # long | short
):
    """
    Simple rolling-hold backtest over 1–5 years for one or more symbols.

    This is educational only and uses daily close data (no intraday fills).
    """

    symbols = [t.strip().upper() for t in (tickers or "").split(",") if t.strip()]
    if not symbols:
        raise HTTPException(status_code=400, detail="No valid tickers provided")

    direction_norm = (direction or "long").lower()
    if direction_norm not in ("long", "short"):
        direction_norm = "long"

    try:
        result = backtest_symbols(symbols, years=years, holding_days=holding_days, direction=direction_norm)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return result


class ExplainBacktestRequest(BaseModel):
    portfolio: Dict[str, Any] = {}
    symbols: Dict[str, Any] = {}
    years: int = 3
    holding_days: int = 5


@app.post("/explain-backtest")
def explain_backtest(req: ExplainBacktestRequest):
    """
    Use the LLM to explain backtest results in plain English for a real trader.
    """
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not set")

    portfolio = req.portfolio or {}
    symbols = req.symbols or {}
    years = req.years or 3
    holding_days = req.holding_days or 5

    ctx = build_master_context()
    prompt = (
        ctx + "\n\n---\n\n"
        "You are MIDORI, a trading educator. Explain these backtest results in plain English for a real trader. "
        "Be concise (2–4 short paragraphs). Cover: what the numbers mean, whether the strategy looks viable, "
        "key risks (drawdown, win rate), and one practical takeaway. End with: ## 📊 What This Means For You — "
        "[Plain English interpretation]. No jargon without brief explanation.\n\n"
        "Portfolio summary (equal-weight, %dy, %d-day holding): %s\n\n"
        "Per-symbol stats: %s"
    ) % (years, holding_days, json.dumps(portfolio, indent=2), json.dumps(symbols, indent=2))

    try:
        client = OpenAI()
        resp = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {"role": "system", "content": "You are MIDORI, an elite trading analyst. Be clear and concise. End with a section: ## 📊 What This Means For You"},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
        )
        explanation = resp.choices[0].message.content or ""
        return {"explanation": explanation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/forecast")
def forecast(ticker: str, years: int = 3):
    """
    ML-style long-term forecast endpoint.

    Uses engineered features (trend, volatility, valuation, growth, VIX regime) and
    an LLM to emulate a conservative long-horizon forecaster. Educational only.
    """

    sym = (ticker or "").strip().upper()
    if not sym:
        raise HTTPException(status_code=400, detail="Ticker is required")

    try:
        result = forecast_symbol(sym, years=years)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return result


@app.get("/signals")
def signals(tickers: str = "SPY,QQQ,IWM", limit: int = 3):
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not set")

    symbols = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not symbols:
        raise HTTPException(status_code=400, detail="No valid tickers provided")

    try:
        ctx = build_master_context()
        signal_list = get_top_signals(symbols, limit=min(int(limit), 5), master_context=ctx)
        return {
            "signals": signal_list,
            "tickers": symbols,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class StressTestPosition(BaseModel):
    symbol: str
    qty: int = 1
    entry: float
    stop: Optional[float] = None


class StressTestRequest(BaseModel):
    positions: List[StressTestPosition]


@app.post("/api/stress-test")
def api_stress_test(req: StressTestRequest):
    """AI-generated portfolio stress scenarios (up to 5 positions)."""
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not set")
    positions = req.positions[:5]
    if not positions:
        raise HTTPException(status_code=400, detail="No positions provided")
    ctx = build_master_context()
    regime = get_market_regime()
    pos_text = "\n".join(
        "  - %s: qty=%d, entry=$%.2f%s"
        % (p.symbol.upper(), p.qty, p.entry, ", stop=$%.2f" % p.stop if p.stop else "")
        for p in positions
    )
    prompt = (
        ctx
        + "\n\n--- PORTFOLIO STRESS TEST REQUEST ---\n"
        + "Current regime: %s — %s\n\n"
        % (regime.get("regime", "UNKNOWN"), regime.get("description", ""))
        + "Positions to stress test:\n%s\n\n"
        % pos_text
        + "Provide a brief stress test analysis (2–4 paragraphs) covering:\n"
        "1) Best-case scenario: what would need to happen for this portfolio to perform well.\n"
        "2) Worst-case scenario: what could cause significant loss and how much.\n"
        "3) Correlated risk: if SPY/QQQ drops 5–10%%, how might these positions move together.\n"
        "4) One concrete action: what the user should consider (hedge, reduce, hold, etc.).\n"
        "Be specific to the symbols and current regime. Educational only."
    )
    client = OpenAI()
    resp = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": "You are Midori, a risk-first trading coach. Give concise, educational stress test analysis. No guarantees."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
    )
    content = (resp.choices[0].message.content or "").strip()
    return {"analysis": content, "regime": regime.get("regime"), "positions": [{"symbol": p.symbol, "qty": p.qty, "entry": p.entry, "stop": p.stop} for p in positions]}


# -------- Chat API models --------

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    tickers: str
    focus: str = "both"
    style: str = "balanced"
    timeframe: str = "intraday"
    analysis_type: str = "options"
    files: List[Dict[str, Any]] = []
    history: List[ChatMessage] = []
    question: str


@app.post("/chat")
def chat(req: ChatRequest):
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not set")

    symbols = [t.strip().upper() for t in req.tickers.split(",") if t.strip()]
    if not symbols:
        raise HTTPException(status_code=400, detail="No valid tickers provided")

    # Reuse the same yfinance snapshot logic as /analyze
    snapshots: List[Dict[str, Any]] = []
    for sym in symbols:
        try:
            snapshots.append(fetch_0dte_snapshot(sym))
        except Exception as e:
            print("Chat skipping %s: %s" % (sym, e))

    if not snapshots:
        raise HTTPException(status_code=500, detail="No data fetched for chat.")

    at = req.analysis_type if req.analysis_type in ("options", "stocks", "both") else "options"
    base_prompt = build_prompt(snapshots, focus=req.focus, style=req.style, timeframe=req.timeframe, analysis_type=at)
    ctx = build_master_context()
    midori_system = (
        "You are MIDORI, an elite AI trading analyst, risk manager, and trading coach with deep expertise in 0DTE options, "
        "swing trading, technical analysis, options Greeks, risk management, and long-term value investing.\n\n"
        "POSITIONING:\n"
        "- You are NOT a trade-picking oracle. You are a risk-first AI cockpit that helps users become smarter, safer traders.\n"
        "- Everything you say should be framed as probability-based, educational analysis — never guarantees or get-rich-quick claims.\n\n"
        "FORMATTING:\n"
        "- Use **bold** for key terms, bullet points for lists, and ## headers for multi-section answers.\n"
        "- After trade-focused answers, include a section titled '## HOW MIDORI DECIDED THIS' that:\n"
        "  * Lists bullish signals used with emoji ✅.\n"
        "  * Lists bearish/contrarian signals with emoji ❌.\n"
        "  * Lists key risk factors with emoji ⚠️.\n"
        "  * Explains in plain English why your confidence is Very High / High / Moderate / Low / Speculative.\n"
        "  * States what would change your mind on the trade.\n\n"
        "CONFIDENCE CALIBRATION:\n"
        "- When you mention confidence or probability, always map it to these labels and SAY the label explicitly:\n"
        "  * 90–100% → 'Very High — rare setup, strong confluence'.\n"
        "  * 70–89%  → 'High — multiple signals aligned'.\n"
        "  * 55–69%  → 'Moderate — favorable but not ideal conditions'.\n"
        "  * 40–54%  → 'Low — mixed signals, trade with caution'.\n"
        "  * <40%    → 'Speculative — high uncertainty, size very small'.\n"
        "- Clarify that these are historical/conditional probabilities, NOT guarantees.\n\n"
        "LOSS EXPLANATION:\n"
        "- If the user asks why a trade did not work, or why the market moved against a prior signal, always explain:\n"
        "  1) What the market actually did and plausible reasons.\n"
        "  2) Which risk factor from the original analysis played out (validate the risk warnings).\n"
        "  3) What this means going forward for that asset or strategy.\n"
        "  4) One practical lesson the user can apply in future trading.\n"
        "- Be honest, calm, and educational — never defensive.\n\n"
        "EMOTIONAL TRADING DETECTION:\n"
        "- If the user's language suggests emotional trading (e.g. 'I need to make it back', 'double down', 'revenge trade', personifying the market, or urgent attempts to recover losses):\n"
        "  * Internally treat this as EMOTIONAL_TRADING_DETECTED.\n"
        "  * First acknowledge their frustration empathetically.\n"
        "  * Then gently but firmly redirect to risk management: discuss position sizing, daily loss limits, and the risk of revenge trading.\n"
        "  * Suggest taking a short break (e.g. 15 minutes) before placing new trades.\n"
        "  * Emphasize that protecting capital matters more than any single trade.\n\n"
        "CLOSING:\n"
        "- End every response with a single line: '💡 Midori's Tip: [one practical takeaway]'.\n"
        "- All content is educational only, not financial advice."
    )
    user_content = ctx + "\n\n---\n\n" + base_prompt

    client = OpenAI()
    messages: List[Dict[str, Any]] = [
        {"role": "system", "content": midori_system},
        {"role": "user", "content": user_content},
    ]

    # Append prior chat history
    for msg in req.history:
        role = "assistant" if msg.role == "assistant" else "user"
        messages.append({"role": role, "content": msg.content})

    # Latest question + optional images
    try:
        files = getattr(req, "files", []) or []
        if files:
            content_parts: List[Dict[str, Any]] = [
                {"type": "text", "text": req.question or "Please analyze the attached chart images."}
            ]
            # Only include a few images to keep payload reasonable
            for f in files[:3]:
                try:
                    data_url = f.get("data_url") or f.get("dataURL") or ""
                    if not data_url:
                        continue
                    content_parts.append(
                        {
                            "type": "image_url",
                            "image_url": {"url": data_url},
                        }
                    )
                except Exception as e:
                    print("Chat file ignored:", e)
                    continue
            messages.append(
                {
                    "role": "user",
                    "content": content_parts,
                }
            )
        else:
            messages.append(
                {
                    "role": "user",
                    "content": req.question,
                }
            )
    except Exception as e:
        # Fallback to text-only if anything goes wrong building image parts
        print("Chat message build error:", e)
        messages.append(
            {
                "role": "user",
                "content": req.question,
            }
        )

    try:
        resp = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=messages,
            temperature=0.4,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    answer = resp.choices[0].message.content or ""
    return {"reply": answer}


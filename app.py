import os
import json
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Literal

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
from master_context import build_master_context
from openai import OpenAI

app = FastAPI()
_APP_START_TIME = time.time()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ok for personal use; tighten for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


# ---------- Market data (free, no API key) ----------
_MARKET_DATA_CACHE: Dict[str, Any] = {}
_MARKET_DATA_CACHE_TS = 0.0
_CACHE_TTL = 60  # seconds


def _get_market_data() -> Dict[str, Any]:
    global _MARKET_DATA_CACHE, _MARKET_DATA_CACHE_TS
    now = time.time()
    if now - _MARKET_DATA_CACHE_TS < _CACHE_TTL and _MARKET_DATA_CACHE:
        return _MARKET_DATA_CACHE
    tickers = ["SPY", "QQQ", "IWM", "DIA"]
    result: Dict[str, Any] = {"tickers": {}, "vix": {}, "timestamp": None}
    try:
        for sym in tickers:
            t = yf.Ticker(sym)
            hist = t.history(period="5d")
            if hist is not None and not hist.empty:
                row = hist.iloc[-1]
                prev = hist.iloc[-2] if len(hist) > 1 else row
                chg = ((row["Close"] - prev["Close"]) / prev["Close"] * 100) if prev["Close"] else 0
                result["tickers"][sym] = {
                    "price": round(row["Close"], 2),
                    "change_pct": round(chg, 2),
                    "high": round(row["High"], 2),
                    "low": round(row["Low"], 2),
                    "volume": int(row.get("Volume", 0) or 0),
                }
            else:
                result["tickers"][sym] = {"price": 0, "change_pct": 0, "high": 0, "low": 0, "volume": 0}
        vix = yf.Ticker("^VIX")
        vhist = vix.history(period="5d")
        if vhist is not None and not vhist.empty:
            row = vhist.iloc[-1]
            prev = vhist.iloc[-2] if len(vhist) > 1 else row
            chg = ((row["Close"] - prev["Close"]) / prev["Close"] * 100) if prev["Close"] else 0
            result["vix"] = {"price": round(row["Close"], 2), "change_pct": round(chg, 2)}
        else:
            result["vix"] = {"price": 0, "change_pct": 0}
        result["timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime())
        _MARKET_DATA_CACHE = result
        _MARKET_DATA_CACHE_TS = now
    except Exception as e:
        result["error"] = str(e)
    return result


@app.get("/api/market-data")
def api_market_data():
    return _get_market_data()


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


_FEAR_GREED_CACHE: Dict[str, Any] = {}
_FEAR_GREED_CACHE_TS = 0.0


@app.get("/api/fear-greed")
def api_fear_greed():
    global _FEAR_GREED_CACHE, _FEAR_GREED_CACHE_TS
    now = time.time()
    if now - _FEAR_GREED_CACHE_TS < _CACHE_TTL and _FEAR_GREED_CACHE:
        return _FEAR_GREED_CACHE
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json",
            "Referer": "https://edition.cnn.com/",
        }
        r = requests.get("https://production.dataviz.cnn.io/index/fearandgreed/graphdata", headers=headers, timeout=10)
        r.raise_for_status()
        data = r.json()
        score, rating = 50, "Unknown"
        if "fear_and_greed" in data:
            fg = data["fear_and_greed"]
            raw = fg.get("score") or fg.get("y") or fg.get("fg_value")
            if raw is not None:
                score = int(round(float(raw)))
            rating = (fg.get("rating") or fg.get("label") or fg.get("fg_rating") or rating).replace("_", " ").title()
        elif "fear_and_greed_historical" in data:
            fgh = data["fear_and_greed_historical"]
            raw_score = fgh.get("score") or fgh.get("y") or fgh.get("fg_value")
            if raw_score is not None:
                score = int(round(float(raw_score)))
                rating = (fgh.get("rating") or fgh.get("label") or fgh.get("fg_rating") or rating).replace("_", " ").title()
            else:
                hist = fgh.get("data") or []
                if hist:
                    last = max(hist, key=lambda p: float(p.get("x") or 0))
                    raw = last.get("y") or last.get("value") or last.get("fg_value")
                    if raw is not None:
                        score = int(round(float(raw)))
                    rating = (last.get("rating") or last.get("label") or last.get("fg_rating") or rating).replace("_", " ").title()
        elif "market_misc" in data and data["market_misc"]:
            last = data["market_misc"][-1]
            score = last.get("y") or last.get("score") or score
            rating = last.get("label") or last.get("rating") or rating
        interpretation = ""
        if score < 25:
            interpretation = "Extreme fear — contrarian buy signals elevated"
        elif score < 45:
            interpretation = "Fear — cautious positioning recommended"
        elif score < 55:
            interpretation = "Neutral — follow technicals"
        elif score < 75:
            interpretation = "Greed — momentum favors bulls but watch for reversals"
        else:
            interpretation = "Extreme greed — elevated reversal risk"
        result = {"score": score, "rating": rating, "interpretation": interpretation, "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime())}
        _FEAR_GREED_CACHE = result
        _FEAR_GREED_CACHE_TS = now
        return result
    except Exception as e:
        return {"score": 50, "rating": "Unknown", "error": str(e)}


@app.get("/api/economic-events")
def api_economic_events():
    from datetime import datetime
    today = datetime.utcnow().strftime("%Y-%m-%d")
    try:
        r = requests.get("https://cdn-nfs.faireconomy.media/ff_calendar_thisweek.json", timeout=10)
        r.raise_for_status()
        raw = r.json()
        events = raw if isinstance(raw, list) else raw.get("events", raw.get("data", []))
        if not isinstance(events, list):
            events = []
        high_impact = []
        for e in events:
            if not isinstance(e, dict):
                continue
            date_str = str(e.get("date", e.get("Date", "")))[:10]
            impact = (e.get("impact", e.get("Impact", "")) or "").lower()
            if date_str == today and (impact == "high" or impact == "3"):
                high_impact.append({
                    "title": e.get("title", e.get("Title", e.get("event", "Event"))),
                    "time": e.get("time", e.get("Time", e.get("date", ""))),
                    "date": date_str,
                })
        return {"events": high_impact[:20], "date": today}
    except Exception as e:
        return {"events": [], "date": today, "error": str(e)}


@app.get("/api/news")
def api_news():
    try:
        r = requests.get("https://feeds.finance.yahoo.com/rss/2.0/headline?s=SPY,QQQ,NVDA&region=US&lang=en-US", timeout=10)
        r.raise_for_status()
        root = ET.fromstring(r.content)
        ns = {"atom": "http://www.w3.org/2005/Atom", "dc": "http://purl.org/dc/elements/1.1/", "content": "http://purl.org/rss/1.0/modules/content/"}
        items = root.findall(".//item")[:10]
        headlines = []
        for item in items:
            title = item.find("title")
            link = item.find("link")
            pub = item.find("pubDate")
            headlines.append({
                "title": title.text if title is not None else "",
                "link": link.text if link is not None else "",
                "pubDate": pub.text if pub is not None else "",
            })
        return {"headlines": headlines}
    except Exception as e:
        return {"headlines": [], "error": str(e)}


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
        "You are MIDORI, an elite AI trading analyst and educator with deep expertise in 0DTE options, "
        "swing trading, technical analysis, options Greeks, risk management, and long-term value investing. "
        "You always ground your analysis in the current market context provided. Use **bold** for key terms, "
        "bullet points for lists, and ## headers for multi-section answers. End every response with "
        "a single line: 💡 Midori's Tip: [one practical takeaway]. Educational only, not advice."
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
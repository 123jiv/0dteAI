import json
import os
import math
import time
import datetime as dt
from typing import List, Dict, Any, Literal

import yfinance as yf
from openai import OpenAI


ZERO_DTE_SPEC = """
You are an options and price-scenario assistant for any reasonably liquid US stock or ETF
(including but not limited to SPY, QQQ, and IWM). Your job is to give very simple,
easy-to-read explanations, NOT dense reports.

You can:
- Use same-day expiration (0DTE) options for intraday ideas.
- Also discuss 1–5 day, multi-week, and longer-term (multi-month) scenarios when the timeframe
  preference or question asks for it.
- For longer-term views, focus on broad price zones and directional scenarios (not precise single
  price targets), and always emphasize uncertainty.

Use the data I provide:
- Intraday candles and a list of near-ATM 0DTE options.
- Daily history summaries (trend, volatility, moving averages, 52-week levels).
Combine these to describe what is happening and suggest ideas in plain language.

IMPORTANT FORMAT RULES
- DO NOT use markdown headings (#) or markdown symbols like ** or _.
- Use plain text headings that end with a colon, for example: "IWM 0DTE View:".
- Keep everything short and friendly, like you are talking to a newer trader.

For EACH ticker I give you, output using EXACTLY this structure and nothing more
(replace "IWM" with the actual ticker symbol):

1) Heading line:
IWM 0DTE View:

2) Short overview (MAX 3 lines):
- Bias: [Bullish / Bearish / Choppy] in one short phrase.
- Key area: [e.g., "near VWAP", "testing prior day low", "inside range"].
- Big picture: One simple sentence about what today looks like.

3) Call idea section:
Call idea:
- Contract: [describe ONE example call contract in plain text, including strike and approximate premium if you can infer it, e.g., "0DTE 260 call, near-the-money, moderate price"].
- Reason: [one short sentence explaining WHY this contract makes sense (trend + level + time)].
- When to consider: [one simple condition, e.g., "if price holds above VWAP and breaks above X with some momentum"].
- Risk limit: [one line, e.g., "cut if option loses around 40–50% of premium or price falls back below VWAP"].
- First target: [short line with level or approximate % gain and what to do, e.g., "aim for quick 20–30% move, then take profit"].

If there is no good call idea, write:
Call idea:
- No high-quality call idea right now because [one short reason].

4) Put idea section:
Put idea:
- Contract: [ONE example put contract (strike + rough premium if you can), in plain text].
- Reason: [one short sentence explaining WHY this contract makes sense].
- When to consider: [one simple condition].
- Risk limit: [one line].
- First target: [short line].

If there is no good put idea, write:
Put idea:
- No high-quality put idea right now because [one short reason].

5) Main risks section:
Main risks:
- Theta: [1 line on time decay, especially dangerous for 0DTE].
- Reversal: [1 line on price reversing and flipping the idea].
- Timeframe mismatch: [1 line on short-term noise vs. longer-term trend].
- News/liquidity: [1 line on news or poor fills].

STYLE REMINDERS
- Use short, plain sentences. No tables, no long paragraphs, no extra sections.
- Do NOT invent precise live prices or Greeks; use approximate or conditional language based on the data I give you.
- Always treat this as educational scenario analysis only, not trading advice. Remind that options can easily go to zero, especially 0DTE, and that longer-term scenarios are uncertain and can be very wrong.
"""


# ---------- yfinance helpers ----------


_STOCK_FACTOR_CACHE: Dict[str, Dict[str, Any]] = {}
_STOCK_FACTOR_CACHE_TTL_SECONDS = 15 * 60  # 15 minutes


def _get_today_or_nearest_expiration(ticker: yf.Ticker) -> str:
    exps = ticker.options
    if not exps:
        raise RuntimeError("No option expirations found.")
    today = dt.date.today()
    exact = [e for e in exps if dt.date.fromisoformat(e) == today]
    if exact:
        return exact[0]
    exps_sorted = sorted(exps, key=lambda x: dt.date.fromisoformat(x))
    return exps_sorted[0]


def _get_expirations_for_timeframe(ticker: yf.Ticker, timeframe: str) -> List[str]:
    """Return a list of expiration date strings for the given timeframe (best first). Falls back if none in range."""
    exps = ticker.options
    if not exps:
        raise RuntimeError("No option expirations found.")
    today = dt.date.today()
    exps_sorted = sorted(exps, key=lambda x: dt.date.fromisoformat(x))

    def days_out(exp_str: str) -> int:
        return (dt.date.fromisoformat(exp_str) - today).days

    # Filter out past expirations
    future = [e for e in exps_sorted if days_out(e) >= 0]
    if not future:
        future = exps_sorted

    if timeframe == "intraday":
        exact = [e for e in future if dt.date.fromisoformat(e) == today]
        if exact:
            # Try today plus next 2 expirations so we have a fallback if same-day is empty (e.g. outside market hours)
            result = exact + [e for e in future if e not in exact][:2]
            return result[:3]
        return future[:3]

    if timeframe == "1-5d":
        candidates = [e for e in future if 1 <= days_out(e) <= 5]
        if not candidates:
            candidates = [e for e in future if days_out(e) >= 1][:3] or future[:1]
    elif timeframe == "multi-week":
        candidates = [e for e in future if 7 <= days_out(e) <= 56]
        if not candidates:
            candidates = [e for e in future if days_out(e) >= 7][:5] or future[-3:]
    elif timeframe == "long-term":
        # 30+ days (was 45); include monthlies
        candidates = [e for e in future if days_out(e) >= 30]
        if not candidates:
            candidates = future[-5:] if len(future) >= 5 else future
    else:
        candidates = [e for e in future if dt.date.fromisoformat(e) == today] or future[:1]

    return candidates[:10]


def _get_expirations_for_dte_range(
    ticker: yf.Ticker,
    min_dte: int,
    max_dte: int,
) -> List[str]:
    """
    Return expirations whose days-to-expiry fall inside [min_dte, max_dte].

    - min_dte / max_dte are in calendar days.
    - If max_dte is very large (e.g. 365+), we effectively treat it as open-ended.
    - Falls back to the nearest future expirations if nothing is strictly in range.
    """
    exps = ticker.options
    if not exps:
        raise RuntimeError("No option expirations found.")

    today = dt.date.today()
    exps_sorted = sorted(exps, key=lambda x: dt.date.fromisoformat(x))

    def days_out(exp_str: str) -> int:
        return (dt.date.fromisoformat(exp_str) - today).days

    future = [e for e in exps_sorted if days_out(e) >= 0]
    if not future:
        future = exps_sorted

    # Normalise bounds
    min_d = max(int(min_dte), 0)
    # Treat very large max_dte as open-ended
    max_d = int(max_dte) if max_dte is not None and max_dte >= min_d else 365 * 5

    in_range = [e for e in future if min_d <= days_out(e) <= max_d]

    if not in_range:
        # Fallback: take the nearest expirations beyond min_d, or the earliest few
        later = [e for e in future if days_out(e) >= min_d]
        if later:
            in_range = later[:10]
        else:
            in_range = future[:10]

    # Cap to a reasonable number so we don't pull huge chains
    return in_range[:20]


def _get_last_price(symbol: str) -> float:
    """Get latest available price for a symbol (intraday or daily)."""
    t = yf.Ticker(symbol)
    hist = t.history(period="1d", interval="5m")
    if not hist.empty:
        return float(hist.iloc[-1]["Close"])
    hist = t.history(period="5d", interval="1d")
    if hist.empty:
        raise RuntimeError("No price data for %s" % symbol)
    return float(hist.iloc[-1]["Close"])


def _approx_time_to_expiry_yrs(expiration_str: str) -> float:
    """Rough T in years for same-day 0DTE options (educational only)."""
    today = dt.date.today()
    exp_date = dt.date.fromisoformat(expiration_str)
    # assume US close 16:00 Eastern ~ 21:00 UTC
    exp_dt = dt.datetime(exp_date.year, exp_date.month, exp_date.day, 21, 0, 0, tzinfo=dt.timezone.utc)
    now = dt.datetime.now(dt.timezone.utc)
    seconds = max((exp_dt - now).total_seconds(), 5 * 60)  # at least 5 min to avoid zero
    return seconds / (365.0 * 24 * 3600)


def fetch_0dte_snapshot(symbol: str) -> Dict[str, Any]:
    t = yf.Ticker(symbol)

    hist = t.history(period="1d", interval="5m")
    if hist.empty:
        # Outside market hours or no intraday: fall back to latest daily close
        hist = t.history(period="5d", interval="1d")
        if hist.empty:
            raise RuntimeError("No price data for %s (market may be closed or ticker invalid)" % symbol)
        last_row = hist.iloc[-1]
        last_price = float(last_row["Close"])
        candle = {
            "time": last_row.name.isoformat(),
            "open": float(last_row["Open"]),
            "high": float(last_row["High"]),
            "low": float(last_row["Low"]),
            "close": float(last_row["Close"]),
        }
    else:
        last_row = hist.iloc[-1]
        last_price = float(last_row["Close"])
        candle = None

    exp = _get_today_or_nearest_expiration(t)
    chain = t.option_chain(exp)
    calls = chain.calls
    puts = chain.puts

    def pick_near_atm(df):
        df = df.copy()
        df["dist"] = (df["strike"] - last_price).abs()
        df = df.sort_values("dist").head(12)
        return df[
            [
                "contractSymbol",
                "strike",
                "lastPrice",
                "bid",
                "ask",
                "volume",
                "openInterest",
                "impliedVolatility",
                "inTheMoney",
            ]
        ]

    calls_sel = pick_near_atm(calls)
    puts_sel = pick_near_atm(puts)

    candle = {
        "time": last_row.name.isoformat(),
        "open": float(last_row["Open"]),
        "high": float(last_row["High"]),
        "low": float(last_row["Low"]),
        "close": float(last_row["Close"]),
    }

    # Higher timeframe daily context (up to ~1 year)
    daily = t.history(period="1y", interval="1d")
    higher_tf = None
    if not daily.empty:
        closes_d = daily["Close"]
        first_close = float(closes_d.iloc[0])
        last_close_d = float(closes_d.iloc[-1])
        trend_pct_1y = (last_close_d - first_close) / first_close * 100.0 if first_close > 0 else 0.0

        high_52w = float(closes_d.max())
        low_52w = float(closes_d.min())
        dist_from_high = (last_price - high_52w) / high_52w * 100.0 if high_52w > 0 else 0.0
        dist_from_low = (last_price - low_52w) / low_52w * 100.0 if low_52w > 0 else 0.0

        ma20 = float(closes_d.rolling(20).mean().iloc[-1])
        ma50 = float(closes_d.rolling(50).mean().iloc[-1])
        ma200 = float(closes_d.rolling(200).mean().iloc[-1])

        daily_rets = closes_d.pct_change().dropna()
        vol_annual = float(daily_rets.std() * math.sqrt(252.0)) if not daily_rets.empty else 0.0

        higher_tf = {
            "trend_pct_1y": trend_pct_1y,
            "high_52w": high_52w,
            "low_52w": low_52w,
            "dist_from_high_pct": dist_from_high,
            "dist_from_low_pct": dist_from_low,
            "ma20": ma20,
            "ma50": ma50,
            "ma200": ma200,
            "vol_annual_pct": vol_annual * 100.0,
        }

    return {
        "symbol": symbol,
        "last_price": last_price,
        "expiration": exp,
        "intraday_last_candle": candle,
        "calls": calls_sel.to_dict(orient="records"),
        "puts": puts_sel.to_dict(orient="records"),
        "higher_tf": higher_tf,
    }


# ---------- Black–Scholes Greeks (approximate, educational) ----------


def _norm_cdf(x: float) -> float:
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def _norm_pdf(x: float) -> float:
    return math.exp(-0.5 * x * x) / math.sqrt(2.0 * math.pi)


def _option_greeks(
    S: float,
    K: float,
    T: float,
    r: float,
    sigma: float,
    opt_type: Literal["call", "put"],
) -> Dict[str, float]:
    if T <= 0 or sigma <= 0 or S <= 0 or K <= 0:
        return {"delta": 0.0, "gamma": 0.0, "theta": 0.0, "vega": 0.0}

    d1 = (math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)
    pdf = _norm_pdf(d1)

    if opt_type == "call":
        delta = _norm_cdf(d1)
        theta = (
            -S * pdf * sigma / (2 * math.sqrt(T)) - r * K * math.exp(-r * T) * _norm_cdf(d2)
        )
    else:
        delta = _norm_cdf(d1) - 1.0
        theta = (
            -S * pdf * sigma / (2 * math.sqrt(T)) + r * K * math.exp(-r * T) * _norm_cdf(-d2)
        )

    gamma = pdf / (S * sigma * math.sqrt(T))
    vega = S * pdf * math.sqrt(T)

    return {"delta": delta, "gamma": gamma, "theta": theta, "vega": vega}


def build_prompt(
    symbol_snapshots: List[Dict[str, Any]],
    focus: str = "both",
    style: str = "balanced",
    timeframe: str = "intraday",
    analysis_type: str = "options",  # options | stocks | both
) -> str:
    spec = ZERO_DTE_SPEC.strip()
    if analysis_type == "stocks":
        spec = (
            spec
            + "\n\nCRITICAL — This run is STOCKS ONLY. You must output ONLY information about buying and selling the underlying STOCK (equity). "
            "Do NOT include any options content: no calls, no puts, no 0DTE, no strikes, no options contracts, no options terminology. "
            "Use the market data only to inform stock direction, key levels, and risk—then output only the Stock idea format per ticker as described below."
        )
    elif analysis_type == "both":
        spec = spec + "\n\nYou are giving BOTH options ideas AND stock (equity) ideas for this run. For each ticker, output the usual options view AND a separate Stock idea section as described below."

    lines = [
        spec,
        "\n\n---\n\nHere is the current market snapshot (delayed yfinance data):",
    ]

    for snap in symbol_snapshots:
        lines.append("\n### %s snapshot" % snap["symbol"])
        lines.append("- Last price: %.2f" % snap["last_price"])
        lines.append("- 0DTE expiration used: %s" % snap["expiration"])

        c = snap["intraday_last_candle"]
        lines.append(
            " - Last 5m candle: time=%s, O=%.2f, H=%.2f, L=%.2f, C=%.2f"
            % (c["time"], c["open"], c["high"], c["low"], c["close"])
        )

        lines.append("\nNear-ATM 0DTE calls:")
        for row in snap["calls"]:
            lines.append(
                "  - %(contractSymbol)s: strike=%(strike)s, last=%(lastPrice)s, "
                "bid=%(bid)s, ask=%(ask)s, vol=%(volume)s, oi=%(openInterest)s"
                % row
            )

        lines.append("\nNear-ATM 0DTE puts:")
        for row in snap["puts"]:
            lines.append(
                "  - %(contractSymbol)s: strike=%(strike)s, last=%(lastPrice)s, "
                "bid=%(bid)s, ask=%(ask)s, vol=%(volume)s, oi=%(openInterest)s"
                % row
            )

        ht = snap.get("higher_tf")
        if ht:
            lines.append("\nHigher timeframe daily context:")
            lines.append(
                " - 1y trend: %.1f%%, 52w high: %.2f, 52w low: %.2f"
                % (ht["trend_pct_1y"], ht["high_52w"], ht["low_52w"])
            )
            lines.append(
                " - Distance from 52w high/low: %.1f%% / %.1f%%"
                % (ht["dist_from_high_pct"], ht["dist_from_low_pct"])
            )
            lines.append(
                " - Moving avgs (20/50/200d): %.2f / %.2f / %.2f"
                % (ht["ma20"], ht["ma50"], ht["ma200"])
            )
            lines.append(" - Realized annual volatility (close-close): %.1f%%" % (ht["vol_annual_pct"]))

    pref_tail = (
        "Describe how aggressive or conservative the stock idea is (e.g. tight stop vs wider hold)."
        if analysis_type == "stocks"
        else "Describe how aggressive or conservative the idea is relative to typical options and 0DTE risk."
    )
    lines.append(
        "\n\nUser preferences for this run:\n"
        "- Focus: %s (both/calls/puts)\n"
        "- Risk style: %s (balanced/conservative/aggressive)\n"
        "- Timeframe: %s (intraday / 1–5 days / multi-week / long-term)\n"
        "- Analysis type: %s (options only / stocks only / both)\n\n"
        "Respect these preferences. Do NOT output position sizes. %s"
        % (focus, style, timeframe, analysis_type, pref_tail)
    )

    # Stock idea output format (when analysis_type is stocks or both)
    if analysis_type in ("stocks", "both"):
        lines.append(
            "\n\nSTOCK (equity) idea format — include for EACH ticker when analysis_type is stocks or both:\n"
            "Stock idea:\n"
            "- Direction: [Long / Short / Neutral] over the chosen timeframe.\n"
            "- Key level: [e.g. support/resistance, 52w level, or VWAP].\n"
            "- Horizon: [e.g. swing 1–5 days, hold for multi-week, long-term accumulate].\n"
            "- Reason: [one short sentence: trend, level, or catalyst].\n"
            "- Risk: [one line: e.g. stop below X, or key level to invalidate].\n"
            "For stocks-only runs, use heading [SYMBOL] Stock View: and output ONLY the Stock idea sections (no options). "
            "For both, output the normal options view first, then the Stock idea section for that ticker."
        )

    # Force output to match the selected timeframe (heading + content)
    tf_heading = {
        "intraday": "0DTE View",
        "1-5d": "1–5 Day View",
        "multi-week": "Multi-week View",
        "long-term": "Long-term View",
    }.get(timeframe, "View")
    if analysis_type == "stocks":
        lines.append(
            "\n\nCRITICAL — Stock-only analysis (equity only):\n"
            "- For EACH ticker use heading: [SYMBOL] Stock View:\n"
            "- Output ONLY the Stock idea section: Direction (long/short/neutral), Key level, Horizon, Reason, Risk.\n"
            "- All recommendations must be about buying or selling the STOCK only. Do not mention options, calls, puts, 0DTE, strikes, or any options contracts.\n"
            "- Match the user's timeframe: intraday = day-trade levels; 1–5d = swing; multi-week/long-term = position and key zones.\n"
            "- If you mention risk or targets, phrase them in terms of stock price levels only, not options."
        )
    else:
        lines.append(
            "\n\nCRITICAL — You MUST match the user's chosen timeframe:\n"
            "- Timeframe selected: %s\n"
            "- For EACH ticker use this EXACT heading style: [SYMBOL] %s:\n"
            "  (e.g. IWM %s: or SPY %s:)\n"
            "- For intraday: same-day 0DTE options, quick targets, intraday levels.\n"
            "- For 1–5 days: weekly or short-dated options (1–5 day expiries), swing-style ideas.\n"
            "- For multi-week: 2–8 week expiries, broader zones, weekly targets.\n"
            "- For long-term: multi-month expiries, broad price zones and direction, NOT 0DTE strikes; "
            "focus on trend and key levels, not same-day entries. Do NOT give 0DTE contract examples when timeframe is long-term."
            % (timeframe, tf_heading, tf_heading, tf_heading)
        )
        if analysis_type == "both":
            lines.append(
                "\nAfter each ticker's options view, add the Stock idea section for that ticker (Direction, Key level, Horizon, Reason, Risk)."
            )

    return "\n".join(lines)


def call_llm(prompt: str) -> str:
    client = OpenAI()
    resp = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a cautious options and market-scenario assistant. "
                    "You can discuss intraday 0DTE setups, short-term swings, and longer-term "
                    "multi-week or multi-month scenarios for any reasonably liquid US stock or ETF. "
                    "Always stay educational, avoid promises, and highlight that options and "
                    "price targets are uncertain and can be wrong."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
    )
    return resp.choices[0].message.content or ""


def analyze_symbols(
    symbols,
    focus: str = "both",
    style: str = "balanced",
    timeframe: str = "intraday",
    analysis_type: str = "options",
) -> str:
    snapshots: List[Dict[str, Any]] = []
    errors: List[str] = []
    for sym in symbols:
        try:
            snapshots.append(fetch_0dte_snapshot(sym))
        except Exception as e:
            msg = str(e).strip()
            errors.append("%s: %s" % (sym, msg if msg else type(e).__name__))
            print("Skipping %s: %s" % (sym, e))

    if not snapshots:
        detail = "No data fetched."
        if errors:
            err_text = "; ".join(errors)
            detail += " " + err_text
            # Friendlier message when rate limited (e.g. yfinance/Yahoo)
            if "rate limit" in err_text.lower() or "too many requests" in err_text.lower():
                detail = (
                    "Data provider rate limited. Wait 1–2 minutes and try again, or use fewer tickers. "
                    "Details: " + err_text
                )
        raise RuntimeError(detail)

    prompt = build_prompt(snapshots, focus=focus, style=style, timeframe=timeframe, analysis_type=analysis_type)
    return call_llm(prompt)


# ---------- Screener API helpers (with Greeks) ----------


def _build_screener_rows_for_exp(
    symbol: str,
    S: float,
    exp: str,
    calls,
    puts,
    min_volume: int,
    max_spread_pct: float,
) -> List[Dict[str, Any]]:
    """Build screener rows for one expiration. Returns list (may be empty)."""
    T = _approx_time_to_expiry_yrs(exp)
    approx_dte = max(int(round(T * 365.0)), 0)
    r = 0.05
    rows: List[Dict[str, Any]] = []

    def process_side(records, opt_type: str):
        nonlocal rows
        if records is None or (hasattr(records, "empty") and records.empty):
            return
        # yfinance returns DataFrames; iterate rows
        for _, row in records.iterrows():
            bid = float(row.get("bid", 0) or 0.0)
            ask = float(row.get("ask", 0) or 0.0)
            last = float(row.get("lastPrice", 0) or 0.0)
            vol = int(row.get("volume", 0) or 0)
            oi = int(row.get("openInterest", 0) or 0)
            K = float(row.get("strike", 0) or 0.0)
            iv = float(row.get("impliedVolatility", 0) or 0.0)

            if vol < min_volume:
                continue
            if bid <= 0 or ask <= 0:
                continue
            spread_pct = (ask - bid) / ask * 100.0 if ask > 0 else 0.0
            if spread_pct > max_spread_pct:
                continue

            if opt_type == "CALL":
                moneyness_pct = (S - K) / S * 100.0
            else:
                moneyness_pct = (K - S) / S * 100.0

            greeks = _option_greeks(
                S=S, K=K, T=T, r=r,
                sigma=max(iv, 0.0001),
                opt_type="call" if opt_type == "CALL" else "put",
            )
            rows.append({
                "symbol": symbol,
                "underlying_price": S,
                "type": opt_type,
                "expiration": exp,
                "dte": approx_dte,
                "strike": K,
                "last": last,
                "bid": bid,
                "ask": ask,
                "spread_pct": spread_pct,
                "volume": vol,
                "open_interest": oi,
                "moneyness_pct": moneyness_pct,
                "iv_pct": iv * 100.0,
                "delta": greeks["delta"],
                "gamma": greeks["gamma"],
                "theta": greeks["theta"],
                "vega": greeks["vega"],
            })

    process_side(calls, "CALL")
    process_side(puts, "PUT")
    return rows


def build_screener_rows(
    symbol: str,
    min_volume: int,
    max_spread_pct: float,
    timeframe: str = "intraday",
) -> List[Dict[str, Any]]:
    try:
        t = yf.Ticker(symbol)
        S = _get_last_price(symbol)
    except Exception as e:
        print("Screener init skip %s: %s" % (symbol, e))
        return []

    # Try requested timeframe first, then broader timeframes if we get no rows (helps IWM, etc.)
    for try_tf in [timeframe, "1-5d", "multi-week", "long-term"]:
        try:
            expirations = _get_expirations_for_timeframe(t, try_tf)
        except Exception as e:
            print("Screener expirations skip %s (%s): %s" % (symbol, try_tf, e))
            continue
        if not expirations:
            continue

        all_rows: List[Dict[str, Any]] = []
        for exp in expirations:
            try:
                chain = t.option_chain(exp)
                rows = _build_screener_rows_for_exp(
                    symbol, S, exp, chain.calls, chain.puts,
                    min_volume=min_volume, max_spread_pct=max_spread_pct,
                )
                all_rows.extend(rows)
                if len(all_rows) >= 20:
                    break
            except Exception as e:
                print("Screener skip exp %s for %s: %s" % (exp, symbol, e))
                continue

        if all_rows:
            all_rows.sort(
                key=lambda r: (-r["volume"], r["spread_pct"], abs(r["moneyness_pct"]))
            )
            return all_rows

    return []


def fetch_option_chains_for_dte_range(
    symbol: str,
    min_volume: int,
    max_spread_pct: float,
    min_dte: int,
    max_dte: int,
    call_put_filter: str = "both",
    max_contracts: int = 100,
) -> List[Dict[str, Any]]:
    """
    Unified helper to build screener-style option rows for an arbitrary DTE window.

    Returns a list of normalized contract dicts with Greeks, filtered by volume/spread
    and optionally by side (calls / puts / both).
    """
    today = dt.date.today()

    try:
        t = yf.Ticker(symbol)
        S = _get_last_price(symbol)
    except Exception as e:
        print("Chain init skip %s: %s" % (symbol, e))
        return []

    try:
        expirations = _get_expirations_for_dte_range(t, min_dte=min_dte, max_dte=max_dte)
    except Exception as e:
        print("Chain expirations skip %s: %s" % (symbol, e))
        return []
    if not expirations:
        return []

    all_rows: List[Dict[str, Any]] = []

    side_filter = (call_put_filter or "both").lower()
    allowed_types = {"CALL", "PUT"}
    if side_filter in ("calls", "call"):
        allowed_types = {"CALL"}
    elif side_filter in ("puts", "put"):
        allowed_types = {"PUT"}

    for exp in expirations:
        try:
            chain = t.option_chain(exp)
        except Exception as e:
            print("Chain fetch skip %s %s: %s" % (symbol, exp, e))
            continue

        rows = _build_screener_rows_for_exp(
            symbol,
            S,
            exp,
            chain.calls,
            chain.puts,
            min_volume=min_volume,
            max_spread_pct=max_spread_pct,
        )
        if not rows:
            continue

        # Make sure DTE is populated consistently (especially for non-0DTE windows)
        try:
            exp_date = dt.date.fromisoformat(exp)
            dte = max((exp_date - today).days, 0)
            for r in rows:
                r["dte"] = dte
        except Exception:
            pass

        if allowed_types != {"CALL", "PUT"}:
            rows = [r for r in rows if r.get("type") in allowed_types]

        all_rows.extend(rows)
        if len(all_rows) >= max_contracts:
            break

    if not all_rows:
        return []

    all_rows.sort(
        key=lambda r: (-r["volume"], r["spread_pct"], abs(r["moneyness_pct"]))
    )
    if max_contracts and max_contracts > 0:
        return all_rows[:max_contracts]
    return all_rows


def compute_stock_factors(symbol: str) -> Dict[str, Any]:
    """
    Compute simple momentum / value / growth-style factors for a stock.

    Uses daily price history and basic fundamentals from yfinance. Results are
    cached for a short TTL to avoid hammering the upstream API.
    """
    now = time.time()
    cached = _STOCK_FACTOR_CACHE.get(symbol)
    if cached and (now - cached.get("_cached_at", 0.0)) < _STOCK_FACTOR_CACHE_TTL_SECONDS:
        # Return a shallow copy without internal metadata
        out = dict(cached)
        out.pop("_cached_at", None)
        return out

    t = yf.Ticker(symbol)
    hist = t.history(period="1y", interval="1d")
    if hist.empty or len(hist) < 30:
        raise RuntimeError("Not enough daily history for %s" % symbol)

    closes = hist["Close"]

    def pct_change_over_days(trading_days: int) -> float:
        if len(closes) <= trading_days:
            return float("nan")
        start = float(closes.iloc[-trading_days - 1])
        end = float(closes.iloc[-1])
        return (end - start) / start * 100.0 if start > 0 else float("nan")

    mom_1m = pct_change_over_days(21)
    mom_3m = pct_change_over_days(63)
    mom_6m = pct_change_over_days(126)

    ma20 = float(closes.rolling(20).mean().iloc[-1])
    ma50 = float(closes.rolling(50).mean().iloc[-1])
    ma200 = float(closes.rolling(200).mean().iloc[-1])
    last_price = float(closes.iloc[-1])

    above_ma20 = bool(last_price > ma20) if ma20 > 0 else False
    above_ma50 = bool(last_price > ma50) if ma50 > 0 else False
    above_ma200 = bool(last_price > ma200) if ma200 > 0 else False

    # Fundamentals – yfinance info dict can be flaky, so be defensive.
    try:
        info = t.info or {}
    except Exception:
        info = {}

    pe = info.get("trailingPE") or info.get("forwardPE")
    ps = info.get("priceToSalesTrailing12Months")
    div_yield = info.get("dividendYield")
    if div_yield is not None:
        try:
            div_yield = float(div_yield) * 100.0
        except Exception:
            div_yield = None

    eps_growth = info.get("earningsQuarterlyGrowth") or info.get("earningsGrowth")
    rev_growth = info.get("revenueGrowth")
    float_shares = info.get("floatShares")

    factors = {
        "symbol": symbol,
        "last_price": last_price,
        "momentum_1m_pct": mom_1m,
        "momentum_3m_pct": mom_3m,
        "momentum_6m_pct": mom_6m,
        "above_ma20": above_ma20,
        "above_ma50": above_ma50,
        "above_ma200": above_ma200,
        "pe": pe,
        "ps": ps,
        "div_yield_pct": div_yield,
        "eps_growth": eps_growth,
        "rev_growth": rev_growth,
        "float_shares": float_shares,
    }

    to_cache = dict(factors)
    to_cache["_cached_at"] = now
    _STOCK_FACTOR_CACHE[symbol] = to_cache
    return factors


# ---------- Confidence / simple backtest metrics ----------


def _compute_confidence_metrics(symbol: str) -> Dict[str, Any]:
    """
    Very rough, educational-only metrics:
    - Look at last ~90 trading days of daily candles.
    - Measure trend, volatility, and how often a strong day sees follow-through next day.
    """
    t = yf.Ticker(symbol)
    hist = t.history(period="90d", interval="1d")
    if hist.empty or len(hist) < 25:
        raise RuntimeError("Not enough daily history for %s" % symbol)

    closes = hist["Close"]
    opens = hist["Open"]

    # 90d trend (% move from start to end)
    first_close = float(closes.iloc[0])
    last_close = float(closes.iloc[-1])
    trend_pct_90d = (last_close - first_close) / first_close * 100.0

    # Realized annualized volatility from daily returns
    daily_rets = closes.pct_change().dropna()
    vol_annual = float(daily_rets.std() * math.sqrt(252.0)) if not daily_rets.empty else 0.0

    # Simple "follow-through" backtest:
    # if day is strong up (close > open + small buffer), how often does next close finish higher?
    up_mask = closes > opens * 1.002
    down_mask = closes < opens * 0.998

    next_close = closes.shift(-1)
    curr_close = closes

    up_sample = up_mask & (next_close > curr_close)
    down_sample = down_mask & (next_close < curr_close)

    up_count = int(up_mask[:-1].sum())
    down_count = int(down_mask[:-1].sum())

    up_hit_rate = float(up_sample[:-1].sum()) / up_count if up_count > 0 else None
    down_hit_rate = float(down_sample[:-1].sum()) / down_count if down_count > 0 else None

    # Base win probability from whichever side matches the latest day
    last_up = bool(up_mask.iloc[-1])
    last_down = bool(down_mask.iloc[-1])

    if last_up and up_hit_rate is not None:
        base_win_prob = up_hit_rate * 100.0
        sample_trades = up_count
        pattern = "strong up-follow-through"
    elif last_down and down_hit_rate is not None:
        base_win_prob = down_hit_rate * 100.0
        sample_trades = down_count
        pattern = "strong down-follow-through"
    else:
        # fallback: average of both sides if available
        vals = [v for v in [up_hit_rate, down_hit_rate] if v is not None]
        base_win_prob = (sum(vals) / len(vals) * 100.0) if vals else 50.0
        sample_trades = (up_count or 0) + (down_count or 0)
        pattern = "mixed days"

    # Confidence score heuristic:
    # - Start from base win probability
    # - Penalize extreme volatility
    # - Reward clean trend direction
    trend_adj = max(min(trend_pct_90d, 8.0), -8.0)  # clamp to +/-8%
    vol_penalty = min(vol_annual * 100.0, 80.0) * 0.25  # higher vol => larger penalty

    raw_conf = base_win_prob + trend_adj - vol_penalty
    confidence_score = max(5.0, min(95.0, raw_conf))

    return {
        "symbol": symbol,
        "trend_pct_90d": round(trend_pct_90d, 1),
        "vol_annual_pct": round(vol_annual * 100.0, 1),
        "expected_win_prob_pct": round(base_win_prob, 1),
        "confidence_score": round(confidence_score, 1),
        "sample_trades": int(sample_trades),
        "pattern": pattern,
    }


def compute_confidence_for_symbols(symbols: List[str]) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    for sym in symbols:
        try:
            out[sym] = _compute_confidence_metrics(sym)
        except Exception as e:
            print("Confidence metrics skipping %s: %s" % (sym, e))
    return out


# ---------- Portfolio & strategy backtests (1–5y, educational) ----------


def _load_history_for_backtest(symbol: str, years: int = 3) -> Any:
    """
    Load daily history for backtesting.

    years: 1–5, mapped to a yfinance period.
    """
    years = max(1, min(int(years), 5))
    # yfinance accepts e.g. "3y"
    period = f"{years}y"
    t = yf.Ticker(symbol)
    hist = t.history(period=period, interval="1d")
    if hist.empty or len(hist) < 60:
        raise RuntimeError("Not enough history for %s over %s" % (symbol, period))
    return hist


def _compute_backtest_metrics_for_symbol(
    symbol: str,
    years: int = 3,
    holding_days: int = 5,
    direction: str = "long",
) -> Dict[str, Any]:
    """
    Very simple rolling-hold backtest:
    - Use daily closes over N years.
    - Construct non-overlapping holding periods of `holding_days`.
    - For each period, compute return from entry close to exit close.
    - Aggregate into CAGR, Sharpe, max drawdown, win rate.
    """
    hist = _load_history_for_backtest(symbol, years=years)
    closes = hist["Close"].astype(float)
    if holding_days < 1:
        holding_days = 1

    # Slice into non-overlapping segments
    rets: List[float] = []
    for start_idx in range(0, len(closes) - holding_days, holding_days):
        entry = float(closes.iloc[start_idx])
        exit_ = float(closes.iloc[start_idx + holding_days])
        if entry <= 0:
            continue
        r = (exit_ - entry) / entry
        if direction == "short":
            r = -r
        rets.append(r)

    if not rets:
        raise RuntimeError("Unable to compute holding-period returns for %s" % symbol)

    import numpy as np  # local import to avoid hard dependency at module import time

    rets_arr = np.array(rets, dtype=float)
    avg_ret = float(rets_arr.mean())
    std_ret = float(rets_arr.std(ddof=1)) if len(rets_arr) > 1 else 0.0

    # Approximate number of such trades per year (252 trading days)
    trades_per_year = 252.0 / float(holding_days)
    # Annualized CAGR from geometric mean
    g_ret = float(np.prod(1.0 + rets_arr) ** (trades_per_year / len(rets_arr)) - 1.0)

    sharpe = 0.0
    if std_ret > 0:
        sharpe = (avg_ret * trades_per_year) / (std_ret * np.sqrt(trades_per_year))

    # Build an equity curve and compute drawdown path
    eq = np.cumprod(1.0 + rets_arr)
    peak = np.maximum.accumulate(eq)
    dd = (eq - peak) / peak  # negative numbers
    max_dd = float(dd.min()) if len(dd) else 0.0

    wins = int((rets_arr > 0).sum())
    win_rate = float(wins) / float(len(rets_arr)) * 100.0

    # Additional risk/return metrics (educational approximations)
    downside = rets_arr[rets_arr < 0]
    sortino = 0.0
    if downside.size > 0:
        downside_std = float(downside.std(ddof=1))
        if downside_std > 0:
            sortino = (avg_ret * trades_per_year) / (downside_std * np.sqrt(trades_per_year))

    calmar = 0.0
    if max_dd < 0:
        calmar = (g_ret * 100.0) / abs(max_dd * 100.0) if max_dd != 0 else 0.0

    pos = rets_arr[rets_arr > 0]
    neg = rets_arr[rets_arr < 0]
    omega = 0.0
    if pos.size > 0 and neg.size > 0:
        omega = float(pos.mean() / abs(neg.mean()))

    # Ulcer index: square-root of mean of squared drawdowns in percent
    if dd.size > 0:
        ui = float(np.sqrt(np.mean((dd * 100.0) ** 2)))
    else:
        ui = 0.0

    return {
        "symbol": symbol,
        "years": years,
        "holding_days": holding_days,
        "direction": direction,
        "num_trades": int(len(rets_arr)),
        "avg_trade_return_pct": round(avg_ret * 100.0, 2),
        "cagr_pct": round(g_ret * 100.0, 2),
        "sharpe": round(sharpe, 2),
        "max_drawdown_pct": round(max_dd * 100.0, 2),
        "win_rate_pct": round(win_rate, 1),
        "sortino": round(sortino, 2),
        "calmar": round(calmar, 2),
        "omega": round(omega, 2),
        "ulcer_index": round(ui, 2),
    }


def backtest_symbols(
    symbols: List[str],
    years: int = 3,
    holding_days: int = 5,
    direction: str = "long",
) -> Dict[str, Any]:
    """
    Backtest a simple rolling-hold strategy across one or more symbols.

    Returns per-symbol metrics plus a simple equal-weight portfolio view.
    """
    metrics: Dict[str, Any] = {}
    for sym in symbols:
        try:
            metrics[sym] = _compute_backtest_metrics_for_symbol(
                sym, years=years, holding_days=holding_days, direction=direction
            )
        except Exception as e:
            print("Backtest skipping %s: %s" % (sym, e))

    if not metrics:
        raise RuntimeError("No backtests could be computed for any symbols.")

    import numpy as np

    # Equal-weight portfolio approximation from per-symbol CAGR and vol
    cagr_vals = []
    dd_vals = []
    sharpe_vals = []
    for sym, m in metrics.items():
        cagr_vals.append(float(m.get("cagr_pct", 0.0)))
        dd_vals.append(float(m.get("max_drawdown_pct", 0.0)))
        sharpe_vals.append(float(m.get("sharpe", 0.0)))

    portfolio = {
        "approx_cagr_pct": round(float(np.mean(cagr_vals)), 2),
        "approx_max_drawdown_pct": round(float(np.min(dd_vals)), 2),
        "avg_sharpe": round(float(np.mean(sharpe_vals)), 2),
        "num_symbols": len(metrics),
    }

    return {"symbols": metrics, "portfolio": portfolio}


# ---------- VIX regime helper (for options strategies) ----------


def compute_vix_regime() -> Dict[str, Any]:
    """
    Simple VIX-based regime classification:

    - Uses ~6 months of daily VIX (^VIX) data.
    - Classifies volatility regime as 'low', 'normal', or 'high'.
    """
    t = yf.Ticker("^VIX")
    hist = t.history(period="6mo", interval="1d")
    if hist.empty:
        raise RuntimeError("No VIX data for ^VIX")

    closes = hist["Close"].astype(float)
    last = float(closes.iloc[-1])
    ma20 = float(closes.rolling(20).mean().iloc[-1])
    # Percentile of current VIX vs last 6 months
    pct = float((closes <= last).sum()) / float(len(closes)) * 100.0

    if last < 15 and pct < 30:
        regime = "low"
    elif last > 25 or pct > 70:
        regime = "high"
    else:
        regime = "normal"

    return {
        "symbol": "^VIX",
        "last": round(last, 2),
        "ma20": round(ma20, 2),
        "percentile_6m": round(pct, 1),
        "regime": regime,
        "note": (
            "HIGH: favor defined-risk or quicker profit targets; "
            "LOW: be more selective, avoid chasing far OTM lottos."
        ),
    }


# ---------- ML-style long-term forecast helper ----------


def build_forecast_prompt(
    symbol: str,
    years: int,
    factors: Dict[str, Any],
    confidence: Dict[str, Any] | None,
    backtest: Dict[str, Any] | None,
    vix_regime: Dict[str, Any] | None,
) -> str:
    """
    Build a rich text prompt that looks like feature engineering for an ML model,
    then ask the LLM to behave like a conservative long-term forecaster.
    """
    lines: List[str] = []
    lines.append(
        "You are a cautious, ML-style long-term equity forecaster. "
        "You see engineered features (trend, volatility, valuation, growth, VIX regime) for one symbol "
        "and you output a 6–24 month view with bull/base/bear scenarios. "
        "Educational only — not trading advice."
    )
    lines.append("")
    lines.append(f"Symbol: {symbol}")
    lines.append(f"Horizon_years: {years}")
    lines.append("")

    if factors:
        lines.append("--- Stock factors (momentum/value/growth) ---")
        lines.append(f"Last price: {factors.get('last_price')}")
        lines.append(
            "Momentum: 1M=%s%%, 3M=%s%%, 6M=%s%%"
            % (
                round(factors.get("momentum_1m_pct") or 0.0, 1),
                round(factors.get("momentum_3m_pct") or 0.0, 1),
                round(factors.get("momentum_6m_pct") or 0.0, 1),
            )
        )
        lines.append(
            "Above MAs: 20d=%s, 50d=%s, 200d=%s"
            % (
                bool(factors.get("above_ma20")),
                bool(factors.get("above_ma50")),
                bool(factors.get("above_ma200")),
            )
        )
        lines.append(
            "Value: PE=%s, PS=%s, Div_yield=%s%%"
            % (
                factors.get("pe"),
                factors.get("ps"),
                round((factors.get("div_yield_pct") or 0.0), 2),
            )
        )
        lines.append(
            "Growth: EPS_growth=%s, Rev_growth=%s"
            % (factors.get("eps_growth"), factors.get("rev_growth"))
        )
        lines.append("")

    if confidence:
        lines.append("--- 90d confidence/backtest-style stats ---")
        lines.append(
            "90d trend=%s%%, realized vol=%s%%, expected win prob≈%s%%, confidence_score=%s%%, pattern=%s"
            % (
                confidence.get("trend_pct_90d"),
                confidence.get("vol_annual_pct"),
                confidence.get("expected_win_prob_pct"),
                confidence.get("confidence_score"),
                confidence.get("pattern"),
            )
        )
        lines.append("")

    if backtest:
        lines.append(f"--- {years}y rolling-hold backtest (holding {backtest.get('holding_days')} days) ---")
        lines.append(
            "CAGR=%s%%, Sharpe=%s, Max_drawdown=%s%%, Win_rate=%s%%, Num_trades=%s"
            % (
                backtest.get("cagr_pct"),
                backtest.get("sharpe"),
                backtest.get("max_drawdown_pct"),
                backtest.get("win_rate_pct"),
                backtest.get("num_trades"),
            )
        )
        lines.append("")

    if vix_regime:
        lines.append("--- VIX regime context ---")
        lines.append(
            "VIX last=%s, 20d_MA=%s, 6m_percentile=%s%%, regime=%s"
            % (
                vix_regime.get("last"),
                vix_regime.get("ma20"),
                vix_regime.get("percentile_6m"),
                vix_regime.get("regime"),
            )
        )
        lines.append("VIX_note: %s" % (vix_regime.get("note") or ""))
        lines.append("")

    lines.append(
        "Now, using these engineered features as if you were a trained ML model on many stocks and macro conditions, "
        "produce a SHORT plain-text forecast with this structure:\n"
        "1) Overall view (one line: Bullish / Neutral / Bearish and why).\n"
        "2) Base case: 6–24 month annualized return range (e.g. 5–10%%) and key drivers.\n"
        "3) Bull case: what needs to go right (trend, macro, earnings).\n"
        "4) Bear case: main downside risks and rough drawdown range.\n"
        "5) Risk notes: 2–3 bullets on volatility, valuation, and macro sensitivity.\n"
        "6) Example plan (educational only): one or two sentences describing a hypothetical way a trader *might* think about entries and exits "
        "using broad price ZONES (e.g. 'accumulate on pullbacks near support zone A–B, trim into resistance zone C–D, cut if price closes below E'). "
        "Do NOT give exact order instructions; keep it high-level and clearly hypothetical."
    )

    return "\n".join(lines)


def forecast_symbol(symbol: str, years: int = 3) -> Dict[str, Any]:
    """
    ML-style long-term forecast for a single symbol.

    Uses engineered features + LLM to emulate a conservative ML forecaster.
    """
    sym = symbol.upper()
    years = max(1, min(int(years), 5))

    factors = compute_stock_factors(sym)
    # 90d confidence metrics
    try:
        conf = _compute_confidence_metrics(sym)
    except Exception as e:
        print("Forecast confidence skip %s: %s" % (sym, e))
        conf = None

    # 1–5y backtest with default 5-day holding period
    try:
        bt_all = backtest_symbols([sym], years=years, holding_days=5, direction="long")
        bt = bt_all["symbols"].get(sym)
    except Exception as e:
        print("Forecast backtest skip %s: %s" % (sym, e))
        bt = None

    # VIX regime
    try:
        vix = compute_vix_regime()
    except Exception as e:
        print("Forecast VIX skip: %s" % (e,))
        vix = None

    prompt = build_forecast_prompt(sym, years, factors, conf, bt, vix)

    client = OpenAI()
    resp = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a conservative, ML-style long-term forecaster. "
                    "You turn engineered features into a short, realistic forecast with clear risks. "
                    "Educational only; not trading advice."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
    )
    text = resp.choices[0].message.content or ""

    return {
        "symbol": sym,
        "horizon_years": years,
        "forecast_text": text.strip(),
        "inputs": {
            "factors": factors,
            "confidence": conf,
            "backtest": bt,
            "vix_regime": vix,
        },
    }


# ---------- Signal Engine: AI-ranked top 0DTE setups ----------

SIGNALS_SYSTEM = (
    "You are a 0DTE signal engine. Given live snapshot data, screener rows, and confidence metrics, "
    "you pick the single best and top N 0DTE setups right now. You respond ONLY with valid JSON, no other text. "
    "Educational only; not trading advice."
)

SIGNALS_OUTPUT_FORMAT = """
Respond with a single JSON object of this exact shape (no markdown, no code fence):
{
  "signals": [
    {
      "rank": 1,
      "ticker": "SPY",
      "type": "CALL",
      "strike_zone": "585-587",
      "headline": "SPY 0DTE call — hold above VWAP",
      "reason": "One short sentence why this is the best setup right now."
    }
  ]
}
- rank: 1 = highest probability, then 2, 3.
- type: CALL or PUT.
- strike_zone: approximate strike or range from the data.
- headline: one short punchy line (like an alert).
- reason: one sentence.
Return exactly 1 to 3 signals, in order of probability. If data is thin, return fewer.
"""


def _build_signals_prompt(
    snapshots: List[Dict[str, Any]],
    screener_rows: List[Dict[str, Any]],
    confidence: Dict[str, Any],
) -> str:
    lines = [
        "Here is the current 0DTE snapshot and liquid contracts. Pick the top 1–3 setups RIGHT NOW.",
        "",
        "--- Snapshot summary ---",
    ]
    for snap in snapshots:
        sym = snap["symbol"]
        lines.append("%s: last=%.2f, exp=%s" % (sym, snap["last_price"], snap["expiration"]))
        c = snap["intraday_last_candle"]
        lines.append("  Last 5m: O=%.2f H=%.2f L=%.2f C=%.2f" % (c["open"], c["high"], c["low"], c["close"]))
        conf = confidence.get(sym)
        if conf:
            lines.append("  Confidence: %.1f%%, expected win ~%.1f%%, pattern: %s" % (
                conf.get("confidence_score", 0),
                conf.get("expected_win_prob_pct", 0),
                conf.get("pattern", "—"),
            ))
    lines.append("")
    lines.append("--- Top liquid 0DTE contracts (from screener) ---")
    for r in screener_rows[:24]:  # cap so prompt stays reasonable
        lines.append(
            "  %s %s strike=%.1f bid=%.2f ask=%.2f spread=%.1f%% vol=%s"
            % (r["symbol"], r["type"], r["strike"], r["bid"], r["ask"], r["spread_pct"], r["volume"])
        )
    lines.append("")
    lines.append(SIGNALS_OUTPUT_FORMAT)
    return "\n".join(lines)


def get_top_signals(symbols: List[str], limit: int = 3) -> List[Dict[str, Any]]:
    """
    Fetch snapshots, screener, and confidence; ask LLM for top N 0DTE setups.
    Returns list of { rank, ticker, type, strike_zone, headline, reason }.
    """
    snapshots: List[Dict[str, Any]] = []
    for sym in symbols:
        try:
            snapshots.append(fetch_0dte_snapshot(sym))
        except Exception as e:
            print("Signals snapshot skip %s: %s" % (sym, e))

    if not snapshots:
        return []

    all_rows: List[Dict[str, Any]] = []
    for sym in symbols:
        try:
            rows = build_screener_rows(sym, min_volume=500, max_spread_pct=30.0, timeframe="intraday")
            all_rows.extend(rows)
        except Exception as e:
            print("Signals screener skip %s: %s" % (sym, e))

    all_rows.sort(key=lambda r: (-r["volume"], r["spread_pct"], abs(r["moneyness_pct"])))
    confidence = compute_confidence_for_symbols(symbols)

    prompt = _build_signals_prompt(snapshots, all_rows, confidence)

    # Append VIX regime context so the model can tilt setups based on volatility
    try:
        vix = compute_vix_regime()
        prompt = (
            prompt
            + "\n\n--- VIX regime (market volatility) ---\n"
            + "VIX last=%.2f, 20d MA=%.2f, 6m percentile=%.1f%%, regime=%s\n"
              % (
                  vix.get("last", 0.0),
                  vix.get("ma20", 0.0),
                  vix.get("percentile_6m", 0.0),
                  vix.get("regime", "unknown"),
              )
            + "Guidance: %s\n"
              % (vix.get("note", ""))
        )
    except Exception as e:
        print("Signals VIX regime fetch failed: %s" % e)

    client = OpenAI()
    resp = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": SIGNALS_SYSTEM},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
    )
    raw = (resp.choices[0].message.content or "").strip()

    # Strip optional markdown code block
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1] if "\n" in raw else raw[3:]
    if raw.startswith("json"):
        raw = raw[4:].lstrip()
    if raw.endswith("```"):
        raw = raw.rsplit("```", 1)[0].strip()

    try:
        data = json.loads(raw)
        signals = data.get("signals") or []
        if not isinstance(signals, list):
            return []
        out = []
        for s in signals[: int(limit)]:
            if isinstance(s, dict) and s.get("ticker") and s.get("headline"):
                out.append({
                    "rank": int(s.get("rank") or len(out) + 1),
                    "ticker": str(s.get("ticker", "")).upper(),
                    "type": str(s.get("type", "CALL")).upper()[:4],
                    "strike_zone": str(s.get("strike_zone", "—")),
                    "headline": str(s.get("headline", "")),
                    "reason": str(s.get("reason", "")),
                })
        return out
    except Exception as e:
        print("Signals JSON parse failed: %s" % e)
        return []
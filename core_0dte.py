import json
import os
import math
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
) -> str:
    lines = [
        ZERO_DTE_SPEC.strip(),
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

    lines.append(
        "\n\nUser preferences for this run:\n"
        "- Focus: %s (both/calls/puts)\n"
        "- Risk style: %s (balanced/conservative/aggressive)\n"
        "- Timeframe: %s (intraday / 1–5 days / multi-week / long-term)\n\n"
        "Respect these preferences when you choose which setups to highlight and how aggressive "
        "the ideas sound. Do NOT output position sizes; only describe how "
        "aggressive or conservative the idea is relative to typical options and 0DTE risk."
        % (focus, style, timeframe)
    )

    # Force output to match the selected timeframe (heading + content)
    tf_heading = {
        "intraday": "0DTE View",
        "1-5d": "1–5 Day View",
        "multi-week": "Multi-week View",
        "long-term": "Long-term View",
    }.get(timeframe, "View")
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
            detail += " " + "; ".join(errors)
        raise RuntimeError(detail)

    prompt = build_prompt(snapshots, focus=focus, style=style, timeframe=timeframe)
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
                "type": opt_type,
                "expiration": exp,
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
    t = yf.Ticker(symbol)
    S = _get_last_price(symbol)
    expirations = _get_expirations_for_timeframe(t, timeframe)
    if not expirations:
        return []

    all_rows: List[Dict[str, Any]] = []
    for exp in expirations:
        try:
            chain = t.option_chain(exp)
            rows = _build_screener_rows_for_exp(
                symbol, S, exp, chain.calls, chain.puts,
                min_volume=min_volume, max_spread_pct=max_spread_pct,
            )
            all_rows.extend(rows)
            # If we got enough rows, stop; otherwise try next expiration (e.g. illiquid expiry)
            if len(all_rows) >= 20:
                break
        except Exception as e:
            print("Screener skip exp %s for %s: %s" % (exp, symbol, e))
            continue

    all_rows.sort(
        key=lambda r: (-r["volume"], r["spread_pct"], abs(r["moneyness_pct"]))
    )
    return all_rows


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
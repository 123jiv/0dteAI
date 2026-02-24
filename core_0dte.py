import datetime as dt
import os
from typing import List, Dict, Any

import yfinance as yf
from openai import OpenAI

# 1) 0DTE spec / behavior
ZERO_DTE_SPEC = """
You are an options day-trading assistant focused ONLY on 0DTE contracts for SPY, QQQ, and IWM.
Your job is to give very simple, easy-to-read explanations, NOT dense reports.

Work only with same-day expiration (0DTE) options for SPY, QQQ, and IWM.
Use the data I provide (price, candles, simple intraday context, and a list of near-ATM 0DTE options)
to describe what is happening and suggest ideas in plain language.

IMPORTANT FORMAT RULES
- DO NOT use markdown headings (#) or markdown symbols like ** or _.
- Use plain text headings that end with a colon, for example: "IWM 0DTE View:".
- Keep everything short and friendly, like you are talking to a newer trader.

For EACH ticker I give you, output using EXACTLY this structure and nothing more:

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
- Theta: [1 line on time decay].
- Reversal: [1 line on price reversing and flipping the idea].
- News/liquidity: [1 line on news or poor fills].

STYLE REMINDERS
- Use short, plain sentences. No tables, no long paragraphs, no extra sections.
- Do NOT invent precise live prices or Greeks; use approximate or conditional language based on the data I give you.
- Always treat this as educational scenario analysis only, not trading advice. Remind that 0DTE options can easily go to zero.
"""

# 2) Data helpers using yfinance (free, delayed)


def _get_today_or_nearest_expiration(ticker: yf.Ticker) -> str:
    exps = ticker.options
    if not exps:
        raise RuntimeError("No option expirations found.")
    today = dt.date.today()
    # exact match if available
    exact = [e for e in exps if dt.date.fromisoformat(e) == today]
    if exact:
        return exact[0]
    # fallback: nearest future expiration
    exps_sorted = sorted(exps, key=lambda x: dt.date.fromisoformat(x))
    return exps_sorted[0]


def fetch_0dte_snapshot(symbol: str) -> Dict[str, Any]:
    """Fetch simple intraday info + near-ATM 0DTE calls/puts for a symbol using yfinance."""
    t = yf.Ticker(symbol)

    # 5-minute intraday candles for today
    hist = t.history(period="1d", interval="5m")
    if hist.empty:
        raise RuntimeError("No intraday data for %s" % symbol)

    last_row = hist.iloc[-1]
    last_price = float(last_row["Close"])

    exp = _get_today_or_nearest_expiration(t)

    chain = t.option_chain(exp)
    calls = chain.calls
    puts = chain.puts

    def pick_near_atm(df):
        df = df.copy()
        df["dist"] = (df["strike"] - last_price).abs()
        df = df.sort_values("dist").head(6)
        return df[["contractSymbol", "strike", "lastPrice", "bid", "ask", "volume", "openInterest"]]

    calls_sel = pick_near_atm(calls)
    puts_sel = pick_near_atm(puts)

    candle = {
        "time": last_row.name.isoformat(),
        "open": float(last_row["Open"]),
        "high": float(last_row["High"]),
        "low": float(last_row["Low"]),
        "close": float(last_row["Close"]),
    }

    return {
        "symbol": symbol,
        "last_price": last_price,
        "expiration": exp,
        "intraday_last_candle": candle,
        "calls": calls_sel.to_dict(orient="records"),
        "puts": puts_sel.to_dict(orient="records"),
    }

# 3) Prompt builder


def build_prompt(
    symbol_snapshots: List[Dict[str, Any]],
    focus: str = "both",
    style: str = "balanced",
) -> str:
    """
    Build a text prompt that includes:
    - Your fixed 0DTE spec
    - A simple snapshot for each ticker
    - User preferences (focus/style)
    """
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

    lines.append(
        "\n\nUser preferences for this run:\n"
        "- Focus: %s (both/calls/puts)\n"
        "- Risk style: %s (balanced/conservative/aggressive)\n\n"
        "Respect these preferences when you choose which setups to highlight and how aggressive "
        "the position sizing / targets sound. Do NOT output position sizes; only describe how "
        "aggressive or conservative the idea is relative to typical 0DTE risk."
        % (focus, style)
    )

    return "\n".join(lines)

# 4) Call OpenAI


def call_llm(prompt: str) -> str:
    client = OpenAI()
    resp = client.chat.completions.create(
        model="gpt-4.1-mini",  # or another model you like
        messages=[
            {"role": "system", "content": "You are a cautious options trading analysis assistant."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
    )
    return resp.choices[0].message.content or ""

# 5) Public entry used by app.py and script.py


def analyze_symbols(symbols, focus: str = "both", style: str = "balanced") -> str:
    snapshots: List[Dict[str, Any]] = []
    for sym in symbols:
        try:
            snapshots.append(fetch_0dte_snapshot(sym))
        except Exception as e:
            print("Skipping %s: %s" % (sym, e))

    if not snapshots:
        raise RuntimeError("No data fetched.")

    prompt = build_prompt(snapshots, focus=focus, style=style)
    return call_llm(prompt)
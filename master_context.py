"""
Project Midori — Master Context Engine.
Builds a single rich context block injected before every AI call.
Uses commercially licensed sources: Alpaca/Polygon, Alternative.me, Finnhub, yfinance (fallback).
"""
import time
import datetime as dt
from typing import Dict, Any, List, Optional

import yfinance as yf

from market_data import get_market_data_all, get_fear_greed, get_market_news, get_economic_events

def _et_tz():
    try:
        from zoneinfo import ZoneInfo
        return ZoneInfo("America/New_York")
    except Exception:
        from datetime import timezone, timedelta
        return timezone(timedelta(hours=-5))  # EST fallback
_MASTER_CONTEXT_CACHE: Optional[str] = None
_MASTER_CONTEXT_TS: float = 0.0
_CACHE_TTL = 60  # seconds


def _et_now() -> dt.datetime:
    return dt.datetime.now(_et_tz())


def _market_session() -> Dict[str, Any]:
    now = _et_now()
    weekday = now.weekday()  # 0=Mon .. 6=Sun
    hour, minute = now.hour, now.minute
    time_mins = hour * 60 + minute

    if weekday >= 5:  # Saturday=5, Sunday=6
        status = "CLOSED"
        session_note = "Weekend: Markets closed, focus on planning."
        days_until_open = 1 if weekday == 5 else 0
        hour_note = ""
    elif time_mins < 9 * 60 + 30:
        status = "PRE_MARKET"
        session_note = "Pre-market session."
        days_until_open = 0
        hour_note = ""
    elif time_mins < 16 * 60:
        status = "OPEN"
        # Market hours 9:30–16:00 ET
        elapsed_mins = time_mins - (9 * 60 + 30)
        hour_num = (elapsed_mins // 60) + 1
        if time_mins < 10 * 60:  # 9:30–10:00
            session_note = "First 30 minutes — elevated volatility expected."
        elif time_mins >= 15 * 60:  # 3:00–4:00
            session_note = "Power hour — trend continuation period."
        else:
            dow_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
            dow = dow_names[weekday]
            if dow == "Monday":
                session_note = "First session of week, gap risk elevated."
            elif dow == "Friday":
                session_note = "OpEx risk, avoid holding 0DTE into close."
            elif weekday in (1, 2, 3):
                session_note = "Mid-week, highest liquidity."
            else:
                session_note = ""
        days_until_open = 0
        hour_note = " (Hour %d)" % hour_num if 1 <= hour_num <= 6 else ""
    else:
        status = "AFTER_HOURS"
        session_note = "After hours."
        days_until_open = 0
        if weekday == 4:  # Friday after close
            days_until_open = 2
        elif weekday == 5:
            days_until_open = 1
        hour_note = ""

    dow_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    dow_str = dow_names[weekday]
    date_str = now.strftime("%B %d %Y")
    time_str = now.strftime("%I:%M %p").lstrip("0") + " ET"

    return {
        "status": status,
        "dow": dow_str,
        "date_str": date_str,
        "time_str": time_str,
        "session_note": session_note,
        "days_until_open": days_until_open,
        "hour_note": hour_note,
    }


def _live_prices() -> Dict[str, Any]:
    out: Dict[str, Any] = {"tickers": {}, "vix": {}, "error": None}
    try:
        data = get_market_data_all()
        out["tickers"] = data.get("tickers", {})
        vix_data = data.get("vix", {})
        v = float(vix_data.get("price") or 0)
        if v < 12:
            interp = "Extremely low volatility — options cheap"
        elif v < 15:
            interp = "Low volatility — favor selling premium"
        elif v < 20:
            interp = "Normal volatility — balanced approach"
        elif v < 25:
            interp = "Elevated volatility — directional plays"
        elif v < 30:
            interp = "High volatility — wide stops needed"
        else:
            interp = "Fear in market — extreme caution or fade"
        out["vix"] = {
            "price": v,
            "change_pct": vix_data.get("change_pct") or 0,
            "interpretation": interp,
        }
    except Exception as e:
        out["error"] = str(e)
    return out


def _spy_internals() -> Dict[str, Any]:
    out: Dict[str, Any] = {"sma20": None, "sma50": None, "sma200": None, "rsi": None, "trend": "NEUTRAL", "first_30min": False, "power_hour": False}
    try:
        t = yf.Ticker("SPY")
        hist = t.history(period="1y")
        if hist is None or len(hist) < 200:
            return out
        closes = hist["Close"].astype(float)
        last = float(closes.iloc[-1])
        sma20 = float(closes.rolling(20).mean().iloc[-1])
        sma50 = float(closes.rolling(50).mean().iloc[-1])
        sma200 = float(closes.rolling(200).mean().iloc[-1])
        out["sma20"] = sma20
        out["sma50"] = sma50
        out["sma200"] = sma200
        out["last"] = last
        pct20 = (last - sma20) / sma20 * 100 if sma20 else 0
        pct50 = (last - sma50) / sma50 * 100 if sma50 else 0
        pct200 = (last - sma200) / sma200 * 100 if sma200 else 0
        out["pct_above_20"] = round(pct20, 1)
        out["pct_above_50"] = round(pct50, 1)
        out["pct_above_200"] = round(pct200, 1)
        if last > sma20 > sma50 > sma200:
            out["trend"] = "BULLISH"
        elif last < sma20 < sma50 < sma200:
            out["trend"] = "BEARISH"
        else:
            out["trend"] = "NEUTRAL"
        # RSI 14
        delta = closes.diff()
        gain = delta.where(delta > 0, 0.0)
        loss = (-delta).where(delta < 0, 0.0)
        avg_gain = gain.rolling(14).mean().iloc[-1] if len(gain) >= 14 else 0
        avg_loss = loss.rolling(14).mean().iloc[-1] if len(loss) >= 14 else 0
        if avg_loss == 0:
            rsi = 100.0
        else:
            rs = avg_gain / avg_loss
            rsi = 100.0 - (100.0 / (1.0 + rs))
        out["rsi"] = round(rsi, 1)
        now = _et_now()
        time_mins = now.hour * 60 + now.minute
        out["first_30min"] = (9 * 60 + 30 <= time_mins < 10 * 60) and now.weekday() < 5
        out["power_hour"] = (15 * 60 <= time_mins < 16 * 60) and now.weekday() < 5
    except Exception:
        pass
    return out


def _economic_events() -> List[Dict[str, Any]]:
    try:
        data = get_economic_events()
        events = data.get("events", [])
        today = _et_now().strftime("%Y-%m-%d")
        high = []
        for e in events:
            if not isinstance(e, dict):
                continue
            date_str = str(e.get("date", ""))[:10]
            if date_str == today or not date_str:
                high.append({
                    "time": e.get("time", ""),
                    "title": e.get("title", e.get("event", "Event")),
                    "impact": "HIGH IMPACT",
                })
        return high[:15]
    except Exception:
        return []


def get_market_regime() -> Dict[str, Any]:
    """
    Compute market regime from SPY SMAs, RSI, and VIX (yfinance only).

    Returns a UI-ready object:
    - regime, label, color, description
    - favored_strategies, avoid_strategies
    - auto_pause_recommended
    - data (debug metrics)
    """
    try:
        spy = yf.Ticker("SPY")
        hist = spy.history(period="1y", interval="1d")
        vix_t = yf.Ticker("^VIX")
        vix_data = vix_t.history(period="5d", interval="1d")

        if hist is None or hist.empty:
            return {"error": "No data"}

        close = hist["Close"].astype(float)
        current = float(close.iloc[-1])
        sma20 = float(close.rolling(20).mean().iloc[-1])
        sma50 = float(close.rolling(50).mean().iloc[-1])
        sma200 = float(close.rolling(200).mean().iloc[-1]) if len(close) >= 200 else float(close.rolling(100).mean().iloc[-1])

        delta = close.diff()
        gain = delta.where(delta > 0, 0.0)
        loss = -delta.where(delta < 0, 0.0)
        avg_gain = float(gain.rolling(14).mean().iloc[-1]) if len(gain) >= 14 else 0.0
        avg_loss = float(loss.rolling(14).mean().iloc[-1]) if len(loss) >= 14 else 0.0
        rs = (avg_gain / avg_loss) if avg_loss != 0 else 100.0
        rsi = float(100.0 - (100.0 / (1.0 + rs)))

        vix_current = float(vix_data["Close"].iloc[-1]) if (vix_data is not None and not vix_data.empty) else 20.0

        returns = close.pct_change().dropna()
        volatility_30d = float(returns.tail(30).std() * (252 ** 0.5) * 100) if len(returns) >= 30 else float(returns.std() * (252 ** 0.5) * 100) if len(returns) else 0.0

        above_20 = current > sma20
        above_50 = current > sma50
        above_200 = current > sma200

        if vix_current > 30:
            regime = "EXTREME_FEAR"
            label = "Extreme Fear"
            color = "danger"
            description = (
                "VIX above 30 signals extreme fear. Markets are highly volatile and directional signals are unreliable."
            )
            favored = ["Premium selling (iron condors)", "Defensive positions", "Cash preservation"]
            avoid = ["0DTE long options", "Directional momentum plays", "Large position sizes"]
            auto_pause = True
        elif vix_current > 25:
            regime = "HIGH_VOL"
            label = "High Volatility"
            color = "warning"
            description = (
                "Elevated volatility environment. Expect larger-than-normal price swings in both directions."
            )
            favored = ["Wider stops on directional trades", "Premium selling strategies", "Reduced position sizes"]
            avoid = ["Tight stop losses", "High-leverage 0DTE positions"]
            auto_pause = False
        elif above_200 and above_50 and above_20 and rsi > 50 and vix_current < 20:
            regime = "TRENDING_BULL"
            label = "Trending Bull"
            color = "success"
            description = (
                "SPY above key moving averages with healthy momentum. Bullish strategies are higher probability."
            )
            favored = ["Call spreads and momentum plays", "VWAP bounce setups", "Dip buying to support levels"]
            avoid = ["Naked short positions", "Heavy put buying", "Over-relying on overbought signals"]
            auto_pause = False
        elif (not above_200) and (not above_50) and rsi < 50 and vix_current > 18:
            regime = "TRENDING_BEAR"
            label = "Trending Bear"
            color = "danger"
            description = (
                "SPY below key moving averages with bearish momentum. Defensive and short strategies are favored."
            )
            favored = ["Put spreads on weak stocks", "Defensive sector rotation", "Cash and short-term bonds"]
            avoid = ["Aggressive call buying", "Catching falling knives", "Ignoring downside risk"]
            auto_pause = False
        elif abs(rsi - 50.0) < 10.0 and 15.0 <= vix_current <= 20.0:
            regime = "CHOPPY"
            label = "Choppy / Neutral"
            color = "warning"
            description = (
                "Mixed signals and range-bound price action. Trending strategies underperform in this environment."
            )
            favored = ["Iron condors and range plays", "Mean reversion at extremes", "Smaller position sizes"]
            avoid = ["Trend-following momentum trades", "Large directional bets", "0DTE outside key events"]
            auto_pause = False
        else:
            regime = "NEUTRAL"
            label = "Neutral"
            color = "neutral"
            description = (
                "No clear dominant regime. Be selective and size down until clearer signals emerge."
            )
            favored = ["High-conviction setups only", "Smaller position sizes", "Waiting for clarity"]
            avoid = ["Low-conviction trades", "Full-size positions"]
            auto_pause = False

        return {
            "regime": regime,
            "label": label,
            "color": color,
            "description": description,
            "favored_strategies": favored,
            "avoid_strategies": avoid,
            "auto_pause_recommended": auto_pause,
            "data": {
                "spy_price": round(current, 2),
                "sma20": round(sma20, 2),
                "sma50": round(sma50, 2),
                "sma200": round(sma200, 2),
                "rsi": round(rsi, 1),
                "vix": round(vix_current, 2),
                "above_20sma": above_20,
                "above_50sma": above_50,
                "above_200sma": above_200,
                "volatility_30d": round(volatility_30d, 1),
            },
        }
    except Exception as e:
        return {"error": str(e)}


def _fear_greed() -> Dict[str, Any]:
    try:
        return get_fear_greed()
    except Exception:
        return {"score": 50, "rating": "Unknown", "interpretation": ""}


def _news_headlines() -> List[str]:
    try:
        data = get_market_news()
        headlines = data.get("headlines", [])
        return [h.get("title", "") for h in headlines[:5] if h.get("title")]
    except Exception:
        return []


def build_master_context() -> str:
    """Build the full market context block. Cached 60 seconds."""
    global _MASTER_CONTEXT_CACHE, _MASTER_CONTEXT_TS
    now = time.time()
    if _MASTER_CONTEXT_CACHE and (now - _MASTER_CONTEXT_TS) < _CACHE_TTL:
        return _MASTER_CONTEXT_CACHE

    lines: List[str] = []
    lines.append("=== PROJECT MIDORI MARKET CONTEXT ===")

    session = _market_session()
    status = session["status"]
    lines.append("📅 %s | %s | %s%s" % (session["date_str"], session["time_str"], status.replace("_", " "), session["hour_note"]))
    if session["session_note"]:
        lines.append("⚡ SESSION NOTE: %s" % session["session_note"])
    if session["days_until_open"] and session["status"] == "CLOSED":
        lines.append("Days until next market open: %d" % session["days_until_open"])
    lines.append("")

    prices = _live_prices()
    lines.append("📊 MARKET SNAPSHOT:")
    spy = prices.get("tickers", {}).get("SPY", {})
    if spy and spy.get("price"):
        lines.append("SPY: $%.2f (%+.2f%%) | High: $%.2f | Low: $%.2f" % (
            spy["price"], spy.get("change_pct", 0), spy.get("high", 0), spy.get("low", 0)))
    qqq = prices.get("tickers", {}).get("QQQ", {})
    iwm = prices.get("tickers", {}).get("IWM", {})
    if qqq and qqq.get("price"):
        lines.append("QQQ: $%.2f (%+.2f%%)" % (qqq["price"], qqq.get("change_pct", 0)))
    if iwm and iwm.get("price"):
        lines.append("IWM: $%.2f (%+.2f%%)" % (iwm["price"], iwm.get("change_pct", 0)))
    vix = prices.get("vix", {})
    if vix and vix.get("price"):
        lines.append("VIX: %.2f (%+.2f%%) → %s" % (vix["price"], vix.get("change_pct", 0), vix.get("interpretation", "")))
    lines.append("")

    internals = _spy_internals()
    lines.append("📈 MARKET INTERNALS:")
    if internals.get("sma20") is not None:
        a20 = "ABOVE" if internals.get("last", 0) > internals["sma20"] else "BELOW"
        a50 = "ABOVE" if internals.get("last", 0) > internals["sma50"] else "BELOW"
        a200 = "ABOVE" if internals.get("last", 0) > internals["sma200"] else "BELOW"
        lines.append("SPY vs 20SMA: %s (%+.1f%%) | 50SMA: %s (%+.1f%%) | 200SMA: %s (%+.1f%%)" % (
            a20, internals.get("pct_above_20", 0), a50, internals.get("pct_above_50", 0), a200, internals.get("pct_above_200", 0)))
    if internals.get("rsi") is not None:
        lines.append("SPY RSI(14): %s — %s" % (internals["rsi"], "Neutral momentum, slight bullish lean" if 45 <= internals["rsi"] <= 65 else "Momentum reading"))
    lines.append("Trend: %s" % internals.get("trend", "NEUTRAL"))
    if internals.get("first_30min"):
        lines.append("⚠️ First 30 min of session — most volatile.")
    if internals.get("power_hour"):
        lines.append("⚠️ Power hour (3:00–4:00 ET) — trend continuation.")
    lines.append("")

    headlines = _news_headlines()
    lines.append("📰 RECENT HEADLINES:")
    if headlines:
        for h in headlines:
            if h:
                lines.append("- " + h[:120] + ("..." if len(h) > 120 else ""))
    else:
        lines.append("- (No headlines fetched)")
    lines.append("")

    events = _economic_events()
    lines.append("⚠️ ECONOMIC EVENTS TODAY:")
    if events:
        now_et = _et_now()
        for ev in events:
            time_str = ev.get("time", "")
            title = ev.get("title", "Event")
            impact = ev.get("impact", "HIGH IMPACT")
            lines.append("- %s — %s (%s)" % (time_str, title[:60], impact))
    else:
        lines.append("✓ No high-impact USD events today")
    lines.append("")

    fg = _fear_greed()
    lines.append("😰 FEAR & GREED: %s/100 — %s" % (fg["score"], fg["rating"]))
    lines.append(fg.get("interpretation", ""))
    lines.append("")

    regime = get_market_regime()
    lines.append("📊 MARKET REGIME: %s" % regime.get("regime", "UNKNOWN"))
    lines.append(regime.get("description", ""))
    if regime.get("vix") is not None:
        lines.append("VIX: %.2f | RSI: %s" % (regime["vix"], regime.get("rsi") or "—"))
    lines.append("=====================================")

    _MASTER_CONTEXT_CACHE = "\n".join(lines)
    _MASTER_CONTEXT_TS = now
    return _MASTER_CONTEXT_CACHE

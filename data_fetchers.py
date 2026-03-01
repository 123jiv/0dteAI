"""
Project Midori — External data fetching layer.
All free sources; no API keys. Used by app.py for politician trades and other features.
"""
import requests
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import pytz

# ================================================
# IN-MEMORY CACHE SYSTEM
# ================================================
_cache: Dict[str, Any] = {}


def get_cached(key: str, ttl_seconds: int) -> Optional[Any]:
    """Return cached value if not expired, else None."""
    if key in _cache:
        data, timestamp = _cache[key]
        if time.time() - timestamp < ttl_seconds:
            return data
    return None


def set_cache(key: str, data: Any) -> Any:
    """Store data in cache with current timestamp."""
    _cache[key] = (data, time.time())
    return data


# ================================================
# POLITICIAN TRADES — ROBUST FETCH (Render free tier)
# ================================================

HOUSE_URL = "https://house-stock-watcher-data.s3-us-east-2.amazonaws.com/data/all_transactions.json"
SENATE_URL = "https://senate-stock-watcher-data.s3-us-east-2.amazonaws.com/aggregate/all_transactions.json"


def clean_trade_type(raw: str) -> str:
    """Normalize transaction type to Purchase/Sale/Exchange."""
    r = str(raw or "").lower()
    if any(x in r for x in ["purchase", "buy"]):
        return "Purchase"
    if any(x in r for x in ["sale", "sell"]):
        return "Sale"
    if "exchange" in r:
        return "Exchange"
    return str(raw).strip().title() if raw else "Unknown"


def days_between(d1: str, d2: str) -> Optional[int]:
    """Days between transaction_date and disclosure_date."""
    try:
        a = datetime.strptime((d1 or "")[:10], "%Y-%m-%d")
        b = datetime.strptime((d2 or "")[:10], "%Y-%m-%d")
        return abs((b - a).days)
    except Exception:
        return None


def fetch_politician_trades_safe() -> Dict[str, Any]:
    """
    Fetch congressional trades from both chambers.
    Returns combined list sorted by most recent first.
    Cache 6 hours to avoid hammering S3 on free tier.
    """
    cached = get_cached("all_politician_trades", 21600)
    if cached:
        return cached

    all_trades: List[Dict[str, Any]] = []

    # Fetch House trades
    try:
        r = requests.get(
            HOUSE_URL,
            timeout=45,
            headers={"User-Agent": "ProjectMidori/1.0"},
        )
        r.raise_for_status()
        raw = r.json()
        for t in raw:
            ticker = str(t.get("ticker", "")).upper().strip()
            if not ticker or ticker == "--" or len(ticker) > 6:
                continue
            all_trades.append({
                "politician": t.get("representative", "Unknown"),
                "chamber": "House",
                "party": t.get("party", ""),
                "state": t.get("state", ""),
                "ticker": ticker,
                "asset": t.get("asset_description", ticker),
                "type": clean_trade_type(t.get("type", "")),
                "amount": t.get("amount", ""),
                "date_traded": (t.get("transaction_date", "") or "")[:10],
                "date_disclosed": (t.get("disclosure_date", "") or "")[:10],
                "days_late": days_between(
                    t.get("transaction_date", ""),
                    t.get("disclosure_date", ""),
                ),
            })
    except Exception as e:
        print("House fetch error: %s" % e)

    # Fetch Senate trades
    try:
        r = requests.get(
            SENATE_URL,
            timeout=45,
            headers={"User-Agent": "ProjectMidori/1.0"},
        )
        r.raise_for_status()
        raw = r.json()
        for t in raw:
            ticker = str(t.get("ticker", "")).upper().strip()
            if not ticker or ticker == "--" or len(ticker) > 6:
                continue
            all_trades.append({
                "politician": t.get("senator", "Unknown"),
                "chamber": "Senate",
                "party": t.get("party", ""),
                "state": t.get("state", ""),
                "ticker": ticker,
                "asset": t.get("asset_description", ticker),
                "type": clean_trade_type(t.get("type", "")),
                "amount": t.get("amount", ""),
                "date_traded": (t.get("transaction_date", "") or "")[:10],
                "date_disclosed": (t.get("disclosure_date", "") or "")[:10],
                "days_late": days_between(
                    t.get("transaction_date", ""),
                    t.get("disclosure_date", ""),
                ),
            })
    except Exception as e:
        print("Senate fetch error: %s" % e)

    # Sort most recent first
    all_trades.sort(key=lambda x: x.get("date_disclosed", ""), reverse=True)

    result: Dict[str, Any] = {
        "trades": all_trades,
        "total": len(all_trades),
        "cached_at": datetime.now(pytz.UTC).isoformat(),
    }

    if all_trades:
        set_cache("all_politician_trades", result)

    return result


# Legacy aliases for compatibility
def normalize_trade_type(raw: str) -> str:
    return clean_trade_type(raw)


def _parse_date(s: str) -> Optional[datetime]:
    if not s or len(s) < 8:
        return None
    s = s.strip()
    s_short = s[:10] if len(s) >= 10 else s
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y"):
        try:
            return datetime.strptime(s_short, fmt)
        except ValueError:
            continue
    return None


def calc_days_between(date_traded_str: str, date_disclosed_str: str) -> Optional[int]:
    return days_between(date_traded_str, date_disclosed_str)


def get_all_politician_trades(
    ticker: Optional[str] = None,
    politician: Optional[str] = None,
    chamber: Optional[str] = None,
    party: Optional[str] = None,
    days_back: int = 90,
    limit: int = 200,
    search: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Get combined politician trades with optional filters.
    Uses fetch_politician_trades_safe for robust S3 fetching.
    """
    from collections import Counter

    data = fetch_politician_trades_safe()
    trades = list(data.get("trades", []))

    # Filter by date
    cutoff = (datetime.now(pytz.UTC) - timedelta(days=days_back)).strftime("%Y-%m-%d")
    trades = [t for t in trades if (t.get("date_disclosed") or "") >= cutoff]

    # Apply filters
    if ticker:
        ticker_upper = ticker.upper().strip()
        trades = [t for t in trades if (t.get("ticker") or "").upper() == ticker_upper]
    if politician:
        pol_lower = politician.lower()
        trades = [t for t in trades if pol_lower in (t.get("politician") or "").lower()]
    if search:
        s = search.lower().strip()
        trades = [
            t
            for t in trades
            if s in (t.get("politician") or "").lower()
            or s in (t.get("ticker") or "").lower()
        ]
    if chamber and str(chamber).lower() != "all":
        trades = [
            t
            for t in trades
            if (t.get("chamber") or "").lower() == str(chamber).lower()
        ]
    if party and str(party).lower() != "all":
        trades = [
            t
            for t in trades
            if (t.get("party") or "").upper().strip().startswith(
                str(party).upper().strip()[:1]
            )
        ]

    # Summary stats
    purchases = sum(1 for t in trades if t.get("type") == "Purchase")
    sales = sum(1 for t in trades if t.get("type") == "Sale")
    top_tickers = Counter(t.get("ticker") for t in trades if t.get("ticker")).most_common(
        5
    )

    limited = trades[:limit]

    return {
        "trades": limited,
        "total": len(trades),
        "summary": {
            "purchases": purchases,
            "sales": sales,
            "top_tickers": [{"ticker": t, "count": c} for t, c in top_tickers],
        },
        "data_note": "STOCK Act disclosures. Up to 45-day lag.",
        "cached_at": data.get("cached_at", ""),
        "days_back": days_back,
    }

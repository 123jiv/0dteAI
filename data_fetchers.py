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
# HELPERS
# ================================================

def normalize_trade_type(raw: str) -> str:
    """Normalize transaction type to a readable label."""
    if not raw:
        return "Unknown"
    s = str(raw).strip().lower()
    if s in ("purchase", "buy", "p"):
        return "Purchase"
    if s in ("sale", "sell", "s"):
        return "Sale"
    if s in ("exchange", "exchange (full)", "exchange (partial)"):
        return "Exchange"
    return str(raw).strip().title() or "Unknown"


def _parse_date(s: str) -> Optional[datetime]:
    """Parse date string; support YYYY-MM-DD, MM/DD/YYYY, and ISO with time."""
    if not s or len(s) < 8:
        return None
    s = s.strip()
    s_short = s[:10] if len(s) >= 10 else s
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y"):
        try:
            return datetime.strptime(s_short, fmt)
        except ValueError:
            continue
    if "T" in s:
        try:
            return datetime.strptime(s[:19], "%Y-%m-%dT%H:%M:%S")
        except ValueError:
            pass
    return None


def calc_days_between(date_traded_str: str, date_disclosed_str: str) -> Optional[int]:
    """Return days between transaction_date and disclosure_date. Positive = disclosed after trade."""
    t = _parse_date(date_traded_str)
    d = _parse_date(date_disclosed_str)
    if t is None or d is None:
        return None
    return (d - t).days


# ================================================
# POLITICIAN TRADES — HOUSE OF REPRESENTATIVES
# ================================================

HOUSE_TRADES_URL = "https://house-stock-watcher-data.s3-us-east-2.amazonaws.com/data/all_transactions.json"
SENATE_TRADES_URL = "https://senate-stock-watcher-data.s3-us-east-2.amazonaws.com/aggregate/all_transactions.json"


def fetch_house_trades() -> Dict[str, Any]:
    """Fetch all House member stock trades. Cache 6 hours."""
    cached = get_cached("house_trades", 21600)
    if cached:
        return cached

    try:
        response = requests.get(HOUSE_TRADES_URL, timeout=30)
        response.raise_for_status()
        raw = response.json()

        trades: List[Dict[str, Any]] = []
        for t in raw:
            try:
                trade = {
                    "politician": t.get("representative", "Unknown"),
                    "chamber": "House",
                    "party": t.get("party", "Unknown"),
                    "state": t.get("state", ""),
                    "ticker": (t.get("ticker") or "").upper().strip(),
                    "asset_description": t.get("asset_description", ""),
                    "type": normalize_trade_type(t.get("type", "")),
                    "amount": t.get("amount", "Unknown"),
                    "date_traded": t.get("transaction_date", ""),
                    "date_disclosed": t.get("disclosure_date", ""),
                    "days_to_disclose": calc_days_between(
                        t.get("transaction_date", ""),
                        t.get("disclosure_date", ""),
                    ),
                    "district": t.get("district", ""),
                    "source": "house",
                }
                if trade["ticker"] and trade["ticker"] != "--":
                    trades.append(trade)
            except Exception:
                continue

        trades.sort(key=lambda x: x.get("date_disclosed", ""), reverse=True)

        result: Dict[str, Any] = {
            "trades": trades,
            "total": len(trades),
            "source": "House Stock Watcher",
            "last_updated": datetime.now(pytz.UTC).isoformat(),
        }
        return set_cache("house_trades", result)

    except Exception as e:
        print("House trades fetch error: %s" % e)
        return {"trades": [], "total": 0, "error": str(e)}


def fetch_senate_trades() -> Dict[str, Any]:
    """Fetch all Senate stock trades. Cache 6 hours."""
    cached = get_cached("senate_trades", 21600)
    if cached:
        return cached

    try:
        response = requests.get(SENATE_TRADES_URL, timeout=30)
        response.raise_for_status()
        raw = response.json()

        trades: List[Dict[str, Any]] = []
        for t in raw:
            try:
                trade = {
                    "politician": t.get("senator", "Unknown"),
                    "chamber": "Senate",
                    "party": t.get("party", "Unknown"),
                    "state": t.get("state", ""),
                    "ticker": (t.get("ticker") or "").upper().strip(),
                    "asset_description": t.get("asset_description", ""),
                    "type": normalize_trade_type(t.get("type", "")),
                    "amount": t.get("amount", "Unknown"),
                    "date_traded": t.get("transaction_date", ""),
                    "date_disclosed": t.get("disclosure_date", ""),
                    "days_to_disclose": calc_days_between(
                        t.get("transaction_date", ""),
                        t.get("disclosure_date", ""),
                    ),
                    "source": "senate",
                }
                if trade["ticker"] and trade["ticker"] != "--":
                    trades.append(trade)
            except Exception:
                continue

        trades.sort(key=lambda x: x.get("date_disclosed", ""), reverse=True)

        result = {
            "trades": trades,
            "total": len(trades),
            "source": "Senate Stock Watcher",
            "last_updated": datetime.now(pytz.UTC).isoformat(),
        }
        return set_cache("senate_trades", result)

    except Exception as e:
        print("Senate trades fetch error: %s" % e)
        return {"trades": [], "total": 0, "error": str(e)}


def get_all_politician_trades(
    ticker: Optional[str] = None,
    politician: Optional[str] = None,
    chamber: Optional[str] = None,
    party: Optional[str] = None,
    days_back: int = 90,
    limit: int = 200,
) -> Dict[str, Any]:
    """
    Get combined politician trades with optional filters.
    Default: last 90 days, max 200 results.
    """
    house = fetch_house_trades()
    senate = fetch_senate_trades()

    all_trades: List[Dict[str, Any]] = list(house.get("trades", [])) + list(senate.get("trades", []))

    cutoff_dt = datetime.now(pytz.UTC) - timedelta(days=days_back)
    cutoff_dt = cutoff_dt.replace(tzinfo=None)

    def disclosed_on_or_after_cutoff(t: Dict[str, Any]) -> bool:
        raw = t.get("date_disclosed") or ""
        if not raw:
            return True
        parsed = _parse_date(raw)
        if parsed is None:
            return True
        return parsed >= cutoff_dt

    all_trades = [t for t in all_trades if disclosed_on_or_after_cutoff(t)]

    if ticker:
        ticker_upper = ticker.upper().strip()
        all_trades = [t for t in all_trades if (t.get("ticker") or "").upper() == ticker_upper]

    if politician:
        pol_lower = politician.lower()
        all_trades = [t for t in all_trades if pol_lower in (t.get("politician") or "").lower()]

    if chamber and str(chamber).lower() != "all":
        all_trades = [t for t in all_trades if (t.get("chamber") or "").lower() == str(chamber).lower()]

    if party and str(party).lower() != "all":
        all_trades = [t for t in all_trades if (t.get("party") or "").upper().strip() == str(party).upper().strip()]

    all_trades = all_trades[:limit]

    return {
        "trades": all_trades,
        "total": len(all_trades),
        "days_back": days_back,
        "filters": {
            "ticker": ticker,
            "politician": politician,
            "chamber": chamber,
            "party": party,
        },
        "last_updated": datetime.now(pytz.UTC).isoformat(),
    }

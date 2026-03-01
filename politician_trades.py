import requests
import json
import time
import threading
from datetime import datetime, timedelta

# ================================================
# DATA SOURCES — US Government public domain data
# Aggregated by open source community projects
# ================================================

HOUSE_URL = (
    "https://house-stock-watcher-data"
    ".s3-us-west-2.amazonaws.com"
    "/data/all_transactions.json"
)
SENATE_URL = (
    "https://senate-stock-watcher-data"
    ".s3-us-west-2.amazonaws.com"
    "/aggregate/all_transactions.json"
)

FETCH_HEADERS = {
    "User-Agent": "ProjectMidori/1.0 "
                  "contact@projectmidori.com",
    "Accept": "application/json",
    "Accept-Encoding": "gzip, deflate"
}

# ================================================
# IN-MEMORY CACHE
# One fetch every 6 hours serves all users
# ================================================

_cache = {
    "trades": None,
    "fetched_at": None,
    "is_fetching": False,
    "fetch_error": None,
    "total_house": 0,
    "total_senate": 0
}

CACHE_TTL = 21600  # 6 hours in seconds


def cache_is_valid():
    if _cache["trades"] is None:
        return False
    if _cache["fetched_at"] is None:
        return False
    age = time.time() - _cache["fetched_at"]
    return age < CACHE_TTL


def cache_age_minutes():
    if _cache["fetched_at"] is None:
        return None
    return int(
        (time.time() - _cache["fetched_at"]) / 60
    )


# ================================================
# PARSING HELPERS
# ================================================

def clean_type(raw):
    """Normalize trade type to Purchase/Sale/Exchange"""
    r = str(raw).lower().strip()
    if any(x in r for x in ["purchase", "buy"]):
        return "Purchase"
    if any(x in r for x in ["sale", "sell"]):
        return "Sale"
    if "exchange" in r:
        return "Exchange"
    return str(raw).strip().title() if raw else "Unknown"


def clean_ticker(raw):
    """
    Validate and clean a ticker symbol.
    Returns None if invalid.
    """
    t = str(raw).upper().strip()
    if not t:
        return None
    if t in ("--", "N/A", "NA", "NONE", ""):
        return None
    if len(t) > 6:
        return None
    if " " in t:
        return None
    if not t.replace(".", "").isalpha():
        return None
    return t


def days_between(d1_str, d2_str):
    """Calculate days between two date strings."""
    try:
        fmt = "%Y-%m-%d"
        d1 = datetime.strptime(d1_str[:10], fmt)
        d2 = datetime.strptime(d2_str[:10], fmt)
        diff = (d2 - d1).days
        return abs(diff) if diff >= 0 else None
    except Exception:
        return None


def format_date(date_str):
    """Format date string for display."""
    try:
        d = datetime.strptime(date_str[:10], "%Y-%m-%d")
        return d.strftime("%b %d, %Y")
    except Exception:
        return date_str[:10] if date_str else "--"


# ================================================
# PARSING INDIVIDUAL TRADE RECORDS
# ================================================

def parse_house_record(raw):
    """
    Parse a single House trade record.
    Returns dict or None if invalid.
    """
    try:
        ticker = clean_ticker(raw.get("ticker", ""))
        if not ticker:
            return None

        politician = str(
            raw.get("representative", "Unknown")
        ).strip()
        if not politician or politician == "Unknown":
            return None

        date_traded = str(
            raw.get("transaction_date", "")
        )[:10]
        date_disclosed = str(
            raw.get("disclosure_date", "")
        )[:10]

        if not date_traded or not date_disclosed:
            return None

        return {
            "politician": politician,
            "chamber": "House",
            "party": str(
                raw.get("party", "")
            ).strip(),
            "state": str(
                raw.get("state", "")
            ).strip(),
            "district": str(
                raw.get("district", "")
            ).strip(),
            "ticker": ticker,
            "asset": str(
                raw.get("asset_description", ticker)
            )[:80].strip(),
            "type": clean_type(raw.get("type", "")),
            "amount": str(
                raw.get("amount", "")
            ).strip(),
            "date_traded": date_traded,
            "date_disclosed": date_disclosed,
            "date_traded_fmt": format_date(date_traded),
            "date_disclosed_fmt": format_date(
                date_disclosed
            ),
            "days_late": days_between(
                date_traded, date_disclosed
            ),
            "source": "house"
        }
    except Exception:
        return None


def parse_senate_record(raw):
    """
    Parse a single Senate trade record.
    Returns dict or None if invalid.
    """
    try:
        ticker = clean_ticker(raw.get("ticker", ""))
        if not ticker:
            return None

        politician = str(
            raw.get("senator", "Unknown")
        ).strip()
        if not politician or politician == "Unknown":
            return None

        date_traded = str(
            raw.get("transaction_date", "")
        )[:10]
        date_disclosed = str(
            raw.get("disclosure_date", "")
        )[:10]

        if not date_traded or not date_disclosed:
            return None

        return {
            "politician": politician,
            "chamber": "Senate",
            "party": str(
                raw.get("party", "")
            ).strip(),
            "state": str(
                raw.get("state", "")
            ).strip(),
            "district": "",
            "ticker": ticker,
            "asset": str(
                raw.get("asset_description", ticker)
            )[:80].strip(),
            "type": clean_type(raw.get("type", "")),
            "amount": str(
                raw.get("amount", "")
            ).strip(),
            "date_traded": date_traded,
            "date_disclosed": date_disclosed,
            "date_traded_fmt": format_date(date_traded),
            "date_disclosed_fmt": format_date(
                date_disclosed
            ),
            "days_late": days_between(
                date_traded, date_disclosed
            ),
            "source": "senate"
        }
    except Exception:
        return None


# ================================================
# FETCHING — Robust with retries and streaming
# ================================================

def fetch_url(url, label):
    """
    Fetch a large JSON file robustly.
    Uses streaming to handle large files on
    Render's free tier memory limits.
    Retries up to 3 times with backoff.
    """
    for attempt in range(3):
        try:
            print(
                f"[PT] Fetching {label} "
                f"attempt {attempt + 1}/3"
            )

            r = requests.get(
                url,
                headers=FETCH_HEADERS,
                timeout=60,
                stream=True
            )
            r.raise_for_status()

            # Stream read to manage memory
            chunks = []
            total_bytes = 0
            for chunk in r.iter_content(
                chunk_size=16384
            ):
                if chunk:
                    chunks.append(chunk)
                    total_bytes += len(chunk)

            raw_bytes = b"".join(chunks)
            data = json.loads(
                raw_bytes.decode("utf-8")
            )

            print(
                f"[PT] {label}: {len(data)} records "
                f"({total_bytes // 1024}KB)"
            )
            return data

        except requests.Timeout:
            print(
                f"[PT] {label} timeout "
                f"attempt {attempt + 1}"
            )
            if attempt < 2:
                time.sleep(3 ** attempt)

        except requests.HTTPError as e:
            print(f"[PT] {label} HTTP error: {e}")
            if attempt < 2:
                time.sleep(3 ** attempt)

        except json.JSONDecodeError as e:
            print(f"[PT] {label} JSON error: {e}")
            break

        except Exception as e:
            print(
                f"[PT] {label} unexpected error: {e}"
            )
            if attempt < 2:
                time.sleep(3 ** attempt)

    print(f"[PT] {label} all attempts failed")
    return []


# ================================================
# MAIN LOAD FUNCTION
# ================================================

def load_all_trades(force_refresh=False):
    """
    Load all congressional trades.
    Returns from cache if valid (6hr TTL).
    Fetches fresh if expired or forced.

    This is the ONLY function the rest of the app
    should call for trade data.
    """
    # Return valid cache immediately
    if not force_refresh and cache_is_valid():
        return _cache["trades"]

    # Prevent duplicate simultaneous fetches
    if _cache["is_fetching"]:
        print("[PT] Already fetching, waiting...")
        for _ in range(30):
            time.sleep(2)
            if not _cache["is_fetching"]:
                break
        if _cache["trades"]:
            return _cache["trades"]

    _cache["is_fetching"] = True
    _cache["fetch_error"] = None

    try:
        all_trades = []
        house_count = 0
        senate_count = 0

        # Fetch and parse House trades
        house_raw = fetch_url(HOUSE_URL, "House")
        for record in house_raw:
            parsed = parse_house_record(record)
            if parsed:
                all_trades.append(parsed)
                house_count += 1

        # Fetch and parse Senate trades
        senate_raw = fetch_url(SENATE_URL, "Senate")
        for record in senate_raw:
            parsed = parse_senate_record(record)
            if parsed:
                all_trades.append(parsed)
                senate_count += 1

        if not all_trades:
            error_msg = "No trades fetched from either source"
            print(f"[PT] WARNING: {error_msg}")
            _cache["fetch_error"] = error_msg
            _cache["is_fetching"] = False
            # Return stale cache if available
            if _cache["trades"]:
                return _cache["trades"]
            return {
                "trades": [],
                "total": 0,
                "error": error_msg
            }

        # Sort by most recent disclosure first
        all_trades.sort(
            key=lambda x: x.get("date_disclosed", ""),
            reverse=True
        )

        result = {
            "trades": all_trades,
            "total": len(all_trades),
            "house_count": house_count,
            "senate_count": senate_count,
            "fetched_at": datetime.now().isoformat(),
            "source": (
                "STOCK Act public disclosures — "
                "US Government public domain data"
            )
        }

        _cache["trades"] = result
        _cache["fetched_at"] = time.time()
        _cache["total_house"] = house_count
        _cache["total_senate"] = senate_count

        print(
            f"[PT] Cache loaded: {len(all_trades)} trades "
            f"({house_count} House, {senate_count} Senate)"
        )
        return result

    except Exception as e:
        print(f"[PT] load_all_trades error: {e}")
        _cache["fetch_error"] = str(e)
        if _cache["trades"]:
            return _cache["trades"]
        return {
            "trades": [],
            "total": 0,
            "error": str(e)
        }
    finally:
        _cache["is_fetching"] = False


# ================================================
# FILTERING
# ================================================

def filter_trades(
    trades,
    ticker=None,
    politician=None,
    chamber=None,
    party=None,
    trade_type=None,
    days_back=30,
    min_days_late=None
):
    """
    Filter a trades list by multiple criteria.
    All filtering in Python — zero extra API calls.
    """
    result = trades

    # Date cutoff
    if days_back and days_back < 9999:
        cutoff = (
            datetime.now() - timedelta(days=days_back)
        ).strftime("%Y-%m-%d")
        result = [
            t for t in result
            if t.get("date_disclosed", "") >= cutoff
        ]

    # Ticker (exact match, case insensitive)
    if ticker:
        tu = ticker.upper().strip()
        result = [
            t for t in result
            if t.get("ticker", "") == tu
        ]

    # Politician name (partial match)
    if politician:
        pl = politician.lower().strip()
        result = [
            t for t in result
            if pl in t.get("politician", "").lower()
        ]

    # Chamber
    if chamber and chamber.lower() not in ("all", ""):
        cl = chamber.lower()
        result = [
            t for t in result
            if t.get("chamber", "").lower() == cl
        ]

    # Party
    if party and party.lower() not in ("all", ""):
        pu = party[0].upper()
        result = [
            t for t in result
            if t.get("party", "").upper().startswith(pu)
        ]

    # Trade type
    if trade_type and trade_type.lower() not in (
        "all", ""
    ):
        tt = trade_type.lower()
        result = [
            t for t in result
            if t.get("type", "").lower() == tt
        ]

    # Late disclosure filter
    if min_days_late is not None:
        result = [
            t for t in result
            if (t.get("days_late") or 0) >= min_days_late
        ]

    return result


# ================================================
# SUMMARY STATS
# ================================================

def build_summary(trades):
    """Build summary statistics from a trades list."""
    from collections import Counter

    purchases = [
        t for t in trades if t["type"] == "Purchase"
    ]
    sales = [
        t for t in trades if t["type"] == "Sale"
    ]

    ticker_counts = Counter(
        t["ticker"] for t in trades
    )
    pol_counts = Counter(
        t["politician"] for t in trades
    )

    net = len(purchases) - len(sales)
    if net > 3:
        sentiment = "BULLISH"
    elif net < -3:
        sentiment = "BEARISH"
    else:
        sentiment = "NEUTRAL"

    # Find most recent trade date
    dates = [
        t.get("date_disclosed", "")
        for t in trades
        if t.get("date_disclosed")
    ]
    most_recent = max(dates) if dates else None

    return {
        "total": len(trades),
        "purchases": len(purchases),
        "sales": len(sales),
        "net_sentiment": sentiment,
        "top_tickers": [
            {"ticker": t, "count": c}
            for t, c in ticker_counts.most_common(5)
        ],
        "most_active_politicians": [
            {"name": p, "count": c}
            for p, c in pol_counts.most_common(5)
        ],
        "most_recent_disclosure": most_recent
    }


# ================================================
# TICKER ACTIVITY (for Analysis page callout)
# ================================================

def get_ticker_activity(ticker, days_back=60):
    """
    Get congressional activity summary for a ticker.
    Used by Analysis page to show callout card.
    Returns None if no activity found.
    """
    data = load_all_trades()
    all_trades = data.get("trades", [])

    filtered = filter_trades(
        all_trades,
        ticker=ticker,
        days_back=days_back
    )

    if not filtered:
        return None

    purchases = [
        t for t in filtered if t["type"] == "Purchase"
    ]
    sales = [
        t for t in filtered if t["type"] == "Sale"
    ]

    net = len(purchases) - len(sales)
    if net > 1:
        sentiment = "BULLISH"
        sentiment_color = "success"
    elif net < -1:
        sentiment = "BEARISH"
        sentiment_color = "danger"
    else:
        sentiment = "NEUTRAL"
        sentiment_color = "warning"

    # Get unique politicians
    politicians = list({
        t["politician"] for t in filtered
    })

    return {
        "ticker": ticker.upper(),
        "total_trades": len(filtered),
        "purchases": len(purchases),
        "sales": len(sales),
        "sentiment": sentiment,
        "sentiment_color": sentiment_color,
        "politicians_involved": politicians[:8],
        "recent_trades": filtered[:5],
        "days_searched": days_back
    }


# ================================================
# NOTABLE TRADES (for Dashboard widget)
# ================================================

def get_notable_trades(days_back=14, limit=5):
    """
    Get the most notable recent trades for the
    dashboard widget. Scores each trade by:
    - Large dollar amount
    - High-profile politician
    - Recent disclosure
    """
    data = load_all_trades()
    all_trades = data.get("trades", [])

    recent = filter_trades(
        all_trades, days_back=days_back
    )

    if not recent:
        recent = filter_trades(
            all_trades, days_back=60
        )

    def score_trade(t):
        score = 0
        amount = t.get("amount", "").lower()

        # Amount scoring
        if any(x in amount for x in [
            "5,000,000", "10,000,000", "over $5m"
        ]):
            score += 50
        elif any(x in amount for x in [
            "1,000,000", "2,500,000"
        ]):
            score += 35
        elif "500,000" in amount:
            score += 20
        elif "250,000" in amount:
            score += 10

        # Purchase slightly more notable than sale
        if t.get("type") == "Purchase":
            score += 10

        # High-profile politicians
        notable_names = [
            "pelosi", "tuberville", "collins",
            "warren", "paul", "kelly", "ossoff",
            "burgess", "congress"
        ]
        pol_lower = t.get("politician", "").lower()
        if any(n in pol_lower for n in notable_names):
            score += 20

        # Recency bonus
        try:
            disc_date = datetime.strptime(
                t.get("date_disclosed", "")[:10],
                "%Y-%m-%d"
            )
            days_ago = (datetime.now() - disc_date).days
            if days_ago <= 3:
                score += 25
            elif days_ago <= 7:
                score += 15
            elif days_ago <= 14:
                score += 5
        except Exception:
            pass

        return score

    scored = sorted(
        recent,
        key=score_trade,
        reverse=True
    )

    return scored[:limit]


# ================================================
# POLITICIAN PROFILE
# ================================================

def get_politician_profile(name, days_back=365):
    """
    Get full trading profile for a politician.
    """
    from collections import Counter

    data = load_all_trades()
    all_trades = data.get("trades", [])

    trades = filter_trades(
        all_trades,
        politician=name,
        days_back=days_back
    )

    if not trades:
        return None

    first = trades[0]
    ticker_counts = Counter(
        t["ticker"] for t in trades
    )

    purchases = [
        t for t in trades if t["type"] == "Purchase"
    ]
    sales = [
        t for t in trades if t["type"] == "Sale"
    ]

    return {
        "name": first.get("politician", name),
        "chamber": first.get("chamber", ""),
        "party": first.get("party", ""),
        "state": first.get("state", ""),
        "total_trades": len(trades),
        "purchases": len(purchases),
        "sales": len(sales),
        "top_tickers": [
            {"ticker": t, "count": c}
            for t, c in ticker_counts.most_common(8)
        ],
        "recent_trades": trades[:25]
    }


# ================================================
# CACHE WARMING — Call on app startup
# ================================================

def warm_cache():
    """
    Pre-fetch trades in background on app startup.
    Ensures first user never waits for large fetch.
    """
    def _warm():
        print("[PT] Warming politician trades cache...")
        try:
            result = load_all_trades()
            total = result.get("total", 0)
            print(f"[PT] Cache warm complete: {total} trades")
        except Exception as e:
            print(f"[PT] Cache warm error: {e}")

    t = threading.Thread(target=_warm, daemon=True)
    t.start()
    return t


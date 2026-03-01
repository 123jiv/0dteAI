"""
Project Midori — Market data layer (commercially licensed sources).
Primary: Alpaca, Polygon. Fallback: yfinance (last resort only).
"""
import os
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import requests

ALPACA_KEY = os.environ.get("ALPACA_KEY", "")
ALPACA_SECRET = os.environ.get("ALPACA_SECRET", "")
POLYGON_KEY = os.environ.get("POLYGON_KEY", "")
FINNHUB_KEY = os.environ.get("FINNHUB_KEY", "")
FRED_KEY = os.environ.get("FRED_KEY", "")

ALPACA_BASE = "https://data.alpaca.markets/v2"
POLYGON_BASE = "https://api.polygon.io"

_price_cache: Dict[str, tuple] = {}


def get_cached_price(key: str, ttl: int = 60) -> Optional[Any]:
    if key in _price_cache:
        data, ts = _price_cache[key]
        if time.time() - ts < ttl:
            return data
    return None


def set_price_cache(key: str, data: Any) -> Any:
    _price_cache[key] = (data, time.time())
    return data


def get_quote_alpaca(ticker: str) -> Optional[Dict[str, Any]]:
    """Get latest quote from Alpaca (free, commercial OK)."""
    cached = get_cached_price(f"alpaca_{ticker}", 60)
    if cached:
        return cached

    try:
        headers = {
            "APCA-API-KEY-ID": ALPACA_KEY,
            "APCA-API-SECRET-KEY": ALPACA_SECRET,
        }
        r = requests.get(
            f"{ALPACA_BASE}/stocks/{ticker}/trades/latest",
            headers=headers,
            timeout=10,
        )
        trade_data = r.json()
        if "trade" not in trade_data:
            return None
        price = float(trade_data["trade"]["p"])

        r2 = requests.get(
            f"{ALPACA_BASE}/stocks/{ticker}/bars/latest",
            headers=headers,
            params={"timeframe": "1Day"},
            timeout=10,
        )
        bar_data = r2.json()
        prev_close = float(bar_data.get("bar", {}).get("c", price))
        change_pct = round(((price - prev_close) / prev_close) * 100, 2)

        result = {
            "ticker": ticker,
            "price": round(price, 2),
            "change_pct": change_pct,
            "prev_close": round(prev_close, 2),
            "high": round(price, 2),
            "low": round(price, 2),
            "volume": 0,
            "source": "alpaca",
        }
        return set_price_cache(f"alpaca_{ticker}", result)

    except Exception as e:
        print(f"Alpaca error for {ticker}: {e}")
        return None


def get_quote_polygon(ticker: str) -> Optional[Dict[str, Any]]:
    """Fallback: Polygon.io free tier."""
    cached = get_cached_price(f"polygon_{ticker}", 60)
    if cached:
        return cached

    try:
        r = requests.get(
            f"{POLYGON_BASE}/v2/aggs/ticker/{ticker}/prev",
            params={"apiKey": POLYGON_KEY},
            timeout=10,
        )
        data = r.json()

        if data.get("resultsCount", 0) == 0:
            return None

        result_data = data["results"][0]
        close = float(result_data["c"])
        open_price = float(result_data["o"])
        change_pct = round(((close - open_price) / open_price) * 100, 2)

        result = {
            "ticker": ticker,
            "price": round(close, 2),
            "change_pct": change_pct,
            "high": round(float(result_data["h"]), 2),
            "low": round(float(result_data["l"]), 2),
            "volume": int(result_data.get("v", 0)),
            "source": "polygon",
        }
        return set_price_cache(f"polygon_{ticker}", result)

    except Exception as e:
        print(f"Polygon error for {ticker}: {e}")
        return None


def get_quote_yfinance_fallback(ticker: str) -> Dict[str, Any]:
    """
    Last resort fallback — yfinance.
    Only used if both Alpaca and Polygon fail.
    Replace when you have paying customers.
    """
    try:
        import yfinance as yf

        t = yf.Ticker(ticker)
        hist = t.history(period="5d")
        if hist is None or hist.empty:
            return {"ticker": ticker, "price": None, "change_pct": None, "source": "unavailable"}
        row = hist.iloc[-1]
        prev = hist.iloc[-2] if len(hist) > 1 else row
        price = round(float(row["Close"]), 2)
        prev_close = float(prev["Close"]) if prev["Close"] else price
        change_pct = round(((price - prev_close) / prev_close) * 100, 2)
        return {
            "ticker": ticker,
            "price": price,
            "change_pct": change_pct,
            "high": round(float(row.get("High", price)), 2),
            "low": round(float(row.get("Low", price)), 2),
            "volume": int(row.get("Volume", 0) or 0),
            "source": "delayed",
        }
    except Exception:
        return {"ticker": ticker, "price": None, "change_pct": None, "source": "unavailable"}


def get_quote(ticker: str) -> Dict[str, Any]:
    """
    Get quote with fallback chain:
    1. Alpaca (free, commercial OK)
    2. Polygon (free tier, commercial OK)
    3. yfinance (fallback only)
    """
    if ALPACA_KEY and ALPACA_SECRET:
        result = get_quote_alpaca(ticker)
        if result:
            return result

    if POLYGON_KEY:
        result = get_quote_polygon(ticker)
        if result:
            return result

    return get_quote_yfinance_fallback(ticker)


def get_vix() -> Dict[str, Any]:
    """Get VIX from Polygon (free) or yfinance fallback."""
    try:
        if POLYGON_KEY:
            r = requests.get(
                f"{POLYGON_BASE}/v2/aggs/ticker/I:VIX/prev",
                params={"apiKey": POLYGON_KEY},
                timeout=10,
            )
            data = r.json()
            if data.get("resultsCount", 0) > 0:
                close = float(data["results"][0]["c"])
                open_p = float(data["results"][0]["o"])
                chg = round(((close - open_p) / open_p) * 100, 2)
                return {"price": round(close, 2), "change_pct": chg, "source": "polygon"}
    except Exception as e:
        print(f"VIX polygon error: {e}")

    try:
        import yfinance as yf

        vix = yf.Ticker("^VIX")
        hist = vix.history(period="5d")
        if hist is not None and not hist.empty:
            row = hist.iloc[-1]
            prev = hist.iloc[-2] if len(hist) > 1 else row
            price = round(float(row["Close"]), 2)
            prev_close = float(prev["Close"]) if prev["Close"] else price
            chg = round(((price - prev_close) / prev_close) * 100, 2)
            return {"price": price, "change_pct": chg, "source": "delayed"}
    except Exception:
        pass
    return {"price": None, "change_pct": None, "source": "unavailable"}


def get_market_data_all() -> Dict[str, Any]:
    """Get all market data for dashboard."""
    tickers = ["SPY", "QQQ", "IWM", "DIA"]
    result: Dict[str, Any] = {"tickers": {}, "vix": {}, "timestamp": None}
    for sym in tickers:
        q = get_quote(sym)
        result["tickers"][sym] = {
            "price": q.get("price") or 0,
            "change_pct": q.get("change_pct") or 0,
            "high": q.get("high") or 0,
            "low": q.get("low") or 0,
            "volume": q.get("volume") or 0,
        }
    vix_data = get_vix()
    result["vix"] = {
        "price": vix_data.get("price") or 0,
        "change_pct": vix_data.get("change_pct") or 0,
    }
    result["timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime())
    return result


def get_fear_greed() -> Dict[str, Any]:
    """
    Fear & Greed from Alternative.me
    Free, commercial use explicitly allowed. No API key required.
    """
    cached = get_cached_price("fear_greed", 3600)
    if cached:
        return cached

    try:
        r = requests.get(
            "https://api.alternative.me/fng/?limit=1",
            timeout=10,
            headers={"User-Agent": "ProjectMidori/1.0"},
        )
        data = r.json()
        entry = data["data"][0]
        score = int(entry["value"])
        label = entry["value_classification"]

        if score <= 25:
            interp = "Extreme fear — contrarian buy signals elevated"
            color = "danger"
        elif score <= 45:
            interp = "Fear — cautious positioning recommended"
            color = "warning"
        elif score <= 55:
            interp = "Neutral — follow the technicals"
            color = "neutral"
        elif score <= 75:
            interp = "Greed — momentum favors bulls, watch for reversals"
            color = "success"
        else:
            interp = "Extreme greed — elevated reversal risk"
            color = "danger"

        result = {
            "score": score,
            "rating": label,
            "interpretation": interp,
            "color": color,
            "source": "alternative.me",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()),
        }
        return set_price_cache("fear_greed", result)

    except Exception as e:
        print(f"Fear & Greed error: {e}")
        return {
            "score": 50,
            "rating": "Unavailable",
            "interpretation": "",
            "color": "neutral",
            "source": "error",
        }


def get_market_news() -> Dict[str, Any]:
    """
    Get market news from Finnhub.
    Free tier, commercial use allowed.
    """
    cached = get_cached_price("market_news", 900)
    if cached:
        return cached

    if not FINNHUB_KEY:
        return {"headlines": [], "source": "no_key"}

    try:
        r = requests.get(
            "https://finnhub.io/api/v1/news",
            params={"category": "general", "token": FINNHUB_KEY},
            timeout=10,
        )
        data = r.json()

        headlines = []
        for item in (data if isinstance(data, list) else [])[:10]:
            headlines.append({
                "title": item.get("headline", item.get("title", "")),
                "link": item.get("url", ""),
                "pubDate": str(item.get("datetime", "")),
            })
        result = {"headlines": headlines, "source": "finnhub"}
        return set_price_cache("market_news", result)

    except Exception as e:
        print(f"Finnhub news error: {e}")
        return {"headlines": [], "source": "error"}


def get_ticker_news(ticker: str) -> List[Dict[str, Any]]:
    """Get news for a specific ticker from Finnhub."""
    cache_key = f"news_{ticker}"
    cached = get_cached_price(cache_key, 900)
    if cached:
        return cached

    if not FINNHUB_KEY:
        return []

    try:
        end = datetime.now()
        start = end - timedelta(days=7)
        r = requests.get(
            "https://finnhub.io/api/v1/company-news",
            params={
                "symbol": ticker,
                "from": start.strftime("%Y-%m-%d"),
                "to": end.strftime("%Y-%m-%d"),
                "token": FINNHUB_KEY,
            },
            timeout=10,
        )
        data = r.json()
        news = [
            {
                "headline": item.get("headline", ""),
                "url": item.get("url", ""),
                "datetime": item.get("datetime", 0),
            }
            for item in (data if isinstance(data, list) else [])[:5]
        ]
        set_price_cache(cache_key, news)
        return news
    except Exception as e:
        print(f"Finnhub ticker news error for {ticker}: {e}")
        return []


def get_economic_events() -> Dict[str, Any]:
    """
    Economic calendar from Finnhub.
    Free tier, commercial use allowed.
    """
    cached = get_cached_price("econ_events", 3600)
    if cached:
        return cached

    if not FINNHUB_KEY:
        return {"events": [], "source": "no_key"}

    try:
        today = datetime.now().strftime("%Y-%m-%d")
        week_end = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        r = requests.get(
            "https://finnhub.io/api/v1/calendar/economic",
            params={"from": today, "to": week_end, "token": FINNHUB_KEY},
            timeout=10,
        )
        data = r.json()

        events = []
        for e in data.get("economicCalendar", []):
            impact = str(e.get("impact", "")).lower()
            if impact not in ("high", "3", "red"):
                continue
            events.append({
                "title": e.get("event", "Event"),
                "time": str(e.get("time", ""))[:16] if e.get("time") else "",
                "date": str(e.get("time", ""))[:10] if e.get("time") else today,
            })
        result = {"events": events[:20], "date": today, "source": "finnhub"}
        return set_price_cache("econ_events", result)

    except Exception as e:
        print(f"Economic calendar error: {e}")
        return {"events": [], "date": datetime.now().strftime("%Y-%m-%d"), "source": "error"}


def get_fred_data() -> Dict[str, Any]:
    """
    Key macro indicators from FRED.
    US Federal Reserve data — fully public domain.
    """
    cached = get_cached_price("fred_data", 86400)
    if cached:
        return cached

    if not FRED_KEY:
        return {}

    series_list = {
        "FEDFUNDS": "Fed Funds Rate",
        "CPIAUCSL": "CPI Inflation",
        "UNRATE": "Unemployment Rate",
        "T10Y2Y": "10Y-2Y Yield Curve",
        "VIXCLS": "VIX (Daily Close)",
    }
    result = {}
    for series_id, label in series_list.items():
        try:
            r = requests.get(
                "https://api.stlouisfed.org/fred/series/observations",
                params={
                    "series_id": series_id,
                    "api_key": FRED_KEY,
                    "file_type": "json",
                    "sort_order": "desc",
                    "limit": 1,
                },
                timeout=10,
            )
            data = r.json()
            obs_list = data.get("observations", [])
            if obs_list:
                obs = obs_list[0]
                result[series_id] = {
                    "label": label,
                    "value": obs.get("value", ""),
                    "date": obs.get("date", ""),
                }
        except Exception as e:
            print(f"FRED error for {series_id}: {e}")
    set_price_cache("fred_data", result)
    return result

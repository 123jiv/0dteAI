import os
import base64
import hashlib
import hmac
import json
import time
from typing import Optional, List, Dict, Any, Literal

from fastapi import FastAPI, HTTPException, Header
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
)
from openai import OpenAI

app = FastAPI()

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


@app.get("/health")
def health():
    return {"status": "ok"}


# ---------- Auth (password -> signed token) ----------

def _get_auth_secret() -> str:
    secret = os.getenv("APP_SECRET", "").strip()
    if not secret:
        raise RuntimeError("APP_SECRET is not set")
    return secret


def _get_app_password() -> str:
    pw = os.getenv("APP_PASSWORD", "").strip()
    if not pw:
        raise RuntimeError("APP_PASSWORD is not set")
    return pw


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def _b64url_decode(s: str) -> bytes:
    pad = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode((s + pad).encode("utf-8"))


def _sign(data: bytes, secret: str) -> str:
    sig = hmac.new(secret.encode("utf-8"), data, hashlib.sha256).digest()
    return _b64url_encode(sig)


def _issue_token(username: str) -> str:
    secret = _get_auth_secret()
    payload = {"sub": username, "exp": int(time.time()) + 60 * 60 * 24 * 7}  # 7 days
    payload_b = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    payload_s = _b64url_encode(payload_b)
    sig_s = _sign(payload_s.encode("utf-8"), secret)
    return f"{payload_s}.{sig_s}"


def _verify_token(token: str) -> Dict[str, Any]:
    secret = _get_auth_secret()
    parts = token.split(".")
    if len(parts) != 2:
        raise HTTPException(status_code=401, detail="Invalid token format")
    payload_s, sig_s = parts
    expected = _sign(payload_s.encode("utf-8"), secret)
    if not hmac.compare_digest(expected, sig_s):
        raise HTTPException(status_code=401, detail="Invalid token signature")
    try:
        payload = json.loads(_b64url_decode(payload_s).decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    exp = int(payload.get("exp") or 0)
    if exp <= int(time.time()):
        raise HTTPException(status_code=401, detail="Token expired")
    return payload


def _require_auth(authorization: Optional[str]):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization header")
    token = authorization.split(" ", 1)[1].strip()
    _verify_token(token)


class LoginRequest(BaseModel):
    username: str = "user"
    password: str


@app.post("/auth/login")
def auth_login(req: LoginRequest):
    try:
        expected = _get_app_password()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if req.password != expected:
        raise HTTPException(status_code=401, detail="Invalid password")

    token = _issue_token(req.username or "user")
    return {"token": token}


@app.get("/auth/me")
def auth_me(authorization: Optional[str] = Header(default=None)):
    _require_auth(authorization)
    return {"ok": True}


@app.get("/analyze")
def analyze(
    tickers: str = "SPY,QQQ,IWM",
    focus: str = "both",      # both | calls | puts
    style: str = "balanced",  # balanced | conservative | aggressive
    timeframe: str = "intraday",
    authorization: Optional[str] = Header(default=None),
):
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not set")
    _require_auth(authorization)

    symbols = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not symbols:
        raise HTTPException(status_code=400, detail="No valid tickers provided")

    try:
        result = analyze_symbols(symbols, focus=focus, style=style, timeframe=timeframe)
        confidence = compute_confidence_for_symbols(symbols)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"tickers": symbols, "analysis_markdown": result, "confidence": confidence}


@app.get("/screener")
def screener(
    tickers: str = "SPY,QQQ,IWM",
    min_volume: int = 1000,
    max_spread_pct: float = 25.0,
    timeframe: str = "intraday",  # intraday | 1-5d | multi-week | long-term
    authorization: Optional[str] = Header(default=None),
):
    _require_auth(authorization)
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


@app.get("/signals")
def signals(
    tickers: str = "SPY,QQQ,IWM",
    limit: int = 3,
    authorization: Optional[str] = Header(default=None),
):
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not set")
    _require_auth(authorization)

    symbols = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not symbols:
        raise HTTPException(status_code=400, detail="No valid tickers provided")

    try:
        from datetime import datetime, timezone
        signal_list = get_top_signals(symbols, limit=min(int(limit), 5))
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
    history: List[ChatMessage] = []
    question: str


@app.post("/chat")
def chat(req: ChatRequest, authorization: Optional[str] = Header(default=None)):
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not set")
    _require_auth(authorization)

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

    base_prompt = build_prompt(snapshots, focus=req.focus, style=req.style, timeframe=req.timeframe)

    client = OpenAI()

    messages: List[Dict[str, str]] = [
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
        {
            "role": "user",
            "content": base_prompt,
        },
    ]

    # Append prior chat history
    for msg in req.history:
        role = "assistant" if msg.role == "assistant" else "user"
        messages.append({"role": role, "content": msg.content})

    # Latest question
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
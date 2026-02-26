import os
import base64
import hashlib
import hmac
import json
import time
from typing import Optional, List, Dict, Any, Literal
from urllib.parse import urlencode

import requests
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse
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


# ---------- Resend email helper ----------


def _send_resend_email(
    to: List[str],
    subject: str,
    html: str,
    text: Optional[str] = None,
) -> None:
    api_key = os.getenv("RESEND_API_KEY", "").strip()
    from_email = os.getenv("RESEND_FROM_EMAIL", "").strip()
    if not api_key or not from_email:
        raise RuntimeError("RESEND_API_KEY or RESEND_FROM_EMAIL not set")

    payload: Dict[str, Any] = {
        "from": from_email,
        "to": to,
        "subject": subject,
        "html": html,
    }
    if text:
        payload["text"] = text

    resp = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=10,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"Resend error {resp.status_code}: {resp.text}")


def _get_google_oauth_config() -> Dict[str, str]:
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "").strip()
    if not client_id or not client_secret or not redirect_uri:
        raise RuntimeError("Google OAuth env vars GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REDIRECT_URI not set")
    return {
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
    }


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


# ---------- Minimal auth (password -> signed token) ----------

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


class SignupRequest(BaseModel):
    email: str
    name: Optional[str] = None


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


@app.get("/auth/google/start")
def auth_google_start():
    """
    Redirects the user to Google's OAuth 2.0 consent screen.
    """
    try:
        cfg = _get_google_oauth_config()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    params = {
        "client_id": cfg["client_id"],
        "redirect_uri": cfg["redirect_uri"],
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
    }
    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
    return RedirectResponse(url)


@app.get("/auth/google/callback")
def auth_google_callback(code: Optional[str] = None, error: Optional[str] = None):
    """
    Handles Google's OAuth 2.0 callback:
    - exchanges the code for tokens
    - fetches the user's email
    - issues a normal 0dteAI auth token
    - returns a tiny HTML page that stores the token in localStorage and routes to the app.
    """
    if error:
        raise HTTPException(status_code=400, detail=f"Google auth error: {error}")
    if not code:
        raise HTTPException(status_code=400, detail="Missing code")

    try:
        cfg = _get_google_oauth_config()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    token_resp = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": cfg["client_id"],
            "client_secret": cfg["client_secret"],
            "redirect_uri": cfg["redirect_uri"],
            "grant_type": "authorization_code",
        },
        timeout=10,
    )
    if token_resp.status_code >= 400:
        raise HTTPException(status_code=500, detail=f"Google token error {token_resp.status_code}: {token_resp.text}")

    token_data = token_resp.json()
    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=500, detail="Missing access_token from Google")

    userinfo_resp = requests.get(
        "https://openidconnect.googleapis.com/v1/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    if userinfo_resp.status_code >= 400:
        raise HTTPException(
            status_code=500,
            detail=f"Google userinfo error {userinfo_resp.status_code}: {userinfo_resp.text}",
        )

    profile = userinfo_resp.json()
    email = (profile.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=500, detail="Google userinfo did not include an email")

    token = _issue_token(email)

    html = f"""
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>0dteAI login</title>
  </head>
  <body>
    <script>
      try {{
        window.localStorage.setItem('odteai_token', '{token}');
        window.location.href = '/#/app';
      }} catch (e) {{
        document.body.innerText = 'Login succeeded, but we could not store your session token. Please try again.';
      }}
    </script>
  </body>
</html>
    """.strip()
    return HTMLResponse(content=html)


@app.post("/signup")
def signup(req: SignupRequest):
    """
    Lightweight email capture that triggers Resend emails.
    Sends a short welcome email to the user and a notification to the owner.
    """
    email = (req.email or "").strip()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Valid email is required")

    admin_email = os.getenv("RESEND_ADMIN_EMAIL", "").strip() or None

    try:
        # User-facing email
        user_subject = "Welcome to 0dteAI"
        user_html = (
            "<p>Thanks for signing up for 0dteAI.</p>"
            "<p>This tool is educational only and not trading advice. "
            "You can access it any time using your app password.</p>"
        )
        _send_resend_email(
            [email],
            user_subject,
            user_html,
            text="Thanks for signing up for 0dteAI. Educational only — not trading advice.",
        )

        # Internal notification
        if admin_email:
            owner_subject = "New 0dteAI signup"
            name_part = f"Name: {req.name}\n" if req.name else ""
            owner_text = f"New signup email: {email}\n{name_part}"
            owner_html = f"<p>New signup email: {email}</p>"
            if req.name:
                owner_html += f"<p>Name: {req.name}</p>"
            _send_resend_email([admin_email], owner_subject, owner_html, text=owner_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"ok": True}


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
    authorization: Optional[str] = Header(default=None),
):
    _require_auth(authorization)
    symbols = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    if not symbols:
        raise HTTPException(status_code=400, detail="No valid tickers provided")

    all_rows: List[Dict[str, Any]] = []
    for sym in symbols:
        try:
            rows = build_screener_rows(sym, min_volume=min_volume, max_spread_pct=max_spread_pct)
            all_rows.extend(rows)
        except Exception as e:
            print("Screener skipping %s: %s" % (sym, e))

    if not all_rows:
        return {"rows": [], "tickers": symbols}

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
# backend/app/routers/ai.py
import os
import re
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Header, Request
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()  # local dev

router = APIRouter(prefix="/ai", tags=["ai"])

# ===== models
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str
    conversationId: str

# ===== helpers (public + compat exports)
def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()

def _get_client() -> OpenAI:
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        # 401 so the UI can show a clear message
        raise HTTPException(status_code=401, detail="Missing OPENAI_API_KEY")
    return OpenAI(api_key=key)

def _get_model() -> str:
    return os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# Back-compat names used by other routers (e.g., idioms.py)
def _openai_client() -> OpenAI:
    return _get_client()

def _model() -> str:
    return _get_model()

# ===== system prompt (dual-mode)
# Mode A (default): produce a beautiful Markdown “AI Explanation” card.
# Mode B (explicit): when the user asks for JSON or says “Reply with JSON only”,
# return STRICT JSON (no code fences, no commentary) with the exact keys requested.
SYSTEM_PROMPT = """
You are Aasaasi, a friendly bilingual lexicographer for Somali learners of English.

GENERAL STYLE:
- Be concise, accurate, and helpful to learners.
- Prefer simple, learner-friendly language.
- When providing Somali, use clear standard Somali.

DUAL RESPONSE MODES:

(1) MARKDOWN CARD (DEFAULT)
If the user is asking about a single word or concept without explicitly requesting JSON,
produce a clean Markdown “AI Explanation” card with the following sections and titles:

# {Headword Capitalized}
## Simple Explanation
<1–2 sentences; very simple definition.>

## Somali Translation
<single best Somali translation for the sense being explained.>

## Example Sentences
1. <short sentence>
2. <short sentence>
3. <short sentence>

## Common Collocations
- <collocation 1>
- <collocation 2>
- <collocation 3>
- <collocation 4 or 5>

## Quick Pronunciation Hint
/<IPA if known>/ – Sounds like "<friendly hint>"

Rules:
- Use exactly those section headings (EN).
- Do NOT wrap the whole thing in code fences.
- Keep lists short and useful.
- If uncertain about IPA, give a reasonable approximation and a friendly "sounds like" hint.

(2) STRICT JSON (ONLY WHEN EXPLICITLY REQUESTED)
If the user explicitly asks for JSON (e.g., “Reply with JSON only”, “return JSON”, or provides key names),
return STRICT JSON with only the keys they requested.
No prefixes, no suffixes, no code fences, no Markdown.
Keys should be populated succinctly. Keep examples as an array of 1–3 strings.
"""

# ===== routes
@router.post("/chat", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    request: Request,
    x_session_id: Optional[str] = Header(default="anon-session", convert_underscores=False),
):
    db = request.app.state.db
    if db is None:
        raise HTTPException(status_code=503, detail="DB not ready")

    now = _iso_now()
    # ensure conversation doc exists
    db.conversations.update_one(
        {"sessionId": x_session_id},
        {"$setOnInsert": {"sessionId": x_session_id, "createdAt": now, "messages": []}},
        upsert=True,
    )
    # log user message
    db.conversations.update_one(
        {"sessionId": x_session_id},
        {"$push": {"messages": {"role": "user", "content": payload.message, "ts": now}}},
    )

    try:
        client = _get_client()
        resp = client.chat.completions.create(
            model=_get_model(),
            temperature=0.2,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT.strip()},
                {"role": "user", "content": payload.message},
            ],
        )
        reply = (resp.choices[0].message.content or "").strip()

        # Safety: if the user asked for JSON but the model returned fenced blocks,
        # unwrap ```json ... ``` or ``` ... ``` so the frontend gets plain JSON.
        wants_json = bool(re.search(r"\b(json only|reply with json|return json)\b", payload.message, flags=re.I))
        if wants_json:
            # try to extract first {...} block if fences slipped in
            m = re.search(r"\{.*\}", reply, flags=re.S)
            if m:
                reply = m.group(0).strip()

    except Exception as e:
        msg = str(e)
        if "Incorrect API key" in msg or "invalid_api_key" in msg or "status code: 401" in msg:
            raise HTTPException(status_code=401, detail="Invalid OpenAI API key")
        if "insufficient_quota" in msg or "status code: 429" in msg:
            raise HTTPException(status_code=429, detail="OpenAI quota exceeded")
        if "timed out" in msg or "Timeout" in msg or "Read timed out" in msg:
            raise HTTPException(status_code=504, detail="AI provider timeout")
        raise HTTPException(status_code=502, detail=f"AI provider error: {msg}")

    # log assistant reply
    db.conversations.update_one(
        {"sessionId": x_session_id},
        {"$push": {"messages": {"role": "assistant", "content": reply, "ts": _iso_now()}}},
    )
    return {"reply": reply, "conversationId": x_session_id}

@router.get("/history")
def history(
    request: Request,
    x_session_id: Optional[str] = Header(default="anon-session", convert_underscores=False),
):
    db = request.app.state.db
    if db is None:
        raise HTTPException(status_code=503, detail="DB not ready")
    doc = db.conversations.find_one({"sessionId": x_session_id}, {"_id": 0})
    return doc or {"sessionId": x_session_id, "messages": [], "conversationId": x_session_id}

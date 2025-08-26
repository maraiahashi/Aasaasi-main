from fastapi import APIRouter, HTTPException, Request, Query, Header
from datetime import date, datetime
from typing import Any, Dict, List, Optional
import re  # NEW: for safely unwrapping accidental code fences

# Reuse your OpenAI helpers & system prompt from ai.py (no duplication)
from .ai import _openai_client, _model, SYSTEM_PROMPT  # type: ignore

router = APIRouter()

def _db(request: Request):
    db = request.app.state.db
    if db is None:
        raise HTTPException(503, "DB not ready")
    return db

def _normalize(doc: Dict[str, Any]) -> Dict[str, Any]:
    # Your collection fields vary; make the API stable:
    return {
        "id": str(doc.get("_id")),
        "idiom": (doc.get("idiom") or doc.get("title") or "").strip(),
        "meaning": (doc.get("meaning") or "").strip(),
        "somaliTranslation": (doc.get("somali") or doc.get("somaliTranslation") or "").strip(),
        "example": (doc.get("example") or doc.get("sentence") or "").strip(),
        "origin": (doc.get("origin") or doc.get("etymology") or "").strip(),
        "pronunciation": (doc.get("pronunciation") or "").strip(),
    }

def _week_index(today: Optional[date] = None) -> tuple[int, int]:
    d = today or date.today()
    iso = d.isocalendar()  # (year, week, weekday)
    return (iso[0], iso[1])  # (year, week)

@router.get("/idioms/current")
def idiom_of_the_week(request: Request, x_session_id: str = Header(default="anon-session")):
    db = _db(request)
    col = db["idiom_entries"]

    total = col.estimated_document_count()
    if total == 0:
        raise HTTPException(404, "No idioms in database")

    year, week = _week_index()
    # deterministic rotation across your whole set
    idx = (year * 53 + week) % total

    doc = col.find({}, {"_id": 1, "idiom": 1, "meaning": 1, "example": 1, "somali": 1, "somaliTranslation": 1,
                        "origin": 1, "etymology": 1, "pronunciation": 1}) \
             .sort([("_id", 1)]).skip(idx).limit(1).next()
    out = _normalize(doc)
    out["weekLabel"] = f"Week {week}, {year}"

    # optional analytics
    try:
        db["events"].insert_one({
            "sessionId": x_session_id or "anon",
            "type": "idiom_of_week_viewed",
            "at": datetime.utcnow().isoformat(),
            "meta": {"idiom": out["idiom"], "week": week, "year": year}
        })
    except Exception:
        pass

    return out
# OLD (breaks, because ai.py isn't in app.routes)
# from .ai import _openai_client, _model, SYSTEM_PROMPT  # type: ignore

# NEW (works no matter what)
# in backend/app/routers/idioms.py OR backend/app/routes/idioms.py
try:
    from app.routers.ai import _openai_client, _model, SYSTEM_PROMPT
except Exception:
    from ..routers.ai import _openai_client, _model, SYSTEM_PROMPT

@router.get("/idioms/archive")
def idiom_archive(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    db = _db(request)
    col = db["idiom_entries"]

    cur = col.find({}, {"_id": 1, "idiom": 1, "meaning": 1, "example": 1, "somali": 1, "somaliTranslation": 1,
                        "origin": 1, "etymology": 1, "pronunciation": 1}) \
             .sort([("_id", -1)]).skip(skip).limit(limit)

    items = [_normalize(d) for d in cur]
    return {"items": items, "skip": skip, "limit": limit}

@router.get("/idioms/explain")
def explain_idiom(request: Request, idiom: str = Query(..., min_length=2)):
    """
    Uses your existing OpenAI setup to produce a friendly explanation.
    Returns a clean Markdown card (no code fences) with fixed headings,
    so the UI renders like the “AI Explanation” style you liked.
    """
    try:
        client = _openai_client()

        # Ask for the exact card sections you want, letting SYSTEM_PROMPT handle voice/tone.
        msg_user = f"""
Create a clean Markdown “AI Explanation” card for the idiom "{idiom}".

Use EXACTLY these headings and order (in English):
# {idiom.title()}
## Simple Explanation
<one short paragraph; very learner-friendly>

## Somali Translation
<best Somali equivalent>

## Example Sentences
1. <short example>
2. <short example>
3. <short example>

## Usage & Origin
<one short note about usage, nuance, or origin if relevant>

## Quick Pronunciation Hint
/<IPA if known>/ – Sounds like "<friendly hint>"

Rules:
- Do NOT wrap the response in code fences.
- Keep sentences short and clear.
- If IPA is uncertain, give an approximate hint anyway.
""".strip()

        resp = client.chat.completions.create(
            model=_model(),
            temperature=0.3,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": msg_user},
            ],
        )
        text = (resp.choices[0].message.content or "").strip()

        # If the model accidentally used code fences, unwrap them.
        m = re.search(r"```(?:markdown|md)?\s*(.*?)```", text, flags=re.S | re.I)
        if m:
            text = m.group(1).strip()

        return {"idiom": idiom, "explanation": text}
    except Exception as e:
        msg = str(e)
        if "invalid_api_key" in msg or "Incorrect API key" in msg or "status code: 401" in msg:
            raise HTTPException(status_code=401, detail="Invalid OpenAI API key")
        if "insufficient_quota" in msg or "status code: 429" in msg:
            raise HTTPException(status_code=429, detail="OpenAI quota exceeded")
        raise HTTPException(status_code=500, detail=f"AI provider error: {msg}")

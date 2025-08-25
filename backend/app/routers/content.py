# backend/app/routers/content.py
from fastapi import APIRouter, HTTPException, Request, Query
from datetime import date, datetime, timezone
from typing import Dict, Any, Optional      # <-- add Optional
import random

router = APIRouter(tags=["content"])

def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()

def _today() -> str:
    return date.today().isoformat()

def _norm_word(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize a word doc from wod_words"""
    if not doc:
        return {}
    examples = doc.get("examples")
    if not examples:
        ex = doc.get("example")
        examples = [ex] if isinstance(ex, str) and ex.strip() else []
    return {
        "word": doc.get("word"),
        "pronunciation": doc.get("pronunciation"),
        "partOfSpeech": doc.get("partOfSpeech") or doc.get("pos"),
        "definition": doc.get("definition") or doc.get("meaning"),
        "somaliTranslation": doc.get("somaliTranslation") or doc.get("somali"),
        "level": doc.get("level"),
        "examples": examples,
        "etymology": doc.get("etymology"),
        "synonyms": doc.get("synonyms") or [],
    }

@router.get("/content/word-of-the-day")
def word_of_the_day(request: Request, date: Optional[str] = Query(None)):
    """
    GET today’s word (default), or a specific day’s word with ?date=YYYY-MM-DD.
    If not picked yet for today, sample one, write it to wod_history, and return it.
    """
    db = request.app.state.db
    if db is None:
        raise HTTPException(503, "DB not ready")

    # --- A) specific date requested (flashback) ----------------------------
    if date:
        hist = db.wod_history.find_one({"date": date})
        if not hist:
            raise HTTPException(404, f"No word recorded for {date}")
        wdoc = db.wod_words.find_one({"_id": hist.get("wordId")}) or db.wod_words.find_one({"word": hist.get("word")})
        if not wdoc:
            raise HTTPException(404, "Word doc missing")
        return {"word": {"date": date, **_norm_word(wdoc)}}

    # --- B) today ----------------------------------------------------------
    today = _today()

    # already chosen today?
    hist = db.wod_history.find_one({"date": today})
    if hist:
        wdoc = db.wod_words.find_one({"_id": hist.get("wordId")}) or {"word": hist.get("word")}
        return {"word": {"date": today, **_norm_word(wdoc)}}

    # otherwise sample a new word (avoid repeats until we exhaust the set)
    used_ids = {h.get("wordId") for h in db.wod_history.find({}, {"wordId": 1}) if h.get("wordId")}
    query = {"_id": {"$nin": list(used_ids)}} if used_ids else {}

    remaining = db.wod_words.count_documents(query)
    if remaining == 0:
        # reset the pool if we ran through everything
        query = {}
        remaining = db.wod_words.count_documents({})
        if remaining == 0:
            raise HTTPException(404, "wod_words collection is empty")

    skip = random.randint(0, remaining - 1)
    cur = db.wod_words.find(query).skip(skip).limit(1)
    choice = next(cur, None)
    if not choice:
        raise HTTPException(404, "No word found")

    # write to wod_history (one per day)
    db.wod_history.update_one(
        {"date": today},
        {"$set": {"date": today, "wordId": choice["_id"], "word": choice.get("word"), "createdAt": _iso_now()}},
        upsert=True,
    )

    return {"word": {"date": today, **_norm_word(choice)}}

@router.get("/content/word-of-the-day/history")
def word_of_the_day_history(request: Request, limit: int = Query(7, ge=1, le=30)):
    """Last N days from wod_history (default 7)."""
    db = request.app.state.db
    if db is None:
        raise HTTPException(503, "DB not ready")

    cur = db.wod_history.find({}, {"_id": 0}).sort("date", -1).limit(limit)
    history = [{"word": h.get("word"), "date": h.get("date")} for h in cur]
    return {"history": history}

@router.get("/content/word-of-the-day/words")
def sample_words(request: Request, limit: int = Query(10, ge=1, le=100)):
    db = request.app.state.db
    if db is None:
        raise HTTPException(503, "DB not ready")
    pipeline = [{"$sample": {"size": limit}}, {"$project": {"_id": 0, "word": 1}}]
    items = list(db.wod_words.aggregate(pipeline))
    return {"words": [{"word": it.get("word"), "date": None} for it in items]}

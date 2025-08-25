from fastapi import APIRouter, Request, Query, HTTPException
from typing import Optional, Any, Dict, List

router = APIRouter(prefix="/vocab", tags=["vocab"])

# --- helpers ---------------------------------------------------------------

def _db(request: Request):
    db = getattr(request.app.state, "db", None)
    if db is None:
        raise HTTPException(503, "DB not ready")
    return db

def _norm_mcq(d: Dict[str, Any]) -> Dict[str, Any]:
    """Map a vocab_tests_mcq doc into the UI shape."""
    return {
        "word": (d.get("answer") or "").strip(),
        "definition": d.get("meaning"),
        "somaliTranslation": d.get("somaliTranslation"),
        "example": d.get("example"),
        "synonyms": [c for c in (d.get("choices") or []) if isinstance(c, str)],
        "level": d.get("level"),
        "category": "MCQ",
    }

def _norm_fill(d: Dict[str, Any]) -> Dict[str, Any]:
    """Map a vocab_tests_fill doc into the UI shape."""
    return {
        "word": (d.get("answer") or "").strip(),
        "definition": d.get("meaning"),
        "somaliTranslation": d.get("somaliTranslation"),
        "example": d.get("example"),
        "synonyms": [],
        "level": d.get("level"),
        "category": "Fill-in",
    }

# --- routes ----------------------------------------------------------------

@router.get("/categories")
def vocab_categories(_: Request):
    # Keep available, though the UI no longer uses it.
    return {"categories": ["All", "MCQ", "Fill-in"]}

@router.get("/words")
def vocab_words(
    request: Request,
    category: str = Query("All"),
    limit: int = Query(8, ge=1, le=100),
    offset: int = Query(0, ge=0),
    level: Optional[str] = None,
):
    """
    Returns: { total, limit, offset, words: [...] }
    Pulls from vocab_tests_mcq + vocab_tests_fill.
    Important: we exclude _id so FastAPI doesn't choke on ObjectId.
    """
    db = _db(request)

    mcq_proj  = {"_id": 0, "answer": 1, "meaning": 1, "choices": 1, "level": 1, "somaliTranslation": 1, "example": 1}
    fill_proj = {"_id": 0, "answer": 1, "meaning": 1, "level": 1, "somaliTranslation": 1, "example": 1}

    q: Dict[str, Any] = {}
    if level:
        q["level"] = level

    if category == "MCQ":
        mcq = list(db.vocab_tests_mcq.find(q, mcq_proj))
        page = [_norm_mcq(x) for x in mcq[offset: offset + limit]]
        return {"total": len(mcq), "limit": limit, "offset": offset, "words": page}

    if category == "Fill-in":
        fill = list(db.vocab_tests_fill.find(q, fill_proj))
        page = [_norm_fill(x) for x in fill[offset: offset + limit]]
        return {"total": len(fill), "limit": limit, "offset": offset, "words": page}

    # All: merge + sort by word
    mcq = [_norm_mcq(x)  for x in db.vocab_tests_mcq.find(q, mcq_proj)]
    fil = [_norm_fill(x) for x in db.vocab_tests_fill.find(q, fill_proj)]
    all_words = [w for w in (mcq + fil) if w.get("word")]
    all_words.sort(key=lambda w: w["word"].lower())
    page = all_words[offset: offset + limit]
    return {"total": len(all_words), "limit": limit, "offset": offset, "words": page}

from fastapi import APIRouter, Header, Query, Request, HTTPException, Body
from typing import Optional, Dict, Any, List, Literal
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/analytics", tags=["analytics"])

EventKind = Literal[
    "dictionary_search", "word_learned", "quiz_completed",
    "grammar_studied", "time_spent", "page_view"
]
TYPE_TO_KIND = {
    "word_searched": "dictionary_search",
    "vocab_marked":  "word_learned",
    "quiz_completed":"quiz_completed",
    "grammar_studied":"grammar_studied",
    "time_spent":"time_spent",
    "page_view":"page_view",
}
def _iso_now() -> str: 
    return datetime.now(timezone.utc).isoformat()

@router.post("/event")
def post_event(
    request: Request,
    payload: Dict[str, Any] = Body(...),           # let FastAPI parse JSON
    x_session_id: str = Header(default="anon-session"),
):
    db = request.app.state.db
    if db is None:
        raise HTTPException(503, "DB not ready")

    now = _iso_now()
    if "kind" in payload or "payload" in payload:
        kind = str(payload.get("kind", "")).strip() or "page_view"
        meta = payload.get("payload") or {}
        ts = payload.get("ts") or now
    else:
        t = str(payload.get("type", "")).strip()
        kind = TYPE_TO_KIND.get(t, t or "page_view")
        meta = payload.get("meta") or {}
        if t == "word_searched" and "term" not in meta and "query" in meta:
            meta["term"] = meta.pop("query")
        if t == "vocab_marked" and "word" not in meta and "term" in meta:
            meta["word"] = meta["term"]
        ts = payload.get("at") or now

    db.events.insert_one({
        "sessionId": x_session_id,
        "kind": kind,
        "payload": meta,
        "ts": ts,
        "createdAt": now
    })
    return {"ok": True}

def _streak_from_dates(dates: List[datetime]) -> int:
    if not dates: 
        return 0
    days = {d.date() for d in dates}
    cur = datetime.now(timezone.utc).date()
    streak = 0
    while cur in days:
        streak += 1
        cur = cur.fromordinal(cur.toordinal() - 1)
    return streak

@router.get("/summary")
def get_summary(
    request: Request,
    x_session_id: str = Header(default="anon-session"),
    days: int = Query(30, ge=1, le=365),
):
    db = request.app.state.db
    if db is None:
        raise HTTPException(503, "DB not ready")

    since = datetime.now(timezone.utc) - timedelta(days=days)
    evs = list(db.events.find(
        {"sessionId": x_session_id, "ts": {"$gte": since.isoformat()}},
        {"_id": 0}
    ))

    words_searched = 0
    quizzes: List[Dict[str, Any]] = []
    accuracy = 0
    quizzes_completed = 0
    time_spent_sec = 0
    vocab_learned: List[str] = []
    grammar_topics: List[str] = []
    timestamps: List[datetime] = []
    search_terms: Dict[str, int] = {}

    for e in evs:
        try:
            t = datetime.fromisoformat(e.get("ts"))
        except Exception:
            t = datetime.now(timezone.utc)
        timestamps.append(t)

        k = e.get("kind")
        p = e.get("payload", {}) or {}

        if k == "dictionary_search":
            words_searched += 1
            term = (p.get("term") or "").strip().lower()
            if term:
                search_terms[term] = search_terms.get(term, 0) + 1
        elif k == "word_learned":
            w = (p.get("word") or "").strip()
            if w and w not in vocab_learned:
                vocab_learned.append(w)
        elif k == "quiz_completed":
            acc = float(p.get("accuracy", 0))
            score = int(p.get("score", 0))
            total = int(p.get("total", 0))
            quizzes.append({"accuracy": acc, "score": score, "total": total})
            quizzes_completed += 1
        elif k == "time_spent":
            time_spent_sec += int(p.get("seconds", 0))
        elif k == "grammar_studied":
            g = (p.get("topic") or "").strip()
            if g and g not in grammar_topics:
                grammar_topics.append(g)

    if quizzes:
        accuracy = round(sum(q["accuracy"] for q in quizzes) / len(quizzes))

    weekly, by_day = [], {}
    today = datetime.now(timezone.utc).date()
    for t in timestamps:
        key = t.date().isoformat()
        by_day[key] = by_day.get(key, 0) + 1
    for i in range(6, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        weekly.append({"day": d, "events": by_day.get(d, 0)})

    recs: List[Dict[str, Any]] = []
    if accuracy and accuracy < 70:
        recs.append({"type": "Practice Quizzes", "items": ["Review last quiz", "Focus on weak items"], "priority": "high", "reason": f"Average accuracy {accuracy}%."})
    if vocab_learned and len(vocab_learned) < 10:
        recs.append({"type": "Build Vocabulary", "items": ["Learn 5 new words", "Review yesterday’s words"], "priority": "medium", "reason": "Grow your set."})
    if search_terms:
        top = sorted(search_terms.items(), key=lambda x: -x[1])[:3]
        recs.append({"type": "Words you looked up a lot", "items": [w for w, _ in top], "priority": "medium", "reason": "Revisit frequent lookups."})
    if not recs:
        recs.append({"type": "Getting Started", "items": ["Try a short quiz", "Open Grammar: Present Simple", "Learn 3 new words"], "priority": "low", "reason": "No activity yet."})

    stats = {
        "wordsLearned": len(vocab_learned),
        "wordsSearched": words_searched,
        "currentStreak": _streak_from_dates(timestamps),
        "accuracy": accuracy,
        "quizzesCompleted": quizzes_completed,
        "timeSpent": round(time_spent_sec / 60),
        "grammarTopicsCount": len(grammar_topics),
    }

    return {"stats": stats, "weekly": weekly, "recommendations": recs}

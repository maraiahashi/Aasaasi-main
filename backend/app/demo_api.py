# backend/app/demo_api.py
from __future__ import annotations
from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import random
import datetime as dt
import os

router = APIRouter(prefix="/api")

# -----------------------
# Demo content (no DB)
# -----------------------
WOTD_TODAY = {
    "date": dt.date.today().isoformat(),
    "word": "perspective",
    "pron": "/pərˈspɛktɪv/",
    "pos": "noun",
    "level": "B2",
    "definition": "A particular attitude toward or way of regarding something.",
    "somali": "aragti",
    "examples": ["Try to see things from my perspective."],
}
WOTD_HISTORY = [
    {"date": (dt.date.today() - dt.timedelta(days=i+1)).isoformat(), "word": w}
    for i, w in enumerate(["clarify", "embrace", "resilient", "curious", "thrive",
                           "context", "purpose", "adapt", "encourage", "achieve"])
]

IDIOM_CURRENT = {
    "idiom": "get off the hook",
    "meaning": "escape blame or responsibility",
    "example": "She forgot the deadline, but her boss let her get off the hook.",
}
IDIOM_ARCHIVE = [
    {"idiom": "piece of cake", "meaning": "very easy"},
    {"idiom": "break the ice", "meaning": "make people feel more comfortable"},
    {"idiom": "under the weather", "meaning": "feeling ill"},
]

VOCAB_CATEGORIES = ["MCQ", "Daily", "Travel", "School"]
VOCAB_WORDS = [
    {"word": "arrive", "meaning": "to reach a place", "category": "MCQ"},
    {"word": "depart", "meaning": "to leave a place", "category": "MCQ"},
    {"word": "context", "meaning": "surrounding information", "category": "MCQ"},
    {"word": "curious", "meaning": "eager to know", "category": "MCQ"},
]

GRAMMAR_TOPICS = [
    {"slug": "present-simple", "title": "Present Simple", "summary": "Habits and facts."},
    {"slug": "past-simple", "title": "Past Simple", "summary": "Finished events in the past."},
]
GRAMMAR_TIPS = [
    {"title": "Use 'do/does' for questions in present simple", "topic": "present-simple"},
    {"title": "Add -ed for regular past verbs", "topic": "past-simple"},
]

# --- A tiny in-memory English test set so we can grade reliably in demo mode.
#     Each question has quick3 and level6 so your UI gets the meta it expects.
DEMO_QS: List[Dict[str, Any]] = [
    {
        "id": "1",
        "question": "When ...... home ? She arrived at nine.",
        "correct": "did she arrive",
        "options": ["did she arrive", "she arrived", "she arrive"],
        "quick3": "Beginner",
        "level6": "A1",
    },
    {
        "id": "2",
        "question": "The wallet ...... by the thief was found later.",
        "correct": "was stolen",
        "options": ["was stolen", "which was stolen", "was stealing"],
        "quick3": "Intermediate",
        "level6": "B1",
    },
    {
        "id": "3",
        "question": "You ...... pay for parking. It’s free.",
        "correct": "don’t have to",
        "options": ["must", "must to", "don’t have to"],
        "quick3": "Beginner",
        "level6": "A2",
    },
    {
        "id": "4",
        "question": "My family ...... to Cairo last month.",
        "correct": "went",
        "options": ["went", "has gone", "been"],
        "quick3": "Beginner",
        "level6": "A2",
    },
    {
        "id": "5",
        "question": "By the time we arrived, the meeting ____. ",
        "correct": "had started",
        "options": ["has started", "had started", "started"],
        "quick3": "Advanced",
        "level6": "B2",
    },
]

def _shuffle_opts(opts: List[str]) -> List[str]:
    a = list(dict.fromkeys([o for o in opts if o]))  # de-dupe + drop blanks
    random.shuffle(a)
    return a

def _pick_questions(limit: int) -> List[Dict[str, Any]]:
    data = DEMO_QS[:]
    random.shuffle(data)
    out = []
    for i, q in enumerate(data[:max(1, min(limit or 12, len(data)))]):
        out.append({
            "id": q["id"],
            "question": q["question"],
            "options": _shuffle_opts(q["options"]),
        })
    return out

# -----------------------
# Content endpoints
# -----------------------
@router.get("/content/word-of-the-day")
def wotd():
    return WOTD_TODAY

@router.get("/content/word-of-the-day/history")
def wotd_history(limit: int = Query(20, ge=1, le=60)):
    return {"history": WOTD_HISTORY[:limit]}

# -----------------------
# Idioms
# -----------------------
@router.get("/idioms/current")
def idiom_current():
    return IDIOM_CURRENT

@router.get("/idioms/archive")
def idiom_archive(limit: int = Query(50, ge=1, le=200)):
    return {"items": IDIOM_ARCHIVE[:limit]}

# -----------------------
# Vocab
# -----------------------
@router.get("/vocab/categories")
def vocab_categories():
    return {"categories": VOCAB_CATEGORIES}

@router.get("/vocab/words")
def vocab_words(category: Optional[str] = None, limit: int = 8, offset: int = 0):
    items = VOCAB_WORDS
    if category:
        items = [w for w in items if w["category"].lower() == category.lower()]
    return {"items": items[offset: offset + limit], "total": len(items)}

# -----------------------
# Grammar
# -----------------------
@router.get("/grammar/topics")
def grammar_topics():
    return {"topics": GRAMMAR_TOPICS}

@router.get("/grammar/tips")
def grammar_tips():
    return {"tips": GRAMMAR_TIPS}

@router.get("/grammar/test")
def grammar_test():
    return {"questions": [
        {"question": "He ____ to school every day.", "options": ["go", "goes", "going"], "answer": "goes"}
    ]}

# -----------------------
# Analytics (stubs)
# -----------------------
@router.post("/analytics/event")
def analytics_event(payload: Dict[str, Any]):
    # Accept anything and acknowledge; no DB writes in demo.
    return {"ok": True}

@router.get("/analytics/summary")
def analytics_summary():
    return {"users": 1, "events": 3, "since": "demo"}

# -----------------------
# Dictionary (tiny demo)
# -----------------------
DEMO_DICT = {
    ("hello", "en-so"): {
        "word": "hello",
        "headword": "hello",
        "pronunciation": "/həˈləʊ/",
        "partOfSpeech": "interjection",
        "meaning": "Used as a greeting or to begin a phone conversation.",
        "somaliTranslation": "isku salaam",
        "examples": ["Hello, how are you?"],
    },
    ("guri", "so-en"): {
        "word": "guri",
        "headword": "guri",
        "meaning": "house, home",
        "somaliTranslation": "guri",
        "examples": ["Waa guri weyn."],
    },
}

@router.get("/dictionary/lookup")
def dict_lookup(term: str, dir: str = "en-so"):
    key = (term.strip().lower(), dir)
    if key not in DEMO_DICT:
        raise HTTPException(status_code=404, detail="Not found")
    return DEMO_DICT[key]

@router.get("/dictionary/suggest")
def dict_suggest(term: str, dir: str = "en-so"):
    t = term.strip().lower()
    # very naive demo suggestions
    pool = ["hello", "help", "helm", "held", "hero", "house", "hope"]
    return [w for w in pool if w.startswith(t)][:5]

@router.get("/dictionary/recent")
def dict_recent():
    return {"recent": ["hello", "house", "guri"]}

# -----------------------
# AI (optional)
# -----------------------
class AIIn(BaseModel):
    message: str

@router.post("/ai/chat")
def ai_chat(payload: AIIn):
    # In demo, return 401 unless OPENAI_API_KEY is present.
    if not os.getenv("OPENAI_API_KEY"):
        return {"detail": "Missing OPENAI_API_KEY"}, 401
    # Minimal “fake” success path (avoids adding extra deps here)
    reply = f"(demo) You asked me: {payload.message[:120]} ..."
    return {"reply": reply}

# -----------------------
# English Test (demo)
# -----------------------
class Answer(BaseModel):
    qid: str
    selected: str

class GradeIn(BaseModel):
    answers: List[Answer]

def _band(level6: str) -> str:
    return level6

@router.get("/tests/english/proficiency")
def english_proficiency(limit: int = Query(12, ge=1, le=60)):
    return {"questions": _pick_questions(limit)}

@router.get("/tests/english/questions")
def english_questions(mode: str = "quick", limit: int = Query(12, ge=1, le=60)):
    # mode is ignored in demo but kept for compatibility
    return {"questions": _pick_questions(limit)}

@router.get("/english-test/questions")
def english_legacy_questions(limit: int = Query(12, ge=1, le=60)):
    # old route used by earlier UI builds
    return {"questions": _pick_questions(limit)}

@router.post("/tests/english/grade")
def english_grade(payload: GradeIn):
    # Score against DEMO_QS
    by_id = {q["id"]: q for q in DEMO_QS}
    total = 0
    correct = 0
    quick_seen = {"Beginner": 0, "Intermediate": 0, "Advanced": 0}
    quick_corr = {"Beginner": 0, "Intermediate": 0, "Advanced": 0}
    cefr_seen = {"A1": 0, "A2": 0, "B1": 0, "B2": 0, "C1": 0}
    cefr_corr = {"A1": 0, "A2": 0, "B1": 0, "B2": 0, "C1": 0}
    details = []

    for a in payload.answers:
        q = by_id.get(a.qid)
        if not q:
            continue
        total += 1
        is_ok = (a.selected or "").strip() == q["correct"]
        if is_ok:
            correct += 1
        quick = q["quick3"]
        lvl = q["level6"]
        quick_seen[quick] += 1
        cefr_seen[lvl] = cefr_seen.get(lvl, 0) + 1
        if is_ok:
            quick_corr[quick] += 1
            cefr_corr[lvl] = cefr_corr.get(lvl, 0) + 1
        details.append({
            "id": q["id"],
            "question": q["question"],
            "selected": a.selected,
            "correct": q["correct"],
            "isCorrect": is_ok,
            "quick3": quick,
            "level6": lvl,
        })

    pct = round(100.0 * correct / max(1, total), 1)
    level = "A1" if pct < 40 else "A2" if pct < 55 else "B1" if pct < 70 else "B2" if pct < 85 else "C1"
    fb = "Excellent!" if pct >= 85 else "Good job—keep practicing." if pct >= 60 else "Keep going—review and try again."

    return {
        "score": pct,
        "correct": correct,
        "total": total,
        "estimatedLevel": {"quick3": "Beginner" if pct < 60 else "Intermediate" if pct < 85 else "Advanced",
                           "cefr6": level},
        "feedback": fb,
        "details": details,
        "meta": {"quick_seen": quick_seen, "quick_correct": quick_corr, "cefr_seen": cefr_seen, "cefr_correct": cefr_corr}
    }

@router.post("/english-test/grade")
def english_legacy_grade(payload: GradeIn):
    # same as new route for back-compat
    return english_grade(payload)

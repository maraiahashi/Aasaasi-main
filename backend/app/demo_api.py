from fastapi import APIRouter, Query
from pathlib import Path
import json, random, datetime as dt

router = APIRouter(prefix="/api")

DATA = Path(__file__).parent / "demo_data"

def _load(name, default):
    p = DATA / name
    try:
        return json.loads(p.read_text())
    except Exception:
        return default

# --- demo datasets (edit/expand later or drop .json files into demo_data) ---
EN_TEST = _load("english_test_questions.json", [
  {"question":"My family ...... to Cairo last month.","correct":"went","distractor1":"has gone","distractor2":"been","quick3":"Beginner","level6":"A1"},
  {"question":"When ...... home ? She arrived at nine.","correct":"did she arrive","distractor1":"she arrive","distractor2":"she arrived","quick3":"Beginner","level6":"A1"},
  {"question":"You ...... pay for parking. It’s free.","correct":"don’t have to","distractor1":"must","distractor2":"must to","quick3":"Intermediate","level6":"B1"},
  {"question":"The wallet ...... by the thief was found later.","correct":"which was stolen","distractor1":"was stealing","distractor2":"was stolen","quick3":"Advanced","level6":"C1"}
])

IDIOMS = _load("idioms.json", [
  {"idiom":"get off the hook","meaning":"escape blame or responsibility","example":"She forgot the deadline, but her boss let her get off the hook."}
])

WOD_WORDS = _load("wod_words.json", [
  {"word":"perspective","pron":"/pərˈspɛktɪv/","pos":"noun","level":"B2","definition":"A particular attitude toward or way of regarding something.","somali":"aragti","examples":["Try to see things from my perspective."]}
])

GRAMMAR_TOPICS = _load("grammar_topics.json", [
  {"id":"advice-vs-advise","title":"Advice vs. Advise"},
  {"id":"between-vs-among","title":"Between vs. Among"}
])

VOCAB_MCQ = _load("vocab_mcq.json", [
  {"word":"abundant","correct":"plentiful","choices":["scarce","tiny","plentiful","partial"],"level":"B2"},
  {"word":"allocate","correct":"assign","choices":["assign","reduce","ignore","delay"],"level":"B1"}
])

# --- endpoints (subset of your prod API), shapes align with your UI ---

@router.get("/english-test/questions")
def demo_english_questions(limit: int = Query(12, ge=1, le=60), mode: str = "quick"):
    Q = EN_TEST.copy()
    random.shuffle(Q)
    Q = Q[:min(limit, len(Q))]
    out = []
    for i,q in enumerate(Q, start=1):
        opts = [q.get("correct",""), q.get("distractor1",""), q.get("distractor2",""), q.get("distractor3","")]
        opts = [o for o in opts if o]
        random.shuffle(opts)
        out.append({"id": str(i), "question": q["question"], "options": opts})
    return {"questions": out}

@router.get("/idioms/current")
def demo_idiom_current():
    it = IDIOMS[0] if IDIOMS else {"idiom":"—","meaning":"—","example":"—"}
    return {"idiom": it["idiom"], "meaning": it["meaning"], "example": it["example"]}

@router.get("/content/word-of-the-day")
def demo_wod_today():
    today = dt.date.today().isoformat()
    w = WOD_WORDS[0] if WOD_WORDS else {"word":"—","definition":"—","somali":"—","pos":"noun","level":"A1"}
    return {"date": today, **w}

@router.get("/content/word-of-the-day/history")
def demo_wod_history(limit: int = 7):
    out = []
    today = dt.date.today()
    for i,w in enumerate(WOD_WORDS[:limit]):
        out.append({"date": (today - dt.timedelta(days=i)).isoformat(), **w})
    return out

@router.get("/grammar/topics")
def demo_grammar_topics():
    return {"topics": GRAMMAR_TOPICS}

@router.get("/vocab/words")
def demo_vocab_words(category: str = "MCQ", limit: int = 8, offset: int = 0, level: str | None = None):
    items = VOCAB_MCQ
    if level:
        items = [x for x in items if x.get("level")==level]
    slice_ = items[offset:offset+limit]
    # your real endpoint returns { total, limit, offset, words: [...] }
    return {"total": len(items), "limit": limit, "offset": offset, "words": slice_}

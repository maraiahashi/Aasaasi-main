from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel
from typing import List, Optional, Literal, Dict, Any
from datetime import datetime
import re, json

# use the AI helpers (for backfill only)
from .ai import _openai_client, _model, SYSTEM_PROMPT

router = APIRouter(prefix="/dictionary", tags=["dictionary"])

# ---------- models
class WordOut(BaseModel):
    word: str
    headword: Optional[str] = None
    somaliTranslation: Optional[str] = None
    meaning: Optional[str] = None
    definition: Optional[str] = None
    partOfSpeech: Optional[str] = None
    pronunciation: Optional[str] = None
    wordForms: Optional[str] = None
    phrase: Optional[str] = None
    usageNote: Optional[str] = None
    examples: List[str] = []
    ai: Optional[bool] = False  # True if AI backfilled

# ---------- helpers
def _get(doc: Dict[str, Any], *names: str) -> Optional[Any]:
    keys = {n for n in names}
    for n in list(keys):
        keys |= {n.lower(), n.upper(), n.title(), n.replace(" ", ""), n.replace(" ", "_")}
    for k in doc.keys():
        norm = k.replace("_", " ")
        if k in keys or k.replace(" ", "") in keys or norm in keys:
            v = doc.get(k)
            if v not in (None, ""):
                return v
    return None

def _doc_to_out(doc: Dict[str, Any], direction: str) -> WordOut:
    headword       = _get(doc, "Headword", "English", "EN", "Word_EN")
    somali         = _get(doc, "Somali", "SO", "Word_SO", "Somali Translation")
    part_of_speech = _get(doc, "Part of Speech", "POS", "partOfSpeech")
    pronunciation  = _get(doc, "Pronunciation", "pronunciation", "Pron")
    word_forms     = _get(doc, "Word Forms", "wordForms")
    phrase         = _get(doc, "Phrase")
    usage_note     = _get(doc, "Usage Note", "usageNote")
    meaning        = _get(doc, "Meaning", "Definition", "definition")
    examples_raw   = _get(doc, "Example", "Examples")

    examples: List[str] = []
    if isinstance(examples_raw, list):
        examples = [str(x).strip() for x in examples_raw if str(x).strip()]
    elif isinstance(examples_raw, str):
        parts = re.split(r"\n|;|•|- ", examples_raw)
        examples = [p.strip() for p in parts if p.strip()]

    if direction == "en-so":
        word = headword or somali or ""
        st   = somali
    else:
        word = somali or headword or ""
        st   = somali or word

    meaning_str = str(meaning) if meaning is not None else None

    return WordOut(
        word=word,
        headword=headword or None,
        somaliTranslation=st,
        meaning=meaning_str,
        definition=meaning_str,
        partOfSpeech=(str(part_of_speech) if part_of_speech else None),
        pronunciation=(str(pronunciation) if pronunciation else None),
        wordForms=(str(word_forms) if word_forms else None),
        phrase=(str(phrase) if phrase else None),
        usageNote=(str(usage_note) if usage_note else None),
        examples=examples,
    )

def _sid(request: Request) -> str:
    return request.headers.get("X-Session-Id") or request.headers.get("x-session-id") or "anon"

def _is_empty(v: Any) -> bool:
    return v is None or (isinstance(v, str) and v.strip() == "")

def _needs_backfill(entry: WordOut) -> bool:
    fields = ["meaning", "somaliTranslation", "partOfSpeech", "pronunciation",
              "wordForms", "phrase", "usageNote"]
    if any(_is_empty(getattr(entry, f)) for f in fields):
        return True
    if not isinstance(entry.examples, list) or len(entry.examples) == 0:
        return True
    return False

def _parse_ai_json(reply: str) -> Optional[Dict[str, Any]]:
    start, end = reply.find("{"), reply.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        return json.loads(reply[start:end+1])
    except Exception:
        return None

def _ai_backfill(term: str, direction: str, base: WordOut) -> Optional[WordOut]:
    """Fill ONLY missing fields; preserve existing Mongo values."""
    client = _openai_client()

    known = {}
    for k in ["word", "headword", "somaliTranslation", "meaning", "partOfSpeech",
              "pronunciation", "wordForms", "phrase", "usageNote", "examples"]:
        v = getattr(base, k, None)
        if not _is_empty(v):
            known[k] = v

    prompt = (
        f"We are preparing a { 'English→Somali' if direction=='en-so' else 'Somali→English' } dictionary entry.\n"
        f'Headword: "{term}".\n'
        "Known fields (DO NOT CHANGE, repeat exactly):\n"
        f"{json.dumps(known, ensure_ascii=False)}\n\n"
        "Fill ONLY the missing fields and return JSON with keys: "
        "word, headword, pronunciation, partOfSpeech, wordForms, phrase, usageNote, meaning, somaliTranslation, examples "
        "(examples = 1–3 short sentences). "
        "For any field present in the known data, repeat the same value. Respond with JSON only."
    )

    resp = client.chat.completions.create(
        model=_model(), temperature=0.2,
        messages=[{"role":"system","content":SYSTEM_PROMPT},
                  {"role":"user","content":prompt}]
    )
    data = _parse_ai_json((resp.choices[0].message.content or "").strip())
    if not data:
        return None

    merged = base.model_dump()
    for k in ["pronunciation", "partOfSpeech", "wordForms", "phrase", "usageNote", "meaning", "somaliTranslation", "headword", "word"]:
        if _is_empty(merged.get(k)) and not _is_empty(data.get(k)):
            merged[k] = data.get(k)

    ex = merged.get("examples") or []
    if not ex:
        ex_new = data.get("examples") or []
        if not isinstance(ex_new, list):
            ex_new = [str(ex_new)]
        ex_new = [str(x).strip() for x in ex_new if str(x).strip()]
        merged["examples"] = ex_new

    merged["definition"] = merged.get("meaning")
    merged["ai"] = True

    try:
        return WordOut(**merged)
    except Exception:
        return None

# ---------- endpoints
@router.get("/lookup", response_model=WordOut)
def lookup(
    request: Request,
    term: str = Query(..., min_length=1),
    dir: Literal["en-so", "so-en"] = Query("en-so"),
):
    db = request.app.state.db
    if db is None:
        raise HTTPException(503, "DB not ready")

    q = term.strip()
    if not q:
        raise HTTPException(400, "Empty term")

    coll = db["dictionary"]
    out: Optional[WordOut] = None
    source = "mongo"

    # --- Mongo query
    if dir == "en-so":
        exact = coll.find_one({"$or": [
            {"Headword": {"$regex": f"^{re.escape(q)}$", "$options": "i"}},
            {"English":  {"$regex": f"^{re.escape(q)}$", "$options": "i"}},
        ]})
        pref = None if exact else coll.find_one({"$or": [
            {"Headword": {"$regex": f"^{re.escape(q)}", "$options": "i"}},
            {"English":  {"$regex": f"^{re.escape(q)}", "$options": "i"}},
        ]})
        doc = exact or pref
        if doc:
            out = _doc_to_out(doc, dir)
    else:
        exact = coll.find_one({"$or": [
            {"Somali": {"$regex": f"^{re.escape(q)}$", "$options": "i"}},
            {"SO":     {"$regex": f"^{re.escape(q)}$", "$options": "i"}},
        ]})
        pref = None if exact else coll.find_one({"$or": [
            {"Somali": {"$regex": f"^{re.escape(q)}", "$options": "i"}},
            {"SO":     {"$regex": f"^{re.escape(q)}", "$options": "i"}},
        ]})
        doc = exact or pref
        if doc:
            out = _doc_to_out(doc, dir)

    # --- Backfill only if we found something but it’s incomplete
    backfilled = False
    if out and _needs_backfill(out):
        try:
            cache = db.get_collection("ai_cache")
            cached = cache.find_one({"term": q.lower(), "dir": dir, "kind": "backfill"})
            if cached and "entry" in cached:
                filled = WordOut(**cached["entry"])
            else:
                filled = _ai_backfill(q, dir, out)
                if filled:
                    cache.update_one(
                        {"term": q.lower(), "dir": dir, "kind": "backfill"},
                        {"$set": {"entry": filled.model_dump(), "ts": datetime.utcnow()}},
                        upsert=True,
                    )
            if filled:
                out = filled
                backfilled = True
                source = "mongo+ai"
        except Exception:
            pass

    # --- NO full AI fallback. Unknown words => 404.
    try:
        db.events.insert_one({
            "sessionId": _sid(request),
            "type": "word_searched",
            "at": datetime.utcnow(),
            "meta": {
                "word": (out.word if out else q),
                "dir": dir,
                "found": bool(out),
                "source": source,
                "backfilled": backfilled,
            },
        })
    except Exception:
        pass

    if not out:
        raise HTTPException(status_code=404, detail="Word not found")
    return out

@router.get("/suggest", response_model=List[str])
def suggest(
    request: Request,
    term: str = Query(..., min_length=1),
    dir: Literal["en-so", "so-en"] = Query("en-so"),
    limit: int = Query(5, ge=1, le=20),
):
    db = request.app.state.db
    if db is None:
        raise HTTPException(503, "DB not ready")

    q = term.strip()
    if not q:
        return []

    coll = db["dictionary"]
    field_candidates = (["Headword", "English"] if dir == "en-so" else ["Somali", "SO"])

    out: List[str] = []
    seen = set()
    for field in field_candidates:
        cur = coll.find({field: {"$regex": f"^{re.escape(q)}", "$options": "i"}}, {field: 1, "_id": 0}).limit(limit * 2)
        for d in cur:
            s = d.get(field)
            if s:
                s = str(s)
                if s.lower() not in seen:
                    seen.add(s.lower())
                    out.append(s)
            if len(out) >= limit:
                break
        if len(out) >= limit:
            break

    try:
        db.events.insert_one({
            "sessionId": _sid(request),
            "type": "word_suggest",
            "at": datetime.utcnow(),
            "meta": {"word": q, "dir": dir, "found": bool(out)},
        })
    except Exception:
        pass

    return out

@router.get("/recent", response_model=List[str])
def recent(request: Request, limit: int = Query(10, ge=1, le=50)):
    db = request.app.state.db
    if db is None:
        raise HTTPException(503, "DB not ready")

    sid = _sid(request)
    cur = db.events.find({"sessionId": sid, "type": "word_searched"}, {"meta.word": 1, "_id": 0}).sort("at", -1).limit(200)

    seen: set[str] = set()
    out: List[str] = []
    for doc in cur:
        w = (doc.get("meta") or {}).get("word")
        if not w:
            continue
        lw = w.lower()
        if lw in seen:
            continue
        seen.add(lw)
        out.append(w)
        if len(out) >= limit:
            break
    return out

# backend/app/routers/english_tests.py
from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from bson import ObjectId
from pathlib import Path
import random, json, re, os

router = APIRouter(prefix="/tests/english", tags=["english-tests"])

# ---------- helpers ----------
def _oid(s: str) -> ObjectId:
    try:
        return ObjectId(s)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Invalid question id: {s}")

def _shuffle(seq):
    a = list(seq)
    random.shuffle(a)
    return a

def _load_fallback() -> List[Dict[str, Any]]:
    f = Path(__file__).resolve().parent.parent / "data" / "english_test_fallback.json"
    try:
        return json.loads(f.read_text(encoding="utf-8"))
    except Exception:
        return [
            {"question":"He ____ work at six.","correct":"starts","distractor1":"start","distractor2":"is start","distractor3":"has start","quick3":"Beginner","level6":"A1"},
            {"question":"I need to speak with you. ____ you busy now?","correct":"Are","distractor1":"Do","distractor2":"Is","distractor3":"Did","quick3":"Intermediate","level6":"B1"},
            {"question":"By the time we arrived, the meeting ____.","correct":"had started","distractor1":"has started","distractor2":"was start","distractor3":"started","quick3":"Advanced","level6":"B2"}
        ]

# ---------- models ----------
class Answer(BaseModel):
    qid: str
    selected: str

class GradePayload(BaseModel):
    answers: List[Answer]

# ---------- internal samplers ----------
def _sample_quick(pool: List[Dict[str, Any]], total: int) -> List[Dict[str, Any]]:
    per_bucket = 4 if total == 0 else max(1, total // 3)
    out = []
    for b in ["Beginner","Intermediate","Advanced"]:
        bucket = [d for d in pool if str(d.get("quick3","")).strip().lower().startswith(b.lower()[:3])]
        random.shuffle(bucket)
        out += bucket[:per_bucket]
    return out

def _sample_cefr(pool: List[Dict[str, Any]], total: int) -> List[Dict[str, Any]]:
    per_band = 6 if total == 0 else max(1, total // 5)
    bands = ["A1","A2","B1","B2","C1"]
    out = []
    rx_map = {
        "A1": r"^(A1|Elementary)$",
        "A2": r"^(A2|Pre[- ]?Intermediate|Preintermediate|Pre-Intermediate)$",
        "B1": r"^(B1|Intermediate)$",
        "B2": r"^(B2|Upper[- ]?Intermediate|Upperintermediate|Upper-Intermediate)$",
        "C1": r"^(C1|Advanced)$",
    }
    for band in bands:
        pattern = re.compile(rx_map[band], re.IGNORECASE)
        bucket = [d for d in pool if pattern.match(str(d.get("level6","")))]
        random.shuffle(bucket)
        out += bucket[:per_band]
    return out

# ---------- question delivery ----------
@router.get("/proficiency")
def get_proficiency(request: Request, limit: int = Query(12, ge=1, le=60)):
    """Convenience endpoint the UI can hit; returns a mixed ‘quick’ set."""
    return get_questions(request, mode="quick", limit=limit)

@router.get("/questions")
def get_questions(
    request: Request,
    mode: str = Query("quick", pattern="^(quick|cefr)$"),
    total: int = Query(0, ge=0, le=60),
    limit: Optional[int] = Query(None, ge=1, le=60),
):
    """
    QUICK (default): 4 each from Beginner / Intermediate / Advanced (12).
    CEFR: 6 per band A1..C1 (30).
    Falls back to a bundled JSON list if Mongo DB isn't available.
    """
    db = getattr(request.app.state, "db", None)
    use_fallback = (db is None) or (os.environ.get("FORCE_TEST_FALLBACK") == "1")

    if limit is not None:
        total = limit

    docs: List[Dict[str, Any]] = []
    if not use_fallback:
        base_match = {"question": {"$ne": ""}, "correct": {"$ne": ""}}
        try:
            coll = db.get_collection("english_test_questions")
            if mode == "quick":
                for b in ["Beginner","Intermediate","Advanced"]:
                    part = list(coll.aggregate([
                        {"$match": base_match},
                        {"$match": {"$expr": {"$regexMatch": {
                            "input": {"$ifNull": ["$quick3", ""]},
                            "regex": f"^{re.escape(b)}$",
                            "options": "i"}}}},
                        {"$sample": {"size": 4 if total == 0 else max(1, total // 3)}},
                    ]))
                    docs.extend(part)
            else:
                regex_map = {
                    "A1": r"^(A1|Elementary)$",
                    "A2": r"^(A2|Pre[- ]?Intermediate|Preintermediate|Pre-Intermediate)$",
                    "B1": r"^(B1|Intermediate)$",
                    "B2": r"^(B2|Upper[- ]?Intermediate|Upperintermediate|Upper-Intermediate)$",
                    "C1": r"^(C1|Advanced)$",
                }
                for band in ["A1","A2","B1","B2","C1"]:
                    part = list(coll.aggregate([
                        {"$match": base_match},
                        {"$match": {"$expr": {"$regexMatch": {
                            "input": {"$ifNull": ["$level6", ""]},
                            "regex": regex_map[band],
                            "options": "i"}}}},
                        {"$sample": {"size": 6 if total == 0 else max(1, total // 5)}},
                    ]))
                    docs.extend(part)
        except Exception:
            docs = []  # fallback below

    if use_fallback or not docs:
        pool = _load_fallback()
        docs = _sample_quick(pool, total) if mode == "quick" else _sample_cefr(pool, total)

    out: List[Dict[str, Any]] = []
    for idx, d in enumerate(docs, 1):
        opts = [d.get("correct",""), d.get("distractor1",""), d.get("distractor2",""), d.get("distractor3","")]
        opts = [o for o in opts if o]
        random.shuffle(opts)
        out.append({
            "id": str(d.get("_id", idx)),
            "question": d.get("question",""),
            "options": opts
        })
    return {"questions": _shuffle(out)}

# ---------- grading ----------
def _band_threshold(n: int, band: str, for_floor: bool=False) -> int:
    if n <= 0: return 10**9
    if band in {"B2","C1"} and not for_floor:
        return max(1, int((5/6.0)*n + 0.9999))
    return max(1, int((4/6.0)*n + 0.9999))

def _place_quick(correct: Dict[str,int], seen: Dict[str,int]) -> str:
    thrB = _band_threshold(seen.get("Beginner",0) or 4, "B1", for_floor=True)
    thrI = _band_threshold(seen.get("Intermediate",0) or 4, "B1", for_floor=True)
    thrA = _band_threshold(seen.get("Advanced",0) or 4, "B1", for_floor=True)
    B = correct.get("Beginner",0); I = correct.get("Intermediate",0); A = correct.get("Advanced",0)
    if A >= thrA and I >= thrI: return "Advanced"
    if I >= thrI and B >= thrB: return "Intermediate"
    if B >= thrB: return "Beginner"
    return "Beginner (low confidence)"

def _place_cefr(corr: Dict[str,int], seen: Dict[str,int]) -> str:
    bands = ["A1","A2","B1","B2","C1"]
    def ok(level: str) -> bool:
        idx = bands.index(level)
        if corr.get(level,0) < _band_threshold(seen.get(level,0), level): return False
        for b in bands[:idx]:
            need = _band_threshold(seen.get(b,0), b, for_floor=True)
            if corr.get(b,0) < need: return False
        if level == "C1":
            need_b2 = _band_threshold(seen.get("B2",0), "B2")
            if corr.get("B2",0) < need_b2: return False
        return True
    for lvl in reversed(bands):
        if ok(lvl): return lvl
    return "A1"

@router.post("/grade")
def grade(request: Request, payload: GradePayload):
    if not payload.answers:
        raise HTTPException(400, "No answers submitted")

    db = getattr(request.app.state, "db", None)
    use_fallback = (db is None) or (os.environ.get("FORCE_TEST_FALLBACK") == "1")
    pool: List[Dict[str, Any]] = []

    if not use_fallback:
        try:
            pool = list(db.get_collection("english_test_questions")
                          .find({}, {"question":1,"correct":1,"quick3":1,"level6":1}))
        except Exception:
            pool = []

    if use_fallback or not pool:
        pool = _load_fallback()

    def norm(v): return (v or "").strip()
    by_id: Dict[str, Dict[str, Any]] = {}
    for i, q in enumerate(pool, 1):
        qid = str(q.get("_id", i))
        by_id[qid] = q

    total = 0; correct_total = 0
    quick_seen = {"Beginner":0,"Intermediate":0,"Advanced":0}
    quick_corr = {"Beginner":0,"Intermediate":0,"Advanced":0}
    cefr_seen = {"A1":0,"A2":0,"B1":0,"B2":0,"C1":0}
    cefr_corr = {"A1":0,"A2":0,"B1":0,"B2":0,"C1":0}
    details = []

    for ans in payload.answers:
        q = by_id.get(ans.qid)
        if not q:
            continue
        total += 1
        is_correct = norm(ans.selected) == norm(q.get("correct"))
        if is_correct: correct_total += 1

        q3s = str(q.get("quick3") or "").strip().lower()
        if q3s.startswith("beg"): quick_seen["Beginner"] += 1;  quick_corr["Beginner"] += int(is_correct)
        elif q3s.startswith("int"): quick_seen["Intermediate"] += 1; quick_corr["Intermediate"] += int(is_correct)
        elif q3s.startswith("adv"): quick_seen["Advanced"] += 1;  quick_corr["Advanced"] += int(is_correct)

        l6s = str(q.get("level6") or "").strip().lower().replace(" ", "").replace("-", "")
        m = "A1" if l6s in {"a1","elementary"} else \
            "A2" if l6s in {"a2","preintermediate","preint"} else \
            "B1" if l6s in {"b1","intermediate"} else \
            "B2" if l6s in {"b2","upperintermediate","upperint"} else \
            "C1" if l6s in {"c1","advanced"} else None
        if m:
            cefr_seen[m] += 1
            if is_correct: cefr_corr[m] += 1

        details.append({
            "id": ans.qid,
            "question": q.get("question",""),
            "selected": ans.selected,
            "correct": q.get("correct",""),
            "isCorrect": is_correct,
            "quick3": "Beginner" if q3s.startswith("beg") else "Intermediate" if q3s.startswith("int") else "Advanced" if q3s.startswith("adv") else None,
            "level6": m
        })

    score_pct = round(100.0 * correct_total / max(1,total), 1)
    quick_level = _place_quick(quick_corr, quick_seen)
    cefr_level  = _place_cefr(cefr_corr, cefr_seen)

    fb = "Excellent work! Your answers suggest strong command of the material." if score_pct >= 85 else \
         "Good job. Review the questions you missed and practice similar items." if score_pct >= 60 else \
         "Keep going! Focus on the topics you missed and try again."

    return {
        "score": score_pct,
        "correct": correct_total,
        "total": total,
        "estimatedLevel": {"quick3": quick_level, "cefr6": cefr_level},
        "feedback": fb,
        "details": details,
        "meta": {"quick_seen": quick_seen, "quick_correct": quick_corr, "cefr_seen": cefr_seen, "cefr_correct": cefr_corr}
    }

# backend/app/routes/english_test.py
from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from bson import ObjectId
import random

router = APIRouter()  # main.py mounts with prefix="/api"

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

# ---------- models ----------

class Answer(BaseModel):
    qid: str
    selected: str

class GradePayload(BaseModel):
    answers: List[Answer]

# ---------- question delivery ----------

@router.get("/english-test/questions")
def get_questions(
    request: Request,
    mode: str = Query("quick", pattern="^(quick|cefr)$"),   # quick=12 (4/4/4), cefr=30 (6 per band)
    total: int = Query(0, ge=0, le=60),                     # optional override; 0 => defaults above
    limit: Optional[int] = Query(None, ge=1, le=60),        # backward-compat alias
):
    """
    QUICK (default): evenly sample Beginner/Intermediate/Advanced (4 each => 12).
    CEFR: sample 6 per band A1..C1 (=> 30).
    """
    db = request.app.state.db
    if db is None:
        raise HTTPException(503, "DB not ready")

    # allow ?limit= to override legacy calls
    if limit is not None:
        total = limit

    base_match = {"question": {"$ne": ""}, "correct": {"$ne": ""}}
    docs: list[Dict[str, Any]] = []

    if mode == "quick":
        per_bucket = 4 if total == 0 else max(1, total // 3)
        buckets = ["Beginner", "Intermediate", "Advanced"]
        for b in buckets:
            # case-insensitive match on quick3
            part = list(db.english_test_questions.aggregate([
                {"$match": base_match},
                {"$match": {
                    "$expr": {
                        "$regexMatch": {
                            "input": {"$toString": "$quick3"},
                            "regex": f"^{b}$",
                            "options": "i"
                        }
                    }
                }},
                {"$sample": {"size": per_bucket}},
            ]))
            docs.extend(part)

    else:  # mode == "cefr"
        per_band = 6 if total == 0 else max(1, total // 5)
        bands = ["A1", "A2", "B1", "B2", "C1"]
        # map “wordy” labels to CEFR on the Mongo side
        regex_map = {
            "A1": r"^(A1|Elementary)$",
            "A2": r"^(A2|Pre[- ]?Intermediate|Preintermediate|Pre-Intermediate)$",
            "B1": r"^(B1|Intermediate)$",
            "B2": r"^(B2|Upper[- ]?Intermediate|Upperintermediate|Upper-Intermediate)$",
            "C1": r"^(C1|Advanced)$",
        }
        for band in bands:
            part = list(db.english_test_questions.aggregate([
                {"$match": base_match},
                {"$match": {
                    "$expr": {
                        "$regexMatch": {
                            "input": {"$toString": "$level6"},
                            "regex": regex_map[band],
                            "options": "i"
                        }
                    }
                }},
                {"$sample": {"size": per_band}},
            ]))
            docs.extend(part)

    if not docs:
        raise HTTPException(404, "No questions found")

    # shape for client, with randomized options
    out: List[Dict[str, Any]] = []
    for d in docs:
        opts = [d.get("correct",""), d.get("distractor1",""), d.get("distractor2",""), d.get("distractor3","")]
        opts = [o for o in opts if o]
        random.shuffle(opts)
        out.append({
            "id": str(d["_id"]),
            "question": d["question"],
            "options": opts,
        })

    # final shuffle (mix buckets)
    out = _shuffle(out)
    return {"questions": out}

# ---------- grading ----------

def _band_threshold(n: int, band: str, for_floor: bool=False) -> int:
    """
    Floors are ~4/6 for lower bands.
    Cuts are ~4/6 for A1/A2/B1 and ~5/6 for B2/C1 (scaled to n via ceil).
    """
    if n <= 0: return 10**9  # impossible; will fail
    if band in {"B2","C1"} and not for_floor:
        return max(1, int((5/6.0)*n + 0.9999))  # ceil(0.833*n)
    return max(1, int((4/6.0)*n + 0.9999))     # ceil(0.667*n)

def _place_quick(correct: Dict[str,int], seen: Dict[str,int]) -> str:
    # scale thresholds to how many were asked in each bucket
    thrB = _band_threshold(seen.get("Beginner",0) or 4, "B1", for_floor=True)
    thrI = _band_threshold(seen.get("Intermediate",0) or 4, "B1", for_floor=True)
    thrA = _band_threshold(seen.get("Advanced",0) or 4, "B1", for_floor=True)

    B = correct.get("Beginner",0)
    I = correct.get("Intermediate",0)
    A = correct.get("Advanced",0)

    if A >= thrA and I >= thrI:
        return "Advanced"
    if I >= thrI and B >= thrB:
        return "Intermediate"
    if B >= thrB:
        return "Beginner"
    return "Beginner (low confidence)"

def _place_cefr(corr: Dict[str,int], seen: Dict[str,int]) -> str:
    bands = ["A1","A2","B1","B2","C1"]

    def ok(level: str) -> bool:
        idx = bands.index(level)
        # cut at this level
        if corr.get(level,0) < _band_threshold(seen.get(level,0), level):
            return False
        # floors below
        for b in bands[:idx]:
            need = _band_threshold(seen.get(b,0), b, for_floor=True)
            if corr.get(b,0) < need:
                return False
        # extra B2 solidity for C1
        if level == "C1":
            need_b2 = _band_threshold(seen.get("B2",0), "B2")
            if corr.get("B2",0) < need_b2:
                return False
        return True

    for lvl in reversed(bands):  # try highest first
        if ok(lvl): return lvl
    return "A1"

@router.post("/english-test/grade")
def grade(request: Request, payload: GradePayload):
    db = request.app.state.db
    if db is None:
        raise HTTPException(503, "DB not ready")
    if not payload.answers:
        raise HTTPException(400, "No answers submitted")

    total = 0
    correct_total = 0

    quick_seen: Dict[str,int] = {"Beginner":0,"Intermediate":0,"Advanced":0}
    quick_corr: Dict[str,int] = {"Beginner":0,"Intermediate":0,"Advanced":0}

    cefr_seen: Dict[str,int] = {"A1":0,"A2":0,"B1":0,"B2":0,"C1":0}
    cefr_corr: Dict[str,int] = {"A1":0,"A2":0,"B1":0,"B2":0,"C1":0}

    details = []

    for ans in payload.answers:
        q = db.english_test_questions.find_one({"_id": _oid(ans.qid)})
        if not q:
            raise HTTPException(400, detail=f"Invalid question id: {ans.qid}")

        total += 1
        is_correct = ans.selected.strip() == (q.get("correct","").strip())
        if is_correct:
            correct_total += 1

        # normalize bands for counting
        quick3_raw = (q.get("quick3") or "")
        level6_raw = (q.get("level6") or "")

        if isinstance(quick3_raw, str):
            q3s = quick3_raw.strip().lower()
            if q3s.startswith("beg"): quick_seen["Beginner"] += 1;  quick_corr["Beginner"] += int(is_correct)
            elif q3s.startswith("int"): quick_seen["Intermediate"] += 1; quick_corr["Intermediate"] += int(is_correct)
            elif q3s.startswith("adv"): quick_seen["Advanced"] += 1;  quick_corr["Advanced"] += int(is_correct)

        if isinstance(level6_raw, str):
            l6s = level6_raw.strip().lower().replace(" ", "").replace("-", "")
            m = None
            if l6s in {"a1","elementary"}: m = "A1"
            elif l6s in {"a2","preintermediate","preint"}: m = "A2"
            elif l6s in {"b1","intermediate"}: m = "B1"
            elif l6s in {"b2","upperintermediate","upperint"}: m = "B2"
            elif l6s in {"c1","advanced"}: m = "C1"
            if m:
                cefr_seen[m] += 1
                if is_correct: cefr_corr[m] += 1

        details.append({
            "id": str(q["_id"]),
            "question": q["question"],
            "selected": ans.selected,
            "correct": q.get("correct",""),
            "isCorrect": is_correct,
            "quick3": "Beginner" if quick3_raw and str(quick3_raw).lower().startswith("beg") else
                      "Intermediate" if quick3_raw and str(quick3_raw).lower().startswith("int") else
                      "Advanced" if quick3_raw and str(quick3_raw).lower().startswith("adv") else None,
            "level6": "A1" if "elementary" in str(level6_raw).lower() or str(level6_raw).upper() == "A1" else
                      "A2" if "pre" in str(level6_raw).lower() or str(level6_raw).upper() == "A2" else
                      "B1" if str(level6_raw).upper() == "B1" or str(level6_raw).lower().strip()=="intermediate" else
                      "B2" if "upper" in str(level6_raw).lower() or str(level6_raw).upper() == "B2" else
                      "C1" if "advanced" in str(level6_raw).lower() or str(level6_raw).upper() == "C1" else None,
        })

    score_pct = round(100.0 * correct_total / max(1,total), 1)

    quick_level = _place_quick(quick_corr, quick_seen)
    cefr_level  = _place_cefr(cefr_corr, cefr_seen)

    if score_pct >= 85:
        fb = "Excellent work! Your answers suggest strong command of the material."
    elif score_pct >= 60:
        fb = "Good job. Review the questions you missed and practice similar items."
    else:
        fb = "Keep going! Focus on the topics you missed and try again."

    return {
        "score": score_pct,
        "correct": correct_total,
        "total": total,
        "estimatedLevel": {"quick3": quick_level, "cefr6": cefr_level},
        "feedback": fb,
        "details": details,
        "meta": {
            "quick_seen": quick_seen, "quick_correct": quick_corr,
            "cefr_seen": cefr_seen, "cefr_correct": cefr_corr,
        }
    }

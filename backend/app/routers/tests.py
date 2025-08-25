# backend/app/routers/tests.py
from __future__ import annotations

import os
from functools import lru_cache
from typing import Any, Dict, List, Tuple

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(tags=["tests"])

# ---- DB helper --------------------------------------------------------------

@lru_cache(maxsize=1)
def _db():
    url = os.getenv("MONGO_URL", "mongodb://127.0.0.1:27017")
    name = os.getenv("MONGO_DB", "aasaasi_db")
    client = MongoClient(url)
    db = client[name]
    # helpful index (one doc per kind)
    try:
        db.tests.create_index("kind", unique=True, background=True)
    except Exception:
        pass
    return db

# ---- Models (response + request) -------------------------------------------

class SectionSummary(BaseModel):
    name: str = ""
    count: int = 0

class KindSummary(BaseModel):
    kind: str
    total: int = 0
    sections: List[SectionSummary] = Field(default_factory=list)

class KindsResponse(BaseModel):
    kinds: List[KindSummary] = Field(default_factory=list)

class StartRequest(BaseModel):
    kind: str  # e.g., "wod" | "vocab" | "idiom" | "english"

class Item(BaseModel):
    id: int
    prompt: str
    choices: List[str] = Field(default_factory=list)  # no correct answer leaked

class Section(BaseModel):
    name: str = ""
    items: List[Item] = Field(default_factory=list)

class StartResponse(BaseModel):
    kind: str
    title: str
    sections: List[Section] = Field(default_factory=list)

class SubmitItem(BaseModel):
    section_index: int
    id: int
    answer: str

class SubmitRequest(BaseModel):
    kind: str
    answers: List[SubmitItem]

class SubmitResponse(BaseModel):
    score: int
    total: int
    percent: float

# ---- Routes -----------------------------------------------------------------

@router.get("/tests/kinds", response_model=KindsResponse, summary="List Kinds")
def list_kinds() -> KindsResponse:
    """
    Returns available test kinds and item counts.
    Never crashes if some sections/items are missing.
    """
    db = _db()
    # project only the fields we need (avoids ObjectId serialization)
    docs = list(db.tests.find({}, {"_id": 0, "kind": 1, "sections.name": 1, "sections.items": 1}))

    kinds: List[KindSummary] = []
    for d in docs:
        secs: List[SectionSummary] = []
        total = 0
        for s in (d.get("sections") or []):
            cnt = len(s.get("items") or [])
            total += cnt
            secs.append(SectionSummary(name=str(s.get("name", "")).strip(), count=cnt))
        kinds.append(KindSummary(kind=str(d.get("kind")), total=total, sections=secs))

    return KindsResponse(kinds=kinds)


@router.post("/tests/start", response_model=StartResponse, summary="Start Test")
def start_test(payload: StartRequest) -> StartResponse:
    """
    Returns the full test (sections + items) for the given kind.
    NOTE: does NOT include the correct answers.
    """
    db = _db()
    doc: Dict[str, Any] | None = db.tests.find_one({"kind": payload.kind}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail=f"No test found for kind='{payload.kind}'")

    sections: List[Section] = []
    for s in (doc.get("sections") or []):
        normalized_items: List[Item] = []
        for idx, it in enumerate(s.get("items") or []):
            _id = it.get("id", idx + 1)
            try:
                _id = int(_id)
            except Exception:
                _id = idx + 1
            prompt = str(it.get("prompt", "")).strip()
            # ensure choices is a list[str]
            raw_choices = it.get("choices") or []
            if not isinstance(raw_choices, list):
                raw_choices = [str(raw_choices)]
            choices = [str(c) for c in raw_choices]
            normalized_items.append(Item(id=_id, prompt=prompt, choices=choices))
        sections.append(Section(name=str(s.get("name", "")).strip(), items=normalized_items))

    return StartResponse(
        kind=str(doc.get("kind")),
        title=str(doc.get("title") or f"{payload.kind.upper()} Test"),
        sections=sections,
    )


@router.post("/tests/submit", response_model=SubmitResponse, summary="Submit")
def submit(payload: SubmitRequest) -> SubmitResponse:
    """
    Grades user answers by comparing to the stored 'answer' for each item.
    """
    db = _db()
    doc = db.tests.find_one({"kind": payload.kind}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Test kind not found")

    # Build answer map: (section_index, id) -> expected_answer
    answer_map: Dict[Tuple[int, int], str] = {}
    for si, s in enumerate(doc.get("sections") or []):
        for it in (s.get("items") or []):
            item_id = it.get("id")
            if item_id is None:
                continue
            try:
                item_id = int(item_id)
            except Exception:
                continue
            correct = str(it.get("answer", "")).strip().lower()
            answer_map[(si, item_id)] = correct

    correct_cnt = 0
    for a in payload.answers:
        key = (int(a.section_index), int(a.id))
        expected = answer_map.get(key)
        if expected is not None and str(a.answer).strip().lower() == expected:
            correct_cnt += 1

    total = max(1, len(payload.answers))
    return SubmitResponse(score=correct_cnt, total=total, percent=round(correct_cnt / total * 100.0, 2))

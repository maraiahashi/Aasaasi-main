from fastapi import APIRouter, Request
from typing import List, Dict

router = APIRouter()

SAMPLE = [
  {"id": "1", "question": "Which is correct?", "options": ["their", "there", "they're"]},
  {"id": "2", "question": "Past tense of 'go'?", "options": ["went", "goed", "gone"]},
  {"id": "3", "question": "Pick the synonym of 'happy'", "options": ["joyful", "sad", "angry"]}
]


@router.get("/questions")
async def get_questions(request: Request, limit: int = 12) -> Dict[str, List[dict]]:
    # Get DB if the app started with one
    db = getattr(request.app.state, "db", None)

    # If no DB configured or not reachable, return sample so UI keeps working
    if db is None:
        return { "questions": SAMPLE[:max(0, int(limit))] }

    try:
        coll = db["english_test_questions"]
        # sample N, and strip _id so FastAPI doesn't choke on ObjectId
        docs = list(coll.aggregate([
            {"$sample": {"size": int(limit)}},
            {"$project": {"_id": 0, "id": 1, "question": 1, "options": 1}}
        ]))

        out = []
        for i, d in enumerate(docs, 1):
            q = d.get("question") or d.get("prompt") or ""
            opts = d.get("options") or d.get("choices") or []
            out.append({
                "id": str(d.get("id") or i),
                "question": q,
                "options": list(opts)
            })

        # If collection exists but empty, still give sample
        if not out:
            out = SAMPLE[:max(0, int(limit))]
        return { "questions": out }
    except Exception:
        # absolutely never 500 this endpoint during local dev
        return { "questions": SAMPLE[:max(0, int(limit))] }

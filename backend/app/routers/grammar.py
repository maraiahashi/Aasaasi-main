from fastapi import APIRouter, HTTPException, Query, Request

router = APIRouter()

@router.get("/grammar/topics")
def list_topics(request: Request):
    db = request.app.state.db
    if db is None:
        raise HTTPException(503, "DB not ready")
    cur = db.grammar_topics.find({}, {"_id": 0}).sort([("order", 1), ("slug", 1)])
    return {"topics": list(cur)}

@router.get("/grammar/tips")
def get_tips(request: Request, topic: str = Query(...)):
    db = request.app.state.db
    if db is None:
        raise HTTPException(503, "DB not ready")
    doc = db.grammar_tips.find_one({"topic": topic}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="No tips found for topic")
    return doc

@router.get("/grammar/test")
def get_test(request: Request, topic: str = Query(...)):
    db = request.app.state.db
    if db is None:
        raise HTTPException(503, "DB not ready")
    questions = list(db.grammar_questions.find({"topic": topic}, {"_id": 0}))
    if not questions:
        raise HTTPException(status_code=404, detail="No questions for topic")
    return {"topic": topic, "questions": questions}

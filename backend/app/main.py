# backend/app/main.py
import os
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient, DESCENDING

from .routers import dictionary, grammar, vocab, analytics, ai, tests, english_test, idioms, content

origins = ["https://<your-vercel-domain>.vercel.app"]

MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")
DB_NAME   = os.getenv("DB_NAME", "aasasasi_db")  

app = FastAPI(title="Aasaasi API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://aasaasi-main.vercel.app/"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def _startup():
    client = MongoClient(MONGO_URI)
    app.state.mongo = client
    app.state.db = client[DB_NAME]

@app.get("/api/health")
def health():
    try:
        app.state.db.command("ping")
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}

# ------------------------------
# Existing routers (unchanged)
# ------------------------------
app.include_router(dictionary.router,    prefix="/api")
app.include_router(grammar.router,       prefix="/api")
app.include_router(vocab.router,         prefix="/api")
app.include_router(analytics.router,     prefix="/api")
app.include_router(ai.router,            prefix="/api")
app.include_router(tests.router,         prefix="/api")
app.include_router(english_test.router,  prefix="/api")
app.include_router(idioms.router,        prefix="/api")
app.include_router(content.router,       prefix="/api")

# =========================================================
# SHIMS to satisfy frontend paths WITHOUT touching routers
# =========================================================
# 1) GET /api/content/word-of-the-day
#    Adjust collection name if yours differs (e.g., "wotd", "content_wotd", etc.)
@app.get("/api/content/word-of-the-day")
def shim_word_of_the_day():
    db = app.state.db
    # Try explicit "current" first
    doc = db["content_word_of_the_day"].find_one({"isCurrent": True}, {"_id": 0})
    if not doc:
        # Fallback to latest by createdAt
        doc = db["content_word_of_the_day"].find_one({}, {"_id": 0}, sort=[("createdAt", DESCENDING)])
    if not doc:
        raise HTTPException(status_code=404, detail="Word of the day not found")
    return doc

# 2) GET /api/english-test/questions?limit=12
#    Adjust collection name if yours differs (e.g., "english_test_questions")
@app.get("/api/english-test/questions")
def shim_english_test_questions(limit: int = Query(12, ge=1, le=50)) -> List[dict]:
    db = app.state.db
    cur = db["english_test_questions"].find({}, {"_id": 0}).sort("createdAt", DESCENDING).limit(limit)
    items = list(cur)
    if not items:
        # If you prefer 200 with empty list instead of 404, keep this:
        return []
    return items

# 3) GET /api/idioms/current
#    Adjust collection name if yours differs (e.g., "idioms")
@app.get("/api/idioms/current")
def shim_idioms_current():
    db = app.state.db
    doc = db["idioms"].find_one({"isCurrent": True}, {"_id": 0})
    if not doc:
        doc = db["idioms"].find_one({}, {"_id": 0}, sort=[("createdAt", DESCENDING)])
    if not doc:
        raise HTTPException(status_code=404, detail="No idiom set")
    return doc

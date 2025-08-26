# backend/app/main.py
import os
from typing import List
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient, DESCENDING
from .routers import dictionary, grammar, vocab, analytics, ai, tests, english_test, idioms, content

MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")
DB_NAME   = os.getenv("DB_NAME", "aasasasi_db")

app = FastAPI(title="Aasaasi API")

# backend/app/main.py
origins = [o.strip() for o in os.getenv("CORS_ORIGINS","").split(",") if o.strip()] or ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("CORS_ORIGINS","").split(",") if o.strip()] or ["http://localhost:5173"],
    allow_origin_regex=os.getenv("ALLOW_ORIGIN_REGEX", r"https://.*\.vercel\.app$"),
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

app.include_router(dictionary.router,    prefix="/api")
app.include_router(grammar.router,       prefix="/api")
app.include_router(vocab.router,         prefix="/api")
app.include_router(analytics.router,     prefix="/api")
app.include_router(ai.router,            prefix="/api")
app.include_router(tests.router,         prefix="/api")
app.include_router(english_test.router,  prefix="/api")
app.include_router(idioms.router,        prefix="/api")
app.include_router(content.router,       prefix="/api")

# Shims
@app.get("/api/content/word-of-the-day")
def shim_wotd():
    db = app.state.db
    doc = db["content_word_of_the_day"].find_one({"isCurrent": True}, {"_id": 0}) \
       or db["content_word_of_the_day"].find_one({}, {"_id": 0}, sort=[("createdAt", DESCENDING)])
    if not doc: raise HTTPException(404, "Word of the day not found")
    return doc

@app.get("/api/english-test/questions")
def shim_questions(limit: int = Query(12, ge=1, le=50)) -> List[dict]:
    items = list(app.state.db["english_test_questions"].find({}, {"_id": 0}).sort("createdAt", DESCENDING).limit(limit))
    return items

@app.get("/api/idioms/current")
def shim_idiom():
    db = app.state.db
    doc = db["idioms"].find_one({"isCurrent": True}, {"_id": 0}) \
       or db["idioms"].find_one({}, {"_id": 0}, sort=[("createdAt", DESCENDING)])
    if not doc: raise HTTPException(404, "No idiom set")
    return doc

# Friendly home page instead of 404 at "/"
@app.get("/")
def root():
    return {"ok": True, "service": "Aasaasi API", "docs": "/docs", "health": "/api/health"}

from app.routes.probes import router as probes_router
app.include_router(probes_router)

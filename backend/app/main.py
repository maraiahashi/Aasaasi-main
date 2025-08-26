# backend/app/main.py
import os
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from dotenv import load_dotenv

load_dotenv()  # harmless on Render

app = FastAPI(title="Aasaasi API", version="1.0.0")

# ---------- CORS (stable: prod, previews, local) ----------
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "")
origins = [o.strip() for o in CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,                               # explicit allow-list from env
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",   # any Vercel preview
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# ---------- Mongo init & health ----------
def _connect_db():
    url = os.getenv("MONGO_URL")
    name = os.getenv("MONGO_DB")
    if not url or not name:
        app.state.db = None
        app.state.db_err = "Missing MONGO_URL or MONGO_DB"
        return
    try:
        client = MongoClient(
            url,
            serverSelectionTimeoutMS=2000,
            connectTimeoutMS=2000,
            socketTimeoutMS=2000,
        )
        client.admin.command("ping")  # force connectivity now
        app.state.db = client[name]
        app.state.db_err = None
    except Exception as e:
        app.state.db = None
        app.state.db_err = str(e)

@app.on_event("startup")
def _startup():
    _connect_db()

@app.get("/api/health")
def health():
    if getattr(app.state, "db", None) is None:
        _connect_db()
    return {
        "status": "ok",
        "db": "up" if getattr(app.state, "db", None) is not None else "down",
        "err": getattr(app.state, "db_err", None),
    }

@app.head("/api/health")
def _health_head():
    return Response(status_code=200)

@app.options("/api/health")
def _health_options():
    return Response(status_code=200)

@app.get("/")
def root():
    return {"ok": True, "service": "Aasaasi API", "docs": "/docs", "health": "/api/health"}

@app.head("/")
def root_head():
    return Response(status_code=200)

# Map ANY PyMongo failure to 503 so DB issues never appear as 500
@app.exception_handler(PyMongoError)
def _handle_pymongo_err(_, exc: PyMongoError):
    return JSONResponse({"detail": "DB unavailable"}, status_code=503)

# ---------- Routers ----------
from app.routers import dictionary, grammar, vocab, analytics, ai, tests, idioms, content  # type: ignore
from .routes.english_test import router as english_test_router
try:
    from app.routes import english_test  # type: ignore
except Exception:
    english_test = None

app.include_router(dictionary.router,  prefix="/api")
app.include_router(grammar.router,     prefix="/api")
app.include_router(vocab.router,       prefix="/api")
app.include_router(analytics.router,   prefix="/api")
app.include_router(ai.router,          prefix="/api")
app.include_router(tests.router,       prefix="/api")
app.include_router(idioms.router,      prefix="/api")
app.include_router(content.router,     prefix="/api")
app.include_router(english_test.router, prefix="/api")
app.include_router(english_test_router, prefix="/api/english-test")


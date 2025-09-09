# backend/app/main.py
import os
from typing import Optional

from fastapi import FastAPI, Response, APIRouter, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Aasaasi API", version="1.0.0")

# ---------------- CORS ----------------
_default_dev_origins = {"http://localhost:5173", "http://127.0.0.1:5173"}
_env_origins = {o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()}
allow_origins = list(_default_dev_origins | _env_origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=r"^https:\/\/.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- Mongo & health ----------------
def _pick(key_primary: str, key_alt: str) -> Optional[str]:
    """Read env var by primary name or fallback name."""
    return os.getenv(key_primary) or os.getenv(key_alt)

def _connect_db() -> None:
    url = _pick("MONGO_URL", "MONGO_URI")
    name = _pick("MONGO_DB", "DB_NAME")

    if not url or not name:
        app.state.db = None
        app.state.db_err = "Missing MONGO_URL/MONGO_URI or MONGO_DB/DB_NAME"
        return
    try:
        client = MongoClient(
            url,
            serverSelectionTimeoutMS=2000,
            connectTimeoutMS=2000,
            socketTimeoutMS=2000,
        )
        client.admin.command("ping")
        app.state.db = client[name]
        app.state.db_err = None
    except Exception as e:
        app.state.db = None
        app.state.db_err = str(e)

@app.on_event("startup")
def _startup() -> None:
    _connect_db()

@app.get("/api/health")
def health():
    if getattr(app.state, "db", None) is None:
        _connect_db()
    return {
        "ok": True,
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

@app.exception_handler(PyMongoError)
def _handle_pymongo_err(_, __: PyMongoError):
    return JSONResponse({"detail": "DB unavailable"}, status_code=503)

# ---------------- Routers ----------------
DEMO_MODE = os.getenv("DEMO_MODE", "0") == "1"

if DEMO_MODE:
    from .demo_api import router as demo_router  # type: ignore
    app.include_router(demo_router, prefix="")
else:
    from .routers import dictionary, grammar, vocab, analytics, ai, tests, idioms, content  # type: ignore

    # English tests router (look in a few places)
    english_tests_router = None
    try:
        from .routers.english_tests import router as english_tests_router  # type: ignore
    except Exception:
        try:
            from .routers.english_test import router as english_tests_router  # type: ignore
        except Exception:
            try:
                from .routes.english_tests import router as english_tests_router  # type: ignore
            except Exception:
                try:
                    from .routes.english_test import router as english_tests_router  # type: ignore
                except Exception:
                    english_tests_router = None

    app.include_router(dictionary.router, prefix="/api")
    app.include_router(grammar.router,    prefix="/api")
    app.include_router(vocab.router,      prefix="/api")
    app.include_router(analytics.router,  prefix="/api")
    app.include_router(ai.router,         prefix="/api")
    app.include_router(tests.router,      prefix="/api")
    app.include_router(idioms.router,     prefix="/api")
    app.include_router(content.router,    prefix="/api")
    if english_tests_router:
        app.include_router(english_tests_router, prefix="/api")

    # ----- legacy aliases for old frontend paths -----
    legacy = APIRouter()

    @legacy.get("/english-test/questions")
    def _legacy_questions(request: Request):
        qp = str(request.query_params)
        url = "/api/tests/english/questions"
        if qp:
            url += f"?{qp}"
        return RedirectResponse(url=url, status_code=307)

    @legacy.post("/english-test/grade")
    def _legacy_grade():
        return RedirectResponse(url="/api/tests/english/grade", status_code=307)

    app.include_router(legacy, prefix="/api")

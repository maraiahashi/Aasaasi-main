
# backend/app/main.py
from __future__ import annotations
import os, re
from importlib import import_module
from typing import List

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient

app = FastAPI(title="Aasaasi API")

# --- CORS -------------------------------------------------------------
_env_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
allow_regex = r"^https?://([a-z0-9-]+\.)*vercel\.app(:\d+)?$"  # any *.vercel.app
origins: List[str] = _env_origins or ["http://localhost:5173", "http://127.0.0.1:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=allow_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DB (Mongo) -------------------------------------------------------
mongo_client: MongoClient | None = None

@app.on_event("startup")
def _startup():
    global mongo_client
    url = os.getenv("MONGO_URL", "mongodb://127.0.0.1:27017")
    name = os.getenv("MONGO_DB", "aasaasi_db")
    mongo_client = MongoClient(url)
    app.state.db = mongo_client[name]

@app.on_event("shutdown")
def _shutdown():
    global mongo_client
    if mongo_client:
        mongo_client.close()

# --- Root & simple HEAD (Render’s head probe sometimes hits /) --------
@app.get("/")
def root():
    return {"ok": True, "service": "Aasaasi API", "docs": "/docs", "health": "/api/health"}

@app.head("/")
def root_head():
    return Response(status_code=200)

# --- Include routers ---------------------------------------------------
def _include(module_path: str, *, prefix: str = "/api"):
    """Include a module's 'router' if present. No crash if missing."""
    try:
        mod = import_module(module_path)
        router = getattr(mod, "router", None)
        if router is not None:
            # Only add /api prefix if routes inside are NOT already /api/*
            pre = prefix
            if module_path.endswith(".probes"):
                # probes defines absolute '/api/health' and '/' already
                pre = ""
            app.include_router(router, prefix=pre)
    except Exception:
        # Silently skip if the file isn’t in this project (we don’t want to break prod)
        pass

# Routers under app.routers.*
_include("app.routers.ai")          # /api/ai/...
_include("app.routers.dictionary")  # /api/dictionary/...
_include("app.routers.content")     # /api/content/...
_include("app.routers.vocab")       # /api/vocab/...
_include("app.routers.tests")       # /api/tests/...
_include("app.routers.analytics")
# Routers under app.routes.*  (kept for backward-compat)
_include("app.routes.english_test") # /api/english-test/...
_include("app.routes.grammar")      # /api/grammar/...
_include("app.routes.idioms")       # /api/idioms/...
_include("app.routes.probes")       # defines /api/health and '/'/HEAD itself (no extra /api)

# Fallback health if probes isn’t present for some reason
try:
    from fastapi import APIRouter
    _health_defined = any(str(r.path) == "/api/health" for r in app.router.routes)
    if not _health_defined:
        r = APIRouter()
        @r.get("/api/health")
        @r.head("/api/health")
        def _health():
            return {"status": "ok"}
        app.include_router(r)
except Exception:
    pass



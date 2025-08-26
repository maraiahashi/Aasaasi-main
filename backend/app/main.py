# backend/app/main.py
import os
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient

app = FastAPI(title="Aasaasi API")

# ---- CORS (works for all Vercel preview/prod domains + optional explicit list)
_allow_regex = r"https://([a-z0-9-]+\.)*vercel\.app"
_explicit = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_explicit,
    allow_origin_regex=_allow_regex,  # covers preview + prod aliases
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Mongo (fast ping on startup; fail soft → db=None so routes return 503)
@app.on_event("startup")
def _init_db():
    app.state.db = None
    url = os.getenv("MONGO_URL")           # e.g. mongodb+srv://user:pass@cluster/... 
    name = os.getenv("MONGO_DB", "aasaasi_db")
    if not url:
        print("⚠️  MONGO_URL not set; starting without DB")
        return
    try:
        client = MongoClient(url, serverSelectionTimeoutMS=2000, connectTimeoutMS=2000)
        client.admin.command("ping")
        app.state.db = client[name]
        print("✅ Connected to Mongo")
    except Exception as e:
        print(f"⚠️  Mongo unavailable: {e!r} (routes will return 503)")

# ---- Probes (Render uses these during deploy)
@app.get("/")
def root():
    return {"ok": True, "service": "Aasaasi API", "docs": "/docs", "health": "/api/health"}

@app.head("/")
def root_head():
    return Response(status_code=200)

@app.get("/api/health")
def health():
    return {"status": "ok", "db": "ready" if app.state.db is not None else "down"}

@app.head("/api/health")
def health_head():
    return Response(status_code=200)

@app.options("/api/health")
def health_options():
    return Response(status_code=200)

# ---- Routers (single include per router; keep existing URL shapes)
from app.routers import dictionary, grammar, vocab, analytics, ai, tests, content
# english_test / idioms may live in routers/ or routes/ depending on your tree
try:
    from app.routers import english_test  # noqa
except Exception:
    from app.routes import english_test    # noqa
try:
    from app.routers import idioms  # noqa
except Exception:
    from app.routes import idioms    # noqa

app.include_router(dictionary.router,   prefix="/api")
app.include_router(grammar.router,      prefix="/api")
app.include_router(vocab.router,        prefix="/api")
app.include_router(analytics.router,    prefix="/api")
app.include_router(ai.router,           prefix="/api")
app.include_router(tests.router,        prefix="/api")
app.include_router(english_test.router, prefix="/api")
app.include_router(idioms.router,       prefix="/api")
app.include_router(content.router,      prefix="/api")
app.include_router(analytics.router,    prefix="/api")
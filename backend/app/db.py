# backend/app/db.py
import os
from pymongo import MongoClient

_client = None
db = None  # module-level holder for convenience

def connect():
    """Create (or reuse) a single MongoClient and return the DB."""
    global _client, db
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    mongo_db  = os.getenv("MONGO_DB",  "aasaasi_db")
    if _client is None:
        _client = MongoClient(mongo_url)
    db = _client[mongo_db]
    return db

def get_db():
    """Return the active DB (connecting if needed)."""
    return db or connect()

def ping():
    """Raise if we cannot reach MongoDB."""
    cli = _client or MongoClient(os.getenv("MONGO_URL", "mongodb://localhost:27017"))
    cli.admin.command("ping")

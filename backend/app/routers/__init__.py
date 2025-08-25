# backend/app/routers/__init__.py
from . import health, tests, ai, analytics, content, dictionary, grammar, vocab, english_test

__all__ = [
    "health", "tests", "ai", "analytics", "content",
    "dictionary", "grammar", "vocab", "english_test"
]

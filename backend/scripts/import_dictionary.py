#!/usr/bin/env python3
"""
Load Aasaasi bilingual dictionary from Excel/ODS into MongoDB.

Expected columns (case-insensitive, spaces ok):
Headword | Pronunciation | Part of Sppech | Word Forms | Phrase | Usage Note | Meaning | Example
"""
import argparse, os, re
from datetime import datetime
from typing import List, Dict, Any
import pandas as pd
from pymongo import MongoClient

COL_MAP = {
    "headword": "Headword",
    "pronunciation": "Pronunciation",
    "pos": "Part of Sppech",
    "wordForms": "Word Forms",
    "phrase": "Phrase",
    "usageNote": "Usage Note",
    "meaning": "Meaning",
    "example": "Example",
}
def _norm(s: str) -> str: return re.sub(r"[^a-z]", "", s.lower())

def _read(path: str) -> pd.DataFrame:
    ext = os.path.splitext(path)[1].lower()
    if ext == ".ods": return pd.read_excel(path, engine="odf")
    return pd.read_excel(path)  # xlsx/xls via openpyxl

def _s(v): 
    if v is None or (isinstance(v, float) and pd.isna(v)): return ""
    try: 
        s = str(v).strip()
    except Exception:
        s = str(v)
    return s

def _split_examples(v) -> List[str]:
    s = _s(v)
    if not s: return []
    parts = re.split(r"[\n\r]+|[•·]\s*", s)
    return [p.strip() for p in parts if p.strip()][:5]

def load_rows(path: str) -> List[Dict[str, Any]]:
    df = _read(path)
    # map columns robustly
    lookup = { _norm(c): c for c in df.columns }
    def col(key: str) -> str:
        want = _norm(COL_MAP[key])
        return lookup.get(want, "")
    rows = []
    for _, r in df.iterrows():
        head = _s(r.get(col("headword")))
        if not head: 
            continue
        doc = {
            "english": head,
            "pronunciation": _s(r.get(col("pronunciation"))),
            "pos": _s(r.get(col("pos"))),
            "wordForms": _s(r.get(col("wordForms"))),
            "phrase": _s(r.get(col("phrase"))),
            "usageNote": _s(r.get(col("usageNote"))),
            "somali": _s(r.get(col("meaning"))),          # Somali meaning/translation
            "examples_en": _split_examples(r.get(col("example"))),
            "source": os.path.basename(path),
        }
        # drop empties
        doc = {k:v for k,v in doc.items() if (v or v == 0)}
        rows.append(doc)
    return rows

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--uri", default="mongodb://127.0.0.1:27017")
    ap.add_argument("--db", default="aasaasi")
    ap.add_argument("--collection", default="dictionary")
    ap.add_argument("files", nargs="+")
    args = ap.parse_args()

    client = MongoClient(args.uri)
    col = client[args.db][args.collection]
    col.create_index("english")
    col.create_index("somali")

    total = 0
    for p in args.files:
        docs = load_rows(p)
        for d in docs:
            now = datetime.utcnow()
            d["updatedAt"] = now
            col.update_one(
                {"english": {"$regex": f"^{re.escape(d['english'])}$", "$options": "i"}},
                {"$set": d, "$setOnInsert": {"createdAt": now}},
                upsert=True
            )
            total += 1
        print(f"Imported {len(docs)} rows from {os.path.basename(p)}")
    print(f"Done. Upserts: {total}")

if __name__ == "__main__":
    main()

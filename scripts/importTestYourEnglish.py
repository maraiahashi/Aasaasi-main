#!/usr/bin/env python3
import argparse
from pathlib import Path
import pandas as pd
from pymongo import MongoClient

def _s(x):
    if x is None: return ""
    s = str(x).strip()
    return "" if s.lower() in ("nan","none") else s

def _u(x):
    s = _s(x)
    return s.upper()

def _reheader(df_raw: pd.DataFrame, hdr_row: int) -> pd.DataFrame:
    header = df_raw.iloc[hdr_row].tolist()
    data = df_raw.iloc[hdr_row+1:].copy()
    data.columns = header
    return data.reset_index(drop=True)

def _read_sheet(xls: pd.ExcelFile, sheet_name: str):
    raw = pd.read_excel(xls, sheet_name=sheet_name, header=None, dtype=str)
    # find header row that contains at least Question + Correct Response
    hdr = None
    for r in range(min(80, len(raw))):
        row = [(_s(v)).lower() for v in raw.iloc[r].tolist()]
        if "question" in row and ("correct response" in row or "correct" in row):
            hdr = r
            break
    if hdr is None:
        return []

    df = _reheader(raw, hdr)
    cols = {(_s(c)).lower(): c for c in df.columns}
    c_q  = cols.get("question")
    c_c  = cols.get("correct response") or cols.get("correct")
    c_d1 = cols.get("distractor 1") or cols.get("distractor1")
    c_d2 = cols.get("distractor 2") or cols.get("distractor2")

    # difficulty / levels
    # your sheets use two different legends: Quick 3 (DIFFICULTY) and Detailed 6 (LEVEL)
    # match loosely:
    c_quick3 = None
    c_level6 = None
    for k, v in cols.items():
        if "difficulty" in k or "quick 3" in k or "quick3" in k:
            c_quick3 = v
        if k == "level" or "detailed 6" in k or "6 levels" in k:
            c_level6 = v

    docs = []
    for _, r in df.iterrows():
        q  = _s(r.get(c_q)) if c_q else ""
        cc = _s(r.get(c_c)) if c_c else ""
        if not q or not cc:  # require question + correct
            continue
        d1 = _s(r.get(c_d1)) if c_d1 else ""
        d2 = _s(r.get(c_d2)) if c_d2 else ""
        quick3 = _s(r.get(c_quick3)) if c_quick3 else ""
        level6 = _u(r.get(c_level6)) if c_level6 else ""  # A1..C2

        docs.append({
            "question": q,
            "correct": cc,
            "distractor1": d1 or None,
            "distractor2": d2 or None,
            "quick3": quick3 or None,      # Beginner / Intermediate / Advanced (or blank)
            "level6": level6 or None,      # A1..C2 (or blank)
        })
    return docs

def import_excel(xl_path: str, coll):
    xls = pd.ExcelFile(xl_path)
    all_docs = []
    for s in xls.sheet_names:
        all_docs += _read_sheet(xls, s)
    if not all_docs:
        print("No questions found in the workbook.")
        return 0

    coll.drop()
    coll.create_index([("question", 1)])
    coll.insert_many(all_docs)
    print(f"Imported English test questions: {len(all_docs)}")
    return len(all_docs)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--excel", required=True)
    ap.add_argument("--mongo-url", default="mongodb://localhost:27017")
    ap.add_argument("--db", default="aasaasi_db")
    args = ap.parse_args()

    cli = MongoClient(args.mongo_url)
    db = cli[args.db]
    import_excel(args.excel, db["english_test_questions"])

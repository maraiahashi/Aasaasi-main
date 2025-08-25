# backend/tools/ingest_excel.py
import os
import sys
import re
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
from pymongo import MongoClient, UpdateOne

# -------------------------
# Config
# -------------------------
DATA_DIR = os.getenv("DATA_DIR", os.path.join(os.getcwd(), "backend", "data"))
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
MONGO_DB  = os.getenv("MONGO_DB",  "aasaasi_db")

pd.options.mode.copy_on_write = True


# -------------------------
# Helpers
# -------------------------
def s(val: Any) -> Optional[str]:
    """Clean a cell into a trimmed string or None."""
    if val is None:
        return None
    if isinstance(val, float) and pd.isna(val):
        return None
    text = str(val).strip()
    if text == "" or text.lower() in ("nan", "none"):
        return None
    return text


def read_xlsx(path: str, sheet_name=None) -> pd.DataFrame:
    return pd.read_excel(path, sheet_name=sheet_name, header=None, engine="openpyxl")


def find_cell(df: pd.DataFrame, needle: str) -> Optional[Tuple[int, int]]:
    """Find first cell equal to `needle` (case-insensitive, trimmed)."""
    n = needle.strip().lower()
    for r in range(len(df)):
        row = df.iloc[r]
        for c in range(len(row)):
            v = s(row.iloc[c])
            if v and v.strip().lower() == n:
                return r, c
    return None


def find_row_with_sequence(df: pd.DataFrame, labels: List[str]) -> Optional[Tuple[int, int]]:
    """
    Find a row that contains consecutive headers equal to labels
    (e.g., ["Answer", "Distractor 1", "Distractor 2"]).
    Returns (row_index, starting_col_index).
    """
    L = [lab.strip().lower() for lab in labels]
    for r in range(min(25, len(df))):  # only scan top area
        row = [s(v) for v in df.iloc[r].tolist()]
        row_l = [v.lower() if v else None for v in row]
        for c in range(0, max(0, len(row_l) - len(L) + 1)):
            window = row_l[c : c + len(L)]
            if window == L:
                return r, c
    return None


def nonempty(*vals: Any) -> bool:
    return any(s(v) for v in vals)


def dedup_choices(choices: List[str]) -> List[str]:
    out, seen = [], set()
    for ch in choices:
        t = s(ch)
        if not t:
            continue
        key = t.lower()
        if key not in seen:
            seen.add(key)
            out.append(t)
    return out


# -------------------------
# WOD words (2019-2024)
# -------------------------
def load_wod_words(db):
    xlsx = os.path.join(DATA_DIR, "WOD 2019 - 2024.xlsx")
    if not os.path.exists(xlsx):
        print("WOD file not found:", xlsx)
        return

    years = [("WoD 2019", "2019"), ("WoD 2020", "2020"), ("WoD 2021", "2021"),
             ("WoD 2022", "2022"), ("WoD 2023", "2023"), ("WoD 2024", "2024")]

    ops: List[UpdateOne] = []
    total_rows = 0
    kept = 0

    for sheet_name, year in years:
        df = read_xlsx(xlsx, sheet_name=sheet_name)
        # Find the 3 headers
        p_word = find_cell(df, "WORD OF THE DAY")
        p_mean = find_cell(df, "Learn it in English - Meaning")
        p_ex   = find_cell(df, "Learn it in English - Example Sentence")

        if not p_word or not p_mean:
            # Sometimes the meaning header text differs slightly; fallback
            if not p_mean:
                p_mean = find_cell(df, "Learn it in English - Meaning                                                                   ")
        # Example column may be missing (e.g., 2024)
        # Determine row where data starts = one row under the headers
        if not p_word or not p_mean:
            print(f"[WOD WORDS] {sheet_name}: headers not found -> 0 rows")
            continue

        start_row = max(p_word[0], p_mean[0]) + 1
        c_word = p_word[1]
        c_mean = p_mean[1]
        c_ex   = p_ex[1] if p_ex else None

        # Walk down until word column goes empty for a long tail
        rows = []
        for r in range(start_row, len(df)):
            word = s(df.iat[r, c_word]) if c_word is not None else None
            meaning = s(df.iat[r, c_mean]) if c_mean is not None else None
            example = s(df.iat[r, c_ex]) if (c_ex is not None and c_ex < df.shape[1]) else None

            if not nonempty(word, meaning, example):
                continue
            # skip the header echo if present
            if word and word.lower().startswith("word of the day"):
                continue

            total_rows += 1
            if not word:
                continue

            doc = {"year": year, "word": word, "meaning": meaning or "", "example": example}
            ops.append(
                UpdateOne(
                    {"year": year, "word": word},
                    {"$set": doc},
                    upsert=True,
                )
            )
            kept += 1

        print(f"[WOD WORDS] {sheet_name}: word='WORD OF THE DAY', meaning='Learn it in English - Meaning', example={'present' if c_ex is not None else 'None'} -> {kept} so far")

    if ops:
        res = db["wod_words"].bulk_write(ops, ordered=False)
    print(f"WOD WORDS: upserted {kept} entries (rows seen {total_rows}, kept {kept})")


# -------------------------
# Idiom of the Day
# -------------------------
def load_idioms(db):
    xlsx = os.path.join(DATA_DIR, "Idiom of the Day.xlsx")
    if not os.path.exists(xlsx):
        print("Idioms file not found:", xlsx)
        return

    df = read_xlsx(xlsx, sheet_name="Sheet1")
    # Find headers
    p_idiom = find_cell(df, "Idiom of the Day")
    p_mean  = find_cell(df, "Meaning in English")
    # English example column label in your sheet looks like "Tusaale" (English ex)
    p_ex    = find_cell(df, "Tusaale")
    # Some sheets also have Somali columns — we ignore them for now.

    if not p_idiom or not p_mean:
        print("[IDIOM] headers not found.")
        return

    start_row = max(p_idiom[0], p_mean[0]) + 1
    c_i, c_m = p_idiom[1], p_mean[1]
    c_e = p_ex[1] if p_ex else None

    ops: List[UpdateOne] = []
    rows = 0
    kept = 0
    for r in range(start_row, len(df)):
        rows += 1
        idiom = s(df.iat[r, c_i])
        meaning = s(df.iat[r, c_m])
        example = s(df.iat[r, c_e]) if c_e is not None else None
        if not s(idiom):
            continue
        if idiom.lower().startswith("idiom of the day"):
            continue
        doc = {"idiom": idiom, "meaning": meaning or "", "example": example}
        ops.append(UpdateOne({"idiom": idiom}, {"$set": doc}, upsert=True))
        kept += 1

    if ops:
        db["idiom_entries"].bulk_write(ops, ordered=False)
    print(f"IDIOMS: upserted {kept} entries (rows seen {rows}, kept {kept})")


# -------------------------
# Generic parser for *tests* sheets that have
#  - Free Response:  [Meaning | Answer]
#  - MCQ:            [Prompt | Answer | Distractor 1 | Distractor 2]
# -------------------------
def parse_tests_sheet(df: pd.DataFrame) -> Tuple[List[Dict], List[Dict]]:
    # Find FR header pair: "Meaning", "Answer"
    pos_fr = None
    for r in range(min(25, len(df))):
        row = [s(v) for v in df.iloc[r].tolist()]
        for c in range(len(row) - 1):
            if (row[c] and row[c].strip().lower() == "meaning" and
                row[c + 1] and row[c + 1].strip().lower() == "answer"):
                pos_fr = (r, c)
                break
        if pos_fr:
            break

    # Find MCQ headers: "Answer", "Distractor 1", "Distractor 2" in a row
    pos_mcq = find_row_with_sequence(df, ["Answer", "Distractor 1", "Distractor 2"])

    fr_items: List[Dict] = []
    mcq_items: List[Dict] = []

    # Collect FR
    if pos_fr:
        sr, sc = pos_fr
        r = sr + 1
        idx = 1
        while r < len(df):
            prompt = s(df.iat[r, sc])   # Meaning
            answer = s(df.iat[r, sc + 1])  # Answer
            # Stop when neither column has data in the row
            if not nonempty(prompt, answer):
                r += 1
                continue
            # Skip stray header echoes
            if prompt and prompt.lower() == "meaning":
                r += 1
                continue
            if answer and answer.lower() == "answer":
                r += 1
                continue
            fr_items.append({"id": idx, "prompt": prompt or "", "answer": answer or ""})
            idx += 1
            r += 1

    # Collect MCQ
    if pos_mcq:
        sr, sc_ans = pos_mcq  # sc_ans points to "Answer"
        c_prompt = sc_ans - 1  # the column before "Answer"
        c_ans, c_d1, c_d2 = sc_ans, sc_ans + 1, sc_ans + 2
        r = sr + 1
        idx = 1
        while r < len(df):
            prompt = s(df.iat[r, c_prompt])
            ans = s(df.iat[r, c_ans])
            d1 = s(df.iat[r, c_d1]) if c_d1 < df.shape[1] else None
            d2 = s(df.iat[r, c_d2]) if c_d2 < df.shape[1] else None
            if not nonempty(prompt, ans, d1, d2):
                r += 1
                continue
            # Skip header echoes
            if prompt and prompt.lower().startswith("read the meaning"):
                r += 1
                continue
            # If someone typed the meaning into Answer by mistake, still keep what we can
            choices = dedup_choices([ans, d1, d2])
            mcq_items.append({"id": idx, "prompt": prompt or "", "answer": ans or "", "choices": choices})
            idx += 1
            r += 1

    return fr_items, mcq_items


# -------------------------
# Load WoD tests (all years in one xlsx)
# -------------------------
def load_wod_tests(db):
    xlsx = os.path.join(DATA_DIR, "WOD 2019 - 2024.xlsx")
    if not os.path.exists(xlsx):
        print("WOD file not found:", xlsx)
        return

    sections = []
    total = 0

    for year_sheet in ["WoD TESTS 2019", "WoD TESTS 2020", "WoD TESTS 2021",
                       "WoD TESTS 2022", "WoD TESTS 2023", "WoD TESTS 2024"]:
        if year_sheet not in pd.ExcelFile(xlsx).sheet_names:
            continue
        df = read_xlsx(xlsx, sheet_name=year_sheet)
        fr, mcq = parse_tests_sheet(df)
        total += len(fr) + len(mcq)
        if fr:
            sections.append({"name": f"{year_sheet} – FR", "items": fr})
        if mcq:
            sections.append({"name": f"{year_sheet} – MCQ", "items": mcq})

    upsert_test_doc(db, kind="wod", title="Words of the Day – Mixed Years", sections=sections)
    print(f"WOD TESTS: upserted with {total} items")


# -------------------------
# Vocab tests (separate xlsx)
# -------------------------
def load_vocab_tests(db):
    xlsx = os.path.join(DATA_DIR, "Vocab tests.xlsx")
    if not os.path.exists(xlsx):
        print("VOCAB TESTS: file not found, skipping")
        return

    df = read_xlsx(xlsx, sheet_name="Sheet1")
    fr, mcq = parse_tests_sheet(df)
    total = len(fr) + len(mcq)
    if total == 0:
        print("VOCAB TESTS: 0 items (no matching columns)")
        return

    sections = []
    if fr:
        sections.append({"name": "Free Response", "items": fr})
    if mcq:
        sections.append({"name": "MCQ", "items": mcq})
    upsert_test_doc(db, kind="vocab", title="Vocabulary Tests", sections=sections)
    print(f"VOCAB TESTS: upserted with {total} items")


# -------------------------
# Idiom tests (separate xlsx)
# -------------------------
def load_idiom_tests(db):
    xlsx = os.path.join(DATA_DIR, "Idiom tests.xlsx")
    if not os.path.exists(xlsx):
        print("IDIOM TESTS: file not found, skipping")
        return

    df = read_xlsx(xlsx, sheet_name="Sheet1")
    fr, mcq = parse_tests_sheet(df)
    total = len(fr) + len(mcq)
    if total == 0:
        print("IDIOM TESTS: 0 items (no matching columns)")
        return

    sections = []
    if fr:
        sections.append({"name": "Free Response", "items": fr})
    if mcq:
        sections.append({"name": "MCQ", "items": mcq})
    upsert_test_doc(db, kind="idiom", title="Idiom Tests", sections=sections)
    print(f"IDIOM TESTS: upserted with {total} items")


# -------------------------
# Test your English (MCQ with levels)
# -------------------------
def load_english_test(db):
    xlsx = os.path.join(DATA_DIR, "Test your English.xlsx")
    if not os.path.exists(xlsx):
        print("ENGLISH TEST: file not found, skipping")
        return

    df = read_xlsx(xlsx, sheet_name="Sheet1")

    # Find the header row that has these five labels
    # [Question, Correct Response, Distractor 1, Distractor 2, ... (levels columns)]
    pos = None
    for r in range(min(25, len(df))):
        row = [s(v) for v in df.iloc[r].tolist()]
        row_l = [v.lower() if v else None for v in row]
        # must have at least these four in order:
        needed = ["question", "correct response", "distractor 1", "distractor 2"]
        for c in range(0, max(0, len(row_l) - len(needed) + 1)):
            if row_l[c : c + 4] == needed:
                pos = (r, c)
                break
        if pos:
            break

    items = []
    if pos:
        sr, sc = pos
        c_q, c_a, c_d1, c_d2 = sc, sc + 1, sc + 2, sc + 3
        # Optional columns for levels
        # Quick 3 Levels (e.g., Beginner/Intermediate/Advanced), Detailed 6 Levels (A1..C2)
        c_q3 = None
        c_d6 = None
        header_row = [s(v) for v in df.iloc[sr].tolist()]
        for j, h in enumerate(header_row):
            if not h:
                continue
            t = h.strip().lower()
            if t.startswith("quick 3 levels"):
                c_q3 = j
            elif t.startswith("detailed 6 levels"):
                c_d6 = j

        idx = 1
        for r in range(sr + 1, len(df)):
            q = s(df.iat[r, c_q])
            a = s(df.iat[r, c_a])
            d1 = s(df.iat[r, c_d1])
            d2 = s(df.iat[r, c_d2])
            if not nonempty(q, a, d1, d2):
                continue
            item = {
                "id": idx,
                "prompt": q or "",
                "answer": a or "",
                "choices": dedup_choices([a, d1, d2]),
            }
            if c_q3 is not None:
                lv3 = s(df.iat[r, c_q3])
                if lv3: item["level3"] = lv3
            if c_d6 is not None:
                lv6 = s(df.iat[r, c_d6])
                if lv6: item["level6"] = lv6
            items.append(item)
            idx += 1

    if not items:
        print("ENGLISH TEST: 0 items")
        return

    upsert_test_doc(db, kind="english", title="Test your English", sections=[{"name": "MCQ", "items": items}])
    print(f"ENGLISH TEST: upserted with {len(items)} items")


# -------------------------
# Upsert helper for tests
# -------------------------
def upsert_test_doc(db, kind: str, title: str, sections: List[Dict]):
    # Keep only sections that actually have items
    sections = [s for s in sections if s.get("items")]
    doc = {"_id": f"test:{kind}", "kind": kind, "title": title, "sections": sections}
    db["tests"].update_one({"_id": doc["_id"]}, {"$set": doc}, upsert=True)


# -------------------------
# Main
# -------------------------
def main():
    print("Loading from", DATA_DIR)
    client = MongoClient(MONGO_URL)
    db = client[MONGO_DB]

    if "--reset" in sys.argv:
        for col in ["wod_words", "idiom_entries", "tests"]:
            if col in db.list_collection_names():
                db.drop_collection(col)
                print("dropped", col)

    # Loaders
    load_wod_words(db)
    load_idioms(db)
    load_wod_tests(db)
    load_vocab_tests(db)
    load_idiom_tests(db)
    load_english_test(db)
    print("Done.")


if __name__ == "__main__":
    main()

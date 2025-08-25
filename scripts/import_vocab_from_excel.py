# scripts/import_vocab_from_excel.py
import argparse
from pathlib import Path
from typing import Optional, List, Tuple
import pandas as pd
from pymongo import MongoClient

# ---------- helpers
def to_s(x) -> str:
    s = "" if x is None else str(x).strip()
    return "" if s.lower() in ("nan", "none") else s

def low(x) -> str:
    return to_s(x).lower()

def reheader(df_raw: pd.DataFrame, hdr_row: int) -> pd.DataFrame:
    header = df_raw.iloc[hdr_row].tolist()
    data = df_raw.iloc[hdr_row + 1:].copy()
    data.columns = header
    return data.reset_index(drop=True)

# normalize levels
LEVELS = {
    "beginner": "Beginner",
    "elementary": "Elementary",
    "pre-intermediate": "Pre-Intermediate",
    "pre intermediate": "Pre-Intermediate",
    "intermediate": "Intermediate",
    "upper-intermediate": "Upper-Intermediate",
    "upper intermediate": "Upper-Intermediate",
    "advanced": "Advanced",
}

# ---------- WORDS (KEY WORD / Answer A / Answer B / LEVEL)
def import_words(db, xl_path: Path, reset: bool = False) -> int:
    xlf = pd.ExcelFile(xl_path)
    out = db.vocab_words
    if reset:
        out.drop()
    # (re)create indexes (safe to call multiple times)
    out.create_index([("word", 1)], unique=False)

    total = 0
    for sheet in xlf.sheet_names:
        raw = pd.read_excel(xl_path, sheet_name=sheet, header=None, dtype=str)

        # Find row that contains all of: "KEY WORD", "Answer A", "Answer B", "LEVEL"
        hdr = None
        for r in range(min(80, len(raw))):
            row = [low(v) for v in raw.iloc[r].tolist()]
            if ("key word" in row) and ("answer a" in row) and ("answer b" in row) and ("level" in row):
                hdr = r
                break
        if hdr is None:
            continue

        df = reheader(raw, hdr)
        cols = {low(c): c for c in df.columns}
        c_word  = cols.get("key word")
        c_a     = cols.get("answer a")
        c_b     = cols.get("answer b")
        c_level = cols.get("level")

        docs = []
        for _, rr in df.iterrows():
            word = to_s(rr.get(c_word))
            if not word or low(word) == "key word":
                continue

            syns = []
            a = to_s(rr.get(c_a)) if c_a else ""
            b = to_s(rr.get(c_b)) if c_b else ""
            if a: syns.append(a)
            if b: syns.append(b)

            lvl_raw = low(rr.get(c_level)) if c_level else ""
            level = LEVELS.get(lvl_raw) or (to_s(rr.get(c_level)) if c_level else None)

            docs.append({
                "word": word,
                "synonyms": syns or None,
                "definition": None,
                "somaliTranslation": None,
                "example": None,
                "level": level,
                "category": "Vocabulary",
            })

        if docs:
            out.insert_many(docs)
            total += len(docs)

    print(f"Imported vocab records: {total}")
    return total

# ---------- TESTS (left block = Fill; right block = MCQ)
def import_tests(db, tests_path: Path, reset: bool = False) -> Tuple[int, int]:
    xlf = pd.ExcelFile(tests_path)
    mcq = db.vocab_tests_mcq
    fill = db.vocab_tests_fill
    if reset:
        mcq.drop()
        fill.drop()
    mcq.create_index([("meaning", 1)])
    fill.create_index([("meaning", 1)])

    n_mcq = n_fill = 0

    for sheet in xlf.sheet_names:
        raw = pd.read_excel(tests_path, sheet_name=sheet, header=None, dtype=str)

        # ---- Fill-in (Meaning + Answer) on left block
        hdr_left = None
        for r in range(min(80, len(raw))):
            row = [low(v) for v in raw.iloc[r].tolist()]
            if ("meaning" in row) and any(c.startswith("answer") for c in row):
                hdr_left = r
                break
        if hdr_left is not None:
            dfL = reheader(raw, hdr_left)
            colsL = {low(c): c for c in dfL.columns}
            c_mean = colsL.get("meaning")
            c_ans  = next((orig for k, orig in colsL.items() if k.startswith("answer")), None)
            c_lvl  = colsL.get("level")
            if c_mean and c_ans:
                for _, rr in dfL.iterrows():
                    meaning = to_s(rr.get(c_mean))
                    answer  = to_s(rr.get(c_ans))
                    if meaning and answer:
                        lvl_raw = low(rr.get(c_lvl)) if c_lvl else ""
                        level = LEVELS.get(lvl_raw) or (to_s(rr.get(c_lvl)) if c_lvl else None)
                        fill.insert_one({"type": "fill", "meaning": meaning, "answer": answer, "level": level})
                        n_fill += 1

        # ---- MCQ on right block (position-based detection)
        def detect_mcq_positions(raw_df):
            scan = min(80, len(raw_df))
            for r in range(scan):
                row = [to_s(v) for v in raw_df.iloc[r].tolist()]
                row_low = [s.lower() for s in row]
                for j, cell in enumerate(row_low):
                    if cell.startswith("answer"):
                        # find distractors to the right
                        d_idxs = [k for k in range(j + 1, len(row_low)) if "distractor" in row_low[k]]
                        mean_idx = j - 1 if j - 1 >= 0 else None
                        if mean_idx is not None and len(d_idxs) >= 1:
                            return r, mean_idx, j, d_idxs
            return None

        found = detect_mcq_positions(raw)
        if found:
            hdr_right, idx_mean, idx_ans, idx_distrs = found
            # iterate data rows under the header
            for i in range(hdr_right + 1, len(raw)):
                row = [to_s(v) for v in raw.iloc[i].tolist()]
                meaning = row[idx_mean] if idx_mean < len(row) else ""
                answer  = row[idx_ans]  if idx_ans  < len(row) else ""
                choices = [answer] + [row[k] for k in idx_distrs if k < len(row)]
                choices = [c for c in choices if c]

                # optional level: try to find a "level" column in header row near the MCQ block
                level = None
                for probe in range(max(idx_distrs) + 1, min(max(idx_distrs) + 4, len(raw.columns))):
                    header_cell = to_s(raw.iloc[hdr_right, probe]).lower()
                    if header_cell == "level":
                        level = to_s(raw.iloc[i, probe])
                        break

                if meaning and answer and len(choices) >= 2:
                    lvl_norm = LEVELS.get(low(level)) if level else None
                    mcq.insert_one({
                        "type": "mcq",
                        "meaning": meaning,
                        "answer": answer,
                        "choices": choices,
                        "level": (lvl_norm or level or None)
                    })
                    n_mcq += 1

    print(f"Imported tests — MCQ: {n_mcq}, Fill: {n_fill}")
    return n_mcq, n_fill

# ---------- CLI
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--words", required=True)
    ap.add_argument("--tests", required=True)
    ap.add_argument("--mongo-url", default="mongodb://localhost:27017")
    ap.add_argument("--db", default="aasaasi_db")
    ap.add_argument("--reset", action="store_true")
    args = ap.parse_args()

    cli = MongoClient(args.mongo_url)
    db = cli[args.db]

    import_words(db, Path(args.words), reset=args.reset)
    import_tests(db, Path(args.tests), reset=args.reset)

if __name__ == "__main__":
    main()

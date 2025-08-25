# scripts/import_grammar_from_excel.py
# Python 3.9+, pandas + openpyxl + pymongo
import argparse, re, unicodedata
import pandas as pd
from pymongo import MongoClient

def slugify(text: str) -> str:
    t = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    t = re.sub(r"[^a-zA-Z0-9]+", "-", t).strip("-").lower()
    return t

def parse(file_path: str):
    # Your file is a single "Sheet1" with these column blocks:
    # A: index (1,2,3...)   B: word    C: meaning    D: usage (EN)    E: usage (SO)
    # F: examples           H: Exam (fill-in)   I: Answer   J: Distractor1   K: Distractor2
    df = pd.read_excel(file_path, sheet_name=0, header=1)   # header row is the 2nd row in your screenshot
    df = df.fillna("")

    # Pick columns by position so header labels don't need to be exact
    col_word = df.columns[1]
    col_mean = df.columns[2]
    col_usage_en = df.columns[3]
    col_usage_so = df.columns[4]
    col_examples = df.columns[5] if len(df.columns) > 5 else None
    col_exam = df.columns[7] if len(df.columns) > 7 else None
    col_ans  = df.columns[8] if len(df.columns) > 8 else None
    col_d1   = df.columns[9] if len(df.columns) > 9 else None
    col_d2   = df.columns[10] if len(df.columns) > 10 else None

    topics = []         # [{slug,title,words,meanings,usage_en,usage_so,examples}]
    questions = []      # [{topic, text, options, answerIndex}]
    current = None
    buffer_examples = []
    buffer_exam = []

    def close_current():
        nonlocal current, buffer_examples, buffer_exam
        if not current: 
            return
        current["examples"] = [x for x in buffer_examples if x.strip()]
        topics.append(current)
        for q in buffer_exam:
            if not q.get("text"): 
                continue
            opts = [q.get("answer","")]
            if q.get("d1"): opts.append(q["d1"])
            if q.get("d2") and q["d2"].lower() != "neither":  # your sheet uses "neither" as filler sometimes
                opts.append(q["d2"])
            questions.append({
                "topic": current["slug"],
                "text": q["text"],
                "options": opts,
                "answerIndex": 0,    # correct is first (Answer col)
            })
        buffer_examples, buffer_exam, current = [], [], None

    i = 0
    while i < len(df):
        row = df.iloc[i]
        word = str(row[col_word]).strip()
        mean = str(row[col_mean]).strip()
        # start of a new pair when we see TWO consecutive word rows (word + meaning)
        if word and mean:
            # word 1
            w1, m1, u1_en, u1_so = word, mean, str(row[col_usage_en]).strip(), str(row[col_usage_so]).strip()
            # next row SHOULD be the second word
            if i + 1 < len(df):
                row2 = df.iloc[i+1]
                if str(row2[col_word]).strip() and str(row2[col_mean]).strip():
                    # close previous topic if any
                    close_current()
                    w2, m2 = str(row2[col_word]).strip(), str(row2[col_mean]).strip()
                    u2_en, u2_so = str(row2[col_usage_en]).strip(), str(row2[col_usage_so]).strip()
                    title = f"{w1} vs {w2}"
                    current = {
                        "slug": slugify(title),
                        "title": title,
                        "words": [w1, w2],
                        "meanings": { w1: m1, w2: m2 },
                        "usage_en": { w1: u1_en, w2: u2_en },
                        "usage_so": { w1: u1_so, w2: u2_so },
                        "examples": [],
                    }
                    i += 2
                    continue
        # examples block
        if current and col_examples and str(row[col_examples]).strip():
            buffer_examples.append(str(row[col_examples]).strip())

        # exam block
        if current and col_exam and str(row[col_exam]).strip():
            q = {
                "text": str(row[col_exam]).strip(),
                "answer": str(row[col_ans]).strip() if col_ans else "",
                "d1": str(row[col_d1]).strip() if col_d1 else "",
                "d2": str(row[col_d2]).strip() if col_d2 else "",
            }
            buffer_exam.append(q)
        i += 1

    close_current()
    if not topics:
        raise SystemExit("Nothing parsed. Check the sheet structure.")
    return topics, questions

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", required=True)
    ap.add_argument("--mongo-url", default="mongodb://localhost:27017")
    ap.add_argument("--db", default="aasaasi")
    ap.add_argument("--reset", action="store_true")
    args = ap.parse_args()

    topics, questions = parse(args.file)
    client = MongoClient(args.mongo_url)
    db = client[args.db]

    if args.reset:
        db.grammar_topics.drop()
        db.grammar_questions.drop()

    if topics:
        db.grammar_topics.insert_many(topics)
    if questions:
        db.grammar_questions.insert_many(questions)

    print(f"Imported topics: {len(topics)}, questions: {len(questions)}")

if __name__ == "__main__":
    main()

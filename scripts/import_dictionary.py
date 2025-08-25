# backend/scripts/import_dictionary.py (only the part inside row -> doc mapping)
def row_to_doc(row: dict) -> dict:
    # normalize keys once
    norm = { (k or "").strip().lower(): v for k, v in row.items() }

    def pick(*names):
        for n in names:
            v = norm.get(n.lower())
            if v not in (None, "", "nan"):
                return str(v).strip()
        return None

    examples_raw = pick("example", "examples", "examples_en", "examples_so")
    examples = []
    if examples_raw:
        examples = [s.strip() for s in re.split(r"[;|\n]+", str(examples_raw)) if s.strip()]

    return {
        "english": pick("english", "en", "headword"),
        "somali": pick("somali", "so", "meaning"),
        "partOfSpeech": pick("part of speech", "pos", "partofspeech"),
        "pronunciation": pick("pronunciation", "pron"),
        "wordForms": pick("word forms", "wordforms"),
        "phrase": pick("phrase"),
        "usageNote": pick("usage note", "usage", "usagenote"),
        "definition": pick("meaning", "definition", "gloss"),
        "examples": examples,
    }

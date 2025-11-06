import csv
import json
from wordfreq import zipf_frequency
# Using wiktextract
from wikitextprocessor import Wtp
from wiktextract import WiktionaryConfig

config = WiktionaryConfig(
    capture_languages=["English", "Translingual"],
    capture_translations=False,
    capture_pronunciation=False,
    capture_linkages=False,
    capture_compounds=False,
    capture_redirects=False,
    capture_examples=False,
    capture_etymologies=False,
    capture_inflections=False,
    verbose=False
)

wtp = Wtp()

# === Load a pre-extracted JSONL dump of Wiktionary entries ===
WIKT_FILE = "wiktextract_en.jsonl"  # adjust path
wiktdict = {}
print("Loading Wiktionary definitions from JSONL…")
with open(WIKT_FILE, "r", encoding="utf-8") as fin:
    for line in fin:
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue
        word = obj.get("word")
        if not word:
            continue
        senses = obj.get("senses")
        if senses:
            glosses = senses[0].get("glosses")
            if glosses:
                wiktdict[word.lower()] = glosses[0]
print(f"Loaded definitions for {len(wiktdict)} words from Wiktionary.")

# === 1. Read the input files ===
with open("dictionary.txt", "r", encoding="utf-8") as f_txt:
    txt_words = {w.strip().lower() for w in f_txt if w.strip()}

with open("dictionary.csv", "r", encoding="utf-8") as f_csv:
    reader = csv.DictReader(f_csv)
    csv_words = {row["word"].strip().lower() for row in reader}

missing_words = sorted(txt_words - csv_words)
print(f"Found {len(missing_words)} words missing from dictionary.csv")

# === 2. Lookup definitions via Wiktionary data and build entries ===
supplemental_entries = []
for i, word in enumerate(missing_words, start=1):
    definition = wiktdict.get(word)
    if definition:
        freq = zipf_frequency(word, "en")
        if freq >= 4.0:
            category = "1"
            category_reason = "common english (recognizable)"
        else:
            category = "2"
            category_reason = "uncommon or archaic (low frequency)"

        supplemental_entries.append({
            "word": word,
            "category": category,
            "category_reason": category_reason,
            "definition": definition
        })
    # optional progress logging
    if i % 1000 == 0:
        print(f"[{i}/{len(missing_words)}] processed…")

# === 3. Sort by frequency descending ===
supplemental_entries.sort(key=lambda x: zipf_frequency(x["word"], "en"), reverse=True)

# === 4. Write to supplemental.csv ===
with open("supplemental.csv", "w", encoding="utf-8", newline="") as f_out:
    writer = csv.DictWriter(f_out,
                            fieldnames=["word","category","category_reason","definition"],
                            quoting=csv.QUOTE_ALL)
    writer.writeheader()
    for row in supplemental_entries:
        writer.writerow(row)

print(f"Done! Wrote {len(supplemental_entries)} new definitions to supplemental.csv")

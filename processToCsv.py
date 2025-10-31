import csv, zipfile, os, re
import pandas as pd
from wordfreq import zipf_frequency
import nltk
nltk.download('wordnet')
from nltk.corpus import wordnet
from tqdm import tqdm

INPUT_FILE = ".\\dictionary.txt"
OUT_CSV = "words.csv"
OUT_ZIP = "words.zip"
CHUNK = 10000  # progress interval

def get_definition(word):
    """Return short dictionary definition if possible."""
    synsets = wordnet.synsets(word)
    if synsets:
        return synsets[0].definition()
    return "No definition found"

def classify_word(word):
    w = word.strip()
    if not w:
        return None
    if re.search(r"[^a-zA-Z'-]", w):
        return (w, 3, "non-alpha/proper/undefined", "No valid English definition (non-alphabetic)")

    wl = w.lower()

    # frequency threshold for commonality (wordfreq uses Zipf scale)
    freq = zipf_frequency(wl, "en")

    if freq >= 3.5:  # roughly frequent enough for average English speaker
        return (w, 1, "common english (recognizable)", get_definition(wl))
    elif freq > 0:
        return (w, 2, "uncommon or archaic (low frequency)", get_definition(wl))
    else:
        return (w, 3, "undefined or proper name (no frequency data)", "No English definition found")

def process_dictionary():
    total = sum(1 for _ in open(INPUT_FILE, encoding="utf-8", errors="ignore"))
    print(f"Total words: {total}")

    rows = []
    with open(INPUT_FILE, encoding="utf-8", errors="ignore") as f:
        for i, line in enumerate(tqdm(f, total=total, desc="Processing words")):
            word = line.strip()
            if not word:
                continue
            res = classify_word(word)
            if res:
                rows.append(res)
            if (i+1) % CHUNK == 0:
                print(f"Processed {i+1}/{total} words ({(i+1)/total*100:.2f}%)")

    df = pd.DataFrame(rows, columns=["word","category","category_reason","definition"])
    df.to_csv(OUT_CSV, index=False, quoting=csv.QUOTE_ALL)

    # zip it
    with zipfile.ZipFile(OUT_ZIP, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.write(OUT_CSV)

    print(f"\n✅ Done! Output files:\n - {OUT_CSV}\n - {OUT_ZIP}")

if __name__ == "__main__":
    process_dictionary()

import pandas as pd

DICTIONARY_FILE = "dictionary.csv"
INPUT_FILE = "suitable.txt"
OUTPUT_FILE = "suitable2.txt"

def filter_suitable():
    # Load dictionary words into a set for fast lookups
    df = pd.read_csv(DICTIONARY_FILE, usecols=["word"])
    dictionary_words = set(df["word"].str.lower())

    print(f"✅ Loaded {len(dictionary_words)} words from {DICTIONARY_FILE}")

    kept = 0
    removed = 0

    with open(INPUT_FILE, "r", encoding="utf-8", errors="ignore") as infile, \
         open(OUTPUT_FILE, "w", encoding="utf-8") as outfile:
        for line in infile:
            word = line.strip()
            if not word:
                continue
            if word.lower() in dictionary_words:
                outfile.write(word + "\n")
                kept += 1
            else:
                print(word)
                removed += 1

    print(f"✅ Done! Saved {kept} words to {OUTPUT_FILE} (removed {removed} not found in dictionary).")

if __name__ == "__main__":
    filter_suitable()

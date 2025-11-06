import csv
from wordfreq import zipf_frequency

INPUT_FILE = "supplemental.csv"
OUTPUT_FILE = "supplemental_sorted.csv"

# === 1. Read the CSV file ===
with open(INPUT_FILE, "r", encoding="utf-8") as f:
    reader = csv.DictReader(f, quotechar='"')
    rows = list(reader)

print(f"Loaded {len(rows)} entries from {INPUT_FILE}")

# === 2. Compute sort keys: word length + frequency ===
def sort_key(row):
    word = row["word"].strip().lower()
    length = len(word)
    freq = zipf_frequency(word, "en")
    # Sort by length ascending, then frequency descending
    return (length, -freq)

# === 3. Sort the data ===
sorted_rows = sorted(rows, key=sort_key)

# === 4. Write to new CSV ===
with open(OUTPUT_FILE, "w", encoding="utf-8", newline="") as f:
    fieldnames = ["word", "category", "category_reason", "definition"]
    writer = csv.DictWriter(f, fieldnames=fieldnames, quoting=csv.QUOTE_ALL)
    writer.writeheader()
    writer.writerows(sorted_rows)

print(f"✅ Wrote sorted file to {OUTPUT_FILE}")

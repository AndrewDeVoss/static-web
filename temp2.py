import csv
from wordfreq import zipf_frequency

INPUT_CSV = "dictionary.csv"
OUTPUT_CSV = "dictionary_with_frequency.csv"

def main():
    with open(INPUT_CSV, newline="", encoding="utf-8") as infile, \
         open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as outfile:

        reader = csv.reader(infile)
        writer = csv.writer(
            outfile,
            quoting=csv.QUOTE_ALL
        )

        for row in reader:
            if not row:
                continue

            word = row[0].strip()
            frequency = zipf_frequency(word, "en")

            row[1] = f"{frequency:.3f}"
            writer.writerow(row)


if __name__ == "__main__":
    main()

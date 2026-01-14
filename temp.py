import csv
from wordfreq import zipf_frequency

def get_word_frequency(word: str) -> float:
    """
    Returns the Zipf frequency for a word.
    Zipf scale:
      ~1 = very rare
      ~3 = common
      ~5 = extremely common
    """
    return zipf_frequency(word, "en")


def main():
    with open("dictionary.csv", newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        ct = 0
        for row in reader:
            word = row[0].strip()
            frequency = get_word_frequency(word)
            if frequency > 2.5:
                ct += 1

if __name__ == "__main__":
    main()

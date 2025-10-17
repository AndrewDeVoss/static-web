import sys
import os
import msvcrt

import time

def wait_for_key_release():
    # Wait until no key is pressed (to avoid repeats from holding a key)
    while msvcrt.kbhit():  # While keys are still in the buffer
        msvcrt.getch()     # Flush them out
    time.sleep(0.1)        # Small delay to ensure key is fully released


def load_dictionary(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        words = [line.strip().lower() for line in f if len(line.strip()) == 5 and not line.strip().endswith('s')]
    return sorted(words)

def get_single_keypress():
    # Waits for and returns a single keypress (does not require Enter)
    return msvcrt.getch().decode('utf-8', errors='ignore')

def main():
    if len(sys.argv) != 3:
        print("Usage: python filter_words.py <dictionary_file> <start_word>")
        sys.exit(1)

    dictionary_file = sys.argv[1]
    start_word = sys.argv[2].lower()
    output_file = 'suitable.txt'

    if not os.path.exists(dictionary_file):
        print(f"Error: Dictionary file '{dictionary_file}' not found.")
        sys.exit(1)

    all_words = load_dictionary(dictionary_file)

    # Filter and trim words
    options = [word for word in all_words if word >= start_word]

    print(f"\nTotal words remaining: {len(options)}")
    print("Press [space] to accept a word, any other key to skip. Press Ctrl+C to quit.\n")

    for word in options:
      print(f"Word: {word}  ", end='', flush=True)
      key = get_single_keypress().lower()
      wait_for_key_release()  # wait for key lift before next input

      if key == ' ':
          with open(output_file, 'a', encoding='utf-8') as f:
              f.write(word + '\n')
          print("[saved]")
      elif key == 'q':
          print("\n🛑 'q' pressed. Exiting.")
          sys.exit(0)
      else:
        print("[skipped]")


    print("\n✅ Done.")

if __name__ == "__main__":
    main()

    # replace with starting word
    # python .\utility\betterdictionary.py .\dictionary.txt adorn

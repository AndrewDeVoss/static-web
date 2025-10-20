import sys
import os
import msvcrt
import time
import pandas as pd

def load_frequency_data(freq_file_path):
    # Norvig's format: word[whitespace]count
    df = pd.read_csv(freq_file_path, sep=r'\s+', names=['word', 'count'], engine='python')
    df['word'] = df['word'].str.lower()
    return df.set_index('word')['count'].to_dict()

def load_sorted_words_by_frequency(dict_path, freq_dict, starting_letter):
    with open(dict_path, 'r', encoding='utf-8') as f:
        words = [
            line.strip().lower()
            for line in f
            if len(line.strip()) == 6
            and not line.strip().endswith('s')
            and line.strip().lower().startswith(starting_letter)
        ]

    df = pd.DataFrame({'word': words})
    df['freq'] = df['word'].map(freq_dict).fillna(0).astype(int)
    df.sort_values(by='freq', ascending=False, inplace=True)
    return df['word'].tolist()

def wait_for_key_release():
    while msvcrt.kbhit():
        msvcrt.getch()
    time.sleep(0.1)

def get_keypress():
    first = msvcrt.getch()
    if first == b'\xe0':
        second = msvcrt.getch()
        return f'{first.hex()} {second.hex()}'
    return first.decode('utf-8', errors='ignore')

def main():
    if len(sys.argv) != 3:
        print("Usage: python filter_words.py <dictionary_file> <starting_letter>")
        sys.exit(1)

    dictionary_file = sys.argv[1]
    starting_letter = sys.argv[2].lower()
    freq_file = os.path.join(os.path.dirname(dictionary_file), 'norwigngram.txt')
    output_file = 'suitable.txt'

    if not os.path.exists(dictionary_file):
        print(f"Error: Dictionary file '{dictionary_file}' not found.")
        sys.exit(1)
    if not os.path.exists(freq_file):
        print(f"Error: Frequency file '{freq_file}' not found.")
        sys.exit(1)
    if not (len(starting_letter) == 1 and starting_letter.isalpha()):
        print(f"Error: Starting letter '{starting_letter}' must be a single letter a–z.")
        sys.exit(1)

    freq_dict = load_frequency_data(freq_file)
    sorted_words = load_sorted_words_by_frequency(dictionary_file, freq_dict, starting_letter)

    if not sorted_words:
        print(f"No six-letter words found starting with '{starting_letter}'.")
        sys.exit(0)

    print(f"\nTotal words starting with '{starting_letter}': {len(sorted_words)}")
    print("Press [space] to accept, [q] to quit, [↑] to go back, [Enter] to re-accept. Ctrl+C to exit.\n")

    index = 0
    back_stack = []

    while 0 <= index < len(sorted_words):
        word = sorted_words[index]
        print(f"Word: {word}  ", end='', flush=True)
        key = get_keypress()
        wait_for_key_release()

        if key == ' ':
            with open(output_file, 'a', encoding='utf-8') as f:
                f.write(word + '\n')
            print("[saved]")
            index += 1
            back_stack.clear()

        elif key == 'q':
            print("\n🛑 'q' pressed. Exiting.")
            sys.exit(0)

        elif key == '\r':  # Enter key
            with open(output_file, 'a', encoding='utf-8') as f:
                f.write(word + '\n')
            print("[saved, returning to previous spot]")
            if back_stack:
                index = back_stack[-1] + 1
                back_stack.clear()
            else:
                index += 1

        elif key == 'e0 48':  # Up arrow
            if index > 0:
                back_stack.append(index)
                index -= 1
                print("[⬆ back]")
            else:
                print("[at beginning]")

        else:
            print("[skipped]")
            index += 1
            back_stack.clear()

    print("\n✅ Done.")

if __name__ == "__main__":
    main()

    # replace with starting word
    # python .\utility\betterdictionary.py .\dictionary.txt raaaaaa

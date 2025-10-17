import sys
import os
import msvcrt
import time

def wait_for_key_release():
    while msvcrt.kbhit():
        msvcrt.getch()
    time.sleep(0.1)

def load_dictionary(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        words = [line.strip().lower() for line in f if len(line.strip()) == 5 and not line.strip().endswith('s')]
    return sorted(words)

def get_keypress():
    """Handles arrow keys and special keys as well"""
    first = msvcrt.getch()
    if first == b'\xe0':  # Arrow/special keys
        second = msvcrt.getch()
        return f'{first.hex()} {second.hex()}'  # e.g., 'e0 48' for up arrow
    return first.decode('utf-8', errors='ignore')

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
    options = [word for word in all_words if word >= start_word]

    print(f"\nTotal words remaining: {len(options)}")
    print("Press [space] to accept, [q] to quit, [↑] to go back, [Enter] to re-accept. Ctrl+C to exit.\n")

    index = 0
    back_stack = []

    while 0 <= index < len(options):
        word = options[index]
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
                index = back_stack[-1] + 1  # Go forward after the last spot
                back_stack.clear()
            else:
                index += 1  # Default forward if no back stack

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
    # python .\utility\betterdictionary.py .\dictionary.txt bawdy

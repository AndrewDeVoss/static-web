# split_dictionary.py

def split_dictionary(input_file, words_per_file=1000):
    with open(input_file, 'r', encoding='utf-8') as f:
        words = [line.strip() for line in f if line.strip()]

    total_files = (len(words) + words_per_file - 1) // words_per_file
    for i in range(total_files):
        chunk = words[i * words_per_file:(i + 1) * words_per_file]
        output_filename = f"dictionary_part_{i+1:03}.txt"
        with open(output_filename, 'w', encoding='utf-8') as out:
            out.write('\n'.join(chunk))
        print(f"Created {output_filename} with {len(chunk)} words.")

if __name__ == "__main__":
    split_dictionary(".\dictionary.txt", 1000)

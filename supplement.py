import csv
import nltk
nltk.download('wordnet')
nltk.download('reuters')
nltk.download('words')
from nltk.corpus import wordnet, reuters, words
from collections import defaultdict

# --- Configuration ---
INPUT_FILE = 'dictionary.csv'
OUTPUT_FILE = 'supplementary.csv'
FREQUENCY_CATEGORY_CUTOFF = 0.15  # Top 15% of missing words are considered 'high frequency' (Category 1)

def load_existing_words(filepath):
    """Loads all words from the dictionary CSV into a set for quick lookup."""
    existing_words = set()
    try:
        with open(filepath, mode='r', newline='', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                # Store the word in lowercase for case-insensitive matching
                existing_words.add(row['word'].lower())
        print(f"Loaded {len(existing_words)} existing words from {filepath}.")
    except FileNotFoundError:
        print(f"Warning: Input file {filepath} not found. Proceeding with an empty initial dictionary.")
    except Exception as e:
        print(f"Error loading {filepath}: {e}")
    return existing_words

def get_word_frequency(all_words):
    """
    Calculates the frequency of all potential words using the NLTK Reuters corpus.
    Sorts the words by frequency in descending order.
    """
    print("Calculating word frequencies using NLTK Reuters corpus...")
    
    # 1. Get all tokens from the corpus
    corpus_words = reuters.words()
    
    # 2. Filter corpus to only include words that are in our potential list
    word_counts = defaultdict(int)
    for word in corpus_words:
        word_lower = word.lower()
        if word_lower in all_words:
            word_counts[word_lower] += 1
    
    # 3. Sort by count (frequency) in descending order
    # Returns a list of (word, count) tuples
    sorted_frequencies = sorted(word_counts.items(), key=lambda item: item[1], reverse=True)
    
    print(f"Calculated frequencies for {len(sorted_frequencies)} unique words.")
    return sorted_frequencies

def get_wordnet_definition(word):
    """Returns the first available definition for a word from WordNet."""
    synsets = wordnet.synsets(word)
    if synsets:
        # Get the definition of the first synset and clean up parenthetical phrases
        definition = synsets[0].definition()
        # Simple cleanup: remove text inside parentheses
        return definition.split(';')[0].strip()
    return None

def find_missing_words():
    """
    Main function to find words missing from the CSV but present in WordNet,
    sort them by frequency, and create the supplementary dictionary.
    """
    
    # 1. Load existing words from the CSV
    existing_words = load_existing_words(INPUT_FILE)

    # 2. Get all known English words from the NLTK 'words' corpus
    # This acts as a robust list of valid spellings to check against WordNet
    all_english_words = set(w.lower() for w in words.words())
    print(f"Loaded {len(all_english_words)} unique words from the NLTK 'words' corpus.")

    # 3. Find potential missing words (in corpus but not in dictionary)
    potential_missing_words = all_english_words - existing_words
    print(f"Found {len(potential_missing_words)} words potentially missing from the dictionary.")

    # 4. Filter by WordNet definition and get frequencies
    wordnet_frequencies = {}
    
    # Calculate initial frequencies for all potential missing words
    # This step is resource-intensive and only needs to be done once
    all_frequencies = get_word_frequency(potential_missing_words)
    
    # Filter the frequency list to only include words that have a WordNet definition
    new_dictionary_entries = []
    
    for word, frequency in all_frequencies:
        if wordnet.synsets(word):
            wordnet_frequencies[word] = frequency

    # Sort the final list of words that have a frequency count AND a definition
    sorted_missing_words = sorted(wordnet_frequencies.items(), key=lambda item: item[1], reverse=True)
    
    # Determine the cutoff for Category 1 (High Frequency)
    num_total_missing = len(sorted_missing_words)
    cutoff_index = int(num_total_missing * FREQUENCY_CATEGORY_CUTOFF)

    print(f"\nFinal list of missing words with definitions: {num_total_missing}")
    print(f"Top {cutoff_index} words will be classified as Category 1 (High Frequency).")

    # 5. Format and prepare entries for the supplementary CSV
    for i, (word, frequency) in enumerate(sorted_missing_words):
        definition = get_wordnet_definition(word)
        
        if definition:
            if i < cutoff_index and frequency > 0: # Check frequency > 0 to ensure it appeared in corpus
                category = "1"
                category_reason = "high frequency (WordNet definition available)"
            else:
                category = "2"
                category_reason = "low frequency (WordNet definition available)"
            
            # Format the output word for consistency (capitalize 'a', 'i' etc. if needed, but keeping lowercase is generally safer)
            entry = {
                "word": word,
                "category": category,
                "category_reason": category_reason,
                # Ensure the definition is clean and quoted correctly in the output
                "definition": definition
            }
            new_dictionary_entries.append(entry)

    # 6. Output the new entries to supplementary.csv
    if new_dictionary_entries:
        fieldnames = ["word", "category", "category_reason", "definition"]
        try:
            with open(OUTPUT_FILE, mode='w', newline='', encoding='utf-8') as file:
                writer = csv.DictWriter(file, fieldnames=fieldnames, quoting=csv.QUOTE_ALL)
                writer.writeheader()
                writer.writerows(new_dictionary_entries)
            
            print(f"\nSuccessfully generated {len(new_dictionary_entries)} new dictionary entries in {OUTPUT_FILE}.")
            print("The file is sorted by word frequency (most frequent first).")
        except Exception as e:
            print(f"Error writing to {OUTPUT_FILE}: {e}")
    else:
        print("\nNo words were found to supplement the dictionary.")


if __name__ == '__main__':
    # Initial NLTK check and download instructions
    try:
        wordnet.synsets('test')
        reuters.words()
        words.words()
    except LookupError:
        print("--- NLTK DATA NOT FOUND ---")
        print("Please run the following commands once to download the required corpora:")
        print("import nltk")
        print("nltk.download('wordnet')")
        print("nltk.download('words')")
        print("nltk.download('reuters')")
        print("---------------------------")
    else:
        find_missing_words()

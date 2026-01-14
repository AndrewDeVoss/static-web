let suitable5And6Words = new Set();
let bigDictionary = new Set();
let forbiddenWords = new Set();

export async function loadSuitable5And6() {
  const url = new URL('../../suitable.txt', import.meta.url).href;
  const response = await fetch(url);
  const text = await response.text();
  suitable5And6Words = new Set(text.split('\n').map(w => w.trim().toLowerCase()).filter(Boolean));
}

export async function loadDictionary() {
  // Adjust the path relative to your script
  const url = new URL('../../dictionary.csv', import.meta.url).href;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load dictionary: ${response.status} ${response.statusText}`);
  }

  const csvText = await response.text();

  // Parse CSV lines (simple manual parser assuming no embedded newlines in quoted fields)
  const lines = csvText.trim().split('\n').slice(1); // skip header

  // Store data in a Map for fast lookups
  // word -> { category, reason, definition }
  bigDictionary = new Map();

  for (const line of lines) {
    // Split on commas, handling quotes
    // This regex safely splits CSV respecting quoted fields
    const match = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    if (!match || match.length < 4) continue;

    const [word, frequency, reason, definition] = match.map(v =>
      v.replace(/^"|"$/g, '').trim()
    );

    bigDictionary.set(word.toLowerCase(), {
      word,
      frequency,
      reason,
      definition,
    });
  }

  return bigDictionary;
}

export async function loadDictionaryFrequencyBased(minFrequency) {
  const bigDictionary = await loadDictionary();

  const filteredDictionary = new Map();

  for (const [key, entry] of bigDictionary) {
    if (parseFloat(entry.frequency) >= minFrequency) {
      filteredDictionary.set(key, {
        ...entry,
      });
    }
  }

  return filteredDictionary;
}

export async function loadForbiddenWords() {
  const url = new URL('../../forbidden.txt', import.meta.url).href;
  const response = await fetch(url);
  const text = await response.text();
  forbiddenWords = new Set(text.split('\n').map(w => w.trim().toLowerCase()).filter(Boolean));
}

export function isWord(word) {
  const lower = word.toLowerCase();

  // If it is not in the big dictionary, definitely not a word
  if (!bigDictionary.has(lower)) return false;

  // If it is a forbidden word, exclude
  if (forbiddenWords.has(lower)) return false;

  // Exclude anything that has a forbidden word in its definition
  let definition = bigDictionary.get(lower).definition;
  for (let explWord of definition.split(/\W+/)) {
    if (forbiddenWords.has(explWord.toLowerCase())) {
      return false;
    }
  }

  // Ok, it passed the test
  return true;
}

export function getDefinitionForWord(word) {
  const lower = word.toLowerCase();
  if (bigDictionary.has(lower)) {
    return bigDictionary.get(lower).definition;
  } else {
    return null;
  }
}

export function getValidWordsFromLetters(charString, dictionarySet = null) {
  const availableLetters = {};
  for (const char of charString.toLowerCase()) {
    availableLetters[char] = (availableLetters[char] || 0) + 1;
  }

  function canBuildWord(word) {
    const letterCounts = {};
    for (const char of word) {
      letterCounts[char] = (letterCounts[char] || 0) + 1;
      if (!availableLetters[char] || letterCounts[char] > availableLetters[char]) {
        return false;
      }
    }
    return true;
  }

  const result = new Set();
  const sourceWords = dictionarySet
    ? dictionarySet
    : new Set([...bigDictionary.keys()]);

  for (const word of sourceWords) {
    const lowerWord = word.toLowerCase();
    if (!forbiddenWords.has(lowerWord) && canBuildWord(lowerWord)) {
      result.add(lowerWord);
    }
  }

  return result;
}

// ----------------------------
// Seed helpers
// ----------------------------
function daysSinceJune15(dateString = null) {
  const start = new Date(2024, 5, 15); // June is 5 (0-based)
  const end = dateString ? new Date(dateString) : new Date();
  const diffTime =
    end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function mulberry32(seed) {
  return function () {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ----------------------------
// Random word picker
// ----------------------------
export function chooseRandomWordSet(targetLength = 12, dateString = null) {
  if (bigDictionary.size === 0) {
    throw new Error("Dictionary not loaded. Call loadDictionary() first.");
  }

  const seed = daysSinceJune15(dateString);
  const rng = mulberry32(seed);

  const words = Array.from(bigDictionary.keys()).filter(
    w => isWord(w)
  );

  const commonEnding = (word) => word.endsWith("ed") || word.endsWith("er") || word.endsWith("y") || word.endsWith("ing");

  /**
   * Get a random word of a given length, optionally excluding certain letters.
   * @param {number} length
   * @param {Set<string>} excludedLetters - letters that must NOT appear in the word
   */
  function getRandomWordOfLength(length, excludedLetters = new Set()) {
    let source;
    if (length === 5 || length === 6) {
      source = Array.from(suitable5And6Words);
    } else {
      source = words;
    }

    const filtered = source.filter(w => {
      if (w.length !== length) return false;
      for (const ch of excludedLetters) {
        if (w.includes(ch)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      filtered = source; // Nothing valid means everything should be fair game
    }

    let chosen;
    do {
      chosen = filtered[Math.floor(rng() * filtered.length)];

      if (commonEnding(chosen) && rng() < 0.8) continue;
      break;
    } while (true);

    return chosen;
  }

  // Step 1: 6-letter word
  let word6 = targetLength >= 6 ? getRandomWordOfLength(6) : "";
  let letters = word6;

  // Step 2: 5-letter word with no overlapping letters
  let word5 = "";
  if (targetLength - letters.length >= 5) {
    let excludedLetters = new Set();
    for (let letter of word6) {
      if (rng() < 0.5) {
        excludedLetters.add(letter);
      }
    }
    word5 = getRandomWordOfLength(5, excludedLetters);
    letters += word5;
  }

  // Step 3: Fill remaining space
  while (letters.length < targetLength) {
    let word = getRandomWordOfLength(
      Math.min(targetLength - letters.length, 8), // prevent overshoot
    );
    if (commonEnding(word) && rng() < 0.3) continue;
    if (letters.length + word.length <= targetLength) {
      letters += word;
    }
  }

  return letters;
}

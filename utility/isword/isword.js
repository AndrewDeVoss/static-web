let suitable5And6Words = new Set();
let comprehensiveWords = new Set();
let forbiddenWords = new Set();
let borderlineWords = new Set();

export async function loadSuitable5And6() {
  const url = new URL('../../suitable.txt', import.meta.url).href;
  const response = await fetch(url);
  const text = await response.text();
  suitable5And6Words = new Set(text.split('\n').map(w => w.trim().toLowerCase()).filter(Boolean));
}

export async function loadDictionary() {
  const url = new URL('../../dictionary.txt', import.meta.url).href;
  const response = await fetch(url);
  const text = await response.text();
  comprehensiveWords = new Set(text.split('\n').map(w => w.trim().toLowerCase()).filter(Boolean));
}

export async function loadForbiddenWords() {
  const url = new URL('../../forbidden.txt', import.meta.url).href;
  const response = await fetch(url);
  const text = await response.text();
  forbiddenWords = new Set(text.split('\n').map(w => w.trim().toLowerCase()).filter(Boolean));
}

export async function loadBorderlineWords() {
  const url = new URL('../../borderline.txt', import.meta.url).href;
  const response = await fetch(url);
  const text = await response.text();
  borderlineWords = new Set(text.split('\n').map(w => w.trim().toLowerCase()).filter(Boolean));
}

export function isWord(word) {
  const lower = word.toLowerCase();
  return (comprehensiveWords.has(lower) || borderlineWords.has(lower)) && !forbiddenWords.has(lower);
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
    : new Set([...comprehensiveWords, ...borderlineWords]);

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
  if (comprehensiveWords.size === 0) {
    throw new Error("Dictionary not loaded. Call loadDictionary() first.");
  }

  const seed = daysSinceJune15(dateString);
  const rng = mulberry32(seed);

  const words = Array.from(comprehensiveWords).filter(
    w => !forbiddenWords.has(w) && !borderlineWords.has(w)
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
      // With 30% chance, reselect if ends in common ending
      if (commonEnding(chosen) && rng() < 0.9) continue;
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
    word5 = getRandomWordOfLength(5, new Set(word6));
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

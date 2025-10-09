let wordSet = new Set();
let forbiddenWords = new Set();
let borderlineWords = new Set();

export async function loadDictionary() {
  const url = new URL('../../dictionary.txt', import.meta.url).href;
  const response = await fetch(url);
  const text = await response.text();
  wordSet = new Set(text.split('\n').map(w => w.trim().toLowerCase()).filter(Boolean));
}

export async function loadForbiddenWords() {
  const url = new URL('../../forbidden.txt', import.meta.url).href
  const response = await fetch(url);
  const text = await response.text();
  forbiddenWords = new Set(text.split('\n').map(w => w.trim().toLowerCase()).filter(Boolean));
}

export async function loadBorderlineWords() {
  const url = new URL('../../borderline.txt', import.meta.url).href
  const response = await fetch(url);
  const text = await response.text();
  borderlineWords = new Set(text.split('\n').map(w => w.trim().toLowerCase()).filter(Boolean));
}

export function isWord(word) {
  const lower = word.toLowerCase();
  return (wordSet.has(lower) || borderlineWords.has(lower)) && !forbiddenWords.has(lower);
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
    : new Set([...wordSet, ...borderlineWords]);

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
function daysSinceJune15() {
  const start = new Date(2024, 6, 15); // June = 5 (0-based)
  const today = new Date();
  const diffTime = today.setHours(0,0,0,0) - start.setHours(0,0,0,0);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ----------------------------
// Random word picker
// ----------------------------
export function chooseRandomWordSet(targetLength = 12) {
  if (wordSet.size === 0) {
    throw new Error("Dictionary not loaded. Call loadDictionary() first.");
  }

  const seed = daysSinceJune15();
  const rng = mulberry32(seed);

  const words = Array.from(wordSet).filter(w => !forbiddenWords.has(w) && !borderlineWords.has(w));


  // Helper function to get a random word of a specific length
  function getRandomWordOfLength(length) {
    const filtered = words.filter(w => w.length === length);
    if (filtered.length === 0) {
      throw new Error(`No words of length ${length} found in dictionary.`);
    }
    return filtered[Math.floor(rng() * filtered.length)];
  }

  let letters = "";

  // Step 1: Add a 6-letter word
  if (targetLength >= 6) {
    const word6 = getRandomWordOfLength(6);
    letters += word6;
  }

  // Step 2: Add a 5-letter word
  if (targetLength - letters.length >= 5) {
    const word5 = getRandomWordOfLength(5);
    letters += word5;
  }

  // Step 3: Fill the rest with any random words
  while (letters.length < targetLength) {
    const word = words[Math.floor(rng() * words.length)];
    if (letters.length + word.length <= targetLength) {
      letters += word;
    }
  }

  return letters;
}

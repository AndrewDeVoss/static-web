let wordSet = new Set();

export async function loadDictionary(url = new URL('../../dictionary.txt', import.meta.url).href) {
  const response = await fetch(url);
  const text = await response.text();
  wordSet = new Set(text.split('\n').map(w => w.trim().toLowerCase()).filter(Boolean));
}

export function isWord(word) {
  return wordSet.has(word.toLowerCase());
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

  const words = Array.from(wordSet);
  const chosen = [];
  let letters = "";

  while (letters.length < targetLength) {
    const word = words[Math.floor(rng() * words.length)];
    if (letters.length + word.length <= targetLength) {
      chosen.push(word);
      letters += word;
    }
  }

  return { words: chosen, letters };
}

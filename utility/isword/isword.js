
let wordSet = new Set();

export async function loadDictionary(url = '/dictionary.txt') {
  const response = await fetch(url);
  const text = await response.text();
  wordSet = new Set(text.split('\n').map(w => w.trim().toLowerCase()));
}

export function isWord(word) {
  return wordSet.has(word.toLowerCase());
}
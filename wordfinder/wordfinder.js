import { isWord, loadDictionary, loadForbiddenWords } from "../utility/isword/isword.js";

await loadForbiddenWords();
let bigDictionary = await loadDictionary();
const DICTIONARY = new Map(
  Array.from(bigDictionary.entries()).filter(([key, value]) => isWord(key))
);

const input = document.getElementById('letters-input');
const wordList = document.getElementById('word-list');
const enterBtn = document.getElementById('enter-btn');

input.addEventListener('input', function () {
  // Only allow letters
  input.value = input.value.replace(/[^a-zA-Z]/g, '');
});

function isWordSubsetOfInput(word, inputLetters) {
  const inputSet = new Set(inputLetters);
  const wordSet = new Set(word);
  for (const letter of wordSet) {
    if (!inputSet.has(letter)) return false;
  }
  return true;
}

function checkLetterUsage(word, inputLetters, usageMode) {
  if (usageMode === 'unlimited') return true;

  // Limited: letters can only be used as many times as they appear
  const inputCount = {};
  for (const letter of inputLetters) {
    inputCount[letter] = (inputCount[letter] || 0) + 1;
  }

  for (const letter of word) {
    if (!inputCount[letter]) return false;
    inputCount[letter]--;
  }
  return true;
}

enterBtn.addEventListener('click', function () {
  const userLetters = input.value.trim().toLowerCase();
  const minLength = parseInt(document.getElementById('min-length').value, 10) || 1;
  const maxLength = parseInt(document.getElementById('max-length').value, 10) || Infinity;
  const usageMode = document.querySelector('input[name="letter-usage"]:checked').value;

  wordList.innerHTML = ""; // Clear previous results
  if (userLetters.length === 0 || DICTIONARY.size === 0) return;

  const results = Array.from(DICTIONARY.keys()).filter(word => {
    return (
      word.length >= minLength &&
      word.length <= maxLength &&
      isWordSubsetOfInput(word, userLetters) &&
      checkLetterUsage(word, userLetters, usageMode)
    );
  });

  wordList.innerHTML = results.length > 0 ? results.join('<br>') : "No words found.";
});

const settingsButton = document.getElementById('settings-button');
const settingsPanel = document.getElementById('settings-panel');
settingsButton.addEventListener('click', function () {
  settingsPanel.classList.toggle('hidden');
});
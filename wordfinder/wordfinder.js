let DICTIONARY = [];

fetch('/dictionary.txt')
  .then(response => response.text())
  .then(text => {
    DICTIONARY = text.split('\n').map(word => word.trim().toLowerCase()).filter(Boolean);
  });

document.addEventListener('DOMContentLoaded', function () {
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

  enterBtn.addEventListener('click', function () {
    const userLetters = input.value.trim().toLowerCase();
    wordList.innerHTML = ""; // Clear previous results

    if (userLetters.length === 0 || DICTIONARY.length === 0) {
      return;
    }
    const results = DICTIONARY.filter(
      word => word.length >= 4 && isWordSubsetOfInput(word, userLetters)
    );
    if (results.length > 0) {
      wordList.innerHTML = results.join('<br>'); // Show results in wordList
    } else {
      wordList.innerHTML = "No words found.";
    }
  });
});
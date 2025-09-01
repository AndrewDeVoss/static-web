// rootwords.js
import { loadDictionary, isWord } from '../utility/isword/isword.js';

const grid = document.getElementById('grid');
const swiper = document.querySelector('word-swiper');

let rootLetters = [];
let totalColumns = 0;
const usedWords = new Set(); // Track previously submitted words

// Initialize
await loadDictionary();
updateLettersFromSwiper();

// Observe changes to <word-swiper letters="...">
const observer = new MutationObserver(updateLettersFromSwiper);
observer.observe(swiper, { attributes: true, attributeFilter: ['letters'] });

// Listen for committed words
document.addEventListener('word-committed', (e) => {
  const word = e.detail.word.toUpperCase();
  const letterEls = e.detail.elements; // DOM references of the selected letters

  if (!isWord(word)) {
    alert(`❌ '${word}' is not a valid word.`);
    return;
  }

  if (usedWords.has(word)) {
    alert(`⚠️ You've already used the word '${word}'.`);
    return;
  }

  usedWords.add(word);
  addWordRow(word);

  // Disable the letters that were used in this word using the DOM references directly
  swiper.disableLetters(letterEls);
});



/**
 * Update the root letter set and grid layout from <word-swiper>
 */
function updateLettersFromSwiper() {
  const attr = swiper.getAttribute('letters');
  rootLetters = attr ? attr.split(',').map(l => l.trim().toUpperCase()) : [];
  totalColumns = rootLetters.length;

  // Update CSS grid columns
  grid.style.gridTemplateColumns = `repeat(${totalColumns}, 1fr)`;

  // Optional: clear previous words on letter change
  usedWords.clear();
  grid.innerHTML = '';
}

/**
 * Add a word to the grid, centered in one cell
 * @param {string} word
 */
function addWordRow(word) {
  const wordLength = word.length;
  const padding = Math.floor((totalColumns - wordLength) / 2);

  const rowFragment = document.createDocumentFragment();

  for (let i = 0; i < totalColumns; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');

    if (i === padding) {
      // Insert the full word in one centered cell
      cell.textContent = word;
      cell.classList.add('word-cell');
    }

    rowFragment.appendChild(cell);
  }

  grid.appendChild(rowFragment);
}

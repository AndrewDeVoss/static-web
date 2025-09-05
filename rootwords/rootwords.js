// rootwords.js
import { loadDictionary, isWord } from '../utility/isword/isword.js';
import { TreeNode } from './word-tree.js';

const grid = document.getElementById('word-grid');
const swiper = document.querySelector('word-swiper');
await customElements.whenDefined('word-swiper');
let letters = swiper.getAttribute('letters');

let rootLetters = [];
let totalColumns = 0;
const usedWords = new Set(); // Track previously submitted words

let treeRoot = new TreeNode(letters);  // Root of the tree, initially empty
let currentNode = treeRoot;  // The current node that the next word will be added to
let wordLevelMap = {};  // To store words at each level

// Initialize the dictionary and update grid layout
await loadDictionary();
updateLettersFromSwiper();

// Observe changes to <word-swiper letters="...">
const observer = new MutationObserver(updateLettersFromSwiper);
observer.observe(swiper, { attributes: true, attributeFilter: ['letters'] });

// Listen for committed words
document.addEventListener('word-committed', (e) => {
  const word = e.detail.word.toUpperCase();
  const letterEls = e.detail.elements; // DOM references of the selected letters

  // TODO style
  if (!isWord(word)) {
    console.log(`❌ '${word}' is not a valid word.`);
    return;
  }

  if (usedWords.has(word)) {
    console.log(`⚠️ You've already used the word '${word}'.`);
    return;
  }

  usedWords.add(word);

  // Create a new node for this word
  const newNode = new TreeNode(word);

  // Add the new node to the tree as a child of the current node
  currentNode.addChild(newNode);

  // Move to the newly added node for future word additions
  currentNode = newNode;

  // Add this word to the level map (for drawing purposes)
  const currentLevel = getNodeLevel(currentNode);
  if (!wordLevelMap[currentLevel]) wordLevelMap[currentLevel] = [];
  wordLevelMap[currentLevel].push(word);

  // Disable the letters that were used in this word using the DOM references directly
  swiper.enableOnlyLetters(letterEls);

  // Draw the subtree starting from the newly added node
  drawTree();
});

/**
 * Update the root letter set and grid layout from <word-swiper>
 */
function updateLettersFromSwiper() {
  const attr = swiper.getAttribute('letters');
  rootLetters = attr ? attr.split(',').map(l => l.trim().toUpperCase()) : [];
  totalColumns = rootLetters.length;

  // Optional: clear previous words on letter change
  usedWords.clear();
  grid.innerHTML = '';
}

function drawTree() {
  console.log('Drawing tree...');

  const numCols = treeRoot.word.length;  // The width is always equal to the root's word length
  const drawList = []; // For breadth-first traversal
  const processedLevels = {};
  let currentColumn = 0; // Track current column for placement

  // Helper function for breadth-first traversal and calculating positions
  function traverse(node, level) {
    if (!node) return;
    if (!processedLevels[level]) {
      processedLevels[level] = true;
      currentColumn = 0; // Reset column for new level
    }

    let nodeInfoDict = {};
    nodeInfoDict.word = node.word;
    nodeInfoDict.row = level;
    nodeInfoDict.column = currentColumn;
    nodeInfoDict.span = node.word.length; // Span is the length of the word
    nodeInfoDict.parent = node.parent;

    drawList.push(nodeInfoDict);

    currentColumn += node.word.length; // Move to the next column based on word length
  
    // Traverse children (breadth-first)
    for (let child of node.children) {
      traverse(child, level + 1);
    }
  }

  // Start traversal from the given startNode (root of the tree)
  traverse(treeRoot, 0);

  // Now draw the grid based on the calculated positions
  drawGrid(drawList, numCols);
}

/**
 * Draw the grid based on node positions
 */
function drawGrid(drawList, numCols) {
  console.log('Drawing grid...');
  grid.innerHTML = '';  // Clear the existing grid

  drawList.forEach(nodeInfoDict => {
    const cell = document.createElement('div');
    cell.classList.add('grid-cell');
    cell.style.gridColumnStart = nodeInfoDict.column + 1;
    cell.style.gridColumnEnd = nodeInfoDict.column + nodeInfoDict.span + 1;
    cell.style.gridRowStart = nodeInfoDict.row + 1;
    cell.textContent = nodeInfoDict.word;
    grid.appendChild(cell);

    // TODO Draw line from parent to this node if parent exists
  });
}

/**
 * Draw a line between parent and child nodes (parent -> child)
 */
function drawLine(parentNode, childNode, positions) {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  const parentPos = positions[parentNode.word];
  const childPos = positions[childNode.word];

  line.setAttribute('x1', parentPos.x * 50 + 25);  // 50 is the width of each cell
  line.setAttribute('y1', parentPos.y * 50 + 25);  // 50 is the height of each cell
  line.setAttribute('x2', childPos.x * 50 + 25);  // Adjust to grid scale
  line.setAttribute('y2', childPos.y * 50 + 25);  // Adjust to grid scale
  line.setAttribute('stroke', '#000');
  line.setAttribute('stroke-width', '2');

  grid.appendChild(line);
}

/**
 * Helper function to calculate the max depth of the tree
 */
function getMaxDepth(node) {
  if (node.children.length === 0) return 0;
  const childDepths = node.children.map(child => getMaxDepth(child));
  return Math.max(...childDepths) + 1;
}

/**
 * Helper function to calculate the level of a node in the tree
 */
function getNodeLevel(node) {
  let level = 0;
  let current = node;
  while (current !== treeRoot) {
    level++;
    current = current.parent;  // Traverse up to the root
  }
  return level;
}


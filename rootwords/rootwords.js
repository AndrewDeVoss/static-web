// rootwords.js
import { loadDictionary, isWord } from '../utility/isword/isword.js';
import { TreeNode } from './word-tree.js';

const grid = document.getElementById('word-grid');
const swiper = document.querySelector('word-swiper');
await customElements.whenDefined('word-swiper');
await swiper.isReady(); // ✅ Wait for letterDivs to be initialized

const rootLetterDivs = swiper.getLetterDivs();
let treeRoot = new TreeNode(rootLetterDivs);  // Safe now
let currentNode = treeRoot;

let rootLetters = [];
let totalColumns = 0;
const usedWords = new Set(); // Track previously submitted words

const nodeToInfo = new Map(); // Map to link TreeNode to its corresponding grid cell


// Initialize the dictionary and update grid layout
await loadDictionary();
updateLettersFromSwiper();

// Observe changes to <word-swiper letters="...">
const observer = new MutationObserver(updateLettersFromSwiper);
observer.observe(swiper, { attributes: true, attributeFilter: ['letters'] });

// Listen for committed words
document.addEventListener('word-committed', (e) => {
  const word = e.detail.word.toUpperCase();
  const letterDivs = e.detail.elements; // DOM references of the selected letters

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
  const newNode = new TreeNode(letterDivs);

  // Add the new node to the tree as a child of the current node
  currentNode.addChild(newNode);

  // Draw the subtree starting from the newly added node
  drawTree();

  selectNode(newNode);
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
    console.log(nodeInfoDict.word);
    nodeInfoDict.row = level;
    nodeInfoDict.column = currentColumn;
    nodeInfoDict.span = node.word.length; // Span is the length of the word
    nodeInfoDict.parent = node.parent;
    nodeInfoDict.treeNode = node;

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

    nodeInfoDict.cell = cell;
    nodeToInfo.set(nodeInfoDict.treeNode, nodeInfoDict);

    cell.addEventListener('click', () => {
      selectNode(nodeInfoDict.treeNode);
    });

    grid.appendChild(cell);

    // TODO Draw line from parent to this node if parent exists
  });
}

function selectNode(treeNode) {
  currentNode = treeNode;
  const cell = nodeToInfo.get(treeNode).cell;
  highlightSelectedCell(cell);

  // Disable the letters that were used in this word using the DOM references directly
  swiper.enableOnlyLetters(treeNode.letterDivs);
}

function highlightSelectedCell(selectedCell) {
  const allCells = grid.querySelectorAll('.grid-cell');
  allCells.forEach(cell => cell.classList.remove('selected'));
  selectedCell.classList.add('selected');
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


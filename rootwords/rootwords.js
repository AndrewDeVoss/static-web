// rootwords.js
import { loadDictionary, isWord } from '../utility/isword/isword.js';
import { TreeNode } from './word-tree.js';

const grid = document.getElementById('grid');
const swiper = document.querySelector('word-swiper');

let rootLetters = [];
let totalColumns = 0;
const usedWords = new Set(); // Track previously submitted words

let treeRoot = new TreeNode('CATDOGS');  // Root of the tree, initially empty
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

  // If the word is valid and not already used
  if (!isWord(word)) {
    alert(`❌ '${word}' is not a valid word.`);
    return;
  }

  if (usedWords.has(word)) {
    alert(`⚠️ You've already used the word '${word}'.`);
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
  swiper.disableLetters(letterEls);

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

  // Update CSS grid columns
  grid.style.gridTemplateColumns = `repeat(${totalColumns}, 1fr)`;

  // Optional: clear previous words on letter change
  usedWords.clear();
  grid.innerHTML = '';
}

/**
 * Draw the entire tree based on the current state
 */
function drawTree() {
  console.log('Drawing tree...');
  const positions = {};  // To store positions of each node
  const maxDepth = getMaxDepth(treeRoot);  // Find the max depth for layout
  let currentX = 0;  // Starting X position for the first node

  // Helper function for breadth-first traversal and calculating positions
  function traverse(node, level) {
    if (!node) return;

    // Set position for this node (X: based on level and sibling index, Y: based on level)
    positions[node.word] = { x: currentX, y: level, word: node.word };  // Store word here

    // Increase X position for the next node at the same level
    currentX++;

    // Draw the line from parent to child if necessary
    if (node.parent) {
      drawLine(node.parent, node, positions);
    }

    // Traverse children (breadth-first)
    for (let child of node.children) {
      traverse(child, level + 1);
    }
  }

  // Start traversal from the given startNode (root of the tree)
  traverse(treeRoot, 0);

  // Now draw the grid based on the calculated positions
  drawGrid(positions);
}


/**
 * Draw the grid based on node positions
 */
function drawGrid(positions) {
  console.log('Drawing grid...', positions);
  grid.innerHTML = '';  // Clear the existing grid

  // Set up the grid layout (using dynamic column count based on max X position)
  const maxX = Math.max(...Object.values(positions).map(p => p.x));
  grid.style.gridTemplateColumns = `repeat(${maxX + 1}, 1fr)`;  // Adjust grid width based on number of nodes

  // Create the grid rows for the nodes
  Object.values(positions).forEach(pos => {
    const row = document.createElement('div');
    row.classList.add('grid-row');
    
    const cell = document.createElement('div');
    cell.classList.add('grid-cell');
    cell.style.gridColumnStart = pos.x + 1;
    cell.style.gridRowStart = pos.y + 1;  // Row position is 1-indexed
    cell.textContent = pos.word;  // Access the word here

    console.log('Placing word:', pos.word, 'at', pos.x + 1, pos.y + 1);

    row.appendChild(cell);
    grid.appendChild(row);
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


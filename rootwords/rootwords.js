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
  scoreTree();
  selectNode(newNode);
});

function scoreTree(rootNode = treeRoot) {
  const letterDivToDepthMap = new Map();

  function traverse(node, depth) {
    if (!node || !node.letterDivs) return;

    for (const letterDiv of node.letterDivs) {
      const currentMax = letterDivToDepthMap.get(letterDiv) ?? -1;
      if (depth > currentMax) {
        letterDivToDepthMap.set(letterDiv, depth);
      }
    }

    for (const child of node.children) {
      traverse(child, depth + 1);
    }
  }

  traverse(rootNode, 0);

  const depthList = Array.from(letterDivToDepthMap.values());
  depthList.sort((a, b) => a-b); // sort low to high
  let score = 0;

  for (let i = 0; i < depthList.length; i++) {
    score += depthList[i] * (depthList.length-i); // more points for letters from shallow roots. Gotta grow deep!
  }

  document.getElementById('score-scroll').textContent = score;
}



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
  const numCols = treeRoot.word.length;  // The width is always equal to the root's word length
  const drawList = [];
  const processedLevels = {};

  function traverse(node, row, col) {
    if (!node) return;

    let nodeInfoDict = {};
    nodeInfoDict.word = node.word;
    nodeInfoDict.row = row;
    nodeInfoDict.column = col;
    nodeInfoDict.span = node.word.length;
    nodeInfoDict.parent = node.parent;
    nodeInfoDict.treeNode = node;

    drawList.push(nodeInfoDict);
  
    let column = col;
    for (let child of node.children) {
      traverse(child, row+1, column);
      column += child.word.length;
    }
  }

  // Start traversal from the given startNode (root of the tree)
  traverse(treeRoot, 0, 0);

  // Now draw the grid based on the calculated positions
  drawGrid(drawList, numCols);
}

/**
 * Draw the grid based on node positions
 */
function drawGrid(drawList, numCols) {
  grid.innerHTML = '';  // Clear the existing grid

   // Create an SVG overlay for the squiggly lines
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'grid-lines');
  svg.style.position = 'absolute';
  svg.style.top = 0;
  svg.style.left = 0;
  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.style.pointerEvents = 'none'; // Allow clicks to pass through

  grid.appendChild(svg);

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

    // Draw line from parent to this node if parent exists
    if (nodeInfoDict.parent) {
      const parentInfo = nodeToInfo.get(nodeInfoDict.parent);
      if (parentInfo) {
        drawSquigglyLine(svg, parentInfo.cell, cell, nodeInfoDict.row);
      }
    }

  });
}

function selectNode(treeNode) {
  currentNode = treeNode;
  const cell = nodeToInfo.get(treeNode).cell;
  highlightSelectedCell(cell);

  // Disable the letters that were used in this word using the DOM references directly
  const usedLetterDivs = [];
  for (let child of treeNode.children) {
    usedLetterDivs.push(...child.letterDivs);
  }
  swiper.updateLetterAvailability(treeNode.letterDivs, usedLetterDivs);
}

function highlightSelectedCell(selectedCell) {
  const allCells = grid.querySelectorAll('.grid-cell');
  allCells.forEach(cell => cell.classList.remove('selected'));
  selectedCell.classList.add('selected');
}
let lineCounter = 0; // Ensures unique gradient IDs

function drawSquigglyLine(svg, parentEl, childEl, row) {
  const parentRect = parentEl.getBoundingClientRect();
  const childRect = childEl.getBoundingClientRect();
  const gridRect = grid.getBoundingClientRect();

  const startX = parentRect.left + parentRect.width / 2 - gridRect.left;
  const startY = parentRect.bottom - gridRect.top;

  const endX = childRect.left + childRect.width / 2 - gridRect.left;
  const endY = childRect.top - gridRect.top;

  // Random jitter for squiggle uniqueness
  const jitter = () => (Math.random() - 0.5) * 20;

  const c1x = startX + jitter();
  const c1y = startY + (endY - startY) * 0.33 + jitter();

  const c2x = endX + jitter();
  const c2y = startY + (endY - startY) * 0.66 + jitter();

  // Depth-based thickness
  const maxThickness = 8;
  const minThickness = 1;
  const maxVisibleDepth = 6;
  const depthFactor = Math.min(row, maxVisibleDepth) / maxVisibleDepth;
  const strokeWidth = maxThickness - (maxThickness - minThickness) * depthFactor;

  const gradientId = `fade-gradient-${lineCounter++}`;

  // Create <defs> if not present
  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.prepend(defs);
  }

  // Define gradient
  const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  gradient.setAttribute('id', gradientId);
  gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
  gradient.setAttribute('x1', startX);
  gradient.setAttribute('y1', startY);
  gradient.setAttribute('x2', endX);
  gradient.setAttribute('y2', endY);

  const stops = [
    { offset: '0%', color: '#5a321c', opacity: '0.05' },
    { offset: '30%', color: '#5a321c', opacity: '0.3' },
    { offset: '70%', color: '#5a321c', opacity: '0.3' },
    { offset: '100%', color: '#5a321c', opacity: '0.05' }
  ];

  stops.forEach(({ offset, color, opacity }) => {
    const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop.setAttribute('offset', offset);
    stop.setAttribute('stop-color', color);
    stop.setAttribute('stop-opacity', opacity);
    gradient.appendChild(stop);
  });

  defs.appendChild(gradient);

  // Draw the squiggly path
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const d = `M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`;

  path.setAttribute('d', d);
  path.setAttribute('stroke', `url(#${gradientId})`);
  path.setAttribute('stroke-width', strokeWidth.toFixed(2));
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke-linecap', 'round');

  svg.appendChild(path);
}

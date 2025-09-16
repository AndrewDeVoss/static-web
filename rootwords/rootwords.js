// rootwords.js
import { loadDictionary, isWord, chooseRandomWordSet } from '../utility/isword/isword.js';
import { TreeNode } from './word-tree.js';


const grid = document.getElementById('word-grid');
const swiper = document.querySelector('word-swiper');
await customElements.whenDefined('word-swiper');
await swiper.isReady(); // ✅ Wait for letterDivs to be initialized
await loadDictionary();
const { words, letters } = chooseRandomWordSet(10);
swiper.setLetters(letters.toUpperCase());

const rootLetterDivs = swiper.getLetterDivs();
let treeRoot = new TreeNode(rootLetterDivs);  // Safe now
let currentNode = treeRoot;

loadTreeFromStorage();

let rootLetters = [];
let totalColumns = 0;
const usedWords = new Set(); // Track previously submitted words
const nodeToInfo = new Map(); // Map to link TreeNode to its corresponding grid cell
let lineCounter = 0; // Ensures unique gradient IDs


// Initialize the dictionary and update grid layout
updateLettersFromSwiper();
drawTree();

// Observe changes to <word-swiper letters="...">
const observer = new MutationObserver(updateLettersFromSwiper);
observer.observe(swiper, { attributes: true, attributeFilter: ['letters'] });

const shuffleButton = document.querySelector('.root-words-shuffle-button');

if (swiper && shuffleButton) {
  shuffleButton.addEventListener('click', () => {
    swiper.shuffleLetters();
  });
} else {
  console.warn('Could not find swiper or shuffle button');
}



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

  saveTreeToStorage();
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
  let numRows = 0;

  function traverse(node, row, col) {
    if (!node) return;

    let nodeInfoDict = {};
    nodeInfoDict.word = node.word;
    nodeInfoDict.row = row;
    nodeInfoDict.column = col;
    nodeInfoDict.span = node.word.length;
    nodeInfoDict.parent = node.parent;
    nodeInfoDict.treeNode = node;

    if (row>numRows) {
      numRows = row;
    }

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

  grid.style.setProperty('--num-rows', numRows);
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

    addLongPressListener(cell, nodeInfoDict.treeNode);

    grid.appendChild(cell);

    // ✅ Draw regular root to parent if needed
    if (nodeInfoDict.parent) {
      const parentInfo = nodeToInfo.get(nodeInfoDict.parent);
      if (parentInfo) {
        drawRootConnection(svg, parentInfo.cell, cell, nodeInfoDict.row);
      }
    }

    // ✅ Draw green root for this node (if it has unused potential)
    const parentSpan = nodeInfoDict.span;
    const children = nodeInfoDict.treeNode.children;
    const totalUsedCols = children.reduce((sum, child) => sum + child.word.length, 0);
    const greenLength = parentSpan - totalUsedCols;

    if (greenLength > 0 && nodeInfoDict.word.length > 1) {
      drawGreenRoot(svg, cell, nodeInfoDict, greenLength);
    }
  });

  // Calculate the height of the first row dynamically
  const firstRow = grid.querySelector('.grid-cell');
  const rowHeight = firstRow ? firstRow.offsetHeight : 50; // Default 50px if not found

  // Dynamically apply padding-bottom based on row height
  grid.style.paddingBottom = `${Math.round(rowHeight*1.5)}px`;
}

function removeSubtrees(startNode) {
  if (!startNode) return;

  const toRemove = [];

  function collectNodesToRemove(node) {
    if (node !== treeRoot) {
      // No children – mark the node itself for removal
      toRemove.push(node);
    }
    for (const child of node.children) {
        toRemove.push(child);
        collectNodesToRemove(child);
      }
  }

  collectNodesToRemove(startNode);

  // Remove from DOM and internal tracking
  toRemove.forEach(node => {
    const info = nodeToInfo.get(node);
    if (info && info.cell) {
      info.cell.remove();
    }
    nodeToInfo.delete(node);
    usedWords.delete(node.word);

    // Remove node from parent's children
    const parent = node.parent;
    if (parent) {
      parent.children = parent.children.filter(child => child !== node);
    }
  });

  // If we were pruning subtrees, clear them now
  if (startNode.children.length > 0) {
    startNode.children = [];
  }

  drawTree();
  scoreTree();
}

function addLongPressListener(cell, node, holdTime = 1000) {
  let holdTimer;
  let delayTimer;
  let progress = 0;
  const interval = 50;
  const steps = holdTime / interval;
  const animationDelay = 200; // Delay before starting animation

  const startHold = () => {
    delayTimer = setTimeout(() => {
      progress = 0;
      cell.classList.add('long-press-start');

      holdTimer = setInterval(() => {
        progress++;
        const ratio = progress / steps;

        // Text color fade from dark red to bright red
        const redValue = Math.min(255, Math.floor(100 + 155 * ratio));
        cell.style.color = `rgb(${redValue}, 0, 0)`;

        if (progress >= steps) {
          clearInterval(holdTimer);
          cell.style.color = '';
          cell.classList.remove('long-press-start');
          const leaf = node.children.length === 0;
          removeSubtrees(node);
          if (node.parent) {
            selectNode(node.parent);
          } else {
            selectNode(treeRoot);
          }
        }
      }, interval);
    }, animationDelay);
  };

  const cancelHold = () => {
    clearTimeout(delayTimer);
    clearInterval(holdTimer);
    cell.style.color = '';
    cell.classList.remove('long-press-start');
  };

  // Mouse support
  cell.addEventListener('mousedown', startHold);
  cell.addEventListener('mouseup', cancelHold);
  cell.addEventListener('mouseleave', cancelHold);

  // Touch support
  cell.addEventListener('touchstart', startHold);
  cell.addEventListener('touchend', cancelHold);
  cell.addEventListener('touchcancel', cancelHold);
}


function selectNode(treeNode) {
  // clear the word selection first
  swiper.clearSelection();
  currentNode = treeNode;
  const cell = nodeToInfo.get(treeNode).cell;
  highlightSelectedCell(cell);

  // Disable the letters that were used in this word using the DOM references directly
  const usedLetterDivs = [];
  for (let child of treeNode.children) {
    usedLetterDivs.push(...child.letterDivs);
  }

  console.log('length', usedLetterDivs.length);
  swiper.updateLetterAvailability(treeNode.letterDivs, usedLetterDivs);
}

function highlightSelectedCell(selectedCell) {
  const allCells = grid.querySelectorAll('.grid-cell');
  allCells.forEach(cell => cell.classList.remove('selected'));
  selectedCell.classList.add('selected');
}

function drawRootConnection(svg, parentEl, childEl, row) {
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
    { offset: '30%', color: '#5a321c', opacity: '0.7' },
    { offset: '70%', color: '#5a321c', opacity: '0.7' },
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
function drawGreenRoot(svg, parentEl, parentInfo, greenLength) {
  if (greenLength <= 0) return;

  const parentRect = parentEl.getBoundingClientRect();
  const gridRect = grid.getBoundingClientRect();

  const startX = parentRect.left + parentRect.width / 2 - gridRect.left;
  const startY = parentRect.bottom - gridRect.top;

  const parentCol = parentInfo.column;
  const parentSpan = parentInfo.span;

  const totalUsedCols = parentInfo.treeNode.children.reduce((sum, child) => sum + child.word.length, 0);
  const unusedCols = parentSpan - totalUsedCols;

  if (unusedCols <= 0) return;

  const unusedStartCol = parentCol + totalUsedCols;
  const unusedMidCol = unusedStartCol + unusedCols / 2;

  const colWidth = parentRect.width / parentSpan;
  const endX = (unusedMidCol - parentCol) * colWidth + parentRect.left - gridRect.left;
  const endY = startY + greenLength * 12;

  // Slightly larger, smoother bends
  const baseCurveOffset = 30; // Adjust this to control curvature
  const jitter = () => (Math.random() - 0.5) * 10; // Smaller random variation

  const midX = (startX + endX) / 2;

  // Push control points slightly outward to curve more
  const c1x = midX - baseCurveOffset + jitter();
  const c1y = startY + (endY - startY) * 0.3 + jitter();

  const c2x = midX + baseCurveOffset + jitter();
  const c2y = startY + (endY - startY) * 0.7 + jitter();


  // ✅ Match stroke thickness to row depth
  const row = parentInfo.row + 1;  // Green root is for the next row
  const maxThickness = 8;
  const minThickness = 1;
  const maxVisibleDepth = 6;

  const depthFactor = Math.min(row, maxVisibleDepth) / maxVisibleDepth;
  const strokeWidth = maxThickness - (maxThickness - minThickness) * depthFactor;

  const gradientId = `greenRootGradient-${lineCounter++}`;

  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.prepend(defs);
  }

  const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  gradient.setAttribute('id', gradientId);
  gradient.setAttribute('gradientUnits', 'userSpaceOnUse');
  gradient.setAttribute('x1', startX);
  gradient.setAttribute('y1', startY);
  gradient.setAttribute('x2', endX);
  gradient.setAttribute('y2', endY);

  const stops = [
    { offset: '0%', color: '#6B3D2F', opacity: '0.05' },
    { offset: '30%', color: '#6b672fff', opacity: '0.7' },
    { offset: '70%', color: '#5F8F5D', opacity: '0.7' },
    { offset: '100%', color: '#3e813cff', opacity: '0.05' }
  ];

  stops.forEach(({ offset, color, opacity }) => {
    const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop.setAttribute('offset', offset);
    stop.setAttribute('stop-color', color);
    stop.setAttribute('stop-opacity', opacity);
    gradient.appendChild(stop);
  });

  defs.appendChild(gradient);

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const d = `M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`;

  path.setAttribute('d', d);
  path.setAttribute('stroke', `url(#${gradientId})`);
  path.setAttribute('stroke-width', strokeWidth.toFixed(2)); // ✅ Dynamic thickness
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('opacity', '1');

  svg.appendChild(path);
}

function encodeTree(root) {
  function serialize(node) {
    return {
      word: node.word,
      children: node.children.map(serialize)
    };
  }
  return JSON.stringify(serialize(root));
}

function decodeTree(jsonStr, getLetterDivsByWord) {
  const data = JSON.parse(jsonStr);

  function build(nodeData) {
    const letterDivs = getLetterDivsByWord(nodeData.word);
    const node = new TreeNode(letterDivs);
    node.children = nodeData.children.map(childData => {
      const childNode = build(childData);
      childNode.parent = node;
      return childNode;
    });
    return node;
  }

  return build(data);
}

function getLetterDivsByWord(word) {
  const allDivs = Array.from(swiper.getLetterDivs());
  const usedIndices = new Set();
  const result = [];

  for (let letter of word) {
    const div = allDivs.find((div, idx) =>
      div.dataset.letter === letter && !usedIndices.has(idx)
    );
    if (div) {
      usedIndices.add(allDivs.indexOf(div));
      result.push(div);
    } else {
      console.warn(`Could not find letterDiv for letter "${letter}"`);
    }
  }

  return result;
}

function saveTreeToStorage(cookie = 'savedWordTree', todayOnly = true) {
  const encoded = encodeTree(treeRoot);

  if (todayOnly) {
    // Save as cookie with expiration at midnight
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0); // Next midnight (local time)

    document.cookie = `${encodeURIComponent(cookie)}=${encodeURIComponent(encoded)}; expires=${midnight.toUTCString()}; path=/`;
  } else {
    // Default: use localStorage
    localStorage.setItem(cookie, encoded);
  }
}


function loadTreeFromStorage(cookie = 'savedWordTree') {
  const encoded = localStorage.getItem(cookie);
  if (!encoded) return;

  try {
    const restoredTree = decodeTree(encoded, getLetterDivsByWord);
    treeRoot = restoredTree;
    currentNode = treeRoot;
    usedWords.clear();

    function collectWords(node) {
      usedWords.add(node.word);
      node.children.forEach(collectWords);
    }

    collectWords(treeRoot);

    drawTree();
    scoreTree();
    selectNode(treeRoot);
  } catch (err) {
    console.error('❌ Failed to decode tree:', err);
  }
}


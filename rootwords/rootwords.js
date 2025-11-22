// rootwords.js
import { loadDictionary, isWord, chooseRandomWordSet, loadForbiddenWords, getValidWordsFromLetters, loadSuitable5And6 } from '../utility/isword/isword.js';
import { TreeNode } from './word-tree.js';
import { drawTree } from './drawtree.js'
import { drawGrass } from './drawgrass.js';
import { drawSky } from './drawsky.js';


const grid = document.getElementById('word-grid');

async function createLetterBoardComponent(tagName, letters) {
  await customElements.whenDefined(tagName);
  const letterboard = document.createElement(tagName);
  const placeholder = document.getElementById('letter-board');
  placeholder.replaceWith(letterboard);

  letterboard.setLetters(letters.toUpperCase());
  await letterboard.isReady?.();
  return letterboard;
}

await loadSuitable5And6();
await loadDictionary();
await loadForbiddenWords();
const letters = chooseRandomWordSet(11);
const board1 = 'word-swiper';
const board2 = 'hex-board';
const letterboard = await createLetterBoardComponent(board2, letters);

const rootLetterDivs = letterboard.getLetterDivs();
let treeRoot = new TreeNode(rootLetterDivs);  // Safe now
let currentNode = treeRoot;

let rootLetters = [];
const usedWords = new Set(); // Track previously submitted words
const nodeToInfo = new Map(); // Map to link TreeNode to its corresponding grid cell
let lineCounter = 0; // Ensures unique gradient IDs

const overWorld = document.getElementById('over-world');
drawSky(overWorld);
const grassContainer = document.getElementById("grassery");
drawGrass(grassContainer);

// toggle for nav
const navControls = document.getElementById('nav-controls');
const toggleNav = document.getElementById('toggle-nav');
toggleNav.addEventListener('click', function () {
  navControls.classList.toggle('hidden');
  const isOpen = !navControls.classList.contains('hidden');

  toggleNav.innerText = isOpen ? '▾' : '▴';
});

// Shuffle
const shuffleButton = document.getElementById('shuffle-button');
if (letterboard && shuffleButton) {
  shuffleButton.addEventListener('click', () => {
    letterboard.shuffleLetters();
  });
} else {
  console.warn('Could not find swiper or shuffle button');
}

// Undo and Redo
const undoButton = document.getElementById('undo-button');
const redoButton = document.getElementById('redo-button');
let rootStack = [];
let rootStackIndex = rootStack.length - 1; // Points to the current tree
undoButton.addEventListener('click', () => {
  if (rootStackIndex > 0) {
    rootStackIndex--;
    loadRootFromEncoded(rootStack[rootStackIndex]);
  }
});
redoButton.addEventListener('click', () => {
  if (rootStackIndex < rootStack.length - 1) {
    rootStackIndex++;
    loadRootFromEncoded(rootStack[rootStackIndex]);
  }
});
function addToStack(encodedTree) {
  rootStack.push(encodedTree);
  rootStackIndex = rootStack.length - 1;
}

// Score
const currentScore = document.getElementById('current-score');
const bronzeScore = document.getElementById('bronze-score');
const silverScore = document.getElementById('silver-score');
const goldScore = document.getElementById('gold-score');
const bestScore = document.getElementById('best-score');

// Initialize
checkOrComputeGreedyScore(treeRoot.word);
console.log(computeOptimalScoreAndTree(treeRoot.word)); // Sanity check letters of hiimrst=? acre=26 aemr=22, tumblenoose thinks it can do bluestone and emno?
loadRootFromStorage();
drawRoots();
scoreRoots();
rootStack.push(encodeRoot(treeRoot)); // Initial state

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

  // Create a new node for this word
  const newNode = new TreeNode(letterDivs);

  // Add the new node to the tree as a child of the current node
  currentNode.addChild(newNode);

  // Draw the subtree TODO starting from the newly added node
  drawRoots();
  scoreRoots();

  // Select node according to a few rules
  if (newNode.word.length === 1) {
    selectNode(currentNode); // Cannot increase depth with single-letter words
  } else {
    // Determine how many letters are used in children of currentNode
    const totalUsedCols = currentNode.children.reduce((sum, child) => sum + child.word.length, 0);
    if (totalUsedCols < currentNode.word.length / 2) {
      selectNode(currentNode); // Most of the room to grow is still here
    } else {
      selectNode(newNode); // Move to the new node
    }
  }

  rootStack = rootStack.slice(0, rootStackIndex + 1); // Any time we commit a word, discard future states
  addToStack(encodeRoot(treeRoot));
});

function scoreRoots(rootNode = treeRoot) {
  const letterDivToDepthMap = new Map();
  let wordCount = 0;
  let numLetters = 0;
  usedWords.clear();

  function traverse(node, depth) {
    if (!node || !node.letterDivs) return;
    wordCount++;
    numLetters += node.word.length;
    usedWords.add(node.word);

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
  depthList.sort((a, b) => a - b); // sort low to high
  let score = 0;

  // for (let i = 0; i < depthList.length; i++) {
  //   score += depthList[i] * (depthList.length-i); // more points for letters from shallow roots. Gotta grow deep!
  // }
  // score = depthList[0] * depthList[depthList.length-1] + wordCount - 1;
  score = numLetters - rootNode.word.length;

  currentScore.textContent = score;

  // Check if score surpasses greedy scores
  let medals = new Map();
  if (bronzeScore && parseInt(bronzeScore.textContent) > 0) {
    let bronze = parseInt(bronzeScore.textContent);
    medals.set('bronze', Math.min(1, Math.floor(score / bronze)));
  }
  if (silverScore && parseInt(silverScore.textContent) > 0) {
    let silver = parseInt(silverScore.textContent);
    medals.set('silver', Math.min(1, Math.floor(score / silver)));
  }
  if (goldScore && parseInt(goldScore.textContent) > 0) {
    let gold = parseInt(goldScore.textContent);
    medals.set('gold', Math.min(1, Math.floor(score / gold)));
  }

  updateCurrentTree();
  tryUpdateBestRoots(score);

  const treeContainer = document.getElementById("tree");
  const dateString = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (daily)
  let trunkXPercent = drawTree(score, treeContainer, dateString, medals);

  // Center the trunk horizontally in the container
  treeContainer.style.transform = `translateX(${-(trunkXPercent - 50)}%) translateY(100px)`;
}

function drawRoots() {
  const numCols = treeRoot.word.length;  // The width is always equal to the root's word length
  const drawList = [];
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

    if (row > numRows) {
      numRows = row;
    }

    drawList.push(nodeInfoDict);

    let column = col;
    for (let child of node.children) {
      traverse(child, row + 1, column);
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

    const wordWrapper = document.createElement('div');
    wordWrapper.textContent = nodeInfoDict.word;
    cell.wordWrapper = wordWrapper;
    cell.appendChild(wordWrapper);

    nodeInfoDict.cell = cell;
    nodeToInfo.set(nodeInfoDict.treeNode, nodeInfoDict);

    cell.addEventListener('click', () => {
      selectNode(nodeInfoDict.treeNode);
    });

    addLongPressListener(wordWrapper, nodeInfoDict.treeNode);

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
  grid.style.paddingBottom = `${Math.round(rowHeight * 1.5)}px`;
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

  drawRoots();
  scoreRoots();
  addToStack(encodeRoot(treeRoot));
}

function addLongPressListener(wordWrapper, node, holdTime = 1000) {
  let holdTimer;
  let delayTimer;
  let progress = 0;
  const interval = 50;
  const steps = holdTime / interval;
  const animationDelay = 200; // Delay before starting 
  const nodeWordWrappers = new Set();

  const startHold = () => {
    nodeWordWrappers.clear();
    function collectNodeWordWrappers(node) {
      const info = nodeToInfo.get(node);
      if (info && info.cell && info.cell.wordWrapper) {
        nodeWordWrappers.add(info.cell.wordWrapper);
      }

      for (let child of node.children) {
        collectNodeWordWrappers(child);
      }
    }
    collectNodeWordWrappers(node);

    delayTimer = setTimeout(() => {
      progress = 0;
      nodeWordWrappers.forEach(div => div.classList.add('long-press-start'));

      holdTimer = setInterval(() => {
        progress++;
        const ratio = progress / steps;

        // Text color fade from dark red to bright red
        const redValue = Math.min(255, Math.floor(100 + 155 * ratio));
        nodeWordWrappers.forEach(div => div.style.color = `rgb(${redValue}, 0, 0)`);

        if (progress >= steps) {
          clearInterval(holdTimer);
          nodeWordWrappers.forEach(div => div.style.color = '');
          nodeWordWrappers.forEach(div => div.classList.remove('long-press-start'));
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
    nodeWordWrappers.forEach(div => div.style.color = '');
    nodeWordWrappers.forEach(div => div.classList.remove('long-press-start'));
  };

  // Mouse support
  wordWrapper.addEventListener('mousedown', startHold);
  wordWrapper.addEventListener('mouseup', cancelHold);
  wordWrapper.addEventListener('mouseleave', cancelHold);

  // Touch support
  wordWrapper.addEventListener('touchstart', startHold);
  wordWrapper.addEventListener('touchend', cancelHold);
  wordWrapper.addEventListener('touchcancel', cancelHold);
}


function selectNode(treeNode) {
  // clear the word selection first
  letterboard.clearSelection();
  currentNode = treeNode;
  const cell = nodeToInfo.get(treeNode).cell;
  highlightSelectedCell(cell);

  // Disable the letters that were used in this word using the DOM references directly
  const usedLetterDivs = [];
  for (let child of treeNode.children) {
    usedLetterDivs.push(...child.letterDivs);
  }

  letterboard.updateLetterAvailability(treeNode.letterDivs, usedLetterDivs);
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

function encodeRoot(root) {
  function serialize(node) {
    return {
      word: node.word,
      children: node.children.map(serialize)
    };
  }
  return JSON.stringify(serialize(root));
}

function decodeRoot(jsonStr, getLetterDivsByWord) {
  const data = JSON.parse(jsonStr);
  const allDivs = Array.from(letterboard.getLetterDivs());
  const root = new TreeNode(allDivs);
  const queue = [];
  queue.push({ nodeData: data, parentNode: root, availableDivs: allDivs.slice() });

  while (queue.length > 0) {
    const { nodeData, parentNode, availableDivs } = queue.shift();

    // Track used divs for siblings
    let usedDivs = new Set();

    nodeData.children.forEach(childData => {
      // Filter availableDivs to exclude the already used ones for this sibling
      const filteredDivs = availableDivs.filter(div => !usedDivs.has(div));

      // Get the letterDivs for the current child
      const letterDivs = getLetterDivsByWord(childData.word, filteredDivs);

      // Mark the divs as used
      letterDivs.forEach(div => usedDivs.add(div));

      const childNode = new TreeNode(letterDivs);
      parentNode.addChild(childNode);

      // Add the child node and its data to the queue
      queue.push({ nodeData: childData, parentNode: childNode, availableDivs: filteredDivs });
    });
  }

  return root;
}

function getLetterDivsByWord(word, letterDivs) {
  const usedIndices = new Set();
  const result = [];

  for (let letter of word) {
    const div = letterDivs.find((div, idx) =>
      div.dataset.letter === letter && !usedIndices.has(idx)
    );
    if (div) {
      usedIndices.add(letterDivs.indexOf(div));
      result.push(div);
    } else {
      console.warn(`Could not find letterDiv for letter "${letter}"`);
    }
  }

  return result;
}

function updateCurrentTree() {
  const cookie = 'current-root';
  const encoded = encodeRoot(treeRoot);

  // Save as cookie with expiration at midnight
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0); // Next midnight (local time)

  document.cookie = `${encodeURIComponent(cookie)}=${encodeURIComponent(encoded)}; expires=${midnight.toUTCString()}; path=/`;
}

function tryUpdateBestRoots(score) {
  const encoded = encodeRoot(treeRoot);

  // Format today's date as YYYY-MM-DD
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const cookie = `best-root`;
  const dateKey = `best-root-${year}-${month}-${day}`;

  // Check for existing data
  const existingDataJSON = localStorage.getItem(dateKey);
  if (existingDataJSON) {
    try {
      const existingData = JSON.parse(existingDataJSON);
      if (existingData.score >= score) {
        // Existing score is higher or equal, don't overwrite
        bestScore.textContent = `${existingData.score}`;
        return;
      }
    } catch (e) {
      console.warn(`Failed to parse existing data for ${dateKey}:`, e);
      // Proceed to overwrite if parsing fails
    }
  }

  // New best score, update
  bestScore.textContent = `${score}`;
  // TODO press and hold high score to restore?


  // This tree is certified best
  const dataToSave = {
    score: score,
    root: encoded
  };

  // Save to local storage if the game was played TODO save when dictionary is finished
  // if (score>0) localStorage.setItem(dateKey, JSON.stringify(dataToSave));

  // Save current best as cookie that expires at midnight
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  document.cookie = `${encodeURIComponent(cookie)}=${encodeURIComponent(encoded)}; expires=${midnight.toUTCString()}; path=/`;
}

function loadRootFromEncoded(encoded) {
  try {
    const newTree = decodeRoot(encoded, getLetterDivsByWord);
    if (newTree.word !== treeRoot.word) {
      console.warn("Tree root mismatch; skipping");
      return;
    }

    treeRoot = newTree;
    currentNode = newTree;

    drawRoots();
    scoreRoots();
    selectNode(newTree);
  } catch (e) {
    console.error("Failed to decode tree from history stack:", e);
  }
}

function loadRootFromStorage(cookie = 'current-root') {
  let encoded = getCookie(cookie);

  if (!encoded) return; // Nothing to load

  try {
    const newTree = decodeRoot(encoded, getLetterDivsByWord);
    if (newTree.word !== treeRoot.word) {
      console.warn('Saved tree root word does not match current letters. Ignoring saved tree.');
      return;
    }

    // Replace the global treeRoot and currentNode
    treeRoot = newTree;
    currentNode = newTree;

    drawRoots();
    scoreRoots();
    selectNode(newTree);
  } catch (err) {
    console.error('Failed to decode saved tree:', err);
  }
}

function getCookie(name) {
  const cookieString = document.cookie
    .split('; ')
    .find(row => row.startsWith(encodeURIComponent(name) + '='));

  return cookieString ? decodeURIComponent(cookieString.split('=')[1]) : null;
}

function getTodayString() {
  const today = new Date();
  return today.toISOString().split('T')[0]; // 'YYYY-MM-DD'
}

export function checkOrComputeGreedyScore(letters, cookie = 'greedy-score') {
  const todayKey = `${cookie}-${getTodayString()}`;
  const cached = getCookie(todayKey);

  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (!parsed.letters) {
        throw new Error("No letters in cached score");
      }
      if (parsed.letters !== letters) {
        throw new Error("Letter mismatch");
      }
      let score = parsed.score;
      goldScore.textContent = `${score}`;
      silverScore.textContent = `${Math.floor(score * 2 / 3)}`;
      bronzeScore.textContent = `${Math.floor(score / 3)}`;
      return score;
    } catch (err) {
      console.warn("Failed to parse cached score from cookie:", err);
    }
  }

  const usedGreedyWords = new Set();
  let score = 0;

  const initialDictionary = getValidWordsFromLetters(letters);

  function recurse(currentLetters) {
    let validWords = getValidWordsFromLetters(currentLetters, initialDictionary);

    validWords = new Set([...validWords].filter(w => !usedGreedyWords.has(w)));

    if (validWords.size === 0) return;

    const sortedWords = [...validWords].sort((a, b) => {
      // Primary sort: descending length
      const lengthDiff = b.length - a.length;
      if (lengthDiff !== 0) return lengthDiff;

      // Tie-break: alphabetical order
      return a.localeCompare(b);
    });

    const bestWord = sortedWords[0];
    if (!bestWord) return;

    usedGreedyWords.add(bestWord);
    score += bestWord.length;

    const usedLetters = bestWord.split('');
    const allLetters = currentLetters.split('');
    const remainingLetters = [...allLetters];

    for (const ch of usedLetters) {
      const index = remainingLetters.indexOf(ch);
      if (index !== -1) remainingLetters.splice(index, 1);
    }

    recurse(bestWord);
    recurse(remainingLetters.join(''));
  }

  recurse(letters.toLowerCase());

  const resultToCache = {
    score,
    letters,
    words: [...usedGreedyWords],
  };

  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);

  document.cookie = `${encodeURIComponent(todayKey)}=${encodeURIComponent(JSON.stringify(resultToCache))}; expires=${midnight.toUTCString()}; path=/`;

  console.log("Computed and stored in cookie:", resultToCache);

  goldScore.textContent = `${score}`;
  silverScore.textContent = `${Math.floor(score * 2 / 3)}`;
  bronzeScore.textContent = `${Math.floor(score / 3)}`;

  return score;
}

function normalizeLetters(s) {
  return s.split("").sort().join("");
}

function subtractLetters(L, w) {
  const arr = L.split("");
  for (const c of w) {
    const idx = arr.indexOf(c);
    if (idx >= 0) arr.splice(idx, 1);
  }
  return arr.sort().join("");
}

function wordIsSubset(word, letters) {
  const freq = Object.create(null);
  for (const c of letters) freq[c] = (freq[c] || 0) + 1;
  for (const c of word) {
    if (!freq[c]) return false;
    freq[c]--;
  }
  return true;
}

function computeOptimalScoreAndTree(letters, cookie = "optimal-score") {
  const todayKey = `${cookie}-${getTodayString()}`;
  const cached = getCookie(todayKey);

  // Try to return cached result
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed.letters === letters && parsed.tree) {
        updateDOMScores(parsed.score);
        console.log("[Optimal] Loaded from cache.");
        return parsed;
      }
    } catch (err) { }
  }

  const normalizedRootLetters = normalizeLetters(letters.toLowerCase());

  // ---------------------------
  // Build dictionary structures
  // ---------------------------
  const allValidWords = [...getValidWordsFromLetters(normalizedRootLetters)].filter(w => /^[A-Za-z0-9]+$/.test(w));   // only alphanumeric words

  const anagramKeyToWords = new Map();
  const anagramKeyToIntID = new Map();
  const intIDtoAnagramKey = new Map(); // Used for reconstruction
  let ID = 0;
  const allAnagramKeys = [];

  for (const word of allValidWords) {
    const anagramKey = normalizeLetters(word);

    // First time seeing this key
    if (!anagramKeyToWords.has(anagramKey)) {
      anagramKeyToWords.set(anagramKey, []);
      allAnagramKeys.push(anagramKey);
      anagramKeyToIntID.set(anagramKey, ID);
      intIDtoAnagramKey.set(ID, anagramKey);
      ID++;
    }

    // Associate word with others of the same letters
    anagramKeyToWords.get(anagramKey).push(word);
  }

  // ---------------------------
  // Optimal DP
  // ---------------------------
  function OPT(normalizedLetters, usedAnagramKeys, anagramKeysAvailableFromParent) {
    // Second recursion stopping condition: there is no possible subtree from this state
    // TODO receive already pruned?
    let anagramKeysAvailableWithTheseLetters = [];
    for (const possibleLeftAnagramKey of anagramKeysAvailableFromParent) {
      if (!usedAnagramKeys.has(possibleLeftAnagramKey) && wordIsSubset(possibleLeftAnagramKey, normalizedLetters)) {
        anagramKeysAvailableWithTheseLetters.push(possibleLeftAnagramKey);
      }
    }
    if (anagramKeysAvailableWithTheseLetters.length === 0 || normalizedLetters === "") {
      const leafResult = {
        score: 0,
        key: null,
        anagramKeys: new Set(usedAnagramKeys)
      };

      return leafResult;
    }

    // If here, this is a brand new state and there are possible subtrees
    let bestScore = 0;
    let bestKey = null;
    let bestAnagramKeys = null;
    for (const leftAnagramKey of anagramKeysAvailableWithTheseLetters) {
      // Left represents the word we select + score that can be made with letters in the selected word
      const leftNormalizedLetters = leftAnagramKey;

      // Right represents score that can be made with letters not in the selected word
      const rightNormalizedLetters = normalizeLetters(subtractLetters(normalizedLetters, leftNormalizedLetters));

      const usedAnagramKeysCOPY = new Set(usedAnagramKeys);
      usedAnagramKeysCOPY.add(leftNormalizedLetters);

      const nextAnagramKeysAvailableFromParent = anagramKeysAvailableWithTheseLetters.slice();
      const indexOfKey = nextAnagramKeysAvailableFromParent.indexOf(leftAnagramKey);
      nextAnagramKeysAvailableFromParent.splice(indexOfKey, 1);
      let possibleLeftAnagramKeys = [];
      for (const possibleLeftAnagramKey of nextAnagramKeysAvailableFromParent) {
        if (!usedAnagramKeysCOPY.has(possibleLeftAnagramKey) && wordIsSubset(possibleLeftAnagramKey, leftAnagramKey)) {
          possibleLeftAnagramKeys.push(possibleLeftAnagramKey);
        }
      }
      const leftResult = OPT(leftNormalizedLetters, usedAnagramKeysCOPY, possibleLeftAnagramKeys);

      // Right represents score that can be made with letters not in the selected word
      let possibleRightAnagramKeys = [];
      const leftAnagramKeysCOPY = new Set(leftResult.anagramKeys);
      for (const rightAnagramKey of nextAnagramKeysAvailableFromParent) {
        if (!leftAnagramKeysCOPY.has(rightAnagramKey) && wordIsSubset(rightAnagramKey, rightNormalizedLetters)) {
          possibleRightAnagramKeys.push(rightAnagramKey);
        }
      }
      const rightResult = OPT(rightNormalizedLetters, leftAnagramKeysCOPY, possibleRightAnagramKeys);

      let scoreForCurrentWord = leftAnagramKey.length * anagramKeyToWords.get(leftAnagramKey).length;
      const score = scoreForCurrentWord + leftResult.score + rightResult.score;

      if (score > bestScore) {
        bestScore = score;
        bestKey = leftAnagramKey;

        const allUsedAnagramKeys = new Set(leftResult.anagramKeys);
        for (const anagramKey of rightResult.anagramKeys) {
          allUsedAnagramKeys.add(anagramKey);
        }

        bestAnagramKeys = new Set(allUsedAnagramKeys);
      }
    }

    const result = {
      score: bestScore,
      key: bestKey,
      anagramKeys: new Set(bestAnagramKeys)
    };

    return result;
  }

  // ---------------------------
  // Compute final score + tree
  // ---------------------------
  const { score, key, anagramKeys } = OPT(normalizedRootLetters, new Set(), allAnagramKeys);

  for (let usedAnagramKey of anagramKeys) {
    console.log(`used ${usedAnagramKey} for ${anagramKeyToWords.get(usedAnagramKey)}`);
  }
  return { score };
}


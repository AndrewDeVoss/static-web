///////////////////////////////////////////////////////////////
// 1. LOAD DICTIONARY
///////////////////////////////////////////////////////////////
import { isWord, loadDictionary } from "../utility/isword/isword.js";
import { random, createSeed } from '../utility/random/random.js';

///////////////////////////////////////////////////////////////
// 2. TRIE STRUCTURE
///////////////////////////////////////////////////////////////
class Trie {
    constructor() {
        this.end = false;
        this.next = Array(26).fill(null);
    }
}

function trieIndex(ch) {
    const x = ch.charCodeAt(0) - 65;
    return x >= 0 && x < 26 ? x : -1;
}

function trieInsert(root, word) {
    let node = root;
    for (const ch of word) {
        const i = trieIndex(ch);
        if (i < 0) continue;
        if (!node.next[i]) node.next[i] = new Trie();
        node = node.next[i];
    }
    node.end = true;
}

function trieFromWords(words) {
    const root = new Trie();
    for (const w of words) trieInsert(root, w);
    return root;
}

// Build trie containing only words of a specific length
function trieForLength(dictionary, length) {
    return trieFromWords(dictionary.filter(w => w.length === length));
}

///////////////////////////////////////////////////////////////
// 3. GRID STRUCTURE
///////////////////////////////////////////////////////////////
class Grid {
    constructor(width, height, dictionary, mask) {
        this.w = width;
        this.h = height;

        // True row lengths if mask exists
        this.rowLengths = Array.from({ length: height }, (_, r) =>
            mask ? mask[r].filter(v => v !== null).length : width
        );

        // True column lengths if mask exists
        this.colLengths = Array.from({ length: width }, (__, c) =>
            mask ? mask.map(row => row[c]).filter(v => v !== null).length : height
        );

        // Per-row / per-column tries
        this.rowTrie = this.rowLengths.map(len => trieForLength(dictionary, len));
        this.colTrie = this.colLengths.map(len => trieForLength(dictionary, len));

        this.row = [...this.rowTrie];
        this.col = [...this.colTrie];

        this.cell = 0;

        // "" = empty, null = hole
        this.grid = Array.from({ length: height }, (_, r) =>
            Array.from({ length: width }, (_, c) =>
                mask && !mask[r][c] ? null : ""
            )
        );

        // Random letter order per cell
        this.order = Array.from({ length: width * height }, () =>
            shuffle([...Array(26).keys()])
        );

        // Track used words to prevent duplicates
        this.usedWords = new Set();
    }
}

///////////////////////////////////////////////////////////////
// 4. UTILS
///////////////////////////////////////////////////////////////
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(random(seedStr) * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

///////////////////////////////////////////////////////////////
// 5. MERGED COMPLETION CHECKS
///////////////////////////////////////////////////////////////
function checkRowCompletion(g, rowIndex) {
    const len = g.rowLengths[rowIndex];
    let filled = 0;

    for (let c = 0; c < g.w; c++) {
        if (typeof g.grid[rowIndex][c] === "string" && g.grid[rowIndex][c].length === 1)
            filled++;
    }

    // Row not yet complete
    if (filled !== len) return true;

    const rowWord = getRowWord(g, rowIndex);

    // Global duplicate check
    if (g.usedWords.has(rowWord)) return false;

    // Check only the transposed column, if it exists
    if (rowIndex < g.w && g.colLengths[rowIndex] === len) {
        const colWord = getColWord(g, rowIndex);
        if (!wordsBelowSimilarityThreshold(rowWord, colWord, 0.61)) return false;
    }

    g.usedWords.add(rowWord);
    return true;
}

function checkColCompletion(g, colIndex) {
    const len = g.colLengths[colIndex];
    let filled = 0;

    for (let r = 0; r < g.h; r++) {
        if (typeof g.grid[r][colIndex] === "string" && g.grid[r][colIndex].length === 1)
            filled++;
    }

    // Column not yet complete
    if (filled !== len) return true;

    const colWord = getColWord(g, colIndex);

    // Global duplicate check
    if (g.usedWords.has(colWord)) return false;

    // Check only the transposed row, if it exists
    if (colIndex < g.h && g.rowLengths[colIndex] === len) {
        const rowWord = getRowWord(g, colIndex);
        if (!wordsBelowSimilarityThreshold(rowWord, colWord, 0.61)) return false;
    }

    g.usedWords.add(colWord);
    return true;
}

function wordsBelowSimilarityThreshold(a, b, threshold) {
    const lenA = a.length;
    const lenB = b.length;
    const total = Math.max(lenA, lenB);
    let sameForward = 0;
    for (let i = 0; i < Math.min(lenA, lenB); i++) {
        if (a[i] === b[i]) sameForward++;
    }
    const forwardRatio = sameForward / total;
    if (forwardRatio>threshold) return false;

    return true;
}

///////////////////////////////////////////////////////////////
// 6. BACKTRACKING SEARCH
///////////////////////////////////////////////////////////////
function nextCell(g, i) {
    const total = g.w * g.h;
    while (i < total) {
        const x = i % g.w;
        const y = Math.floor(i / g.w);
        if (g.grid[y][x] !== null) break;
        i++;
    }
    return i;
}

function gridFind(g, cell = 0) {
    const total = g.w * g.h;

    cell = nextCell(g, cell);
    if (cell >= total) return true;

    const x = cell % g.w;
    const y = Math.floor(cell / g.w);

    const rowNode = g.row[y];
    const colNode = g.col[x];

    const order = g.order[cell];
    if (!order) return false; // out-of-range; backtrack safely

    for (const c of order) {
        const nr = rowNode.next[c];
        const nc = colNode.next[c];
        if (!nr || !nc) continue;

        g.grid[y][x] = String.fromCharCode(65 + c);
        g.row[y] = nr;
        g.col[x] = nc;

        const rowOk = checkRowCompletion(g, y);
        const colOk = checkColCompletion(g, x);

        if (rowOk && colOk) {
            if (gridFind(g, cell + 1)) return true;
        }

        // undo
        if (nr.end) g.usedWords.delete(getRowWord(g, y));
        if (nc.end) g.usedWords.delete(getColWord(g, x));
        g.grid[y][x] = "";
        g.row[y] = rowNode;
        g.col[x] = colNode;
    }

    return false;
}


function getRowWord(g, rowIndex) {
    return g.grid[rowIndex].map(c => c || "").join("");
}

function getColWord(g, colIndex) {
    let word = "";
    for (let r = 0; r < g.h; r++) word += g.grid[r][colIndex] || "";
    return word;
}


///////////////////////////////////////////////////////////////
// 7. PUBLIC FUNCTION
///////////////////////////////////////////////////////////////
let seedStr = "";
export function findWordGrid(dictionary, width, height, seedString, mask = null) {
    seedStr = seedString;
    const g = new Grid(width, height, dictionary, mask);
    if (!gridFind(g)) return null;
    return g.grid;
}

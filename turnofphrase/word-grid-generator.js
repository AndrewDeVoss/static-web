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
    for (const word of words) trieInsert(root, word);
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
            mask ? mask[r].filter(v => v === true).length : width
        );

        // True column lengths if mask exists
        this.colLengths = Array.from({ length: width }, (__, c) =>
            mask ? mask.map(row => row[c]).filter(v => v === true).length : height
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
    const rowLength = g.rowLengths[rowIndex];
    let filled = 0;

    for (let c = 0; c < g.w; c++) {
        if (typeof g.grid[rowIndex][c] === "string" && g.grid[rowIndex][c].length === 1)
            filled++;
    }

    // Row not yet complete
    if (filled !== rowLength) return null;

    const rowWord = getRowWord(g, rowIndex);

    if (g.usedWords.has(rowWord)) return false;

    if (rowIndex < g.w && g.colLengths[rowIndex] === rowLength) {
        const colWord = getColWord(g, rowIndex);
        if (!wordsBelowSimilarityThreshold(rowWord, colWord, 0.61)) return false;
    }

    g.usedWords.add(rowWord);
    return rowWord;
}

function checkColCompletion(g, colIndex) {
    const len = g.colLengths[colIndex];
    let filled = 0;

    for (let r = 0; r < g.h; r++) {
        if (typeof g.grid[r][colIndex] === "string" && g.grid[r][colIndex].length === 1)
            filled++;
    }

    // Column not yet complete
    if (filled !== len) return null;

    const colWord = getColWord(g, colIndex);

    if (g.usedWords.has(colWord)) return false;

    if (colIndex < g.h && g.rowLengths[colIndex] === len) {
        const rowWord = getRowWord(g, colIndex);
        if (!wordsBelowSimilarityThreshold(rowWord, colWord, 0.61)) return false;
    }

    g.usedWords.add(colWord);
    return colWord;

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
    if (forwardRatio > threshold) return false;

    return true;
}

///////////////////////////////////////////////////////////////
// 6. BACKTRACKING SEARCH
///////////////////////////////////////////////////////////////
function firstEmptyCell(g) {
    const total = g.w * g.h;
    let i=0;
    while (i < total) {
        const x = i % g.w;
        const y = Math.floor(i / g.w);

        // Only consider empty, fillable cells
        if (g.grid[y][x] === "") return i;

        i++;
    }

    // No empty cells left
    return null;
}

function gridFind(g) {
    let emptyCellIdx = firstEmptyCell(g);
    if (emptyCellIdx === null) {
        return true;
    }

    const x = emptyCellIdx % g.w;
    const y = Math.floor(emptyCellIdx / g.w);

    const rowNode = g.row[y];
    const colNode = g.col[x];

    const order = g.order[emptyCellIdx];
    if (!order) return false; // out-of-range; backtrack safely

    for (const c of order) {
        const nr = rowNode.next[c];
        const nc = colNode.next[c];
        if (!nr || !nc) continue;

        g.grid[y][x] = String.fromCharCode(65 + c);
        g.row[y] = nr;
        g.col[x] = nc;

        const added = [];

        const rowResult = checkRowCompletion(g, y);
        if (rowResult === false) gotoUndo();
        if (typeof rowResult === "string") added.push(rowResult);

        const colResult = checkColCompletion(g, x);
        if (colResult === false) gotoUndo();
        if (typeof colResult === "string") added.push(colResult);

        if (gridFind(g)) {
            return true;
        }

        // undo
        gotoUndo();

        function gotoUndo() {
            for (const w of added) g.usedWords.delete(w);
            g.grid[y][x] = "";
            g.row[y] = rowNode;
            g.col[x] = colNode;
        }
    }

    return false;
}


function getRowWord(g, rowIndex) {
    let word = "";
    for (let c = 0; c < g.w; c++) {
        const cell = g.grid[rowIndex][c];
        if (typeof cell === "string" && cell.length === 1) {
            word += cell;
        }
    }
    return word;
}

function getColWord(g, colIndex) {
    let word = "";
    for (let r = 0; r < g.h; r++) {
        const cell = g.grid[r][colIndex];
        if (typeof cell === "string" && cell.length === 1) {
            word += cell;
        }
    }
    return word;
}


///////////////////////////////////////////////////////////////
// 7. PUBLIC FUNCTION
///////////////////////////////////////////////////////////////
let seedStr = "";
export function findWordGrid(dictionary, width, height, seedString, mask = null) {
    seedStr = seedString;
    const g = new Grid(width, height, dictionary, mask);
    if (!gridFind(g)) {
        return null;
    }
    return g.grid;
}

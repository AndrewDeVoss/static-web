///////////////////////////////////////////////////////////////
// 1. LOAD DICTIONARY
///////////////////////////////////////////////////////////////
import { isWord, loadDictionary } from "../utility/isword/isword.js";

let DICT = [];
loadDictionary().then(dictMap => {
    DICT = Array.from(dictMap.keys()).map(w => w.toUpperCase());
    // Optional: filter to only valid words
    DICT = DICT.filter(w => isWord(w));
});

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
        const j = Math.floor(Math.random() * (i + 1));
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
    if (filled !== len) return true; // row not yet complete

    const word = getRowWord(g, rowIndex);
    if (g.usedWords.has(word)) return false; // duplicate detected
    g.usedWords.add(word);
    return true;
}

function checkColCompletion(g, colIndex) {
    const len = g.colLengths[colIndex];
    let filled = 0;
    for (let r = 0; r < g.h; r++) {
        if (typeof g.grid[r][colIndex] === "string" && g.grid[r][colIndex].length === 1)
            filled++;
    }
    if (filled !== len) return true; // column not yet complete

    const word = getColWord(g, colIndex);
    if (g.usedWords.has(word)) return false; // duplicate detected
    g.usedWords.add(word);
    return true;
}


///////////////////////////////////////////////////////////////
// 6. BACKTRACKING SEARCH
///////////////////////////////////////////////////////////////
function gridFind(g) {
    const total = g.w * g.h;

    function nextCell(i) {
        while (i < total) {
            const x = i % g.w;
            const y = Math.floor(i / g.w);
            if (g.grid[y][x] !== null) break;
            i++;
        }
        return i;
    }

    g.cell = nextCell(g.cell);
    if (g.cell === total) return true;

    const idx = g.cell;
    const x = idx % g.w;
    const y = Math.floor(idx / g.w);

    const rowNode = g.row[y];
    const colNode = g.col[x];

    g.cell++;

    for (const c of g.order[idx]) {
        const nr = rowNode.next[c];
        const nc = colNode.next[c];
        if (!nr || !nc) continue;

        g.grid[y][x] = String.fromCharCode(65 + c);
        g.row[y] = nr;
        g.col[x] = nc;

        // --- MERGED CHECKS ---
        let rowOk = checkRowCompletion(g, y);
        let colOk = checkColCompletion(g, x);

        if (!rowOk || !colOk) {
            // undo any registration
            if (!rowOk && nr.end) g.usedWords.delete(getRowWord(g, y));
            if (!colOk && nc.end) g.usedWords.delete(getColWord(g, x));

            g.grid[y][x] = "";
            g.row[y] = rowNode;
            g.col[x] = colNode;
            continue;
        }

        if (gridFind(g)) return true;

        // BACKTRACK
        if (nr.end) g.usedWords.delete(getRowWord(g, y));
        if (nc.end) g.usedWords.delete(getColWord(g, x));

        g.grid[y][x] = "";
        g.row[y] = rowNode;
        g.col[x] = colNode;
    }

    g.cell--;
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
function findWordGrid(dictionary, width, height, mask = null) {
    const g = new Grid(width, height, dictionary, mask);
    if (!gridFind(g)) return null;
    return g.grid;
}

///////////////////////////////////////////////////////////////
// 8. DOM HOOKUP
///////////////////////////////////////////////////////////////
const btn = document.getElementById("generate-btn");
const out = document.getElementById("grid-output");

btn.addEventListener("click", () => {
    const w = 6;
    const h = 4;

    const grid = findWordGrid(DICT, w, h);

    if (!grid) {
        out.textContent = "No grid found.";
        return;
    }

    out.textContent = grid
        .map(row =>
            row.map(c => (c === null ? "·" : c)).join(" ")
        )
        .join("\n");
});

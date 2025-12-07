///////////////////////////////////////////////////////////////
// TRIE STRUCTURE (C equivalent)
///////////////////////////////////////////////////////////////
class Trie {
    constructor() {
        this.end = false;
        this.next = Array(26).fill(null);
    }
}

function trieIndex(char) {
    // Expecting uppercase A–Z
    const u = char.charCodeAt(0) - 65;
    return (u >= 0 && u < 26) ? u : -1;
}

function trieInsert(root, word) {
    let node = root;
    for (const ch of word) {
        const idx = trieIndex(ch);
        if (idx < 0) continue;
        if (!node.next[idx]) node.next[idx] = new Trie();
        node = node.next[idx];
    }
    node.end = true;
}

function trieFrom(words) {
    const root = new Trie();
    for (const w of words) trieInsert(root, w);
    return root;
}

///////////////////////////////////////////////////////////////
// GRID STRUCT (generalized version of C struct Grid)
///////////////////////////////////////////////////////////////
class Grid {
    constructor(width, height, trieRoot, mask) {
        this.w = width;
        this.h = height;

        // Trie states for each row and column prefix
        this.row = Array(height).fill(trieRoot);
        this.col = Array(width).fill(trieRoot);

        // Linear cell pointer
        this.cell = 0;

        // Grid with chars or null for holes
        this.grid = Array.from({ length: height }, (_, r) =>
            Array.from({ length: width }, (_, c) =>
                mask && !mask[r][c] ? null : ""  // null means hole
            )
        );

        // Per-cell random order of letters 0..25
        this.order = Array.from({ length: width * height }, () =>
            shuffle([...Array(26).keys()])
        );
    }
}

///////////////////////////////////////////////////////////////
// UTILS
///////////////////////////////////////////////////////////////
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function differentWords(grid) {
    // Collect row+col final trie nodes
    const words = [...grid.row, ...grid.col];

    // Compare pointer identity as in C
    const sorted = [...words].sort((a, b) =>
        (a > b) ? 1 : (a < b) ? -1 : 0
    );

    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === sorted[i - 1]) return false;
    }
    return true;
}

///////////////////////////////////////////////////////////////
// BACKTRACKING (JS port of grid_find)
///////////////////////////////////////////////////////////////
function gridFind(g, root) {
    const total = g.w * g.h;

    // Skip holes automatically
    function nextCell(ptr) {
        while (ptr < total) {
            const x = ptr % g.w;
            const y = Math.floor(ptr / g.w);
            if (g.grid[y][x] !== null) break; // usable cell
            ptr++;
        }
        return ptr;
    }

    g.cell = nextCell(g.cell);

    if (g.cell === total) {
        if (differentWords(g)) {
            dumpGrid(g);
            return true;
        }
        return false;
    }

    const idx = g.cell;
    const x = idx % g.w;
    const y = Math.floor(idx / g.w);

    const rowTrie = g.row[y];
    const colTrie = g.col[x];

    g.cell++;

    for (const c of g.order[idx]) {
        const nextRow = rowTrie.next[c];
        const nextCol = colTrie.next[c];
        if (nextRow && nextCol) {
            g.grid[y][x] = String.fromCharCode(65 + c);
            g.row[y] = nextRow;
            g.col[x] = nextCol;

            if (gridFind(g, root)) return true;
        }
    }

    // Undo
    g.cell--;
    g.row[y] = rowTrie;
    g.col[x] = colTrie;

    return false;
}

///////////////////////////////////////////////////////////////
// PRINTING
///////////////////////////////////////////////////////////////
function dumpGrid(g) {
    for (let r = 0; r < g.h; r++) {
        console.log(
            g.grid[r]
                .map(c => (c === null ? "·" : c || "_"))
                .join("")
        );
    }
    console.log();
}

///////////////////////////////////////////////////////////////
// MAIN USER-FACING FUNCTION
///////////////////////////////////////////////////////////////
function findWordGrid(dictionary, width, height, mask = null) {
    // Ensure dictionary words are uppercase
    const words = dictionary.map(w => w.toUpperCase());

    const root = trieFrom(words);

    const grid = new Grid(width, height, root, mask);

    const success = gridFind(grid, root);
    return success ? grid : null;
}

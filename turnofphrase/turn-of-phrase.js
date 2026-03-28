import { isWord, loadDictionary, loadDictionaryFrequencyBased, getDefinitionForWord } from "../utility/isword/isword.js";
import { random, createSeed } from '../utility/random/random.js';
import { findWordGrid } from "./word-grid-generator.js";
import { generateTiles } from "./tile-generator.js";
import { updateUrl } from "./shared-navigation.js";

// Date area
const dateSubHeader = document.querySelector("#date-subheader");
const dateSubHeaderText = document.querySelector("#date-subheader-text");
const dateSubHeaderPrev = document.querySelector("#date-subheader-prev");
const dateSubHeaderNext = document.querySelector("#date-subheader-next");

// Definition area
const definitionSubHeader = document.querySelector("#definition-subheader");
const definitionSubHeaderText = document.querySelector("#definition-subheader-text");
const definitionSubHeaderClose = document.querySelector("#definition-subheader-close");
definitionSubHeaderClose.addEventListener("click", () => {
    definitionSubHeader.classList.add("hidden");
});

// Share button
const shareButton = document.getElementById("share-button");
shareButton.addEventListener("click", async () => {
    const shareData = {
        title: "Turn of Phrase",
        text: "hey this puzzle is pretty neat, try it out",
        url: window.location.href
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            // User cancelled — no need to do anything
        }
    }
});

// Prevent double click zoom on iOS
(function preventIosDoubleTapZoom() {
    const ua = navigator.userAgent;
    const isIosSafari =
        /iPad|iPhone/.test(ua) &&
        /WebKit/.test(ua) &&
        !/CriOS/.test(ua);

    if (!isIosSafari) return;

    let lastTouchEnd = 0;

    document.addEventListener(
        'touchend',
        function (e) {
            const now = Date.now();
            if (now - lastTouchEnd <= 500) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        },
        { passive: false }
    );
})();

// Get params from URL
const params = new URLSearchParams(window.location.search);
const launchDifficulty = params.get("difficulty"); // easy | medium | hard | custom | null
const launchDate = params.get("date"); // YYYY-MM-DD
const dateObj = new Date(launchDate);

dateSubHeaderPrev.addEventListener("click", () => {
    let prevDate = new Date(dateObj);
    prevDate.setDate(prevDate.getDate() - 1);
    updateUrl(launchDifficulty, prevDate.toISOString().split("T")[0]);
});

dateSubHeaderNext.addEventListener("click", () => {
    let nextDate = new Date(dateObj);
    nextDate.setDate(nextDate.getDate() + 1);
    updateUrl(launchDifficulty, nextDate.toISOString().split("T")[0]);
});

dateSubHeaderText.textContent = `${dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`;
let seedString = `${launchDate}-${launchDifficulty}`;
if (!launchDate || !launchDifficulty) {
    seedString = random(seedString).toString(36).slice(2);
}

// Identifier for the current game
function getGameStorageKey() {
    return seedString;
}

// Saving
const baseKey = `turn-of-phrase`;
const version = `v0.0.2`;
const masterKey = `${baseKey}-${version}`;
function saveGameState() {
    const key = getGameStorageKey();

    const board = document.getElementById("board");
    const rows = parseInt(board.dataset.rows, 10);
    const cols = parseInt(board.dataset.cols, 10);

    const boardLetters = Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
            const cell = board.querySelector(
                `.board-cell[data-row="${r}"][data-col="${c}"]`
            );
            // store null if blocked, otherwise letter or ""
            return cell?.dataset.blocked === "true" ? null : (cell?.dataset.letter || "");
        })
    );

    const tiles = Array.from(document.querySelectorAll(".tile")).map(tile => ({
        id: tile.querySelector(".tile-cell")?.dataset.tileId,
        rows: parseInt(tile.dataset.rows, 10),
        cols: parseInt(tile.dataset.cols, 10),
        state: tile.dataset.state,
        color: tile.querySelector(".tile-cell")?.style.backgroundColor || null,
        boardRow: tile.dataset.boardRow ?? null,
        boardCol: tile.dataset.boardCol ?? null,
        left: tile.style.left,
        top: tile.style.top,
        cells: Array.from(tile.querySelectorAll(".tile-cell")).map(cell => ({
            row: parseInt(cell.dataset.row, 10),
            col: parseInt(cell.dataset.col, 10),
            letter: cell.dataset.letter
        }))
    }));

    const state = {
        seedString,
        completed: checkBoardForCompletion(),
        tileColors,
        board: { rows, cols, letters: boardLetters },
        tiles
    };

    // Load existing games from the master key
    const allGamesRaw = localStorage.getItem(masterKey);
    const allGames = allGamesRaw ? JSON.parse(allGamesRaw) : {};

    // Save/update this game's state
    allGames[key] = state;

    localStorage.setItem(masterKey, JSON.stringify(allGames));
}

// Loading
function loadGameState() {
    const key = getGameStorageKey();

    const allGamesRaw = localStorage.getItem(masterKey);
    if (!allGamesRaw) return false;

    const allGames = JSON.parse(allGamesRaw);
    const state = allGames[key];
    if (!state) return false;

    seedString = state.seedString;
    tileColors = state.tileColors || [];

    renderBoard(state.board.letters);

    // Restore board letters
    state.board.letters.forEach((row, r) => {
        row.forEach((letter, c) => {
            if (letter) {
                const cell = document.querySelector(
                    `.board-cell[data-row="${r}"][data-col="${c}"]`
                );
                cell.dataset.letter = letter;
                cell.classList.add("filled");
            }
        });
    });

    renderBank(
        Array.from({ length: state.board.rows }, () => Array(state.board.cols).fill(""))
    );

    const gameArea = document.querySelector(".game-area");

    state.tiles.forEach(t => {
        const tileDiv = document.createElement("div");
        tileDiv.className = "tile";
        tileDiv.dataset.rows = t.rows;
        tileDiv.dataset.cols = t.cols;
        tileDiv.dataset.state = t.state;
        tileDiv.style.position = "absolute";
        tileDiv.style.left = t.left;
        tileDiv.style.top = t.top;
        tileDiv.style.display = "inline-grid";
        tileDiv.style.gridTemplateRows = `repeat(${t.rows}, 40px)`;
        tileDiv.style.gridTemplateColumns = `repeat(${t.cols}, 40px)`;


        t.cells.forEach(c => {
            const cell = document.createElement("div");
            cell.className = "tile-cell";
            cell.dataset.row = c.row;
            cell.dataset.col = c.col;
            cell.dataset.letter = c.letter;
            cell.textContent = c.letter;
            cell.style.gridRowStart = c.row + 1;
            cell.style.gridColumnStart = c.col + 1;
            if (t.color) {
                cell.style.backgroundColor = t.color;
            }
            tileDiv.appendChild(cell);
        });

        if (t.state === "in-board") {
            tileDiv.dataset.boardRow = t.boardRow;
            tileDiv.dataset.boardCol = t.boardCol;
            tileDiv.classList.add("in-board");
        }

        enableTileDrag(tileDiv);
        enableTileRotation(tileDiv);
        gameArea.appendChild(tileDiv);
    });

    updateRowColHelpers();

    if (state.completed) {
        onComplete();
    }

    return true;
}

/**
 * Creates a random mask with a given number of holes.
 * @param {number} width  - number of columns
 * @param {number} height - number of rows
 * @param {number} numHoles - how many cells to block (set false)
 * @returns {boolean[][]} mask - 2D array [row][col]
 */
/**
 * Creates a random mask with a given number of holes, avoiding isolated islands.
 * @param {number} width  - number of columns
 * @param {number} height - number of rows
 * @param {number} numHoles - how many cells to block
 * @returns {boolean[][]} mask - 2D array [row][col]
 */
function createRandomMask(width, height, numHoles) {
    const mask = Array.from({ length: height }, () => Array(width).fill(true));
    const totalCells = width * height;
    numHoles = Math.min(numHoles, totalCells);

    // Flatten coordinates for random selection
    const coords = [];
    for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
            coords.push([r, c]);
        }
    }

    // Shuffle coordinates
    for (let i = coords.length - 1; i > 0; i--) {
        const j = Math.floor(random(seedString) * (i + 1));
        [coords[i], coords[j]] = [coords[j], coords[i]];
    }

    let holesPlaced = 0;

    // Helper: check if all open cells are still connected using BFS
    function allConnected(testMask) {
        const visited = Array.from({ length: height }, () => Array(width).fill(false));
        let start = null;

        // Find first open cell
        outer: for (let r = 0; r < height; r++) {
            for (let c = 0; c < width; c++) {
                if (testMask[r][c]) {
                    start = [r, c];
                    break outer;
                }
            }
        }

        if (!start) return true; // no open cells left

        const queue = [start];
        visited[start[0]][start[1]] = true;
        let count = 1;

        const totalOpen = testMask.flat().filter(v => v).length;

        const dirs = [
            [0, 1], [1, 0], [0, -1], [-1, 0]
        ];

        while (queue.length) {
            const [r, c] = queue.shift();
            for (const [dr, dc] of dirs) {
                const nr = r + dr, nc = c + dc;
                if (
                    nr >= 0 && nr < height &&
                    nc >= 0 && nc < width &&
                    testMask[nr][nc] && !visited[nr][nc]
                ) {
                    visited[nr][nc] = true;
                    queue.push([nr, nc]);
                    count++;
                }
            }
        }

        return count === totalOpen;
    }

    for (const [r, c] of coords) {
        if (holesPlaced >= numHoles) break;

        if (!mask[r][c]) continue;

        // simulate hole
        mask[r][c] = false;
        if (!allConnected(mask)) {
            // undo if it would disconnect
            mask[r][c] = true;
            continue;
        }

        holesPlaced++;
    }

    return mask;
}

function generateGame({ width, height }) {
    const maxDim = 6;
    createSeed(seedString);

    const w = Math.min(maxDim, width);
    const h = Math.min(maxDim, height);

    tileColors = [];

    const numHoles = 4;
    let wordGrid = null;
    let attempts = 0;
    const maxAttempts = 100; // safety to avoid infinite loops

    while (!wordGrid && attempts < maxAttempts) {
        attempts++;
        const mask = createRandomMask(w, h, numHoles);

        try {
            wordGrid = findWordGrid(DICT, w, h, seedString, mask);
        } catch (err) {
            console.warn("Grid generation failed, retrying with a new mask:", err.message);
            // wordGrid stays null, so the loop continues
        }
    }

    if (!wordGrid) {
        document.getElementById("grid-output").textContent = "No grid found.";
        return;
    }

    document.querySelectorAll(".game-area .tile").forEach(tile => tile.remove());

    renderBank(wordGrid);
    renderBoard(wordGrid);
    renderTiles(wordGrid);
    updateRowColHelpers();
    saveGameState();
}

const generateBtn = document.getElementById("generate-btn");
generateBtn.addEventListener("click", () => {
    const width = parseInt(document.getElementById("grid-width").value, 10);
    const height = parseInt(document.getElementById("grid-height").value, 10);
    seedString = random(seedString).toString(36).slice(2);
    createSeed(seedString);

    generateGame({
        width,
        height
    });
});

const DIFFICULTY_DIMENSIONS = {
    easy: { width: 5, height: 5 },
    medium: { width: 6, height: 5 },
    hard: { width: 6, height: 6 }
};

let DICT = [];
loadDictionaryFrequencyBased(2.5).then(dictMap => {
    DICT = Array.from(dictMap.keys()).map(w => w.toUpperCase());
    DICT = DICT.filter(w => isWord(w));
    generateBtn.disabled = false;

    handleLaunchMode();
});

function handleLaunchMode() {
    const controls = document.querySelector(".control-panel");

    if (loadGameState()) {
        console.log("Loaded saved game");
        return;
    }


    // Random difficulty → manual controls
    if (launchDifficulty === "custom") {
        controls.style.display = "flex";
        return;
    }

    // Difficulty or day-selector launch
    if (launchDifficulty && DIFFICULTY_DIMENSIONS[launchDifficulty]) {
        controls.style.display = "none";

        const { width, height } = DIFFICULTY_DIMENSIONS[launchDifficulty];

        generateGame({
            width,
            height
        });

        return;
    }

    // Direct page load (no params) → behave like clicking Generate
    controls.style.display = "flex";
    generateBtn.click();
}

/*********************************************************************
 *  BANK RENDERING
 *********************************************************************/
function renderBank(grid) {
    const extraCells = 3
    const H = grid.length + extraCells;
    const W = grid[0].length + extraCells;
    const bank = document.getElementById("bank");
    bank.innerHTML = "";
    bank.style.position = "relative"; // required for ghost + absolute tiles
    bank.style.display = "inline-grid";
    bank.style.gridTemplateColumns = `repeat(${W}, 25px)`;
    bank.style.width = "fit-content";
    bank.dataset.rows = H;
    bank.dataset.cols = W;

    for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
            const gridCell = document.createElement("div");
            gridCell.className = "bank-cell";
            gridCell.dataset.row = r;
            gridCell.dataset.col = c;
            bank.appendChild(gridCell);
        }
    }
}

/*********************************************************************
 *  BOARD RENDERING
 *********************************************************************/
function renderBoard(grid) {
    const H = grid.length;
    const W = grid[0].length;

    const board = document.getElementById("board");
    board.innerHTML = "";
    board.style.position = "relative"; // required for ghost + absolute tiles
    board.style.display = "inline-grid";
    board.style.gridTemplateColumns = `repeat(${W}, 40px)`;
    board.style.width = "fit-content";

    board.dataset.rows = H;
    board.dataset.cols = W;

    for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
            const boardCell = document.createElement("div");
            boardCell.className = "board-cell";
            boardCell.dataset.row = r;
            boardCell.dataset.col = c;
            boardCell.dataset.letter = "";
            boardCell.dataset.blocked = "false";
            if (grid[r][c] === null) {
                boardCell.dataset.blocked = "true";
                boardCell.classList.add("blocked");
            }
            board.appendChild(boardCell);
        }
    }
}

/*********************************************************************
 *  TILE RENDERING
 *********************************************************************/
function renderTiles(grid) {
    const tiles = generateTiles(grid, seedString);
    const bank = document.getElementById("bank");
    const gameArea = document.querySelector(".game-area");

    const BANK_COLS = parseInt(bank.dataset.cols, 10);
    const BANK_ROWS = parseInt(bank.dataset.rows, 10);

    const bankCells = Array.from(bank.querySelectorAll(".bank-cell"));

    // --------------------------------------------------
    // 1. CREATE + ROTATE ALL TILES FIRST
    // --------------------------------------------------
    const tileDivs = tiles.map(tile => {
        const tileDiv = renderTileDOM(tile);

        const rotations = Math.floor(random(seedString) * 4);
        for (let i = 0; i < rotations; i++) {
            const pivot = tileDiv.querySelector(".tile-cell");
            if (pivot) {
                rotateTile(tileDiv, pivot);
                saveGameState();
            }
        }

        tileDiv.dataset.state = "in-bank";
        enableTileDrag(tileDiv);
        enableTileRotation(tileDiv);

        return tileDiv;
    });

    // --------------------------------------------------
    // 2. SORT BY NUMBER OF ROWS (AFTER ROTATION)
    // --------------------------------------------------
    tileDivs.sort(
        (a, b) =>
            parseInt(a.dataset.rows, 10) -
            parseInt(b.dataset.rows, 10)
    );

    // --------------------------------------------------
    // 3. GRID PLACEMENT
    // --------------------------------------------------
    let curRow = 0;
    let curCol = 0;

    tileDivs.forEach(tileDiv => {
        const tileRows = parseInt(tileDiv.dataset.rows, 10);
        const tileCols = parseInt(tileDiv.dataset.cols, 10);

        let placed = false;

        // ---- Try normal flowing layout
        for (let r = curRow; r < BANK_ROWS && !placed; r += tileRows) {
            for (let c = curCol; c < BANK_COLS && !placed; c++) {
                if (c + tileCols > BANK_COLS && r + tileRows > BANK_ROWS) continue;
                if (c + tileCols > BANK_COLS) {
                    // Advance to next row 
                    curCol = 0;
                    curRow = r + tileRows;
                    continue;
                }

                const cell = bank.querySelector(
                    `.bank-cell[data-row="${r}"][data-col="${c}"]`
                );
                if (!cell) continue;

                placeTileAtCell(tileDiv, cell);
                placed = true;

                // Advance column based on tile width
                curCol = (c + tileCols);
                if (curCol >= BANK_COLS) {
                    curCol = 0;
                    curRow = r + tileRows;
                }
            }
        }

        // ---- Fallback: place near end of bank
        if (!placed) {
            for (let i = bankCells.length - 1; i >= 0; i--) {
                const cell = bankCells[i];
                const r = parseInt(cell.dataset.row, 10);
                const c = parseInt(cell.dataset.col, 10);

                if (r + tileRows <= BANK_ROWS && c + tileCols <= BANK_COLS) {
                    placeTileAtCell(tileDiv, cell);
                    placed = true;
                    break;
                }
            }
        }
    });

    // --------------------------------------------------
    // Helper: position tile and snap
    // --------------------------------------------------
    function placeTileAtCell(tileDiv, cell) {
        const areaRect = gameArea.getBoundingClientRect();
        const cellRect = cell.getBoundingClientRect();

        tileDiv.style.position = "absolute";
        tileDiv.style.left = `${cellRect.left - areaRect.left}px`;
        tileDiv.style.top = `${cellRect.top - areaRect.top}px`;

        gameArea.appendChild(tileDiv);
        placeTileInBank(tileDiv);
    }
}

function renderTileDOM(tile) {
    const minR = Math.min(...tile.cells.map(c => c.row));
    const minC = Math.min(...tile.cells.map(c => c.col));
    const maxR = Math.max(...tile.cells.map(c => c.row));
    const maxC = Math.max(...tile.cells.map(c => c.col));

    const tileDiv = document.createElement("div");

    tileDiv.innerHTML = "";
    tileDiv.className = "tile";
    tileDiv.style.display = "inline-grid";

    const tileColor = randomLowOpacityColor(0.35);

    const rows = maxR - minR + 1;
    const cols = maxC - minC + 1;
    tileDiv.dataset.rows = rows;
    tileDiv.dataset.cols = cols;
    tileDiv.dataset.state = "in-bank";

    tileDiv.style.gridTemplateRows = `repeat(${rows}, 40px)`;
    tileDiv.style.gridTemplateColumns = `repeat(${cols}, 40px)`;

    tile.cells.forEach(cell => {
        const tileCell = document.createElement("div");
        tileCell.className = "tile-cell";

        // Visuals
        tileCell.textContent = cell.letter;
        tileCell.style.gridRowStart = (cell.row - minR) + 1;
        tileCell.style.gridColumnStart = (cell.col - minC) + 1;
        tileCell.style.backgroundColor = tileColor;

        // Data
        tileCell.dataset.row = cell.row - minR;
        tileCell.dataset.col = cell.col - minC;
        tileCell.dataset.tileId = tile.id;
        tileCell.dataset.letter = cell.letter;
        tileDiv.appendChild(tileCell);
    });

    return tileDiv;
}

function enableTileRotation(tileDiv) {
    let downX = 0;
    let downY = 0;
    let downTime = 0;
    let moved = false;
    let startedOnCell = false;

    const MOVE_THRESHOLD = 5;
    const CLICK_TIME = 350;

    tileDiv.addEventListener("pointerdown", e => {
        if (tileDiv.classList.contains("locked")) return;

        // Did this pointer start on a tile cell?
        startedOnCell = !!e.target.closest(".tile-cell");

        if (!startedOnCell) return;

        downX = e.clientX;
        downY = e.clientY;
        downTime = performance.now();
        moved = false;
    });

    tileDiv.addEventListener("pointermove", e => {
        if (!startedOnCell) return;

        if (
            Math.abs(e.clientX - downX) > MOVE_THRESHOLD ||
            Math.abs(e.clientY - downY) > MOVE_THRESHOLD
        ) {
            moved = true;
        }
    });

    tileDiv.addEventListener("pointerup", e => {
        if (!startedOnCell) return;

        const elapsed = performance.now() - downTime;
        if (!moved && elapsed < CLICK_TIME) {
            const cell = e.target.closest(".tile-cell");
            rotateTile(tileDiv, cell);
            saveGameState();
        }
    });

}

function rotateTile(tileDiv, pivotCell) {
    if (tileDiv.classList.contains("locked")) return;

    // If tile was on board, clear it first
    removeTileFromBoard(tileDiv);

    const CELL = 40;
    const GAP = 4;

    const cells = Array.from(tileDiv.querySelectorAll(".tile-cell"));

    const rows = parseInt(tileDiv.dataset.rows, 10);
    const cols = parseInt(tileDiv.dataset.cols, 10);

    // --- Pivot position BEFORE rotation (tile-local)
    const oldRow = parseInt(pivotCell.dataset.row, 10);
    const oldCol = parseInt(pivotCell.dataset.col, 10);

    const oldX = oldCol * (CELL + GAP);
    const oldY = oldRow * (CELL + GAP);

    // --- Rotate logical coordinates (90° clockwise)
    cells.forEach(cell => {
        const r = parseInt(cell.dataset.row, 10);
        const c = parseInt(cell.dataset.col, 10);

        const newR = c;
        const newC = (rows - 1) - r;

        cell.dataset.row = newR;
        cell.dataset.col = newC;
    });

    const newRows = cols;
    const newCols = rows;

    tileDiv.dataset.rows = newRows;
    tileDiv.dataset.cols = newCols;

    tileDiv.style.gridTemplateRows = `repeat(${newRows}, ${CELL}px)`;
    tileDiv.style.gridTemplateColumns = `repeat(${newCols}, ${CELL}px)`;

    // --- Apply new CSS grid placement
    cells.forEach(cell => {
        cell.style.gridRowStart = parseInt(cell.dataset.row, 10) + 1;
        cell.style.gridColumnStart = parseInt(cell.dataset.col, 10) + 1;
    });

    // --- Pivot position AFTER rotation (tile-local)
    const newRow = parseInt(pivotCell.dataset.row, 10);
    const newCol = parseInt(pivotCell.dataset.col, 10);

    const newX = newCol * (CELL + GAP);
    const newY = newRow * (CELL + GAP);

    // --- Offset tile so pivot cell stays visually fixed
    const dx = oldX - newX;
    const dy = oldY - newY;

    const left = parseFloat(tileDiv.style.left || 0);
    const top = parseFloat(tileDiv.style.top || 0);

    tileDiv.style.left = `${left + dx}px`;
    tileDiv.style.top = `${top + dy}px`;

    const targetCell = findBestStartingBoardCell(tileDiv);
    if (targetCell) {
        placeTileInBoard(tileDiv, targetCell);
    } else {
        placeTileInBank(tileDiv);
    }

    saveGameState();
}

function enableTileDrag(tileDiv) {
    let downX = 0, downY = 0;
    let startX = 0, startY = 0;
    let dragging = false;
    let startedOnCell = false;

    const DRAG_THRESHOLD = 6;

    tileDiv.addEventListener("pointerdown", e => {
        if (tileDiv.classList.contains("locked")) return;

        const cell = e.target.closest(".tile-cell");
        if (!cell) return;

        startedOnCell = true;
        dragging = false;

        downX = e.clientX;
        downY = e.clientY;

        const tileRect = tileDiv.getBoundingClientRect();
        startX = e.clientX - tileRect.left;
        startY = e.clientY - tileRect.top;
    });

    tileDiv.addEventListener("pointermove", e => {
        if (!startedOnCell || tileDiv.classList.contains("locked")) return;

        const dx = e.clientX - downX;
        const dy = e.clientY - downY;

        // Promote to drag only after threshold
        if (!dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
            dragging = true;

            tileDiv.setPointerCapture(e.pointerId);

            removeTileFromBoard(tileDiv);
            tileDiv.classList.add("dragging");

            const gameArea = document.querySelector(".game-area");
            const areaRect = gameArea.getBoundingClientRect();
            const tileRect = tileDiv.getBoundingClientRect();

            tileDiv.style.position = "absolute";
            tileDiv.style.left = `${tileRect.left - areaRect.left}px`;
            tileDiv.style.top = `${tileRect.top - areaRect.top}px`;

            if (tileDiv.parentElement !== gameArea) {
                gameArea.appendChild(tileDiv);
            }
        }

        if (!dragging) return;

        const gameArea = document.querySelector(".game-area");
        const rect = gameArea.getBoundingClientRect();

        tileDiv.style.left = `${e.clientX - rect.left - startX}px`;
        tileDiv.style.top = `${e.clientY - rect.top - startY}px`;
    });

    tileDiv.addEventListener("pointerup", e => {
        if (!startedOnCell) return;

        if (dragging) {
            tileDiv.releasePointerCapture(e.pointerId);

            tileDiv.classList.remove("dragging");

            const targetCell = findBestStartingBoardCell(tileDiv);
            if (!targetCell) {
                placeTileInBank(tileDiv);
            } else {
                placeTileInBoard(tileDiv, targetCell);
            }
            saveGameState();
        }

        dragging = false;
        startedOnCell = false;
    });

}

/*********************************************************************
 *  PLACEMENT ALGORITHM
 *********************************************************************/
function findBestStartingBoardCell(tileDiv) {
    // Tile only snaps into place if the bounding boxes overlap
    const board = document.getElementById("board");
    const tileRect = tileDiv.getBoundingClientRect();
    const boardRect = board.getBoundingClientRect();
    if (tileRect.right < boardRect.left ||
        tileRect.left > boardRect.right ||
        tileRect.bottom < boardRect.top ||
        tileRect.top > boardRect.bottom) {
        return null;
    }

    // Find the board cell closest to the tile where the whole tile could fit if placed there
    let bestBoardCell = null;
    let bestBoardCellDist = Infinity;
    for (const startingBoardCell of board.querySelectorAll(".board-cell")) {
        if (tileFits(tileDiv, startingBoardCell)) {
            // TODO compute dist from centroid of tile to centroid of landing location
            const tileRect = tileDiv.getBoundingClientRect();
            const tileCenterX = (tileRect.left + tileRect.right) / 2;
            const tileCenterY = (tileRect.top + tileRect.bottom) / 2;

            // The startingBoardCell is top-left, get the cell at bottom-right of placement
            const endingBoardCell = board.querySelector(
                `.board-cell[data-row="${parseInt(startingBoardCell.dataset.row) + parseInt(tileDiv.dataset.rows) - 1}"][data-col="${parseInt(startingBoardCell.dataset.col) + parseInt(tileDiv.dataset.cols) - 1}"]`
            );
            const startCellRect = startingBoardCell.getBoundingClientRect();
            const endCellRect = endingBoardCell.getBoundingClientRect();
            const landingCenterX = (startCellRect.left + endCellRect.right) / 2;
            const landingCenterY = (startCellRect.top + endCellRect.bottom) / 2;

            const dx = tileCenterX - landingCenterX;
            const dy = tileCenterY - landingCenterY;
            const dist = dx * dx + dy * dy;
            if (dist < bestBoardCellDist) {
                bestBoardCellDist = dist;
                bestBoardCell = startingBoardCell;
            }
        }
    }

    return bestBoardCell;
}

function tileFits(tileDiv, startingBoardCell) {
    const board = document.getElementById("board");
    const boardRows = parseInt(board.dataset.rows, 10);
    const boardCols = parseInt(board.dataset.cols, 10);
    const startingRow = parseInt(startingBoardCell.dataset.row, 10);
    const startingCol = parseInt(startingBoardCell.dataset.col, 10);

    for (const tileCell of tileDiv.querySelectorAll(".tile-cell")) {
        const currentTileCellRow = parseInt(tileCell.dataset.row, 10);
        const currentTileCellCol = parseInt(tileCell.dataset.col, 10);

        const rowInGrid = startingRow + currentTileCellRow;
        const colInGrid = startingCol + currentTileCellCol;

        // Current tile cell would be off grid
        if (rowInGrid < 0 || rowInGrid >= boardRows) return false;
        if (colInGrid < 0 || colInGrid >= boardCols) return false;

        // Current tile cell would land in filled or blocked grid cell
        const gridCell = board.querySelector(
            `.board-cell[data-row="${rowInGrid}"][data-col="${colInGrid}"]`
        );
        if (!gridCell) return false;
        if (gridCell.dataset.letter !== "") return false;
        if (gridCell.dataset.blocked === "true") return false;
    }

    return true;
}

function placeTileInBank(tileDiv) {
    tileDiv.dataset.state = "in-bank";

    const bank = document.getElementById("bank");
    const gameArea = document.querySelector(".game-area");

    const areaRect = gameArea.getBoundingClientRect();
    const tileRect = tileDiv.getBoundingClientRect();

    // Ensure absolute positioning in game-area
    if (tileDiv.parentElement !== gameArea) {
        tileDiv.style.position = "absolute";
        tileDiv.style.left = `${tileRect.left - areaRect.left}px`;
        tileDiv.style.top = `${tileRect.top - areaRect.top}px`;
        gameArea.appendChild(tileDiv);
    }

    const tileRows = parseInt(tileDiv.dataset.rows, 10);
    const tileCols = parseInt(tileDiv.dataset.cols, 10);

    const bankCells = Array.from(bank.querySelectorAll(".bank-cell"));

    let bestCell = null;
    let bestDist = Infinity;

    const tileCenterX = (tileRect.left + tileRect.right) / 2;
    const tileCenterY = (tileRect.top + tileRect.bottom) / 2;

    for (const cell of bankCells) {
        const startRow = parseInt(cell.dataset.row, 10);
        const startCol = parseInt(cell.dataset.col, 10);

        // ---- Check bounds: tile must fully fit in bank
        let fits = true;

        for (const tileCell of tileDiv.querySelectorAll(".tile-cell")) {
            const r = startRow + parseInt(tileCell.dataset.row, 10);
            const c = startCol + parseInt(tileCell.dataset.col, 10);

            if (!bank.querySelector(
                `.bank-cell[data-row="${r}"][data-col="${c}"]`
            )) {
                fits = false;
                break;
            }
        }

        if (!fits) continue;

        // ---- Distance from tile center to landing center
        const startCellRect = cell.getBoundingClientRect();

        const endCell = bank.querySelector(
            `.bank-cell[data-row="${startRow + tileRows - 1}"][data-col="${startCol + tileCols - 1}"]`
        );
        if (!endCell) continue;

        const endCellRect = endCell.getBoundingClientRect();

        const landingCenterX = (startCellRect.left + endCellRect.right) / 2;
        const landingCenterY = (startCellRect.top + endCellRect.bottom) / 2;

        const dx = tileCenterX - landingCenterX;
        const dy = tileCenterY - landingCenterY;
        const dist = dx * dx + dy * dy;

        if (dist < bestDist) {
            bestDist = dist;
            bestCell = cell;
        }
    }

    // If no valid placement exists, leave tile where it is
    if (!bestCell) return;

    // ---- Snap tile to chosen bank cell
    const bestRect = bestCell.getBoundingClientRect();

    tileDiv.style.left = `${bestRect.left - areaRect.left}px`;
    tileDiv.style.top = `${bestRect.top - areaRect.top}px`;

    tileDiv.classList.remove("in-board");

    updateRowColHelpers();
}

function placeTileInBoard(tileDiv, startingBoardCell) {
    tileDiv.dataset.state = "in-board";

    const board = document.getElementById("board");

    // Coordinate system must match dragging: use game-area
    const gameArea = document.querySelector(".game-area");
    const areaRect = gameArea.getBoundingClientRect();
    const startCellRect = startingBoardCell.getBoundingClientRect();

    // Snap relative to game-area
    const snappedLeft = startCellRect.left - areaRect.left;
    const snappedTop = startCellRect.top - areaRect.top;

    tileDiv.style.left = `${snappedLeft}px`;
    tileDiv.style.top = `${snappedTop}px`;

    tileDiv.classList.add("in-board");

    const firstRow = parseInt(startingBoardCell.dataset.row, 10);
    const firstCol = parseInt(startingBoardCell.dataset.col, 10);
    tileDiv.dataset.boardRow = firstRow;
    tileDiv.dataset.boardCol = firstCol;

    // Fill board cells
    for (const tileCell of tileDiv.querySelectorAll(".tile-cell")) {
        const rowOffset = parseInt(tileCell.dataset.row, 10);
        const colOffset = parseInt(tileCell.dataset.col, 10);

        const row = firstRow + rowOffset;
        const col = firstCol + colOffset;

        const boardCell = board.querySelector(
            `.board-cell[data-row="${row}"][data-col="${col}"]`
        );

        if (boardCell) {
            boardCell.dataset.letter = tileCell.dataset.letter;
            boardCell.classList.add("filled");
        }
    }

    updateRowColHelpers();

    let complete = checkBoardForCompletion();
    if (complete) {
        onComplete();
    }
}

function updateRowColHelpers() {
    const board = document.getElementById("board");
    const container = document.getElementById("board-container");

    const rows = parseInt(board.dataset.rows, 10);
    const cols = parseInt(board.dataset.cols, 10);

    const CELL = 40;
    const GAP = 4;

    // Remove helpers that are no longer valid
    container.querySelectorAll(".word-helper").forEach(h => h.remove());

    const boardRect = board.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const offsetX = boardRect.left - containerRect.left;
    const offsetY = boardRect.top - containerRect.top;

    // ---- ROWS
    for (let r = 0; r < rows; r++) {
        let word = "";
        let complete = true;

        for (let c = 0; c < cols; c++) {
            const cell = board.querySelector(
                `.board-cell[data-row="${r}"][data-col="${c}"]`
            );
            if (!cell || (cell.dataset.letter === "" && cell.dataset.blocked === "false")) {
                complete = false;
                break;
            }
            word += cell.dataset.letter;
        }

        if (!complete) continue;

        const helper = document.createElement("div");
        helper.className = "word-helper";
        helper.dataset.type = "row";
        helper.dataset.index = r;
        helper.dataset.word = word;
        const definition = getDefinitionForWord(word);

        if (definition) {
            helper.textContent = "❓";
        } else {
            helper.textContent = "";
        }

        const top =
            offsetY +
            r * (CELL + GAP) +
            CELL / 2 -
            7;

        const left =
            offsetX +
            cols * (CELL + GAP) +
            6;

        helper.style.top = `${top}px`;
        helper.style.left = `${left}px`;

        helper.addEventListener("click", () => {
            if (definition) {
                definitionSubHeaderText.textContent = `${word} - ${definition}`;
                definitionSubHeader.classList.remove('hidden');
            } else {
                definitionSubHeaderText.textContent = `No match found for ${word}`;
                definitionSubHeader.classList.remove('hidden');
            }
        });

        container.appendChild(helper);
    }

    // ---- COLUMNS
    for (let c = 0; c < cols; c++) {
        let word = "";
        let complete = true;

        for (let r = 0; r < rows; r++) {
            const cell = board.querySelector(
                `.board-cell[data-row="${r}"][data-col="${c}"]`
            );
            if (!cell || (cell.dataset.letter === "" && cell.dataset.blocked === "false")) {
                complete = false;
                break;
            }
            word += cell.dataset.letter;
        }

        if (!complete) continue;

        const helper = document.createElement("div");
        helper.className = "word-helper";

        const definition = getDefinitionForWord(word);
        if (definition) {
            helper.textContent = "❓";
        } else {
            helper.textContent = "";
        }

        helper.dataset.type = "col";
        helper.dataset.index = c;
        helper.dataset.word = word;

        const left =
            offsetX +
            c * (CELL + GAP) +
            CELL / 2 -
            7;

        const top =
            offsetY +
            rows * (CELL + GAP) +
            6;

        helper.style.left = `${left}px`;
        helper.style.top = `${top}px`;

        helper.addEventListener("click", () => {
            const definition = getDefinitionForWord(word);
            if (definition) {
                definitionSubHeaderText.textContent = `${word} - ${definition}`;
                definitionSubHeader.classList.remove('hidden');
            } else {
                definitionSubHeaderText.textContent = `No match found for ${word}`;
                definitionSubHeader.classList.remove('hidden');

            }
        });

        container.appendChild(helper);
    }
}


function checkBoardForCompletion() {
    const board = document.getElementById("board");
    for (const cell of board.querySelectorAll(".board-cell")) {
        // If any unblocked cell is unfilled, board is incomplete
        if (cell.dataset.letter === "" && cell.dataset.blocked === "false") {
            return false;
        }
    }

    // All cells filled, check if each row and column forms a valid word
    const rows = parseInt(board.dataset.rows, 10);
    const cols = parseInt(board.dataset.cols, 10);
    for (let r = 0; r < rows; r++) {
        let rowWord = "";
        for (let c = 0; c < cols; c++) {
            const cell = board.querySelector(`.board-cell[data-row="${r}"][data-col="${c}"]`);
            if (cell.dataset.blocked === "true") continue;
            rowWord += cell.dataset.letter;
        }
        if (!isWord(rowWord)) {
            return false;
        }
    }

    for (let c = 0; c < cols; c++) {
        let colWord = "";
        for (let r = 0; r < rows; r++) {
            const cell = board.querySelector(`.board-cell[data-row="${r}"][data-col="${c}"]`);
            if (cell.dataset.blocked === "true") continue;
            colWord += cell.dataset.letter;
        }
        if (!isWord(colWord)) {
            return false;
        }
    }

    return true;
}

function onComplete() {
    for (const tile of document.querySelectorAll(".tile")) {
        tile.classList.add("locked");
    }
    launchFireworks(tileColors);

}

function removeTileFromBoard(tileDiv) {
    if (tileDiv.dataset.state !== "in-board") return;

    tileDiv.classList.remove("in-board");

    const board = document.getElementById("board");
    const firstRow = parseInt(tileDiv.dataset.boardRow, 10);
    const firstCol = parseInt(tileDiv.dataset.boardCol, 10);

    // Mark board cells as unfilled
    for (const tileCell of tileDiv.querySelectorAll(".tile-cell")) {
        const rowOffset = parseInt(tileCell.dataset.row, 10);
        const colOffset = parseInt(tileCell.dataset.col, 10);

        const row = firstRow + rowOffset;
        const col = firstCol + colOffset;

        const boardCell = board.querySelector(
            `.board-cell[data-row="${row}"][data-col="${col}"]`
        );

        if (boardCell) {
            boardCell.dataset.letter = "";
            boardCell.classList.remove("filled");
        }
    }
}

function launchFireworks(colors) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.style.position = "fixed";
    canvas.style.top = 0;
    canvas.style.left = 0;
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = 9999;

    document.body.appendChild(canvas);

    resize();
    window.addEventListener("resize", resize);

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    const particles = [];
    const gravity = 0.04;
    const duration = 4000;
    const startTime = performance.now();

    function createFirework() {
        const x = random(seedString) * canvas.width;
        const y = random(seedString) * canvas.height * 0.6;

        const colorDict = colors[Math.floor(random(seedString) * colors.length)];
        const color = `hsla(${colorDict.h}, ${colorDict.s}%, ${colorDict.l}%, ${1})`

        for (let i = 0; i < 30; i++) {
            const angle = random(seedString) * Math.PI * 2;
            const speed = random(seedString) * 3 + 1;

            particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1,
                color
            });
        }
    }

    function update() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            p.vy += gravity;
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.015;

            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.globalAlpha = 1;

        // Remove faded particles
        for (let i = particles.length - 1; i >= 0; i--) {
            if (particles[i].alpha <= 0) {
                particles.splice(i, 1);
            }
        }

        if (performance.now() - startTime < duration) {
            if (random(seedString) < 0.15) createFirework();
            requestAnimationFrame(update);
        } else {
            cleanup();
        }
    }

    function cleanup() {
        window.removeEventListener("resize", resize);
        canvas.remove();
    }

    // Initial burst
    for (let i = 0; i < 5; i++) createFirework();
    update();
}

let tileColors = [];

function randomLowOpacityColor(alpha = 0.25, candidates = 9) {
    // First color: no comparison needed
    if (tileColors.length === 0) {
        const first = generateRandomHSL(alpha);
        tileColors.push(first);
        return `hsla(${first.h}, ${first.s}%, ${first.l}%, ${first.a})`;
    }

    let bestCandidate = null;
    let bestScore = -Infinity;

    for (let i = 0; i < candidates; i++) {
        const candidate = generateRandomHSL(alpha);

        // Find distance to closest existing color
        let minDist = Infinity;
        for (const used of tileColors) {
            const d = hslDistance(candidate, used);
            if (d < minDist) minDist = d;
        }

        // Maximize the minimum distance
        if (minDist > bestScore) {
            bestScore = minDist;
            bestCandidate = candidate;
        }
    }

    tileColors.push(bestCandidate);

    return `hsla(${bestCandidate.h}, ${bestCandidate.s}%, ${bestCandidate.l}%, ${bestCandidate.a})`;
}

function generateRandomHSL(alpha) {
    return {
        h: random(seedString) * 360,
        s: 60 + random(seedString) * 40, // 60–100%
        l: 40 + random(seedString) * 20, // 40–60%
        a: alpha
    };
}

function hslDistance(a, b) {
    const dh = Math.min(
        Math.abs(a.h - b.h),
        360 - Math.abs(a.h - b.h)
    ) / 180; // normalize

    const ds = Math.abs(a.s - b.s) / 100;
    const dl = Math.abs(a.l - b.l) / 100;

    // Weighted Euclidean distance
    return Math.sqrt(
        dh * dh * 2 + // hue matters most
        ds * ds +
        dl * dl
    );
}

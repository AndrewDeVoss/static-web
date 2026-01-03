import { isWord, loadDictionary, getDefinitionForWord } from "../utility/isword/isword.js";
import { random, createSeed } from '../utility/random/random.js';
import { findWordGrid } from "./word-grid-generator.js";
import { generateTiles } from "./tile-generator.js";

const subHeader = document.querySelector(".subheader");
const subHeaderText = document.querySelector(".subheader-text");
const subHeaderClose = document.querySelector(".subheader-close");
subHeaderClose.addEventListener("click", () => {
    subHeader.classList.add("hidden");
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
            if (now - lastTouchEnd <= 300) {
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
let seedString = `${launchDate}-${launchDifficulty}`;
if (!launchDate || !launchDifficulty) {
    seedString = random(seedString).toString(36).slice(2);
}

function generateGame({ width, height }) {
    const maxDim = 6;
    console.log('seed ' + seedString);
    createSeed(seedString);

    const w = Math.min(maxDim, width);
    const h = Math.min(maxDim, height);

    tileColors = [];

    const wordGrid = findWordGrid(DICT, w, h, seedString);

    if (!wordGrid) {
        document.getElementById("grid-output").textContent = "No grid found.";
        return;
    }

    document.querySelectorAll(".game-area .tile").forEach(tile => tile.remove());

    renderBank(wordGrid);
    renderBoard(wordGrid);
    renderTiles(wordGrid);
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
loadDictionary().then(dictMap => {
    DICT = Array.from(dictMap.keys()).map(w => w.toUpperCase());
    DICT = DICT.filter(w => isWord(w));
    generateBtn.disabled = false;

    handleLaunchMode();
});

function handleLaunchMode() {
    const controls = document.querySelector(".control-panel");

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
    bank.style.gridTemplateColumns = `repeat(${W}, 30px)`;
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
            const gridCell = document.createElement("div");
            gridCell.className = "board-cell";
            gridCell.dataset.row = r;
            gridCell.dataset.col = c;
            gridCell.dataset.letter = "";
            board.appendChild(gridCell);
        }
    }
}

/*********************************************************************
 *  TILE RENDERING
 *********************************************************************/
function renderTiles(grid) {
    const tiles = generateTiles(grid, seedString);

    // --------------------------------------------------
    // 1. SHUFFLE tiles (instead of sorting by dimensions)
    // --------------------------------------------------
    const shuffledTiles = tiles
        .map(t => [random(seedString), t])
        .sort((a, b) => a[0] - b[0])
        .map(pair => pair[1]);

    const bank = document.getElementById("bank");
    const BANK_COLS = parseInt(bank.dataset.cols, 10);

    // --------------------------------------------------
    // 2. LAYOUT + RANDOM INITIAL ROTATION
    // --------------------------------------------------
    let bankIndex = 0;

    shuffledTiles.forEach(tile => {
        const tileDiv = renderTileDOM(tile);

        // Random initial rotation
        const rotations = Math.floor(random(seedString) * 4);
        for (let i = 0; i < rotations; i++) {
            const pivot = tileDiv.querySelector(".tile-cell");
            if (pivot) rotateTile(tileDiv, pivot);
        }

        tileDiv.dataset.state = "in-bank";

        // --- TEMP placement so snapping works
        const gameArea = document.querySelector(".game-area");
        const bankCells = bank.querySelectorAll(".bank-cell");
        const cell = bankCells[bankIndex % bankCells.length];

        const areaRect = gameArea.getBoundingClientRect();
        const cellRect = cell.getBoundingClientRect();

        tileDiv.style.position = "absolute";
        tileDiv.style.left = `${cellRect.left - areaRect.left}px`;
        tileDiv.style.top = `${cellRect.top - areaRect.top}px`;

        gameArea.appendChild(tileDiv);

        // --- Snap using the same logic as drag-drop
        placeTileInBank(tileDiv);

        enableTileDrag(tileDiv);
        enableTileRotation(tileDiv);

        bankIndex++;
    });

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

    const tileColor = randomLowOpacityColor(0.2);

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
}

function enableTileDrag(tileDiv) {
    let startX = 0, startY = 0;
    let dragging = false;

    tileDiv.addEventListener("pointerdown", e => {
        dragging = true;
        removeTileFromBoard(tileDiv);

        tileDiv.classList.add("dragging");

        const gameArea = document.querySelector(".game-area");
        const areaRect = gameArea.getBoundingClientRect();
        const tileRect = tileDiv.getBoundingClientRect();

        // Mouse offset inside tile
        startX = e.clientX - tileRect.left;
        startY = e.clientY - tileRect.top;

        // Absolute pos relative to game-area BEFORE reparenting
        const absLeft = tileRect.left - areaRect.left;
        const absTop = tileRect.top - areaRect.top;

        tileDiv.style.position = "absolute";
        tileDiv.style.left = absLeft + "px";
        tileDiv.style.top = absTop + "px";

        // Always drag inside gameArea
        if (tileDiv.parentElement !== gameArea) {
            gameArea.appendChild(tileDiv);
        }

        e.preventDefault();
    });


    window.addEventListener("pointermove", e => {
        if (!dragging) return;

        tileDiv.dataset.state = "dragging";

        const gameArea = document.querySelector(".game-area");
        const rect = gameArea.getBoundingClientRect();

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        tileDiv.style.left = `${mouseX - startX}px`;
        tileDiv.style.top = `${mouseY - startY}px`;

        const startingBoardCell = findBestStartingBoardCell(tileDiv);
        // drawGhost(tileDiv, startingBoardCell);
    });

    window.addEventListener("pointerup", e => {
        if (!dragging) return;
        dragging = false;
        tileDiv.classList.remove("dragging");

        const targetCell = findBestStartingBoardCell(tileDiv);

        if (!targetCell) {
            placeTileInBank(tileDiv);
        } else {
            placeTileInBoard(tileDiv, targetCell);
        }
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

        // Current tile cell would land in filled grid cell
        const gridCell = board.querySelector(
            `.board-cell[data-row="${rowInGrid}"][data-col="${colInGrid}"]`
        );
        if (!gridCell) return false;
        if (gridCell.dataset.letter !== "") return false;
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
        for (const tile of document.querySelectorAll(".tile")) {
            tile.classList.add("locked");
        }
        launchFireworks(tileColors);
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
            if (!cell || cell.dataset.letter === "") {
                complete = false;
                break;
            }
            word += cell.dataset.letter;
        }

        if (!complete) continue;

        const helper = document.createElement("div");
        helper.className = "word-helper";
        helper.textContent = "❓";
        helper.dataset.type = "row";
        helper.dataset.index = r;
        helper.dataset.word = word;

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
            const definition = getDefinitionForWord(word);
            if (definition) {
                subHeaderText.textContent = `${word} - ${definition}`;
                subHeader.classList.remove('hidden');
            } else {
                subHeaderText.textContent = `No match found for ${word}`;
                subHeader.classList.remove('hidden');
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
            if (!cell || cell.dataset.letter === "") {
                complete = false;
                break;
            }
            word += cell.dataset.letter;
        }

        if (!complete) continue;

        const helper = document.createElement("div");
        helper.className = "word-helper";
        helper.textContent = "❓";
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
                subHeaderText.textContent = `${word} - ${definition}`;
                subHeader.classList.remove('hidden');
            } else {
                subHeaderText.textContent = `No match found for ${word}`;
                subHeader.classList.remove('hidden');

            }
        });

        container.appendChild(helper);
    }
}


function checkBoardForCompletion() {
    const board = document.getElementById("board");
    for (const cell of board.querySelectorAll(".board-cell")) {
        if (cell.dataset.letter === "") {
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
            colWord += cell.dataset.letter;
        }
        if (!isWord(colWord)) {
            return false;
        }
    }

    return true;
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

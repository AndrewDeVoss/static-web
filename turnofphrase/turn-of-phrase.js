/**********************************************************************
 *  TURN OF PHRASE — FIXED TILE SYSTEM
 *  - Ghost highlighting fixed
 *  - Proper tile dragging and snapping
 *  - Debug line from tile centroid to landing location
 *********************************************************************/

import { isWord, loadDictionary } from "../utility/isword/isword.js";
import { findWordGrid } from "./word-grid-generator.js";
import { generateTiles } from "./tile-generator.js";

/*********************************************************************
 *  INITIAL SETUP
 *********************************************************************/
const btn = document.getElementById("generate-btn");
btn.disabled = true;

let DICT = [];

loadDictionary().then(dictMap => {
    DICT = Array.from(dictMap.keys()).map(w => w.toUpperCase());
    DICT = DICT.filter(w => isWord(w));
    btn.disabled = false;
});

/*********************************************************************
 *  MAIN BUTTON
 *********************************************************************/
btn.addEventListener("click", () => {
    const maxDim = 6;
    const w = Math.min(maxDim, parseInt(document.getElementById("grid-width").value, 10));
    const h = Math.min(maxDim, parseInt(document.getElementById("grid-height").value, 10));

    const grid = findWordGrid(DICT, w, h);

    if (!grid) {
        document.getElementById("grid-output").textContent = "No grid found.";
        return;
    }

    // If there are any tiles that exist, delete them
    document.querySelectorAll(".game-area .tile").forEach(tile => tile.remove());

    renderBoard(grid);
    renderTiles(grid);
});

/*********************************************************************
 *  BOARD RENDERING
 *********************************************************************/
function renderBoard(grid) {
    const H = grid.length;
    const W = grid[0].length;

    const board = document.getElementById("board");
    board.innerHTML = "";
    board.style.position = "relative"; // required for ghost + absolute tiles
    board.style.gridTemplateColumns = `repeat(${W}, 40px)`;
    board.style.display = "grid";

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
    const tiles = generateTiles(grid);
    const bank = document.getElementById("tile-bank");

    // ---- SORT: height (rows) → width (cols)
    function tileDims(tile) {
        const rows =
            Math.max(...tile.cells.map(c => c.r)) -
            Math.min(...tile.cells.map(c => c.r)) + 1;

        const cols =
            Math.max(...tile.cells.map(c => c.c)) -
            Math.min(...tile.cells.map(c => c.c)) + 1;

        return { rows, cols };
    }

    tiles.sort((a, b) => {
        const da = tileDims(a);
        const db = tileDims(b);

        if (da.rows !== db.rows) return da.rows - db.rows;
        return da.cols - db.cols;
    });

    // ---- BANK SETUP
    bank.innerHTML = "";
    bank.style.position = "relative";

    const CELL = 40;
    const GAP = 4;
    const PADDING = 10;

    // Choose a reasonable max width (responsive)
    const maxBankWidth = window.innerWidth - 20;

    let x = 0;
    let y = 0;
    let rowHeight = 0;
    let maxRowWidth = 0;


    // ---- LAYOUT
    tiles.forEach(tile => {
        const tileDiv = renderTileDOM(tile);

        const rows = parseInt(tileDiv.dataset.rows, 10);
        const cols = parseInt(tileDiv.dataset.cols, 10);

        const tileWidth =
            cols * CELL + (cols - 1) * GAP + PADDING;

        const tileHeight =
            rows * CELL + (rows - 1) * GAP + PADDING;

        // New row if tile doesn't fit
        if (x + tileWidth > maxBankWidth) {
            maxRowWidth = Math.max(maxRowWidth, x);

            x = 0;
            y += rowHeight;
            rowHeight = 0;
        }


        tileDiv.style.position = "absolute";
        tileDiv.style.left = `${x}px`;
        tileDiv.style.top = `${y}px`;

        // Save location for when we place in bank
        tileDiv.dataset.bankLeft = x;
        tileDiv.dataset.bankTop = y;

        bank.appendChild(tileDiv);
        enableTileDrag(tileDiv);

        x += tileWidth;
        rowHeight = Math.max(rowHeight, tileHeight);
        maxRowWidth = Math.max(maxRowWidth, x);
    });

    bank.style.width = `${maxRowWidth}px`;
    bank.style.height = `${y + rowHeight}px`;
}


function placeTileInBank(tileDiv) {
    const bank = document.getElementById("tile-bank");

    tileDiv.dataset.state = "in-bank";

    const left = parseFloat(tileDiv.dataset.bankLeft);
    const top = parseFloat(tileDiv.dataset.bankTop);

    tileDiv.style.position = "absolute";
    tileDiv.style.left = `${left}px`;
    tileDiv.style.top = `${top}px`;

    // Reparent if necessary
    if (tileDiv.parentElement !== bank) {
        bank.appendChild(tileDiv);
    }
}


function renderTileDOM(tile) {
    const minR = Math.min(...tile.cells.map(c => c.r));
    const minC = Math.min(...tile.cells.map(c => c.c));
    const maxR = Math.max(...tile.cells.map(c => c.r));
    const maxC = Math.max(...tile.cells.map(c => c.c));

    const tileDiv = document.createElement("div");

    tileDiv.innerHTML = "";
    tileDiv.className = "tile";
    tileDiv.style.display = "inline-grid";
    tileDiv.style.cursor = "grab";

    const tileColor = randomLowOpacityColor(0.2);

    const rows = maxR - minR + 1;
    const cols = maxC - minC + 1;
    tileDiv.dataset.rows = rows;
    tileDiv.dataset.cols = cols;

    tileDiv.style.gridTemplateRows = `repeat(${rows}, 40px)`;
    tileDiv.style.gridTemplateColumns = `repeat(${cols}, 40px)`;

    tile.cells.forEach(cell => {
        const tileCell = document.createElement("div");
        tileCell.className = "tile-cell";

        // Visuals
        tileCell.textContent = cell.letter;
        tileCell.style.gridRowStart = (cell.r - minR) + 1;
        tileCell.style.gridColumnStart = (cell.c - minC) + 1;
        tileCell.style.backgroundColor = tileColor;

        // Data
        tileCell.dataset.row = cell.r - minR;
        tileCell.dataset.col = cell.c - minC;
        tileCell.dataset.tileId = tile.id;
        tileCell.dataset.letter = cell.letter;
        tileDiv.appendChild(tileCell);
    });

    return tileDiv;
}

function enableTileRotation(tileDiv) {
    tileDiv.addEventListener("click", e => {
        if (tileDiv.classList.contains("dragging")) return;

        tile.cells = tile.cells.map(({ r, c, letter }) => ({
            r: c,
            c: -r,
            letter
        }));

        renderTileDOM(tile);
    });
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

function randomLowOpacityColor(alpha = 0.25) {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

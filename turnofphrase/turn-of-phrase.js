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

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    shuffle(tiles);

    bank.innerHTML = "";
    bank.style.position = "relative"; // for absolute positioning

    const N = tiles.length;
    const cols = Math.ceil(Math.sqrt(N));
    const rows = Math.ceil(N / cols);

    // Set container fixed size so layout never shifts
    const maxTileDim = Math.max(
        ...tiles.map(t =>
            Math.max(
                Math.max(...t.cells.map(c => c.r)) - Math.min(...t.cells.map(c => c.r)) + 1,
                Math.max(...t.cells.map(c => c.c)) - Math.min(...t.cells.map(c => c.c)) + 1
            )
        )
    );

    const bankCellSize = 40 * maxTileDim + 4 * (maxTileDim - 1) + 10;
    bank.style.width = `${cols * bankCellSize}px`;
    bank.style.height = `${rows * bankCellSize}px`;

    tiles.forEach((tile, i) => {
        let tileDiv = renderTileDOM(tile);

        const r = Math.floor(i / cols);
        const c = i % cols;

        tileDiv.dataset.bankRow = r;
        tileDiv.dataset.bankCol = c;

        // Store the cell size so "placeTileInBank" can compute left/top
        tileDiv.dataset.bankCellSize = bankCellSize;

        placeTileInBank(tileDiv);
        enableTileDrag(tileDiv);
    });
}

function placeTileInBank(tileDiv) {
    const bank = document.getElementById("tile-bank");

    tileDiv.dataset.state = "in-bank";

    // Absolute positioning inside the bank grid
    const bankCellRow = parseInt(tileDiv.dataset.bankRow, 10);
    const bankCellCol = parseInt(tileDiv.dataset.bankCol, 10);
    const cellSize = parseInt(tileDiv.dataset.bankCellSize, 10);

    tileDiv.style.position = "absolute";
    tileDiv.style.left = `${bankCellCol * cellSize}px`;
    tileDiv.style.top = `${bankCellRow * cellSize}px`;

    // Reparent tile if necessary
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

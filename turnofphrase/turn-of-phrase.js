import { isWord, loadDictionary } from "../utility/isword/isword.js";
import { random, createSeed } from '../utility/random/random.js';
import { findWordGrid } from "./word-grid-generator.js";
import { generateTiles } from "./tile-generator.js";

const params = new URLSearchParams(window.location.search);
const launchDifficulty = params.get("difficulty"); // easy | medium | hard | custom | null
const launchDate = params.get("date"); // YYYY-MM-DD

function generateGame({ width, height, seedString }) {
    const maxDim = 6;
    createSeed(seedString);

    const w = Math.min(maxDim, width);
    const h = Math.min(maxDim, height);

    tileColors = [];

    const grid = findWordGrid(DICT, w, h);

    if (!grid) {
        document.getElementById("grid-output").textContent = "No grid found.";
        return;
    }

    document.querySelectorAll(".game-area .tile").forEach(tile => tile.remove());

    renderBoard(grid);
    renderTiles(grid);
}
const generateBtn = document.getElementById("generate-btn");
generateBtn.addEventListener("click", () => {
    const width = parseInt(document.getElementById("grid-width").value, 10);
    const height = parseInt(document.getElementById("grid-height").value, 10);

    generateGame({
        width,
        height,
        seed: null
    });
});

const DIFFICULTY_DIMENSIONS = {
    easy:   { width: 5, height: 5 },
    medium: { width: 6, height: 5 },
    hard:   { width: 6, height: 6 }
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
    if (launchDifficulty === "random") {
        controls.style.display = "flex";
        return;
    }

    // Difficulty or day-selector launch
    if (launchDifficulty && DIFFICULTY_DIMENSIONS[launchDifficulty]) {
        controls.style.display = "none";

        const { width, height } = DIFFICULTY_DIMENSIONS[launchDifficulty];

        generateGame({
            width,
            height,
            seedString: launchDifficulty || "random"
        });

        return;
    }

    // Direct page load (no params) → behave like clicking Generate
    controls.style.display = "flex";
    generateBtn.click();
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

    const bankScale = 0.75
    const CELL = 40 * bankScale;
    const GAP = 4  * bankScale;

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

        const tileWidth = cols * CELL + (cols - 1) * GAP;
        const tileHeight = rows * CELL + (rows - 1) * GAP;

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
        console.log(`Bank pos for tile ${tile.id}: ${x}, ${y}`);

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

    let complete = checkBoardForCompletion();
    if (complete) {
        for (const tile of document.querySelectorAll(".tile")) {
            tile.classList.add("locked");
        }
        launchFireworks(tileColors);
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
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height * 0.6;

        const colorDict = colors[Math.floor(Math.random() * colors.length)];
        const color = `hsla(${colorDict.h}, ${colorDict.s}%, ${colorDict.l}%, ${1})`

        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;

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
            if (Math.random() < 0.15) createFirework();
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
        h: Math.random() * 360,
        s: 60 + Math.random() * 40, // 60–100%
        l: 40 + Math.random() * 20, // 40–60%
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

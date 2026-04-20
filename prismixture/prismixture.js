import { generatePrismixture } from "./prismixture-generator.js";
import { Color } from "./color.js";
import { ColorNGraph } from "./color-n-graph.js";

// Initial generation
const colors = Color.generatePartitionColors(4, Math.random);
const prismixture = generatePrismixture(4, 4, colors);
const colorNGraph = new ColorNGraph(prismixture);
const board = document.getElementById("board");
const overlay = document.createElement("canvas");
const overlayContext = overlay.getContext("2d");

// State Variables
const width = colorNGraph.getGraph().length;
const height = colorNGraph.getGraph()[0].length;
let isDrawing = false;
let sourceNode = null;
let currentMouse = { x: 0, y: 0 };
let hoveredNode = null;
const globalPositions = new Map();
let boardRect = null;
let cellContexts = [];
let cellCanvases = [];
let cellElements = [];
let cellSize = 0;

// =========================
// INIT BOARD
// =========================
function initBoard() {
    board.innerHTML = "";
    board.style.position = "relative";
    board.style.display = "grid";
    board.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
    board.style.gridTemplateRows = `repeat(${height}, 1fr)`;
    board.style.gap = "10px";

    // Wait for layout to stabilize
    boardRect = board.getBoundingClientRect();

    // Compute ONE consistent size
    cellSize = boardRect.width / width;

    const dpr = window.devicePixelRatio || 1;

    for (let row = 0; row < height; row++) {
        cellContexts[row] = [];
        cellCanvases[row] = [];
        cellElements[row] = [];

        for (let col = 0; col < width; col++) {
            const cellElement = document.createElement("div");
            cellElement.style.position = "relative";
            cellElement.style.width = `${cellSize}px`;
            cellElement.style.height = `${cellSize}px`;

            const canvas = document.createElement("canvas");
            canvas.style.width = "100%";
            canvas.style.height = "100%";

            const ctx = canvas.getContext("2d");

            // Set consistent resolution
            canvas.width = cellSize * dpr;
            canvas.height = cellSize * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.globalCompositeOperation = "lighter";

            cellElement.appendChild(canvas);
            board.appendChild(cellElement);

            cellContexts[row][col] = ctx;
            cellCanvases[row][col] = canvas;
            cellElements[row][col] = cellElement;
        }
    }

    overlay.style.position = "absolute";
    overlay.style.left = "0";
    overlay.style.top = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.pointerEvents = "auto";

    board.prepend(overlay);
}
initBoard();

// =========================
// OVERLAY
// =========================
function initOverlay() {
    const dpr = window.devicePixelRatio || 1;
    overlay.width = boardRect.width * dpr;
    overlay.height = boardRect.height * dpr;
    overlayContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    overlayContext.lineWidth = 2;
}
initOverlay();

// =========================
// CELL RENDERING
// =========================
function updateCell(fromColorNodes, toColorNodes) {
    for (let fromNode of fromColorNodes) {
        globalPositions.delete(fromNode);
    }

    const col = toColorNodes[0].getX();
    const row = toColorNodes[0].getY();
    const ctx = cellContexts[row][col];
    const canvas = cellCanvases[row][col];
    const cellEl = cellElements[row][col];

    ctx.clearRect(0, 0, cellSize, cellSize);

    const sortedNodes = [...toColorNodes].sort((a, b) => {
        const [ar, ag, ab] = [a.getColor().r, a.getColor().g, a.getColor().b];
        const [br, bg, bb] = [b.getColor().r, b.getColor().g, b.getColor().b];
        return (br - ar) || (bg - ag) || (bb - ab);
    });

    const n = sortedNodes.length;
    const baseSize = 0.9;
    const cx = cellSize / 2;
    const cy = cellSize / 2;
    const paddingFactor = 0.85;

    const baseRadius =
        (cellSize * (baseSize / Math.sqrt(n)) * 0.5) * paddingFactor;

    const rect = cellEl.getBoundingClientRect();

    sortedNodes.forEach((node, i) => {
        const c = node.getColor();
        const angle = (i / n) * Math.PI * 2;
        const offsetRadius = n === 1 ? 0 : baseRadius * 0.5;

        const px = cx + Math.cos(angle) * offsetRadius;
        const py = cy + Math.sin(angle) * offsetRadius;

        const globalX = rect.left - boardRect.left + px;
        const globalY = rect.top - boardRect.top + py;

        globalPositions.set(node, { x: globalX, y: globalY, r: baseRadius });

        ctx.beginPath();
        ctx.arc(px, py, baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
        ctx.fill();
    });

    drawAllLines();
}

// Initial render
for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
        updateCell([], colorNGraph.getGraph()[x][y]);
    }
}

// =========================
// LINE DRAWING
// =========================
function drawAllLines() {
    overlayContext.clearRect(0, 0, overlay.width, overlay.height);

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            for (let node of colorNGraph.getGraph()[x][y]) {
                const from = globalPositions.get(node);
                if (!from) continue;

                const c = node.getColor();
                overlayContext.strokeStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;

                for (let target of node.connections) {
                    const to = globalPositions.get(target);
                    if (!to) continue;

                    overlayContext.beginPath();
                    overlayContext.moveTo(from.x, from.y);
                    overlayContext.lineTo(to.x, to.y);
                    overlayContext.stroke();
                }
            }
        }
    }

    if (isDrawing && sourceNode) {
        const from = globalPositions.get(sourceNode);
        if (from) {
            const c = sourceNode.getColor();
            overlayContext.strokeStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
            overlayContext.lineWidth = 3;

            overlayContext.beginPath();
            overlayContext.moveTo(from.x, from.y);
            overlayContext.lineTo(currentMouse.x, currentMouse.y);
            overlayContext.stroke();
        }
    }
}

// =========================
// INPUT
// =========================
function getNodeAtPosition(x, y) {
    for (let [node, pos] of globalPositions.entries()) {
        const dx = x - pos.x;
        const dy = y - pos.y;
        if (dx * dx + dy * dy <= pos.r * pos.r) {
            return node;
        }
    }
    return null;
}

board.addEventListener("pointerdown", (e) => {
    board.setPointerCapture(e.pointerId);

    const rect = overlay.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const node = getNodeAtPosition(x, y);
    if (node) {
        isDrawing = true;
        sourceNode = node;
        currentMouse = { x, y };
    }
});

board.addEventListener("pointermove", (e) => {
    const rect = overlay.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    currentMouse = { x, y };

    if (!isDrawing) return;
    drawAllLines();

    const node = getNodeAtPosition(x, y);

    if (node && node !== sourceNode) {
        hoveredNode = node;
        overlay.style.cursor = "pointer";
    } else {
        hoveredNode = null;
        overlay.style.cursor = "default";
    }
});

board.addEventListener("pointerup", (e) => {
    board.releasePointerCapture(e.pointerId);

    if (!isDrawing) return;

    if (hoveredNode && hoveredNode !== sourceNode) {
        colorNGraph.connect(sourceNode, hoveredNode);
    }

    isDrawing = false;
    sourceNode = null;
    hoveredNode = null;
    drawAllLines();
});

// =========================
// MODEL EVENTS
// =========================
colorNGraph.addEventListener("connection-change", () => {
    drawAllLines();
});

colorNGraph.addEventListener("cell-change", (event) => {
    const { fromColorNodes, toColorNodes } = event.detail;
    updateCell(fromColorNodes, toColorNodes);
});
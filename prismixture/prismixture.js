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
let connections = new Map();

// Define board
function initBoard() {
    board.innerHTML = "";
    board.style.position = "relative";
    board.style.display = "grid";
    board.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
    board.style.gridTemplateRows = `repeat(${height}, 1fr)`;
    board.style.gap = "10px";

    boardRect = board.getBoundingClientRect();

    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            board.appendChild(document.createElement("div"));
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

// Define overlay canvas things
function initOverlay() {
    const dpr = window.devicePixelRatio || 1;
    overlay.width = boardRect.width * dpr;
    overlay.height = boardRect.height * dpr;
    overlayContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    overlayContext.lineWidth = 2;
}
initOverlay();

/**
 * Updates a cell's visual representation based on its current ColorNodes. Handles both adding and removing nodes.
 */
function updateCell(fromColorNodes, toColorNodes) {
    // Remove old nodes from globals
    for (let node of fromColorNodes) {
        globalPositions.delete(node);
    }

    // Calculate cell index
    const col = toColorNodes[0].getX();
    const row = toColorNodes[0].getY();
    const cellIndex = row * width + col + 1; // +1 because of the overlay canvas at index 0

    // Create div for the cell
    const cellEl = document.createElement("div");
    cellEl.style.position = "relative";
    cellEl.style.width = "100%";
    cellEl.style.height = "100%";

    // Create canvas for the div - needed for additive color mixing
    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";

    // Add canvas to cell
    cellEl.appendChild(canvas);

    // Add cell to board
    board.replaceChild(cellEl, board.children[cellIndex]);

    // Use canvas to render circles defined by toColorNodes
    const ctx = canvas.getContext("2d");
    ctx.globalCompositeOperation = "lighter"; // Additive color mixing

    const rect = cellEl.getBoundingClientRect();
    const sizePx = Math.min(rect.width, rect.height);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = sizePx * dpr;
    canvas.height = sizePx * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Sort nodes by color for consistent placement
    const sortedNodes = [...toColorNodes].sort((a, b) => {
        const [ar, ag, ab] = [a.getColor().r, a.getColor().g, a.getColor().b];
        const [br, bg, bb] = [b.getColor().r, b.getColor().g, b.getColor().b];
        return (br - ar) || (bg - ag) || (bb - ab);
    });

    const n = sortedNodes.length;
    const baseSize = 0.9;
    const cx = sizePx / 2;
    const cy = sizePx / 2;
    const paddingFactor = 0.85;
    const baseRadius = (sizePx * (baseSize / Math.sqrt(n)) * 0.5) * paddingFactor;

    sortedNodes.forEach((node, i) => {
        const c = node.getColor();
        const angle = (i / n) * Math.PI * 2;
        const offsetRadius = n === 1 ? 0 : baseRadius * 0.5;
        const px = cx + Math.cos(angle) * offsetRadius;
        const py = cy + Math.sin(angle) * offsetRadius;
        const globalX = rect.left - boardRect.left + px;
        const globalY = rect.top - boardRect.top + py;

        // Store global position
        globalPositions.set(node, { x: globalX, y: globalY, r: baseRadius });

        // Draw circle for the node
        ctx.beginPath();
        ctx.arc(px, py, baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
        ctx.fill();
    });

    // After updating the cell, redraw lines
    drawAllLines();
}

// Render each starting cell:
for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
        updateCell([], colorNGraph.getGraph()[x][y]);
    }
}

function drawAllLines() {
    overlayContext.clearRect(0, 0, overlay.width, overlay.height);

    // Draw every connection
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

    // active line
    if (isDrawing && sourceNode) {
        const from = globalPositions.get(sourceNode);

        const c = sourceNode.getColor();
        overlayContext.strokeStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;

        overlayContext.lineWidth = 3;

        overlayContext.beginPath();
        overlayContext.moveTo(from.x, from.y);
        overlayContext.lineTo(currentMouse.x, currentMouse.y);
        overlayContext.stroke();
    }
}

// Helper
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

// Mouse listeners - actual user interaction with game
board.addEventListener("mousedown", (e) => {
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

board.addEventListener("mousemove", (e) => {
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

board.addEventListener("mouseup", () => {
    if (!isDrawing) return;

    if (hoveredNode && hoveredNode !== sourceNode) {
        colorNGraph.connect(sourceNode, hoveredNode);
    }

    isDrawing = false;
    sourceNode = null;
    hoveredNode = null;
    drawAllLines();
});

// Event listeners for observing model
colorNGraph.addEventListener("connection-change", (event) => {
    console.log("Received:", event.detail.value);
    drawAllLines();
});
colorNGraph.addEventListener("cell-change", (event) => {
    console.log("Received cell change:", event.detail);
    const { fromColorNodes, toColorNodes } = event.detail;
    updateCell(fromColorNodes, toColorNodes);
});

// =========================
// TEST CONNECTIONS
// =========================
// colorNGraph.connect(
//     colorNGraph.getGraph()[0][0][0],
//     colorNGraph.getGraph()[1][0][0]
// );

// colorNGraph.connect(
//     colorNGraph.getGraph()[0][0][0],
//     colorNGraph.getGraph()[0][1][0]
// );

// colorNGraph.connect(
//     colorNGraph.getGraph()[0][1][0],
//     colorNGraph.getGraph()[0][2][0]
// );

// colorNGraph.connect(
//     colorNGraph.getGraph()[1][0][0],
//     colorNGraph.getGraph()[2][0][0]
// );


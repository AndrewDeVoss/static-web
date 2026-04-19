import { generatePrismixture } from "./prismixture-generator.js";
import { Color } from "./color.js";
import { ColorNGraph } from "./color-n-graph.js";

/**
 * Notes:
 * - additive blending via canvas ("lighter")
 * - graph-driven rendering (not grid colors anymore)
 * - edges drawn on global overlay canvas
 */

const colors = Color.generatePartitionColors(4, Math.random);
const prismixture = generatePrismixture(4, 4, colors);
const colorNGraph = new ColorNGraph(prismixture);

const board = document.getElementById("board");

// =========================
// INTERACTION STATE
// =========================
let isDrawing = false;
let sourceNode = null;
let currentMouse = { x: 0, y: 0 };
let hoveredNode = null;

function renderColorNGraph(board, graph) {
    const width = graph.length;
    const height = graph[0].length;

    board.innerHTML = "";
    board.style.position = "relative";
    board.style.display = "grid";
    board.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
    board.style.gridTemplateRows = `repeat(${height}, 1fr)`;
    board.style.gap = "10px";

    const globalPositions = new Map();

    const boardRect = board.getBoundingClientRect();

    // =========================
    // PASS 1: DRAW NODES
    // =========================
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {

            const cellEl = document.createElement("div");
            cellEl.style.position = "relative";
            cellEl.style.width = "100%";
            cellEl.style.height = "100%";

            const canvas = document.createElement("canvas");
            canvas.style.width = "100%";
            canvas.style.height = "100%";

            cellEl.appendChild(canvas);
            board.appendChild(cellEl);

            const ctx = canvas.getContext("2d");

            const rect = cellEl.getBoundingClientRect();

            const sizePx = Math.min(rect.width, rect.height);
            const dpr = window.devicePixelRatio || 1;

            canvas.width = sizePx * dpr;
            canvas.height = sizePx * dpr;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            ctx.globalCompositeOperation = "lighter";

            const nodes = graph[x][y];
            const sortedNodes = [...nodes].sort((a, b) => {
                const [ar, ag, ab] = [a.getColor().r, a.getColor().g, a.getColor().b];
                const [br, bg, bb] = [b.getColor().r, b.getColor().g, b.getColor().b];

                return (br - ar) || (bg - ag) || (bb - ab);
            });

            const n = sortedNodes.length;

            const baseSize = 0.9;
            const cx = sizePx / 2;
            const cy = sizePx / 2;

            const paddingFactor = 0.85;

            const baseRadius =
                (sizePx * (baseSize / Math.sqrt(n)) * 0.5) * paddingFactor;

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
        }
    }

    // =========================
    // OVERLAY (INTERACTION + EDGES)
    // =========================
    const overlay = document.createElement("canvas");
    overlay.style.position = "absolute";
    overlay.style.left = "0";
    overlay.style.top = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.pointerEvents = "auto";

    board.prepend(overlay);

    const ctx = overlay.getContext("2d");

    const dpr = window.devicePixelRatio || 1;

    overlay.width = boardRect.width * dpr;
    overlay.height = boardRect.height * dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.lineWidth = 2;

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

    function redrawOverlay() {
        ctx.clearRect(0, 0, overlay.width, overlay.height);

        // draw edges
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                for (let node of graph[x][y]) {

                    const from = globalPositions.get(node);
                    if (!from) continue;

                    const c = node.getColor();
                    ctx.strokeStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;

                    for (let target of node.connections) {
                        const to = globalPositions.get(target);
                        if (!to) continue;

                        ctx.beginPath();
                        ctx.moveTo(from.x, from.y);
                        ctx.lineTo(to.x, to.y);
                        ctx.stroke();
                    }
                }
            }
        }

        // active line
        if (isDrawing && sourceNode) {
            const from = globalPositions.get(sourceNode);

            const c = sourceNode.getColor();
            ctx.strokeStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;

            ctx.lineWidth = 3;

            ctx.beginPath();
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(currentMouse.x, currentMouse.y);
            ctx.stroke();
        }

        // hover glow
        if (hoveredNode) {
            const pos = globalPositions.get(hoveredNode);

            ctx.beginPath();
            ctx.arc(pos.x, pos.y, pos.r * 1.2, 0, Math.PI * 2);

            ctx.shadowColor = "white";
            ctx.shadowBlur = 20;
            ctx.fillStyle = "rgba(255,255,255,0.15)";
            ctx.fill();

            ctx.shadowBlur = 0;
        }
    }

    // =========================
    // EVENTS
    // =========================
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

        const node = getNodeAtPosition(x, y);

        if (node && node !== sourceNode) {
            hoveredNode = node;
            overlay.style.cursor = "pointer";
        } else {
            hoveredNode = null;
            overlay.style.cursor = "default";
        }

        redrawOverlay();
    });

    board.addEventListener("mouseup", () => {
        if (!isDrawing) return;

        if (hoveredNode && hoveredNode !== sourceNode) {
            // console.log("SOURCE:", sourceNode);
            // console.log("TARGET:", hoveredNode);
            colorNGraph.connect(sourceNode, hoveredNode);
        }

        isDrawing = false;
        sourceNode = null;
        hoveredNode = null;

        redrawOverlay();
    });

    redrawOverlay();
}

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

renderColorNGraph(board, colorNGraph.getGraph());
import { generatePrismixture } from "./prismixture-generator.js";
import { Color } from "./color.js";
import { ColorNGraph, ColorNode } from "./color-n-graph.js";

/**
 * Notes: 
 * only connect to endpoints
 * maintain list of lines
 * use n-tree model that is used by controller to render
 * try to do local updates instead of re-rendering everything
 */
const colors = Color.generatePartitionColors(4, Math.random);
const prismixture = generatePrismixture(4, 4, colors);
const colorNGraph = new ColorNGraph(prismixture);
console.log("color n graph", colorNGraph.getGraph());
const board = document.getElementById("board");

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

    // --- FIRST PASS: render cells + circles ---
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
            const boardRect = board.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;

            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);

            const nodes = graph[x][y];
            const n = nodes.length;

            const baseSize = 0.9;
            const size = baseSize / Math.sqrt(n);


            const sizePx = Math.min(rect.width, rect.height);

            canvas.width = sizePx * dpr;
            canvas.height = sizePx * dpr;
            ctx.scale(dpr, dpr);

            const cx = sizePx / 2;
            const cy = sizePx / 2;

            const paddingFactor = 0.85;
            const cellSize = sizePx;

            const baseRadius =
                (cellSize * (baseSize / Math.sqrt(n)) * 0.5) * paddingFactor;


            nodes.forEach((node, i) => {
                const c = node.getColor();

                const angle = (i / n) * Math.PI * 2;
                const offsetRadius = n === 1 ? 0 : baseRadius * 0.8;

                const px = cx + Math.cos(angle) * offsetRadius;
                const py = cy + Math.sin(angle) * offsetRadius;

                // 🔥 convert to GLOBAL board coordinates
                const globalX = rect.left - boardRect.left + px;
                const globalY = rect.top - boardRect.top + py;

                globalPositions.set(node, { x: globalX, y: globalY });

                ctx.beginPath();
                ctx.arc(px, py, baseRadius, 0, Math.PI * 2);
                ctx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
                ctx.fill();
            });
        }
    }

    // --- SECOND PASS: draw edges on overlay canvas ---
    const overlay = document.createElement("canvas");
    overlay.style.position = "absolute";
    overlay.style.left = "0";
    overlay.style.top = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.pointerEvents = "none";

    board.appendChild(overlay);

    const ctx = overlay.getContext("2d");
    const boardRect = board.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    overlay.width = boardRect.width * dpr;
    overlay.height = boardRect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.globalCompositeOperation = "source-over";
    ctx.lineWidth = 2;

    const drawn = new Set();

    // iterate entire graph
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            for (let node of graph[x][y]) {

                const from = globalPositions.get(node);
                if (!from) continue;

                const c = node.getColor();
                ctx.strokeStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;

                for (let target of node.connections) {

                    // prevent double drawing
                    const key = node < target ? node + "|" + target : target + "|" + node;
                    if (drawn.has(key)) continue;
                    drawn.add(key);

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
}

// Testing connections in graph. Corner must connect to one of the ones next to it at least.
colorNGraph.connect(colorNGraph.getGraph()[0][0][0], colorNGraph.getGraph()[1][0][0]);
colorNGraph.connect(colorNGraph.getGraph()[0][0][0], colorNGraph.getGraph()[0][1][0]);
colorNGraph.connect(colorNGraph.getGraph()[0][1][0], colorNGraph.getGraph()[0][2][0]);
colorNGraph.connect(colorNGraph.getGraph()[1][0][0], colorNGraph.getGraph()[2][0][0]);

renderColorNGraph(board, colorNGraph.getGraph());
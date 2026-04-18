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
    board.style.display = "grid";
    board.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
    board.style.gridTemplateRows = `repeat(${height}, 1fr)`;
    board.style.gap = "10px";

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {

            const cellEl = document.createElement("div");
            const nodes = graph[x][y]; // array of ColorNode

            // --- container setup ---
            cellEl.style.position = "relative";
            cellEl.style.width = "100%";
            cellEl.style.height = "100%";

            const n = nodes.length;

            // shrink factor when multiple nodes
            const size = n === 1 ? 0.9 : 0.6;

            nodes.forEach((node, i) => {
                const c = node.getColor();

                const circle = document.createElement("div");

                // --- base circle ---
                circle.style.position = "absolute";
                circle.style.width = `${size * 100}%`;
                circle.style.height = `${size * 100}%`;
                circle.style.borderRadius = "50%";

                circle.style.backgroundColor = `rgba(${c.r}, ${c.g}, ${c.b}, 0.7)`;

                // important for Venn-style blending
                circle.style.mixBlendMode = "multiply";

                // --- offset logic ---
                const angle = (i / n) * Math.PI * 2;
                const radius = n === 1 ? 0 : 10; // px offset

                const offsetX = Math.cos(angle) * radius;
                const offsetY = Math.sin(angle) * radius;

                circle.style.left = `calc(50% - ${size * 50}% + ${offsetX}px)`;
                circle.style.top  = `calc(50% - ${size * 50}% + ${offsetY}px)`;

                cellEl.appendChild(circle);
            });

            board.appendChild(cellEl);
        }
    }
}
renderColorNGraph(board, colorNGraph.getGraph());
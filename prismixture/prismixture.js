import { generatePrismixture } from "./prismixture-generator.js";
import { Color } from "./color.js";

const colors = Color.generatePartitionColors(4, Math.random);
const prismixture = generatePrismixture(4, 4, colors);
const board = document.getElementById("board");

function renderPrismixture(board, grid) {
    const width = grid.length;
    const height = grid[0].length;

    board.innerHTML = "";
    board.style.display = "grid";
    board.style.gridTemplateColumns = `repeat(${width}, minmax(0, 1fr))`;
    board.style.gridTemplateRows = `repeat(${height}, minmax(0, 1fr))`;
    board.style.gap = "10px";

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {

            const cell = document.createElement("div");

            const colors = grid[x][y]; // <-- now an array

            // --- recompute summed color ---
            let combined = new Color(0, 0, 0);
            for (let c of colors) {
                combined = combined.add(c);
            }

            const r = combined.r;
            const g = combined.g;
            const b = combined.b;

            cell.style.width = "100%";
            cell.style.height = "100%";
            cell.style.borderRadius = "50%";
            cell.style.backgroundColor = `rgba(${r}, ${g}, ${b}, 1)`;
            cell.style.border = "1px solid rgba(0, 0, 0, 0.6)";

            // --- center content ---
            cell.style.display = "flex";
            cell.style.alignItems = "center";
            cell.style.justifyContent = "center";

            // --- label colors ---
            const label = document.createElement("div");

            label.style.fontSize = "10px";
            label.style.color = "black";
            label.style.textAlign = "center";
            label.style.pointerEvents = "none";

            // simple label: show each color as (r,g,b)
            label.innerHTML = colors.map(c => {
                return `(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`;
            }).join("<br>");

            cell.appendChild(label);

            board.appendChild(cell);
        }
    }
}

renderPrismixture(board, prismixture);
import { generatePrismixture } from "./prismixture-generator.js";
import { Color } from "./color.js";

const colors = Color.generateBalancedDistinctColors(4);
const prismixture = generatePrismixture(4, 4, colors);
const board = document.getElementById("board");

function renderPrismixture(board, grid) {
    const width = grid.length;
    const height = grid[0].length;

    board.innerHTML = "";

    // --- CRITICAL FIX: give the grid real space ---
    board.style.display = "grid";
    board.style.width = "600px";
    board.style.height = "600px";

    board.style.gridTemplateColumns = `repeat(${width}, minmax(0, 1fr))`;
    board.style.gridTemplateRows = `repeat(${height}, minmax(0, 1fr))`;

    board.style.gap = "2px";

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {

            const cell = document.createElement("div");

            const { r, g, b, a } = grid[x][y].toSRGB();

            // --- ensure full cell usage ---
            cell.style.width = "100%";
            cell.style.height = "100%";

            // --- circle styling ---
            cell.style.borderRadius = "50%";
            cell.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
            cell.style.border = "1px solid rgba(0, 0, 0, 0.6)";

            // optional: makes circles visually cleaner
            cell.style.display = "flex";
            cell.style.alignItems = "center";
            cell.style.justifyContent = "center";

            board.appendChild(cell);
        }
    }
}

renderPrismixture(board, prismixture);
import { Color } from "./color.js";

export function generatePrismixture(width, height, colors) {
    const encode = (x, y) => x * height + y;

    const grid = Array.from({ length: width }, () =>
        Array.from({ length: height }, () => ({
            lines: new Set()
        }))
    );

    const dirs = [
        [1, 0], [-1, 0], [0, 1], [0, -1]
    ];

    const inBounds = (x, y) =>
        x >= 0 && y >= 0 && x < width && y < height;

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = (Math.random() * (i + 1)) | 0;
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    // --- create starting cells ---
    const allCells = [];
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            allCells.push([x, y]);
        }
    }

    for (let i = allCells.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [allCells[i], allCells[j]] = [allCells[j], allCells[i]];
    }

    const starts = allCells.slice(0, colors.length);

    const lines = [];

    let idx = 0;
    for (let [x, y] of starts) {
        const key = encode(x, y);

        const line = {
            id: idx,
            color: colors[idx],
            cells: [[x, y]],
            visited: new Set([key])
        };

        grid[x][y].lines.add(idx);
        lines.push(line);
        idx++;
    }

    // --- grow lines ---
    let attempts = 0;
    const maxAttempts = width * height * 50;

    while (!isFull(grid, width, height) && attempts < maxAttempts) {
        attempts++;

        for (let line of lines) {
            const [cx, cy] = line.cells[line.cells.length - 1];

            const options = shuffle(dirs)
                .map(([dx, dy]) => [cx + dx, cy + dy])
                .filter(([nx, ny]) => inBounds(nx, ny))
                .filter(([nx, ny]) => !line.visited.has(encode(nx, ny)));

            if (options.length === 0) continue;

            const [nx, ny] = options[0];
            const key = encode(nx, ny);

            line.cells.push([nx, ny]);
            line.visited.add(key);
            grid[nx][ny].lines.add(line.id);
        }
    }

    // --- ensure min length ---
    for (let line of lines) {
        if (line.cells.length < 2) {
            const [x, y] = line.cells[0];

            const neighbors = shuffle(dirs)
                .map(([dx, dy]) => [x + dx, y + dy])
                .filter(([nx, ny]) => inBounds(nx, ny));

            for (let [nx, ny] of neighbors) {
                const key = encode(nx, ny);

                if (!line.visited.has(key)) {
                    line.cells.push([nx, ny]);
                    line.visited.add(key);
                    grid[nx][ny].lines.add(line.id);
                    break;
                }
            }
        }
    }

    // --- fill uncovered cells ---
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            if (grid[x][y].lines.size === 0) {
                const line = lines[(Math.random() * colors.length) | 0];
                grid[x][y].lines.add(line.id);
            }
        }
    }

    // --- build output ---
    const output = Array.from({ length: width }, () =>
        Array.from({ length: height }, () => new Color(0, 0, 0))
    );

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            let color = new Color(0, 0, 0);

            for (let lineId of grid[x][y].lines) {
                color = color.add(lines[lineId].color);
            }

            output[x][y] = color;
        }
    }

    return output;
}

// --- helpers ---
function isFull(grid, width, height) {
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            if (grid[x][y].lines.size === 0) return false;
        }
    }
    return true;
}
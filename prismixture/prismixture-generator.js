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

    // --- spaced starting cells (farthest-point sampling) ---
    function pickSpacedStarts(width, height, count) {
        const starts = [];

        const dist2 = (a, b) => {
            const dx = a[0] - b[0];
            const dy = a[1] - b[1];
            return dx * dx + dy * dy;
        };

        // first point: center
        starts.push([
            Math.floor(width / 2),
            Math.floor(height / 2)
        ]);

        while (starts.length < count) {
            let bestCell = null;
            let bestScore = -1;

            for (let x = 0; x < width; x++) {
                for (let y = 0; y < height; y++) {
                    const candidate = [x, y];

                    let minDist = Infinity;
                    for (let s of starts) {
                        minDist = Math.min(minDist, dist2(candidate, s));
                    }

                    if (minDist > bestScore) {
                        bestScore = minDist;
                        bestCell = candidate;
                    }
                }
            }

            starts.push(bestCell);
        }

        return starts;
    }

    const starts = pickSpacedStarts(width, height, colors.length);

    // reserve starting cells so they are never reused
    const reserved = new Set(starts.map(([x, y]) => encode(x, y)));

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
                .filter(([nx, ny]) => {
                    const key = encode(nx, ny);

                    // don't revisit own cells
                    if (line.visited.has(key)) return false;

                    // don't invade reserved starting cells (except own)
                    if (reserved.has(key) && !line.visited.has(key)) return false;

                    return true;
                });

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

                if (!line.visited.has(key) && !reserved.has(key)) {
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

    // --- build output (array of colors per cell) ---
    const output = Array.from({ length: width }, () =>
        Array.from({ length: height }, () => [])
    );

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const colorsHere = [];
            const usedColors = new Set();  

            for (let lineId of grid[x][y].lines) {
                let usedColor = lines[lineId].color;
                colorsHere.push(usedColor);
                if (usedColors.has(usedColor)) {
                    console.warn("Duplicate color in cell:", usedColor);
                }
                usedColors.add(usedColor);
            }

            output[x][y] = colorsHere;
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
import { random } from '../utility/random/random.js';

export function generateTiles(grid, seedString) {
    const H = grid.length;
    const W = grid[0].length;

    const MIN = Math.min(H, W);
    const MAX = Math.max(H, W);

    const used = Array.from({ length: H }, () => Array(W).fill(false));
    const tiles = [];

    const dirs = [
        [1, 0], [-1, 0], [0, 1], [0, -1]
    ];

    function inBounds(r, c) {
        return r >= 0 && r < H && c >= 0 && c < W;
    }

    function shuffled(arr) {
        return arr
            .map(v => [random(seedString), v])
            .sort((a, b) => a[0] - b[0])
            .map(v => v[1]);
    }

    function findFirstUnused() {
        const cells = [];
        for (let r = 0; r < H; r++) {
            for (let c = 0; c < W; c++) {
                if (!used[r][c]) cells.push({ r, c });
            }
        }
        // Avoid top-left bias
        return cells.length
            ? cells[Math.floor(random(seedString) * cells.length)]
            : null;
    }

    function canExtendBounds(minR, maxR, minC, maxC) {
        if (maxR - minR + 1 === H) return false;
        if (maxC - minC + 1 === W) return false;
        return true;
    }

    /**
     * Generate all contiguous polyominoes of given size
     * starting from seed cell.
     */
    function generateShapes(seed, targetSize) {
        const results = [];

        function dfs(cells, frontier, minR, maxR, minC, maxC) {
            if (cells.length === targetSize) {
                results.push([...cells]);
                return;
            }

            for (const idx in frontier) {
                const cell = frontier[idx];

                for (const [dr, dc] of dirs) {
                    const nr = cell.r + dr;
                    const nc = cell.c + dc;

                    if (
                        !inBounds(nr, nc) ||
                        used[nr][nc] ||
                        cells.some(c => c.r === nr && c.c === nc)
                    ) continue;

                    const nextMinR = Math.min(minR, nr);
                    const nextMaxR = Math.max(maxR, nr);
                    const nextMinC = Math.min(minC, nc);
                    const nextMaxC = Math.max(maxC, nc);

                    if (!canExtendBounds(
                        nextMinR, nextMaxR,
                        nextMinC, nextMaxC
                    )) continue;

                    dfs(
                        [...cells, { r: nr, c: nc }],
                        [...frontier, { r: nr, c: nc }],
                        nextMinR, nextMaxR,
                        nextMinC, nextMaxC
                    );
                }
            }
        }

        dfs(
            [seed],
            [seed],
            seed.r, seed.r,
            seed.c, seed.c
        );

        return results;
    }

    function backtrack() {
        const seed = findFirstUnused();
        if (!seed) return true; // success

        for (let size = MIN; size <= MAX; size++) {
            const shapes = generateShapes(seed, size);

            for (const shape of shuffled(shapes)) {
                // Commit
                shape.forEach(({ r, c }) => used[r][c] = true);

                tiles.push({
                    id: tiles.length + 1,
                    cells: shape.map(({ r, c }) => ({
                        r,
                        c,
                        letter: grid[r][c]
                    }))
                });

                if (backtrack()) return true;

                // Undo
                tiles.pop();
                shape.forEach(({ r, c }) => used[r][c] = false);
            }
        }

        return false;
    }

    if (!backtrack()) {
        throw new Error("No valid tiling exists under given constraints.");
    }

    return tiles;
}

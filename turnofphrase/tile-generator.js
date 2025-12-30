import { random } from '../utility/random/random.js';

export function generateTiles(grid, seedString) {
    const H = grid.length;
    const W = grid[0].length;

    const MAX = Math.max(H, W);

    const dirs = [
        [1, 0], [-1, 0], [0, 1], [0, -1]
    ];

    function inGrid(r, c) {
        return r >= 0 && r < H && c >= 0 && c < W && grid[r][c] != null;
    }

    function shuffled(arr) {
        return arr
            .map(v => [random(seedString), v])
            .sort((a, b) => a[0] - b[0])
            .map(v => v[1]);
    }

    function manhattan(r1, c1, r2, c2) {
        return Math.abs(r2 - r1) + Math.abs(c2 - c1);
    }

    /* -------------------------------------------------- */
    /* Grid state                                         */
    /* -------------------------------------------------- */

    const used = Array.from({ length: H }, () => Array(W).fill(false));
    const tileAt = Array.from({ length: H }, () => Array(W).fill(null));

    const allCells = [];
    for (let r = 0; r < H; r++) {
        for (let c = 0; c < W; c++) {
            if (grid[r][c] != null) {
                allCells.push({ row: r, col: c, letter: grid[r][c] });
            }
        }
    }

    /* -------------------------------------------------- */
    /* Pick starting cells                                */
    /* -------------------------------------------------- */

    let startingCells = new Set();
    let cellsArray = [...allCells];
    const numStartingTiles = Math.min(W,H);
    for (let i = 0; i < numStartingTiles && cellsArray.length > 0; i++) {
        let candidates = new Set();
        for (let j = 0; j <= i && cellsArray.length > 0; j++) {
            const c = cellsArray[Math.floor(random(seedString) * cellsArray.length)];
            candidates.add(c);
        }

        let best = candidates.values().next().value;
        let bestDist = -1;

        for (const cand of candidates) {
            let minDist = Infinity;
            for (const s of startingCells) {
                minDist = Math.min(
                    minDist,
                    manhattan(cand.row, cand.col, s.row, s.col)
                );
            }
            if (minDist > bestDist) {
                bestDist = minDist;
                best = cand;
            }
        }

        startingCells.add(best);
        cellsArray = cellsArray.filter(c => c !== best);
    }

    /* -------------------------------------------------- */
    /* Create tiles                                       */
    /* -------------------------------------------------- */

    const tiles = [];
    let nextTileID = 0;

    for (const cell of startingCells) {
        const tile = {
            id: nextTileID++,
            cells: [cell],
            boundary: new Set([cell])
        };
        tiles.push(tile);

        used[cell.row][cell.col] = true;
        tileAt[cell.row][cell.col] = tile;
    }

    /* -------------------------------------------------- */
    /* Region detection                                   */
    /* -------------------------------------------------- */

    function findRegions() {
        const visited = Array.from({ length: H }, () => Array(W).fill(false));
        const regions = [];

        function dfs(r, c, acc) {
            visited[r][c] = true;
            acc.push({ row: r, col: c });

            for (const [dr, dc] of dirs) {
                const nr = r + dr, nc = c + dc;
                if (inGrid(nr, nc) && !used[nr][nc] && !visited[nr][nc]) {
                    dfs(nr, nc, acc);
                }
            }
        }

        for (let r = 0; r < H; r++) {
            for (let c = 0; c < W; c++) {
                if (inGrid(r, c) && !used[r][c] && !visited[r][c]) {
                    const region = [];
                    dfs(r, c, region);
                    regions.push(region);
                }
            }
        }

        return regions;
    }

    function borderingTiles(r, c) {
        const set = new Set();
        for (const [dr, dc] of dirs) {
            const nr = r + dr, nc = c + dc;
            if (inGrid(nr, nc) && used[nr][nc]) {
                set.add(tileAt[nr][nc]);
            }
        }
        return set;
    }

    /* -------------------------------------------------- */
    /* Expansion safety                                   */
    /* -------------------------------------------------- */

    function canClaimCell(tile, cell) {
        const neighbors = borderingTiles(cell.row, cell.col);

        // HARD GUARANTEE:
        // If only one tile borders this cell, it must be allowed
        if (neighbors.size === 1 && neighbors.has(tile)) {
            return true;
        }

        const before = findRegions();

        used[cell.row][cell.col] = true;
        tileAt[cell.row][cell.col] = tile;

        const after = findRegions();

        used[cell.row][cell.col] = false;
        tileAt[cell.row][cell.col] = null;

        if (after.length > before.length) return false;

        return true;
    }

    /* -------------------------------------------------- */
    /* Tile growth                                        */
    /* -------------------------------------------------- */

    function expandTile(tile) {
        const boundary = shuffled([...tile.boundary]);

        for (const b of boundary) {
            for (const [dr, dc] of dirs) {
                const r = b.row + dr;
                const c = b.col + dc;

                if (!inGrid(r, c) || used[r][c]) continue;

                const cell = {
                    row: r,
                    col: c,
                    letter: grid[r][c]
                };

                if (!canClaimCell(tile, cell)) continue;

                tile.cells.push(cell);
                tile.boundary.add(cell);
                used[r][c] = true;
                tileAt[r][c] = tile;

                return true;
            }
        }
        return false;
    }

    /* -------------------------------------------------- */
    /* Round-robin expansion                              */
    /* -------------------------------------------------- */

    let expandable = tiles.filter(t => t.cells.length < MAX);
    let changed = true;

    while (changed && expandable.length) {
        changed = false;
        const next = [];

        for (const tile of expandable) {
            if (expandTile(tile)) {
                next.push(tile);
                changed = true;
            }
        }

        expandable = next;
    }

    return tiles;
}

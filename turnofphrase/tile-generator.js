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
    let remainingCells = new Set(allCells);

    const numStartingTiles = Math.floor(H*W / 5);

    // 4-way neighbors, respecting holes
    function getNeighbors(cell) {
        const dirs = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
        ];

        const result = [];
        for (const [dr, dc] of dirs) {
            const r = cell.row + dr;
            const c = cell.col + dc;
            if (inGrid(r, c)) {
                result.push({ row: r, col: c });
            }
        }
        return result;
    }

    // pick initial source randomly
    {
        const arr = [...remainingCells];
        const first = arr[Math.floor(random(seedString) * arr.length)];
        startingCells.add(first);
        remainingCells.delete(first);
    }

    for (let i = 1; i < numStartingTiles && remainingCells.size > 0; i++) {

        // multi-source BFS
        const queue = [];
        const dist = new Map();

        for (const s of startingCells) {
            const key = `${s.row},${s.col}`;
            dist.set(key, 0);
            queue.push(s);
        }

        while (queue.length > 0) {
            const cur = queue.shift();
            const curKey = `${cur.row},${cur.col}`;
            const curDist = dist.get(curKey);

            for (const n of getNeighbors(cur)) {
                const nKey = `${n.row},${n.col}`;
                if (!dist.has(nKey)) {
                    dist.set(nKey, curDist + 1);
                    queue.push(n);
                }
            }
        }

        // choose farthest remaining valid cell
        let best = null;
        let bestDist = -1;

        for (const c of remainingCells) {
            if (!inGrid(c.row, c.col)) continue;

            const d = dist.get(`${c.row},${c.col}`);
            if (d !== undefined && d > bestDist) {
                bestDist = d;
                best = c;
            }
        }

        if (!best) break;

        startingCells.add(best);
        remainingCells.delete(best);
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

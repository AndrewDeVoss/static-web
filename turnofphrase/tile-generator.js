export function generateTiles(grid) {
    const H = grid.length;
    const W = grid[0].length;

    const dirs = [
        [1,0], [-1,0], [0,1], [0,-1]
    ];
    const used = Array.from({length:H}, ()=>Array(W).fill(false));

    const tiles = [];
    let tileId = 1;

    function neighbors(r,c) {
        return dirs
            .map(([dr,dc]) => [r+dr, c+dc])
            .filter(([nr,nc]) =>
                nr>=0 && nr<H && nc>=0 && nc<W && !used[nr][nc]
            );
    }

    for (let r=0; r<H; r++) {
        for (let c=0; c<W; c++) {
            if (used[r][c]) continue;

            // Start a new tile
            let tileCells = [{r, c}];
            used[r][c] = true;

            // Target size: mostly 4
            // But if we are near the end, allow flexible sizes
            let remaining = countRemaining(used);
            let targetSize = 4;
            if (remaining <= 5) targetSize = remaining; // final piece

            while (tileCells.length < targetSize) {
                let frontier = tileCells.flatMap(cell => neighbors(cell.r, cell.c));
                if (frontier.length === 0) break; // cannot grow
                let [nr, nc] = frontier[Math.floor(Math.random()*frontier.length)];
                used[nr][nc] = true;
                tileCells.push({r:nr, c:nc});
            }

            // Build final tile object
            tiles.push({
                id: tileId++,
                cells: tileCells.map(({r,c}) => ({ r, c, letter: grid[r][c] }))
            });
        }
    }

    return tiles;

    function countRemaining(used) {
        let count = 0;
        for (let r=0; r<H; r++)
            for (let c=0; c<W; c++)
                if (!used[r][c]) count++;
        return count;
    }
}

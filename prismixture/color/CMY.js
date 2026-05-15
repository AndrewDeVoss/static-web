export class CMY {

    constructor(c, m, y) {
        this.c = Math.max(0, c);
        this.m = Math.max(0, m);
        this.y = Math.max(0, y);
    }

    combine(other) {
        // In CMY, "combining" colors means subtracting their values (since it's a subtractive model)
        return new CMY(
            Math.max(0, this.c - other.c),
            Math.max(0, this.m - other.m),
            Math.max(0, this.y - other.y),
        );
    }

    remove(other) {
        // In CMY, "removing" a color means adding it back (since it's a subtractive model)
        return new CMY(
            Math.min(255, this.c + other.c),
            Math.min(255, this.m + other.m),
            Math.min(255, this.y + other.y),
        );
    }

    isSubset(other) {
        return (
            this.c >= other.c &&
            this.m >= other.m &&
            this.y >= other.y
        );
    }
    
    toRGB() {
        return [255-this.c, 255-this.m, 255-this.y];
    }

    isMatch(other) {
        return (
            this.c === other.c &&
            this.m === other.m &&
            this.y === other.y
        );
    }

static generatePartitionColors(numColors, seed) {
    const sum = CMY.generateSum(seed);

    // ---- helper: random partition ----
    function randomPartition(total, n) {
        const cuts = Array.from({ length: n - 1 }, () => Math.random());
        cuts.sort((a, b) => a - b);

        const parts = [];
        let prev = 0;

        for (let i = 0; i < n - 1; i++) {
            parts.push((cuts[i] - prev) * total);
            prev = cuts[i];
        }

        parts.push((1 - prev) * total);
        return parts;
    }

    // ---- ordering helpers ----
    function order(arr, increasing) {
        return [...arr].sort((a, b) => increasing ? a - b : b - a);
    }

    function shuffle(arr) {
        return arr
            .map(v => ({ v, r: Math.random() }))
            .sort((a, b) => a.r - b.r)
            .map(x => x.v);
    }

    // ---- floor + sum correction ----
    function floorFix(values, total) {
        const floored = values.map(v => Math.floor(v));
        let diff = total - floored.reduce((a, b) => a + b, 0);

        const fracOrder = values
            .map((v, i) => ({ i, f: v - floored[i] }))
            .sort((a, b) => b.f - a.f);

        for (let k = 0; k < diff; k++) {
            floored[fracOrder[k % fracOrder.length].i]++;
        }

        return floored;
    }

    // ---- determine channel roles ----
    const channels = ["c", "m", "y"];

    const maxChannel = channels.reduce((a, c) =>
        sum[c] > sum[a] ? c : a
    , "c");

    const rest = channels.filter(c => c !== maxChannel);

    const minChannel = rest.reduce((a, c) =>
        sum[c] < sum[a] ? c : a
    );

    const midChannel = rest.find(c => c !== minChannel);

    // ---- generate float partitions ----
    let c = randomPartition(sum.c, numColors);
    let m = randomPartition(sum.m, numColors);
    let y = randomPartition(sum.y, numColors);

    const map = { c, m, y };

    // ---- NEW ORDERING RULE ----
    map[maxChannel] = shuffle(map[maxChannel]);              // random (was increasing)
    map[minChannel] = order(map[minChannel], true);          // increasing (swapped in)
    map[midChannel] = order(map[midChannel], false);         // decreasing

    // ---- floor + repair sums ----
    const cInt = floorFix(map.c, sum.c);
    const mInt = floorFix(map.m, sum.m);
    const yInt = floorFix(map.y, sum.y);

    // ---- assemble final colors ----
    const colors = [];

    for (let i = 0; i < numColors; i++) {
        colors.push({
            c: cInt[i],
            m: mInt[i],
            y: yInt[i]
        });
    }

    return colors;
}

    static generateSum(seed = Math.random) {
        function randRange(min, max) {
            return Math.floor(min + seed() * (max - min + 1));
        }

        // your 3 intensity bands
        const bands = [
            randRange(100, 255),
            randRange(150, 255),
            randRange(200, 255)
        ];

        // shuffle across C, M, Y
        for (let i = bands.length - 1; i > 0; i--) {
            const j = Math.floor(seed() * (i + 1));
            [bands[i], bands[j]] = [bands[j], bands[i]];
        }

        return {
            c: bands[0],
            m: bands[1],
            y: bands[2]
        };
    }

    // -------------------------------------------------
    // HELPERS
    // -------------------------------------------------

    static #chromaScore(c) {
        const avg = (c.c + c.m + c.y) / 3;
        return (
            Math.abs(c.c - avg) +
            Math.abs(c.m - avg) +
            Math.abs(c.y - avg)
        );
    }
}
export class Color {
    // -------------------------------------------------
    // LINEAR RGB STORAGE
    // -------------------------------------------------

    constructor(r, g, b) {
        this.r = Math.max(0, r);
        this.g = Math.max(0, g);
        this.b = Math.max(0, b);
    }

    // -------------------------------------------------
    // PHYSICAL LIGHT MATH (LINEAR RGB)
    // -------------------------------------------------

    add(other) {
        return new Color(
            this.r + other.r,
            this.g + other.g,
            this.b + other.b,
        );
    }

    subtract(other) {
        return new Color(
            Math.max(0, this.r - other.r),
            Math.max(0, this.g - other.g),
            Math.max(0, this.b - other.b),
        );
    }

    isRGBSubset(other) {
        return (
            this.r <= other.r &&
            this.g <= other.g &&
            this.b <= other.b
        );
    }

    isMatch(other) {
        return (
            this.r === other.r &&
            this.g === other.g &&
            this.b === other.b
        );
    }

static generatePartitionColors(numColors, seed) {
    const rgbSum = Color.generateRGBSum(seed);

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
    const channels = ["r", "g", "b"];

    const maxChannel = channels.reduce((a, c) =>
        rgbSum[c] > rgbSum[a] ? c : a
    , "r");

    const rest = channels.filter(c => c !== maxChannel);

    const minChannel = rest.reduce((a, c) =>
        rgbSum[c] < rgbSum[a] ? c : a
    );

    const midChannel = rest.find(c => c !== minChannel);

    // ---- generate float partitions ----
    let r = randomPartition(rgbSum.r, numColors);
    let g = randomPartition(rgbSum.g, numColors);
    let b = randomPartition(rgbSum.b, numColors);

    const map = { r, g, b };

    // ---- NEW ORDERING RULE ----
    map[maxChannel] = shuffle(map[maxChannel]);              // random (was increasing)
    map[minChannel] = order(map[minChannel], true);          // increasing (swapped in)
    map[midChannel] = order(map[midChannel], false);         // decreasing

    // ---- floor + repair sums ----
    const rInt = floorFix(map.r, rgbSum.r);
    const gInt = floorFix(map.g, rgbSum.g);
    const bInt = floorFix(map.b, rgbSum.b);

    // ---- assemble final colors ----
    const colors = [];

    for (let i = 0; i < numColors; i++) {
        colors.push({
            r: rInt[i],
            g: gInt[i],
            b: bInt[i]
        });
    }

    return colors;
}

    static generateRGBSum(seed = Math.random) {
        function randRange(min, max) {
            return Math.floor(min + seed() * (max - min + 1));
        }

        // your 3 intensity bands
        const bands = [
            randRange(100, 255),
            randRange(150, 255),
            randRange(200, 255)
        ];

        // shuffle across R, G, B
        for (let i = bands.length - 1; i > 0; i--) {
            const j = Math.floor(seed() * (i + 1));
            [bands[i], bands[j]] = [bands[j], bands[i]];
        }

        return {
            r: bands[0],
            g: bands[1],
            b: bands[2]
        };
    }

    // -------------------------------------------------
    // HELPERS
    // -------------------------------------------------

    static #chromaScore(c) {
        const avg = (c.r + c.g + c.b) / 3;
        return (
            Math.abs(c.r - avg) +
            Math.abs(c.g - avg) +
            Math.abs(c.b - avg)
        );
    }
}
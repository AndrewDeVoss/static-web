import { random, createSeed } from '../utility/random/random.js';

let seedString = createSeed('elephants rock '+Date.now()); // TODO pass in?

export function pickColors(numColors) {
    chosenColors = [];
    const colors = [];
    for (let i = 0; i < numColors; i++) {
        const color = randomLowOpacityColor(.4);
        colors.push(color);
    }
    return colors;
}

let chosenColors = [];
function randomLowOpacityColor(alpha = 0.25, candidates = 9) {
    // First color: no comparison needed
    if (chosenColors.length === 0) {
        const first = generateRandomHSL(alpha);
        chosenColors.push(first);
        return `hsla(${first.h}, ${first.s}%, ${first.l}%, ${first.a})`;
    }

    let bestCandidate = null;
    let bestScore = -Infinity;

    for (let i = 0; i < candidates; i++) {
        const candidate = generateRandomHSL(alpha);

        // Find distance to closest existing color
        let minDist = Infinity;
        for (const used of chosenColors) {
            const d = hslDistance(candidate, used);
            if (d < minDist) minDist = d;
        }

        // Maximize the minimum distance
        if (minDist > bestScore) {
            bestScore = minDist;
            bestCandidate = candidate;
        }
    }

    chosenColors.push(bestCandidate);

    return `hsla(${bestCandidate.h}, ${bestCandidate.s}%, ${bestCandidate.l}%, ${bestCandidate.a})`;
}


function generateRandomHSL(alpha) {
    return {
        h: random(seedString) * 360,
        s: 60 + random(seedString) * 40, // 60–100%
        l: 40 + random(seedString) * 20, // 40–60%
        a: alpha
    };
}

function hslDistance(a, b) {
    const dh = Math.min(
        Math.abs(a.h - b.h),
        360 - Math.abs(a.h - b.h)
    ) / 180; // normalize

    const ds = Math.abs(a.s - b.s) / 100;
    const dl = Math.abs(a.l - b.l) / 100;

    // Weighted Euclidean distance
    return Math.sqrt(
        dh * dh * 2 + // hue matters most
        ds * ds +
        dl * dl
    );
}
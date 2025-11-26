// Map: seedString -> RNG state
const generators = new Map();

// Hash a string into a 32-bit unsigned int
function seedFromString(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    }
    return h >>> 0;
}

// Make a generator object (stateful)
function createGenerator(seed) {
    let state = seed;

    return function nextRandom() {
        // LCG (Numerical Recipes)
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}

// Main exported function
export function random(seedString) {
    if (!generators.has(seedString)) {
        console.log('error in random!!');
        return Math.random();
    }

    return generators.get(seedString)();
}

export function createSeed(seedString) {
    const seed = seedFromString(seedString);
    generators.set(seedString, createGenerator(seed));
}

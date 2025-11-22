import { ClassicScorer } from './classic-scorer.js';
import { AbstractScorer } from '../abstract-scorer.js'; 

const scorer = new ClassicScorer();

self.onmessage = async (e) => {
    if (e.data.type === 'compute-scores') {
        const letters = e.data.letters;

        const gold   = scorer.getGreedyScore(letters);
        const opal   = scorer.getOptimalScore(letters);
        const silver = Math.floor(gold * 2 / 3);
        const bronze = Math.floor(gold * 1 / 3);

        postMessage({ opal, gold, silver, bronze });
    }
};

self.onerror = function(e) {
    console.error("ERROR INSIDE WORKER:", e.message, "at", e.filename, ":", e.lineno);
};
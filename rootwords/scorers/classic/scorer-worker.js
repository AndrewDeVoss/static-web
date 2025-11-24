import { ClassicScorer } from './classic-scorer.js';
import { AbstractScorer } from '../abstract-scorer.js';
import { getValidWordsFromLetters } from '../../../utility/isword/isword.js';
import { 
    loadDictionary,
    loadForbiddenWords,
    loadSuitable5And6
} from '../../../utility/isword/isword.js';

// Preload dictionary in the worker
let dictionaryReady = (async () => {
    await loadDictionary();
    await loadForbiddenWords();
    await loadSuitable5And6();
})();

const scorer = new ClassicScorer();

self.onmessage = async (e) => {
    await dictionaryReady;
    
    if (e.data.type === "compute-scores") {
        const letters = e.data.letters;

        const greedyResult = scorer.computeGreedyResult(letters);
        const optimalResult = scorer.computeOptimalResult(letters);

        postMessage({ greedyResult, optimalResult });
    }
};

self.onerror = function (e) {
    console.error("ERROR INSIDE WORKER:", e.message, "at", e.filename, ":", e.lineno);
};
import { TreeNode } from "../../word-tree.js";
import { getValidWordsFromLetters } from '../../../utility/isword/isword.js';
import { AbstractScorer } from "../abstract-scorer.js";

export class ClassicScorer extends AbstractScorer {
    constructor() {
        super();
    }

    /**
     * opal - optimal score
     * gold - greedy score
     * silver - greedy score * 2/3
     * bronze - breedy score * 1/3
     * @param {string} letters 
     */
    async getScoringTargets(letters) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(
                new URL('./scorer-worker.js', import.meta.url),
                { type: 'module' }
            );

            worker.onmessage = (e) => {
                resolve(e.data);
                worker.terminate();
            };

            worker.onerror = (err) => {
                console.error("ERROR INSIDE WORKER:", err.message, "at", err.filename, ":", err.lineno);
                reject(err);
                worker.terminate();
            };

            worker.postMessage({ type: 'compute-scores', letters });
        });
    }

    /**
     * one point per letter in all created words
     * @param {TreeNode} rootNode 
     */
    scoreTree(rootNode) {
        throw new Error("score tree not implemented")
    }

    getTodayString() {
        const today = new Date();
        return today.toISOString().split('T')[0]; // 'YYYY-MM-DD'
    }

    getCookie(name) {
        const cookieString = document.cookie
            .split('; ')
            .find(row => row.startsWith(encodeURIComponent(name) + '='));

        return cookieString ? decodeURIComponent(cookieString.split('=')[1]) : null;
    }

    getGreedyScore(letters, cookie = 'greedy-score') {
        // Check if cached
        const todayKey = `${cookie}-${this.getTodayString()}`;
        const cached = this.getCookie(todayKey);
        if (cached) {
            try {
                const cachedResult = JSON.parse(cached);
                if (!cachedResult.letters) {
                    throw new Error("No letters in cached greedy score");
                }
                if (cachedResult.letters !== letters) {
                    throw new Error("Letter mismatch");
                }
                let score = cachedResult.score;
                return score;
            } catch (err) {
                console.warn("Failed to parse cached greedy score from cookie:", err);
            }
        }

        // Not cached: compute, cache, return
        const result = this.computeGreedyResult(letters);
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        document.cookie = `${encodeURIComponent(todayKey)}=${encodeURIComponent(JSON.stringify(result))}; expires=${midnight.toUTCString()}; path=/`;
        return result.score;
    }

    computeGreedyResult() {
        const usedGreedyWords = new Set();
        let score = 0;
        const initialDictionary = getValidWordsFromLetters(letters);

        function recurse(currentLetters) {
            let validWords = getValidWordsFromLetters(currentLetters, initialDictionary);
            validWords = new Set([...validWords].filter(w => !usedGreedyWords.has(w)));
            if (validWords.size === 0) return;

            const sortedWords = [...validWords].sort((a, b) => {
                // Primary sort: descending length
                const lengthDiff = b.length - a.length;
                if (lengthDiff !== 0) return lengthDiff;

                // Tie-break: alphabetical order
                return a.localeCompare(b);
            });

            const bestWord = sortedWords[0];
            if (!bestWord) return;

            usedGreedyWords.add(bestWord);
            score += bestWord.length;

            const usedLetters = bestWord.split('');
            const allLetters = currentLetters.split('');
            const remainingLetters = [...allLetters];

            for (const ch of usedLetters) {
                const index = remainingLetters.indexOf(ch);
                if (index !== -1) remainingLetters.splice(index, 1);
            }

            recurse(bestWord);
            recurse(remainingLetters.join(''));
        }

        recurse(letters.toLowerCase());

        const resultToCache = {
            score,
            letters,
            words: [...usedGreedyWords],
        };

        return resultToCache;
    }

    getOptimalScore(letters, cookie = 'optimal-score') {
        // Check if cached
        const todayKey = `${cookie}-${this.getTodayString()}`;
        const cached = this.getCookie(todayKey);
        if (cached) {
            try {
                const cachedResult = JSON.parse(cached);
                if (!cachedResult.letters) {
                    throw new Error("No letters in cached greedy score");
                }
                if (cachedResult.letters !== letters) {
                    throw new Error("Letter mismatch");
                }
                let score = cachedResult.score;
                return score;
            } catch (err) {
                console.warn("Failed to parse cached greedy score from cookie:", err);
            }
        }

        // Not cached: compute, cache, return
        const result = this.computeOptimalResult(letters);
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        document.cookie = `${encodeURIComponent(todayKey)}=${encodeURIComponent(JSON.stringify(result))}; expires=${midnight.toUTCString()}; path=/`;
        return result.score;
    }

    computeOptimalResult(letters, cookie = "optimal-score") {
        // ---------------------------
        // Utility: alphabetize letters
        // ---------------------------
        function normalizeLetters(s) {
            return s.split("").sort().join("");
        }

        // ---------------------------
        // Utility: remove letters in word w from letter set L
        // ---------------------------
        function subtractLetters(L, w) {
            const arr = L.split("");
            for (const c of w) {
                const idx = arr.indexOf(c);
                if (idx >= 0) arr.splice(idx, 1);
            }
            return arr.sort().join("");
        }

        // ---------------------------
        // Utility: check if all letters in word w are also in letterset L
        // ---------------------------
        function wordIsSubset(w, L) {
            const freq = Object.create(null);
            for (const c of L) freq[c] = (freq[c] || 0) + 1;
            for (const c of w) {
                if (!freq[c]) return false;
                freq[c]--;
            }
            return true;
        }

        const normalizedRootLetters = normalizeLetters(letters.toLowerCase());

        // ---------------------------
        // Build dictionary structures
        // ---------------------------
        const allValidWords = [...getValidWordsFromLetters(normalizedRootLetters)].filter(w => /^[A-Za-z0-9]+$/.test(w));   // only alphanumeric words

        const anagramKeyToWords = new Map();
        const anagramKeyToIntID = new Map();
        const intIDtoAnagramKey = new Map(); // Used for reconstruction
        let ID = 0;
        const allAnagramKeys = [];

        for (const word of allValidWords) {
            const anagramKey = normalizeLetters(word);

            // First time seeing this key
            if (!anagramKeyToWords.has(anagramKey)) {
                anagramKeyToWords.set(anagramKey, []);
                allAnagramKeys.push(anagramKey);
                anagramKeyToIntID.set(anagramKey, ID);
                intIDtoAnagramKey.set(ID, anagramKey);
                ID++;
            }

            // Associate word with others of the same letters
            anagramKeyToWords.get(anagramKey).push(word);
        }

        // ---------------------------
        // Optimal DP
        // ---------------------------
        function OPT(normalizedLetters, usedAnagramKeys, anagramKeysAvailableFromParent) {
            // Second recursion stopping condition: there is no possible subtree from this state
            // TODO receive already pruned?
            let anagramKeysAvailableWithTheseLetters = [];
            for (const possibleLeftAnagramKey of anagramKeysAvailableFromParent) {
                if (!usedAnagramKeys.has(possibleLeftAnagramKey) && wordIsSubset(possibleLeftAnagramKey, normalizedLetters)) {
                    anagramKeysAvailableWithTheseLetters.push(possibleLeftAnagramKey);
                }
            }
            if (anagramKeysAvailableWithTheseLetters.length === 0 || normalizedLetters === "") {
                const leafResult = {
                    score: 0,
                    key: null,
                    anagramKeys: new Set(usedAnagramKeys)
                };

                return leafResult;
            }

            // If here, this is a brand new state and there are possible subtrees
            let bestScore = 0;
            let bestKey = null;
            let bestAnagramKeys = null;
            for (const leftAnagramKey of anagramKeysAvailableWithTheseLetters) {
                // Left represents the word we select + score that can be made with letters in the selected word
                const leftNormalizedLetters = leftAnagramKey;

                // Right represents score that can be made with letters not in the selected word
                const rightNormalizedLetters = normalizeLetters(subtractLetters(normalizedLetters, leftNormalizedLetters));

                const usedAnagramKeysCOPY = new Set(usedAnagramKeys);
                usedAnagramKeysCOPY.add(leftNormalizedLetters);

                const nextAnagramKeysAvailableFromParent = anagramKeysAvailableWithTheseLetters.slice();
                const indexOfKey = nextAnagramKeysAvailableFromParent.indexOf(leftAnagramKey);
                nextAnagramKeysAvailableFromParent.splice(indexOfKey, 1);
                let possibleLeftAnagramKeys = [];
                for (const possibleLeftAnagramKey of nextAnagramKeysAvailableFromParent) {
                    if (!usedAnagramKeysCOPY.has(possibleLeftAnagramKey) && wordIsSubset(possibleLeftAnagramKey, leftAnagramKey)) {
                        possibleLeftAnagramKeys.push(possibleLeftAnagramKey);
                    }
                }
                const leftResult = OPT(leftNormalizedLetters, usedAnagramKeysCOPY, possibleLeftAnagramKeys);

                // Right represents score that can be made with letters not in the selected word
                let possibleRightAnagramKeys = [];
                const leftAnagramKeysCOPY = new Set(leftResult.anagramKeys);
                for (const rightAnagramKey of nextAnagramKeysAvailableFromParent) {
                    if (!leftAnagramKeysCOPY.has(rightAnagramKey) && wordIsSubset(rightAnagramKey, rightNormalizedLetters)) {
                        possibleRightAnagramKeys.push(rightAnagramKey);
                    }
                }
                const rightResult = OPT(rightNormalizedLetters, leftAnagramKeysCOPY, possibleRightAnagramKeys);

                let scoreForCurrentWord = leftAnagramKey.length * anagramKeyToWords.get(leftAnagramKey).length;
                const score = scoreForCurrentWord + leftResult.score + rightResult.score;

                if (score > bestScore) {
                    bestScore = score;
                    bestKey = leftAnagramKey;

                    const allUsedAnagramKeys = new Set(leftResult.anagramKeys);
                    for (const anagramKey of rightResult.anagramKeys) {
                        allUsedAnagramKeys.add(anagramKey);
                    }

                    bestAnagramKeys = new Set(allUsedAnagramKeys);
                }
            }

            const result = {
                score: bestScore,
                key: bestKey,
                anagramKeys: new Set(bestAnagramKeys)
            };

            return result;
        }

        // ---------------------------
        // Compute final score + tree
        // ---------------------------
        const { score, key, anagramKeys } = OPT(normalizedRootLetters, new Set(), allAnagramKeys);

        for (let usedAnagramKey of anagramKeys) {
            console.log(`used ${usedAnagramKey} for ${anagramKeyToWords.get(usedAnagramKey)}`);
        }
        return { score };
    }
}
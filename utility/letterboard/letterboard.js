export class LetterBoard extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({ mode: 'open' });
        this.letters = 'XOXOXOXOXOXO'
        this.letterDivs = [];
        this._ready = new Promise(resolve => {
            this._resolveReady = resolve;
        })
        if (new.target === LetterBoard) {
            throw new TypeError("Cannot instantiate LetterBoard directly");
        }
    }

    connectedCallback() {
        throw new Error("Method 'connectedCallback()' must be implemented.");
    }

    setLetters(letters) {
        this.letters = [...letters];

        // Defer layout if letterContainer isn't ready yet
        if (this.letterContainer) {
            this.layoutLetters();
        } else {
            // Wait for the browser to connect the element
            requestAnimationFrame(() => {
                this.layoutLetters();
            });
        }
    }


    isReady() {
        return this._ready;
    }

    getLetterDivs() {
        return this.letterDivs;
    }

    layoutLetters() {
        // NOTE: This is an abstract placeholder.

        // After layout completes:
        if (this.letterDivs?.length > 0) {
            this._resolveReady?.();
        }
    }


    shuffleLetters() {
        throw new Error("Method 'shuffleLetters()' must be implemented.");
    }

    clearSelection() {
        throw new Error("Method 'clearSelection()' must be implemented.");
    }

    updateLetterAvailability(lettersToEnable, usedLetterDivs = []) {
        throw new Error("Method 'updateLetterAvailability()' must be implemented.");
    }
}

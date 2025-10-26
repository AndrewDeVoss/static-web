import { LetterBoard } from './letterboard.js';

class HexBoard extends LetterBoard {
    constructor() {
        super();
        this.selectedLetterEls = [];
        this.centerDisplay = null;
    }

    connectedCallback() {
        const attr = this.getAttribute('letters');
        this.letters = attr ? [...attr] : [];
        const computed = Math.min(50, window.innerWidth / 15.5);
        this.style.setProperty('--hex-side-length', `${computed}px`);

        // Set shadow DOM HTML first — so we don't wipe out styles later
        this.shadowRoot.innerHTML = `
            <div id="hex-board">
            <div id="word-display"></div>
            <div id="hex-container"></div>
            </div>
        `;

        // Now add both stylesheets
        const sharedLink = document.createElement('link');
        sharedLink.setAttribute('rel', 'stylesheet');
        sharedLink.setAttribute('href', new URL(`./letterboard.css?v=${Date.now()}`, import.meta.url).href);

        const linkEl = document.createElement('link');
        linkEl.setAttribute('rel', 'stylesheet');
        linkEl.setAttribute('href', new URL(`./hexboard.css?v=${Date.now()}`, import.meta.url).href);

        // Order: component-specific first, shared after (optional)
        this.shadowRoot.prepend(linkEl, sharedLink);

        // Now continue with the rest of your setup...
        this.centerDisplay = this.shadowRoot.getElementById('word-display');
        this.letterContainer = this.shadowRoot.getElementById('hex-container');

        this.layoutLetters();
        this.addEventListeners?.();

                // Add global CSS for this shadow root
        const style = document.createElement('style');
        style.textContent = `
            * {
                touch-action: manipulation;
            }
        `;
        this.shadowRoot.appendChild(style);
    }

    layoutLetters(existingLetterDivs = null) {
        if (!this.letterContainer) return;

        if (!existingLetterDivs) {
            this.letterContainer.innerHTML = '';
            this.letterDivs = [];
            this.selectedLetterEls = [];
        }

        const sideLengthVar = getComputedStyle(this).getPropertyValue('--hex-side-length');
        let sideLength = sideLengthVar ? parseFloat(sideLengthVar) : 50;
        sideLength += 3; // small gap between hexes

        const boundingWidth = 2 * (Math.sqrt(3) / 2) * sideLength;
        const vertShift = sideLength * 3 / 2;

        const positions = [];
        const halfwayIdx = Math.round(this.letters.length / 2);

        // Top row
        for (let idx = 0; idx < halfwayIdx; idx++) {
            const letter = this.letters[idx];
            const x = idx * boundingWidth;
            const y = 0;
            positions.push({ x, y, letter });
        }

        // Bottom row
        const xStart = this.letters.length % 2 === 0 ? -boundingWidth / 2 : boundingWidth / 2;
        for (let idx = halfwayIdx; idx < this.letters.length; idx++) {
            const letter = this.letters[idx];
            const x = xStart + (idx - halfwayIdx) * boundingWidth;
            const y = vertShift;
            positions.push({ x, y, letter });
        }

        // Enter button
        const enterX = xStart + (halfwayIdx - 1) * boundingWidth;
        const enterY = vertShift;
        positions.push({ x: enterX, y: enterY, letter: '↵', isEnter: true });

        const minX = Math.min(...positions.map(p => p.x));
        const maxX = Math.max(...positions.map(p => p.x));
        const minY = Math.min(...positions.map(p => p.y));
        const maxY = Math.max(...positions.map(p => p.y));

        const offsetX = (maxX + minX) / 2;
        const offsetY = (maxY + minY) / 2;

        if (existingLetterDivs) {
            // Reuse existing divs
            existingLetterDivs.forEach((div, idx) => {
                const { x, y } = positions[idx];
                div.style.left = `${x - offsetX}px`;
                div.style.top = `${y - offsetY}px`;
                this.letterContainer.appendChild(div); // re-append in correct order
            });

            this.letterDivs = existingLetterDivs;
        } else {
            // Create all from scratch
            positions.forEach(({ x, y, letter, isEnter }) => {
                const div = document.createElement('div');
                div.className = 'letter' + (isEnter ? ' enter' : '');
                div.dataset.letter = letter;
                div.innerText = letter;

                div.style.left = `${x - offsetX}px`;
                div.style.top = `${y - offsetY}px`;

                this.letterContainer.appendChild(div);

                if (!isEnter) this.letterDivs.push(div);
            });
        }

        if (this.letterDivs.length > 0) {
            this._resolveReady?.();
            this._resolveReady = null;
        }
    }

    addEventListeners() {
        this.letterContainer.addEventListener('pointerdown', e => {
            const target = e.target.closest('.letter');
            if (!target) return;
            this.selectOrDeselectLetter(target);
        });
    }

    selectOrDeselectLetter(el) {
        const letter = el.dataset.letter;

        if (letter === '↵') {
            this.commitWord();
            return;
        }

        // Prevent double-toggle by enforcing a minimum interval
        const now = Date.now();
        const lastClick = parseInt(el.dataset.lastClick || '0');
        const MIN_INTERVAL = 150; // milliseconds

        if (now - lastClick < MIN_INTERVAL) {
            return; // Ignore this click as it's too soon after the last one
        }

        el.dataset.lastClick = now;

        let index = this.selectedLetterEls.indexOf(el);

        if (index !== -1) {
            el.classList.remove('selected');
            this.selectedLetterEls.splice(index, 1);
        } else {
            el.classList.add('selected');
            this.selectedLetterEls.push(el);
        }

        this.updateCenterText();
    }

    commitWord() {
        const word = this.selectedLetterEls.map(el => el.dataset.letter).join('');
        if (!word) return;

        this.dispatchEvent(new CustomEvent('word-committed', {
            detail: {
                word,
                elements: this.selectedLetterEls
            },
            bubbles: true,
            composed: true
        }));

        this.clearSelection();
    }

    clearSelection() {
        this.selectedLetterEls.forEach(el => {
            el.classList.remove('selected');
        });
        this.selectedLetterEls = [];
        this.updateCenterText();
    }

    updateCenterText() {
        const word = this.selectedLetterEls.map(el => el.dataset.letter).join('');
        if (this.centerDisplay) {
            this.centerDisplay.textContent = word || '';
        }
    }

    shuffleLetters() {
        if (!this.letterDivs || this.letterDivs.length === 0) return;

        // Shuffle the existing DOM elements (Fisher–Yates)
        for (let i = this.letterDivs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.letterDivs[i], this.letterDivs[j]] = [this.letterDivs[j], this.letterDivs[i]];
        }

        this.letters = '';
        for (let i = 0; i < this.letterDivs.length; i++) {
            this.letters += this.letterDivs[i].textContent;
        }

        this.layoutLetters(this.letterDivs);
    }

    updateLetterAvailability(lettersToEnable, usedLetterDivs = []) {
        this.letterDivs.forEach(letterDiv => {
            letterDiv.className = 'letter'; // reset classes
            if (!lettersToEnable.includes(letterDiv)) {
                letterDiv.classList.add('disabled');
            } else if (usedLetterDivs.includes(letterDiv)) {
                letterDiv.classList.add('used');
            }
        });
    }
}

customElements.define('hex-board', HexBoard);


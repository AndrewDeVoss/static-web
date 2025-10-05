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
    }

    layoutLetters() {
        if (!this.letterContainer) return;

        this.letterContainer.innerHTML = '';
        this.letterDivs = [];
        this.selectedLetterEls = [];

        const sideLengthAttr = this.getAttribute('hex-side-length');
        const sideLength = sideLengthAttr ? parseInt(sideLengthAttr) : 50;
        console.log('side length ' + sideLength);
        const boundingWidth = 2 * (Math.sqrt(3) / 2) * sideLength;
        const vertShift = sideLength * 3 / 2; // Shift down just enough so sides would touch

        // Calculate all positions
        const positions = [];
        const halfwayIdx = Math.round(this.letters.length/2);

        // First half of letters go on top row
        for (let idx = 0; idx < halfwayIdx; idx++) {
            const letter = this.letters[idx];
            const x = idx * boundingWidth;
            const y = 0;
            positions.push({ x, y, letter });
        }

        // Second half go on bottom row
        const xStart = this.letters.length % 2 === 0 ? -boundingWidth / 2 : boundingWidth / 2; // shift left or right by half a hex
        for (let idx = halfwayIdx; idx < this.letters.length; idx++) {
            const letter = this.letters[idx];
            const x = xStart + (idx - halfwayIdx) * boundingWidth;
            const y = vertShift;
            positions.push({ x, y, letter });
        }

        // Add enter button at the end
        const enterX = xStart + (halfwayIdx-1) * boundingWidth;
        const enterY = vertShift;
        positions.push({ x: enterX, y: enterY, letter: '↵', isEnter: true });

        // Compute bounding box to center group
        const minX = Math.min(...positions.map(p => p.x));
        const maxX = Math.max(...positions.map(p => p.x));
        const minY = Math.min(...positions.map(p => p.y));
        const maxY = Math.max(...positions.map(p => p.y));

        const offsetX = (maxX + minX) / 2;
        const offsetY = (maxY + minY) / 2;

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

        if (this.letterDivs.length > 0) {
            this._resolveReady?.();
            this._resolveReady = null;
        }
    }


    addEventListeners() {
        this.letterContainer.addEventListener('click', e => {
            const target = e.target.closest('.letter');
            if (!target) return;
            this.selectLetter(target);
        });
    }

    selectLetter(el) {
        const letter = el.dataset.letter;

        if (letter === '↵') {
            this.commitWord();
            return;
        }

        if (!this.selectedLetterEls.includes(el)) {
            el.classList.add('selected');
            this.selectedLetterEls.push(el);
            this.updateCenterText();
        }
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
        // Optional: reshuffle letterDivs and re-layout
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


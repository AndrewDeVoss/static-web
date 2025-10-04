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
        sharedLink.setAttribute('href', new URL('./letterboard.css', import.meta.url).href);

        const linkEl = document.createElement('link');
        linkEl.setAttribute('rel', 'stylesheet');
        linkEl.setAttribute('href', new URL('./hexboard.css', import.meta.url).href);

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

        const cols = 4; // roughly square-ish grid
        const size = 50; // side length of hex
        const width = size * 2;
        const height = Math.sqrt(3) * size;

        this.letters.forEach((letter, i) => {
            const div = document.createElement('div');
            div.className = 'letter';
            div.dataset.letter = letter;
            div.innerText = letter;

            const row = Math.floor(i / cols);
            const col = i % cols;

            const offsetX = col * (width * 0.75);
            const offsetY = row * height + (col % 2 === 1 ? height / 2 : 0);

            div.style.left = `${offsetX}px`;
            div.style.top = `${offsetY}px`;

            this.letterContainer.appendChild(div);
            this.letterDivs.push(div);
        });

        // Add Enter button
        const enterBtn = document.createElement('div');
        enterBtn.className = 'hex enter';
        enterBtn.dataset.letter = '↵';
        enterBtn.innerText = '↵';

        const enterOffsetX = (cols + 1) * (width * 0.75);
        const enterOffsetY = height;

        enterBtn.style.left = `${enterOffsetX}px`;
        enterBtn.style.top = `${enterOffsetY}px`;

        this.letterContainer.appendChild(enterBtn);
        // this.letterDivs.push(enterBtn);

        if (this.letterDivs.length > 0) {
            this._resolveReady?.();
            this._resolveReady = null;
        }
    }

    addEventListeners() {
        this.letterContainer.addEventListener('click', e => {
            const target = e.target.closest('.hex');
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


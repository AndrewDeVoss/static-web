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

        const sizeAttr = this.getAttribute('hex-size');
        const size = sizeAttr ? parseInt(sizeAttr) : 50;

        const width = size * 2;
        const height = Math.sqrt(3) * size;
        const horizSpacing = width * 0.5; // horizontal distance between centers
        const vertSpacing = height * 0.45;    // vertical step for staggering

        const centerX = 200;
        const centerY = 200;

        this.letters.forEach((letter, i) => {
            const div = document.createElement('div');
            div.className = 'letter';
            div.dataset.letter = letter;
            div.innerText = letter;

            // Now stagger every letter diagonally
            const x = centerX + i * horizSpacing;
            const y = centerY + (i % 2 === 0 ? -vertSpacing : vertSpacing); // alternate rows

            div.style.left = `${x}px`;
            div.style.top = `${y}px`;

            this.letterContainer.appendChild(div);
            this.letterDivs.push(div);
        });

        // Add Enter button at the next diagonal position
        const enterBtn = document.createElement('div');
        enterBtn.className = 'letter enter';
        enterBtn.dataset.letter = '↵';
        enterBtn.innerText = '↵';

        // Continue the same stagger pattern as the last letter
        const enterX = centerX + this.letters.length * horizSpacing;
        const enterY = centerY + (this.letters.length % 2 === 0 ? -vertSpacing : vertSpacing);

        enterBtn.style.left = `${enterX}px`;
        enterBtn.style.top = `${enterY}px`;

        this.letterContainer.appendChild(enterBtn);

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


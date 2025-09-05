class WordSwiper extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.letters = [];
    this.letterDivs = [];
    this.letterPositions = new Map();
    this.selectedLetterEls = [];
    this.selectedLetterPositions = [];
    this.isSwiping = false;
  }

  connectedCallback() {
    const attr = this.getAttribute('letters');
    this.letters = attr ? [...attr] : [];

    const linkEl = document.createElement('link');
    linkEl.setAttribute('rel', 'stylesheet');
    const cssURL = new URL('./wordswiper.css', import.meta.url);
    linkEl.setAttribute('href', cssURL.href);

    this.shadowRoot.innerHTML = `
      <div id="word-swiper">
        <div id="word-display"></div> 
        <svg id="line-canvas" width="300" height="300"></svg>
        <div id="circle-container"></div>
        <div id="enter-button" class="hidden">Enter</div>
      </div>
    `;
    this.shadowRoot.prepend(linkEl);

    this.circleContainer = this.shadowRoot.querySelector('#circle-container');
    this.centerDisplay = this.shadowRoot?.querySelector('#word-display') || document.querySelector('#word-display');
    this.enterButton = this.shadowRoot.querySelector('#enter-button');
    this.lineCanvas = this.shadowRoot.querySelector('#line-canvas');

    this.layoutLetters();
    this.addEventListeners();
  }

  layoutLetters() {
    this.circleContainer.innerHTML = '';
    this.letterPositions.clear();
    this.selectedLetterEls = [];
    this.selectedLetterPositions = [];

    const radius = 120;
    const angleStep = (2 * Math.PI) / this.letters.length;

    this.letters.forEach((letter, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const x = 150 + radius * Math.cos(angle);
      const y = 150 + radius * Math.sin(angle);

      const div = document.createElement('div');
      div.className = 'letter';
      div.innerText = letter;
      div.style.left = `${x - 25}px`;
      div.style.top = `${y - 25}px`;
      div.dataset.letter = letter;
      div.dataset.index = i;

      this.circleContainer.appendChild(div);
      this.letterPositions.set(div, { x, y });
      this.letterDivs.push(div);
    });

    // Make enter button act like a letter at the center
    this.letterPositions.set(this.enterButton, { x: 150, y: 150 });
    this.enterButton.dataset.letter = '↵';
  }

  addEventListeners() {
    this.circleContainer.addEventListener('mousedown', this.startSwipe.bind(this));
    this.circleContainer.addEventListener('touchstart', this.startSwipe.bind(this));

    document.addEventListener('mousemove', this.continueSwipe.bind(this));
    document.addEventListener('mouseup', this.endSwipe.bind(this));

    document.addEventListener('touchmove', this.continueSwipe.bind(this), { passive: false });
    document.addEventListener('touchend', this.endSwipe.bind(this));

    this.enterButton.addEventListener('click', this.commitWord.bind(this));
  }

  getPointFromEvent(e) {
    if (e.touches && e.touches[0]) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
      return { x: e.clientX, y: e.clientY };
    }
  }

  startSwipe(e) {
    e.preventDefault();
    this.clearSelection();
    this.isSwiping = true;

    this.continueSwipe(e); // First touchpoint

    this.enterButton.classList.remove('hidden');
  }

  continueSwipe(e) {
    if (!this.isSwiping) return;

    const point = this.getPointFromEvent(e);
    const el = this.getLetterElementFromPoint(point.x, point.y);

    if (el) {
      this.selectLetter(el);
    }
  }

  endSwipe() {
    if (!this.isSwiping) return;
    this.isSwiping = false;
  }

  getLetterElementFromPoint(x, y) {
    const elements = [...this.shadowRoot.elementsFromPoint(x, y)];
    return elements.find(el => this.letterPositions.has(el));
  }

  selectLetter(el) {
    const letter = el.dataset.letter;

    if (letter === '↵') {
      this.commitWord();
      return;
    }

    el.classList.add('selected');

    this.selectedLetterEls.push(el);
    this.selectedLetterPositions.push(this.letterPositions.get(el));

    this.updateCenterText();
    this.redrawLines();

    if (this.selectedLetterEls.length === 1) {
      this.enterButton.classList.remove('hidden');
    }
  }

  disableLetters(letterElsToDisable) {
    letterElsToDisable.forEach(el => {
      el.classList.add('disabled');
    });
  }

  updateLetterAvailability(lettersToEnable, usedLetterDivs=[]) {
    this.letterDivs.forEach(letterDiv => {
      letterDiv.classList.remove('disabled');
      letterDiv.classList.remove('used');

      if(!lettersToEnable.includes(letterDiv)) {
        letterDiv.classList.add('disabled');
      } else if (usedLetterDivs.includes(letterDiv)) {
        letterDiv.classList.add('used');
        letterDiv.classList.add('disabled');
      }
    });
  }

  updateCenterText() {
    const word = this.selectedLetterEls.map(el => el.dataset.letter).join('');
    if (this.centerDisplay) {
      this.centerDisplay.textContent = word || '';
    }
  }

  redrawLines() {
    const svg = this.lineCanvas;
    svg.innerHTML = '';

    for (let i = 0; i < this.selectedLetterPositions.length - 1; i++) {
      const p1 = this.selectedLetterPositions[i];
      const p2 = this.selectedLetterPositions[i + 1];

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', p1.x);
      line.setAttribute('y1', p1.y);
      line.setAttribute('x2', p2.x);
      line.setAttribute('y2', p2.y);
      line.setAttribute('stroke', '#2b8fd2');
      line.setAttribute('stroke-width', '4');
      line.setAttribute('stroke-linecap', 'round');

      svg.appendChild(line);
    }
  }

  clearSelection() {
    this.selectedLetterEls.forEach(el => {
      el.classList.remove('selected');
    });

    this.selectedLetterEls = [];
    this.selectedLetterPositions = [];
    this.lineCanvas.innerHTML = '';
    this.updateCenterText();
    this.enterButton.classList.add('hidden');
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

  getLetterDivs() {
    return this.letterDivs;
  }

  isReady() {
    return new Promise(resolve => {
      // Wait until the next animation frame to ensure layoutLetters has run
      requestAnimationFrame(() => {
        // Resolve only when letterDivs are available
        if (this.letterDivs.length > 0) {
          resolve();
        } else {
          // Try again on next frame (recursive retry)
          const waitUntilReady = () => {
            if (this.letterDivs.length > 0) {
              resolve();
            } else {
              requestAnimationFrame(waitUntilReady);
            }
          };
          waitUntilReady();
        }
      });
    });
  }

}

customElements.define('word-swiper', WordSwiper);

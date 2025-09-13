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
    this.swipeExited = false;
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
        <div id="circle-container">
          
        </div>
        <svg id="line-canvas" width="100%" height="100%"></svg>
      </div>
    `;
    this.shadowRoot.prepend(linkEl);

    this.circleContainer = this.shadowRoot.querySelector('#circle-container');
    this.centerDisplay = this.shadowRoot?.querySelector('#word-display') || document.querySelector('#word-display');
    this.lineCanvas = this.shadowRoot.querySelector('#line-canvas');
    console.log(`line canvas found: ${!!this.lineCanvas}`);

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
  }

  addEventListeners() {
    this.circleContainer.addEventListener('mousedown', this.startSwipe.bind(this));
    this.circleContainer.addEventListener('touchstart', this.startSwipe.bind(this));

    document.addEventListener('mousemove', this.continueSwipe.bind(this));
    document.addEventListener('mouseup', this.endSwipe.bind(this));

    document.addEventListener('touchmove', this.continueSwipe.bind(this), { passive: false });
    document.addEventListener('touchend', this.endSwipe.bind(this));
  }

  startSwipe(e) {
    e.preventDefault();
    this.clearSelection();
    this.isSwiping = true;
    this.swipeExited = false; // Reset swipe exit flag

    this.continueSwipe(e); // First touchpoint
  }

  continueSwipe(e) {
    if (!this.isSwiping) return;

    const point = this.getPointFromEvent(e);
    const el = this.getLetterElementFromPoint(point.x, point.y);

    if (el) {
      this.selectLetter(el);
    }

    this.checkSwipeExit(point.x, point.y);
  }

  endSwipe() {
    if (!this.isSwiping) return;
    this.isSwiping = false;

    // If the user swiped outside the circle, commit the word
    if (this.swipeExited) {
      this.commitWord();
    }
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
  }

  // Handle swipe exit (if user moves their swipe outside of the circle)
  checkSwipeExit(x, y) {
    const rect = this.circleContainer.getBoundingClientRect();
    const isOutside = x < rect.left || x > rect.right || y < rect.top || y > rect.bottom;

    if (isOutside && !this.swipeExited) {
      this.swipeExited = true;
      this.commitWord(); // Trigger commit when swipe exits
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
    this.selectedLetterPositions = [];
    this.lineCanvas.innerHTML = '';
    this.updateCenterText();
  }

  updateCenterText() {
    const word = this.selectedLetterEls.map(el => el.dataset.letter).join('');
    if (this.centerDisplay) {
      this.centerDisplay.textContent = word || '';
    }
  }

  redrawLines() {
    const svg = this.lineCanvas;
    svg.innerHTML = ''; // Clear any previous lines

    for (let i = 0; i < this.selectedLetterPositions.length - 1; i++) {
      const p1 = this.selectedLetterPositions[i];
      const p2 = this.selectedLetterPositions[i + 1];

      // Calculate positions relative to the circle-container
      const svgRect = svg.getBoundingClientRect();
      const p1x = p1.x - svgRect.left;
      const p1y = p1.y - svgRect.top;
      const p2x = p2.x - svgRect.left;
      const p2y = p2.y - svgRect.top;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', p1x);
      line.setAttribute('y1', p1y);
      line.setAttribute('x2', p2x);
      line.setAttribute('y2', p2y);
      line.setAttribute('stroke', '#2b8fd2');
      line.setAttribute('stroke-width', '4');
      line.setAttribute('stroke-linecap', 'round');

      svg.appendChild(line);
    }

    console.log(`svg content: ${svg.innerHTML}`);
  }

  getPointFromEvent(e) {
    if (e.touches && e.touches[0]) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
      return { x: e.clientX, y: e.clientY };
    }
  }

  getLetterDivs() {
    return this.letterDivs;
  }

  updateLetterAvailability(lettersToEnable, usedLetterDivs=[]) {
    this.letterDivs.forEach(letterDiv => {
      letterDiv.className = 'letter'; // Resets it cleanly
      if (!lettersToEnable.includes(letterDiv)) {
        letterDiv.classList.add('disabled');
      } else if (usedLetterDivs.includes(letterDiv)) {
        letterDiv.classList.add('used');
      }
    });
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


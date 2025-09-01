class WordSwiper extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.letters = [];
    this.letterPositions = new Map();
    this.selectedLetterEls = [];
    this.selectedLetterPositions = [];
    this.isSwiping = false;
  }

  connectedCallback() {
    const attr = this.getAttribute('letters');
    this.letters = attr ? attr.split(',') : [];

    const linkEl = document.createElement('link');
    linkEl.setAttribute('rel', 'stylesheet');
    linkEl.setAttribute('href', '../utility/wordswiper/wordswiper.css');

    this.shadowRoot.innerHTML = `
      <div id="word-swiper">
        <div id="word-display">Enter</div> 
        <svg id="line-canvas" width="300" height="300"></svg>
        <div id="circle-container"></div>
        <div id="center-button" class="hidden">Enter</div>
      </div>
    `;
    this.shadowRoot.prepend(linkEl);

    this.circleContainer = this.shadowRoot.querySelector('#circle-container');
    this.centerDisplay = this.shadowRoot?.querySelector('#word-display') || document.querySelector('#word-display');
    this.centerButton = this.shadowRoot.querySelector('#center-button');
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
    });

    // Make enter button act like a letter at the center
    this.letterPositions.set(this.centerButton, { x: 150, y: 150 });
    this.centerButton.dataset.letter = '↵';
  }

  addEventListeners() {
    this.circleContainer.addEventListener('mousedown', this.startSwipe.bind(this));
    this.circleContainer.addEventListener('mousemove', this.continueSwipe.bind(this));
    document.addEventListener('mouseup', this.endSwipe.bind(this));

    this.circleContainer.addEventListener('touchstart', this.startSwipe.bind(this));
    this.circleContainer.addEventListener('touchmove', this.continueSwipe.bind(this), { passive: false });
    document.addEventListener('touchend', this.endSwipe.bind(this));

    this.centerButton.addEventListener('click', this.commitWord.bind(this));
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

    const point = this.getPointFromEvent(e);
    const el = this.getLetterElementFromPoint(point.x, point.y);
    if (el && this.canSelectAgain(el)) this.selectLetter(el);

    // Show enter button right after first letter
    this.centerButton.classList.remove('hidden');
  }

  continueSwipe(e) {
    if (!this.isSwiping) return;

    const point = this.getPointFromEvent(e);
    const el = this.getLetterElementFromPoint(point.x, point.y);

    if (el && this.canSelectAgain(el)) {
      this.selectLetter(el);
    }
  }

  endSwipe() {
    if (!this.isSwiping) return;
    this.isSwiping = false;
    // Do not hide enter button — user may want to click it
  }

  getLetterElementFromPoint(x, y) {
    const elements = [...this.shadowRoot.elementsFromPoint(x, y)];
    return elements.find(el => this.letterPositions.has(el));
  }

  canSelectAgain(el) {
    return !this.selectedLetterEls.includes(el);
  }

  selectLetter(el) {
    const letter = el.dataset.letter;

    if (letter === '↵') {
      this.commitWord(); // Treat swipe over enter as confirmation
      return;
    }

    el.classList.add('selected');
    el.style.pointerEvents = 'none';

    this.selectedLetterEls.push(el);
    this.selectedLetterPositions.push(this.letterPositions.get(el));

    this.updateCenterText();
    this.redrawLines();

    // Show enter button after first letter
    if (this.selectedLetterEls.length === 1) {
      this.centerButton.classList.remove('hidden');
    }
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
      el.style.pointerEvents = 'auto';
    });

    this.selectedLetterEls = [];
    this.selectedLetterPositions = [];
    this.lineCanvas.innerHTML = '';
    this.updateCenterText();
    this.centerButton.classList.add('hidden');
  }

  commitWord() {
    const word = this.selectedLetterEls.map(el => el.dataset.letter).join('');
    if (!word) return;

    this.dispatchEvent(new CustomEvent('word-committed', {
      detail: { word },
      bubbles: true,
      composed: true
    }));

    this.clearSelection();
  }
}

customElements.define('word-swiper', WordSwiper);

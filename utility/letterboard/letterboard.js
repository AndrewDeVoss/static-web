export class LetterBoard extends HTMLElement {
  constructor() {
    super();

    if (new.target === LetterBoard) {
      throw new TypeError("Cannot instantiate LetterBoard directly");
    }
  }

  isReady() {
    throw new Error("Method 'isReady()' must be implemented.");
  }

  setLetters(letters) {
    throw new Error("Method 'setLetters()' must be implemented.");
  }

  getLetterDivs() {
    throw new Error("Method 'getLetterDivs()' must be implemented.");
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

class TreeNode {
  constructor(letterDivs) {
    this.letterDivs = letterDivs;
    this.word = letterDivs.map(el => el.dataset.letter).join('');
    this.children = [];
    this.parent = null;
  }

  addChild(childNode) {
    childNode.parent = this;
    this.children.push(childNode);
  }
}

export { TreeNode };

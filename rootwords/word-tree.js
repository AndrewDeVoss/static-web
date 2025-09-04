class TreeNode {
  constructor(word) {
    this.word = word;
    this.children = [];
    this.parent = null;
  }

  addChild(childNode) {
    childNode.parent = this;
    this.children.push(childNode);
  }
}

export { TreeNode };

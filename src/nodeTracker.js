export default class NodeTracker {
  constructor() {
    this.helperNode = null;
  }

  setHelperNode(node) {
    this.helperNode = node;
  }

  getHelperNode() {
    return this.helperNode;
  }
};

export default class NodeTracker {
  constructor() {
    this.nodes = [];
    this.helperNode = null;
    this.isHelperNodeActive = false;
  }

  setHelperNode(node) {
    this.helperNode = node;
    this.isHelperNodeActive = true;
  }

  unsetHelperNode() {
    this.isHelperNodeActive = false;
  }

  add(index, el) {
    this.nodes.splice(index, 0, el);
  }

  remove(index) {
    this.nodes.splice(index, 1);
  }

  getHelperNode() {
    return this.helperNode;
  }

  hasActiveHelperNode() {
    return this.isHelperNodeActive;
  }

  getNodes() {
    return this.nodes;
  }
};

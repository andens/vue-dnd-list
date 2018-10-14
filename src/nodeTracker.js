export default class NodeTracker {
  constructor() {
    this.nodes = [];
    this.helperNode = null;
  }

  setHelperNode(node) {
    this.helperNode = node;
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

  getNodes() {
    return this.nodes;
  }
};

<template>
  <div ref="container">
    <div ref="scrollContainer" :class="scrollContainerClass" v-on="scrollContainerEvents">
      <transition
        :name="transitionName"
        v-for="(listItem, index) in value"
        :key="itemKeyProperty ? listItem[itemKeyProperty] : index"
      >
        <list-item
          :class="listItemClass"
          :index="index"
          @transitionend.native="itemTransitionEnd"
        >
          <slot
            v-bind="{
              listItem,
              index,
              isGhost: sortIndex === index,
              isHelper: false,
              sorting,
              settling,
              startDrag: (e) => handleStart(e, index),
            }"
          />
        </list-item>
      </transition>
    </div>
    <transition
      :name="transitionName"
      @before-leave="helperBeforeLeave"
      @after-leave="helperAfterLeave"
    >
      <list-item
        :key="helperItemKey"
        v-if="sorting"
        :class="[listItemClass, helperItemClass]"
        :style="{
          position: 'absolute',
          left: `${helperTranslation.x - $refs.scrollContainer.scrollLeft}px`,
          top: `${helperTranslation.y - $refs.scrollContainer.scrollTop}px`,
          zIndex: helperZ,
        }"
        :index="sortIndex"
        :helper=true
      >
        <slot
          name="helper"
          v-bind="{
            listItem: value[sortIndex],
            index: sortIndex,
            isGhost: false,
            isHelper: true,
            sorting,
            settling,
            startDrag: () => {},
          }"
        >
          <slot
            v-bind="{
              listItem: value[sortIndex],
              index: sortIndex,
              isGhost: false,
              isHelper: true,
              sorting,
              settling,
              startDrag: () => {},
            }"
          />
        </slot>
      </list-item>
    </transition>
  </div>
</template>

<script>
import NodeTracker from "./nodeTracker.js";
import ListItem from "./ListItem.vue";

export default {
  data: () => ({
    sortIndex: null,
    sorting: false,
    settling: false,
    helperTranslation: { x: 0, y: 0 }, // Facade item translation as if it was inside the scroll container.
    activationTimer: null, // Tracker for when `activationDelay` is used
    startPosition: { x: 0, y: 0 }, // Mouse position at the time of activation.
    helperStartPosition: { x: 0, y: 0 }, // Offset of the sort item when sorting is activated.
    startScroll: { x: 0, y: 0 }, // Container scroll at time of activation.
    latestMousePosition: { x: 0, y: 0 },
    nodeTracker: new NodeTracker(),
    autoscrollIntervalTimer: null,
    protrusion: 0, // Used in autoscroll to determine scroll speed.
  }),

  props: {
    value: { type: Array, required: true },
    orientation: { type: String, default: "y", validator: v => v === "x" || v === "y" },
    lockAxis: { type: Boolean, default: false },
    scrollContainerClass: { type: String, default: "dnd-scroll-container" },
    transitionName: { type: String, default: "dnd-list" },
    listItemClass: { type: String, default: "dnd-list-item" },
    helperItemClass: { type: String, default: "dnd-helper-item" },
    itemKeyProperty: { type: String, default: null },
    helperItemKey: { type: Number, default: -1 },
    activationDelay: { type: Number, default: 0 },
    activationDistance: { type: Number, default: 0 },
    helperZ: { type: Number, default: 0 },
    maxItemTransitionDuration: { type: Number, default: 0 },
    scrollContainerEvents: { type: Object, default: null },
    autoscrollTopSpeed: { type: Number, default: 30 },
    autoscrollTopSpeedProtrusion: { type: Number, default: 60 },
  },

  provide() {
    return {
      nodeTracker: this.nodeTracker,
    }
  },

  methods: {
    handleStart(e, index) {
      if (this.sortIndex !== null) {
        return;
      }

      this.sortIndex = index;

      window.addEventListener("mousemove", this.handleSortMove, true);
      window.addEventListener("mouseup", this.handleSortEnd, true);

      this.latestMousePosition.x = e.pageX;
      this.latestMousePosition.y = e.pageY;

      // If an activation delay is set, wait before entering the sorting phase.
      if (this.activationDelay > 0) {
        this.activationTimer = setTimeout(
          () => this.activateSorting(),
          this.activationDelay
        );
      }
      // When using drag activation, `startPosition` is used for calculating
      // the offset to determine whether the drag constraint is satisfied.
      else if (this.activationDistance > 0) {
        this.startPosition.x = this.latestMousePosition.x;
        this.startPosition.y = this.latestMousePosition.y;
      }
      // Neither activation delay nor -distance is used: activate immediately
      else {
        this.activateSorting();
      }
    },

    handleSortMove(e) {
      e.stopPropagation();

      this.latestMousePosition.x = e.pageX;
      this.latestMousePosition.y = e.pageY;

      // Sorting has not begun and we are not waiting for an activation delay.
      // This is when drag distance is used to activate sorting.
      if (!this.sorting && this.activationDelay === 0) {
        this.checkActivationDistanceConstraint();
      }

      this.synchronizeHelperTranslation();
      this.autoscroll();
    },

    handleSortEnd(e) {
      e.stopPropagation();

      window.removeEventListener("mousemove", this.handleSortMove, true);
      window.removeEventListener("mouseup", this.handleSortEnd, true);

      // Clear to prevent entering the sorting phase later if it has not
      // already fired.
      clearTimeout(this.activationTimer);
      this.activationTimer = null;

      // Stop autoscrolling if active.
      if (this.autoscrollIntervalTimer) {
        clearInterval(this.autoscrollIntervalTimer);
        this.autoscrollIntervalTimer = null;
      }

      // Switch to the settling phase (cleanup is done when the helper has left
      // the DOM).
      if (this.sorting) {
        this.sorting = false;
        this.settling = true;
      }
      // If sorting has not yet begun, cleanup what was set in `handleStart`.
      else {
        this.sortIndex = null;
        this.informSortEnd();
      }
    },

    helperBeforeLeave(el) {
      const targetElement = this.nodeTracker.getNodes()[this.sortIndex];
      el.style.transform = `translate3d(${this.helperTranslation.x - targetElement.offsetLeft}px, ${this.helperTranslation.y - targetElement.offsetTop}px, 0)`;
      
      // During the settling phase we give `helperTranslation` the purpose of
      // representing the target position to easily tweak it when scrolling.
      this.helperTranslation.x = targetElement.offsetLeft;
      this.helperTranslation.y = targetElement.offsetTop;
      
      // Set the style ourselves. I'm not sure, but it seems that during leave
      // transitions either the element is replaced with a new one or bindings
      // no longer apply.
      el.style.left = `${this.helperTranslation.x - this.$refs.scrollContainer.scrollLeft}px`;
      el.style.top = `${this.helperTranslation.y - this.$refs.scrollContainer.scrollTop}px`;
    },

    helperAfterLeave(el) {
      this.sortIndex = null;
      this.settling = false;
      this.informSortEnd();
    },

    checkActivationDistanceConstraint() {
      const delta = {
        x: this.startPosition.x - this.latestMousePosition.x,
        y: this.startPosition.y - this.latestMousePosition.y,
      };

      const distSq = delta.x * delta.x + delta.y * delta.y;

      if (distSq > this.activationDistance * this.activationDistance) {
        this.activateSorting();
      }
    },

    activateSorting() {
      const sortNode = this.nodeTracker.getNodes()[this.sortIndex];
      this.helperStartPosition.x = sortNode.offsetLeft;
      this.helperStartPosition.y = sortNode.offsetTop;
      this.helperTranslation.x = this.helperStartPosition.x;
      this.helperTranslation.y = this.helperStartPosition.y;
      this.startPosition.x = this.latestMousePosition.x;
      this.startPosition.y = this.latestMousePosition.y;
      this.startScroll.x = this.$refs.scrollContainer.scrollLeft;
      this.startScroll.y = this.$refs.scrollContainer.scrollTop;
      this.sorting = true;
    },

    synchronizeHelperTranslation() {
      if (!this.sorting) {
        if (this.settling) {
          // Scroll during settling must manually update the helper position
          // because the reactive bindings no longer seem to apply then. Note
          // that `helperTranslation` is the target position set when the leave
          // transition began.
          let helperStyle = this.nodeTracker.getHelperNode().style;
          helperStyle.left = `${this.helperTranslation.x - this.$refs.scrollContainer.scrollLeft}px`;
          helperStyle.top = `${this.helperTranslation.y - this.$refs.scrollContainer.scrollTop}px`;
        }

        return;
      }

      const prevTranslation = { x: this.helperTranslation.x, y: this.helperTranslation.y };

      // Set the new translation.
      if (!this.lockAxis || (this.lockAxis && this.orientation === "x")) {
        const {scrollLeft} = this.$refs.scrollContainer;
        this.helperTranslation.x = this.helperStartPosition.x + (this.latestMousePosition.x - this.startPosition.x) + (scrollLeft - this.startScroll.x);
      }
      if (!this.lockAxis || (this.lockAxis && this.orientation === "y")) {
        const {scrollTop} = this.$refs.scrollContainer;
        this.helperTranslation.y = this.helperStartPosition.y + (this.latestMousePosition.y - this.startPosition.y) + (scrollTop - this.startScroll.y);
      }

      if (this.nodeTracker.hasActiveHelperNode()) {
        this.sortItems(prevTranslation);
      }
      else {
        this.$nextTick(() => this.sortItems(prevTranslation));
      }
    },

    sortItems(prevTranslation) {
      const horizontal = this.orientation === "x";
      const movement = horizontal
        ? this.helperTranslation.x - prevTranslation.x
        : this.helperTranslation.y - prevTranslation.y;
      const checkDirection = Math.sign(movement);

      if (checkDirection === 0) {
        return;
      }

      const nodes = this.nodeTracker.getNodes();
      const helperRect = this.nodeTracker.getHelperNode().getBoundingClientRect();

      let checkNodeIndex = this.sortIndex + checkDirection;
      while (checkNodeIndex >= 0 && checkNodeIndex < nodes.length) {
        const node = nodes[checkNodeIndex];
        const compareRect = node.getBoundingClientRect();
        const compareRectMid = horizontal
          ? compareRect.left + 0.5 * compareRect.width
          : compareRect.top + 0.5 * compareRect.height;

        let swap = false;
        if (horizontal) {
          swap = (movement > 0 && helperRect.right > compareRectMid) || (movement < 0 && helperRect.left < compareRectMid);
        }
        else {
          swap = (movement > 0 && helperRect.bottom > compareRectMid) || (movement < 0 && helperRect.top < compareRectMid);
        }

        if (swap) {
          this.moveSortItem(movement > 0);
        }
        else {
          break;
        }

        checkNodeIndex += checkDirection;
      }
    },

    // Swaps places with the sort item and its neighbor, if one is available.
    // If the argument is truthy, the right-hand neighbor is swapped, otherwise
    // the left-hand one is swapped.
    moveSortItem(right) {
      let otherIndex = this.sortIndex;

      if (right && this.sortIndex + 1 < this.value.length) {
        otherIndex = this.sortIndex + 1;
      }
      else if (!right && this.sortIndex > 0) {
        otherIndex = this.sortIndex - 1;
      }

      if (otherIndex !== this.sortIndex) {
        const sortNode = this.nodeTracker.getNodes()[this.sortIndex];
        const otherNode = this.nodeTracker.getNodes()[otherIndex];

        const sortItem = this.value[this.sortIndex];
        const otherItem = this.value[otherIndex];

        this.value.splice(this.sortIndex, 1, otherItem);
        this.value.splice(otherIndex, 1, sortItem);

        this.sortIndex = otherIndex;

        this.$emit("input", this.value);

        if (this.maxItemTransitionDuration > 0) {
          this.transitionSwappedItems(sortNode, otherNode, right);
        }
      }
    },

    transitionSwappedItems(sortNode, otherNode, right) {
      //╔═════════════════════════════════════════════════════════════════════╗
      //║ Note to self:                                                       ║
      //║ The logic here is not difficult, but somewhat fragile. The order of ║
      //║ operations is important for CSS transitions to trigger properly. Be ║
      //║ careful with any changes in this method.                            ║
      //╚═════════════════════════════════════════════════════════════════════╝

      // To make a currently transitioning item behave properly, we use its
      // mid-transition transform value to calculate the new transform such
      // that it returns nicely from where it currently is.
      const otherComputedStyle = window.getComputedStyle(otherNode);
      const sortComputedStyle = window.getComputedStyle(sortNode);
      const otherOuterWidth =
        ["left", "right"]
        .map(side => {
          return parseInt(otherComputedStyle[`margin-${side}`], 10);
        })
        .reduce((total, side) => {
          return total + side;
        }, otherNode.offsetWidth);
      const sortOuterWidth =
        ["left", "right"]
        .map(side => {
          return parseInt(sortComputedStyle[`margin-${side}`], 10);
        })
        .reduce((total, side) => {
          return total + side;
        }, sortNode.offsetWidth);
      const otherMatrix = new WebKitCSSMatrix(otherComputedStyle.transform);
      const sortMatrix = new WebKitCSSMatrix(sortComputedStyle.transform);
      const otherTranslate = (right ? -1 : 1) * (otherOuterWidth + (right ? -1 : 1) * (sortMatrix.m41));
      const sortTranslate = (right ? 1 : -1) * (sortOuterWidth + (right ? 1 : -1) * (otherMatrix.m41));

      // Reduce the transition duration based on the distance that has already
      // been transitioned to move with an even speed. Otherwise the transition
      // restarts with the same duration and moves more slowly due to a shorter
      // distance being transitioned over the same period of time.
      const sortTime = Math.min(Math.abs(sortTranslate) / sortOuterWidth, 1.0) * this.maxItemTransitionDuration;
      const otherTime = Math.min(Math.abs(otherTranslate) / otherOuterWidth, 1.0) * this.maxItemTransitionDuration;

      // Remove the move class and transition duration before reflow.
      const className = `${this.transitionName}-move`;

      sortNode.classList.remove(className);
      otherNode.classList.remove(className);

      sortNode.style.transitionDuration = "";
      otherNode.style.transitionDuration = "";

      sortNode.style.transform = `translateX(${sortTranslate}px)`;
      otherNode.style.transform = `translateX(${otherTranslate}px)`;

      // Force reflow to use the new translation without transition.
      sortNode.offsetLeft;
      otherNode.offsetLeft;

      // Now we can reapply the transition duration and the move class to
      // continue transitioning.
      sortNode.style.transitionDuration = `${sortTime}ms`;
      otherNode.style.transitionDuration = `${otherTime}ms`;

      sortNode.classList.add(className);
      otherNode.classList.add(className);
    },

    itemTransitionEnd(e) {
      const className = `${this.transitionName}-move`;
      e.target.style.transform = "";
      e.target.style.transitionDuration = "";
      e.target.classList.remove(className);
    },

    getScrollContainer() {
      return this.$refs.scrollContainer;
    },

    autoscroll() {
      if (!this.sorting) {
        return;
      }

      if (!this.nodeTracker.getHelperNode()) {
        return;
      }

      // Calculate how far outside the scroll container we are.
      this.calculateHelperProtrusionOutsideContainer();

      // Disable autoscroll if we are no longer within the autoscroll bounds.
      if (this.protrusion === 0) {
        if (this.autoscrollIntervalTimer) {
          clearInterval(this.autoscrollIntervalTimer);
          this.autoscrollIntervalTimer = null;
        }
        return;
      }

      if (this.autoscrollIntervalTimer) {
        return;
      }

      this.autoscrollIntervalTimer = setInterval(this.autoscrollIteration, 30);
    },

    calculateHelperProtrusionOutsideContainer() {
      this.protrusion = 0;
      const helperRect = this.nodeTracker.getHelperNode().getBoundingClientRect();
      const scrollRect = this.$refs.scrollContainer.getBoundingClientRect();
      if (this.orientation === "x") {
        const left = helperRect.left - scrollRect.left;
        const right = helperRect.right - scrollRect.right;
        if (left < 0) {
          this.protrusion = left;
        }
        else if (right > 0) {
          this.protrusion = right;
        }
      }
      else {
        const top = helperRect.top - scrollRect.top;
        const bottom = helperRect.bottom - scrollRect.bottom;
        if (top < 0) {
          this.protrusion = top;
        }
        else if (bottom > 0) {
          this.protrusion = bottom;
        }
      }
    },

    autoscrollIteration() {
      const horizontal = this.orientation === "x";
      const scrollSpeed = Math.min(1.0, Math.abs(this.protrusion) / this.autoscrollTopSpeedProtrusion) * this.autoscrollTopSpeed * Math.sign(this.protrusion);

      if (horizontal) {
        this.$refs.scrollContainer.scrollLeft += scrollSpeed;
      }
      else {
        this.$refs.scrollContainer.scrollTop += scrollSpeed;
      }

      this.synchronizeHelperTranslation();

      const { scrollLeft, scrollTop, scrollWidth, scrollHeight, clientWidth, clientHeight } = this.$refs.scrollContainer;

      // Avoid choppy movement by explicitly setting the helper position.
      // Such artifacts were particularly visible for slow movements opposite
      // to the autoscroll direction. I assume that the reason this works is
      // that the animation frame is called just before rendering and at that
      // time we can set the final position without waiting for Vue to update
      // reactive bindings and thus lag behind.
      if (this.nodeTracker.getHelperNode()) {
        let s = this.nodeTracker.getHelperNode().style;
        s.left = `${this.helperTranslation.x - scrollLeft}px`;
        s.top = `${this.helperTranslation.y - scrollTop}px`;
      }

      let cancelAutoscroll = false;
      cancelAutoscroll |= horizontal && this.protrusion > 0 && scrollLeft >= (scrollWidth - clientWidth);
      cancelAutoscroll |= horizontal && this.protrusion < 0 && scrollLeft <= 0;
      cancelAutoscroll |= !horizontal && this.protrusion > 0 && scrollTop >= (scrollHeight - clientHeight);
      cancelAutoscroll |= !horizontal && this.protrusion < 0 && scrollTop <= 0;
      if (cancelAutoscroll) {
        clearInterval(this.autoscrollIntervalTimer);
        this.autoscrollIntervalTimer = null;
      }
    },

    informSortEnd() {
      this.$emit("sort-end");
    },
  },

  components: {
    ListItem,
  },
}
</script>

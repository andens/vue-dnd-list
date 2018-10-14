<template>
  <transition-group :name="transitionName" tag="div" @after-leave="afterLeave">
    <list-item
      v-for="(listItem, index) in value"
      :key="itemKeyProperty ? listItem[itemKeyProperty] : index"
      :class="listItemClass"
      :index="index"
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
    <list-item
      :key="helperItemKey"
      v-if="sorting"
      :class="[listItemClass, helperItemClass]"
      :style="{
        position: 'absolute',
        left: `${helperTranslation.x}px`,
        top: `${helperTranslation.y}px`,
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
  </transition-group>
</template>

<script>
import NodeTracker from "./nodeTracker.js";
import ListItem from "./ListItem.vue";

export default {
  data: () => ({
    sortIndex: null,
    sorting: false,
    settling: false,
    helperTranslation: { x: 0, y: 0 },
    activationTimer: null, // Tracker for when `activationDelay` is used
    startPosition: { x: 0, y: 0 }, // Mouse position at the time of activation.
    helperStartPosition: { x: 0, y: 0 }, // Offset of the sort item when sorting is activated.
    nodeTracker: new NodeTracker(),
  }),

  props: {
    value: { type: Array, required: true },
    transitionName: { type: String, default: "dnd-list" },
    listItemClass: { type: String, default: "dnd-list-item" },
    helperItemClass: { type: String, default: "dnd-helper-item" },
    itemKeyProperty: { type: String, default: null },
    helperItemKey: { type: Number, default: -1 },
    activationDelay: { type: Number, default: 0 },
    activationDistance: { type: Number, default: 0 },
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

      // If no particular constraint is set, this is the proper start position.
      // If using drag activation, this is used as the offset base to determine
      // whether the constraint has been met. Delay activation overwrites this
      // on mouse moves, but requires this value as a default if the mouse is
      // not moved during the countdown.
      this.startPosition.x = e.pageX;
      this.startPosition.y = e.pageY;

      // If an activation delay is set, wait before entering the sorting phase.
      if (this.activationDelay > 0) {
        this.activationTimer = setTimeout(
          () => this.activateSorting(),
          this.activationDelay
        );
      }
      // Neither activation delay nor -distance is used: activate immediately
      else if (this.activationDistance === 0) {
        this.activateSorting();
      }
    },

    handleSortMove(e) {
      e.stopPropagation();

      // Track the mouse position so that the drag offset is later calculated
      // from the mouse position at the time of activation.
      if (!this.sorting && this.activationDelay > 0) {
        this.startPosition.x = e.pageX;
        this.startPosition.y = e.pageY;
      }
      // Sorting has not begun and we are not waiting for an activation delay.
      // This is when drag distance is used to activate sorting.
      else if (!this.sorting && this.activationDelay === 0) {
        this.checkActivationDistanceConstraint(e);
      }

      if (!this.sorting) {
        return;
      }

      this.helperTranslation.x = this.helperStartPosition.x + (e.pageX - this.startPosition.x);
      this.helperTranslation.y = this.helperStartPosition.y + (e.pageY - this.startPosition.y);
    },

    handleSortEnd(e) {
      e.stopPropagation();

      window.removeEventListener("mousemove", this.handleSortMove, true);
      window.removeEventListener("mouseup", this.handleSortEnd, true);

      // Clear to prevent entering the sorting phase later if it has not
      // already fired.
      clearTimeout(this.activationTimer);
      this.activationTimer = null;

      // Switch to the settling phase (cleanup is done when the helper has left
      // the DOM).
      if (this.sorting) {
        this.sorting = false;
        this.settling = true;
      }
      // If sorting has not yet begun, cleanup what was set in `handleStart`.
      else {
        this.sortIndex = null;
      }
    },

    afterLeave(el) {
      if (el === this.nodeTracker.getHelperNode()) {
        this.sortIndex = null;
        this.settling = false;
      }
    },

    checkActivationDistanceConstraint(e) {
      const delta = {
        x: this.startPosition.x - e.pageX,
        y: this.startPosition.y - e.pageY,
      };

      const distSq = delta.x * delta.x + delta.y * delta.y;

      if (distSq > this.activationDistance * this.activationDistance) {
        // Use the current mouse position at the time of activation.
        this.startPosition.x = e.pageX;
        this.startPosition.y = e.pageY;
        this.activateSorting();
      }
    },

    activateSorting() {
      const sortNode = this.nodeTracker.getNodes()[this.sortIndex];
      this.helperStartPosition.x = sortNode.offsetLeft;
      this.helperStartPosition.y = sortNode.offsetTop;
      this.helperTranslation.x = this.helperStartPosition.x;
      this.helperTranslation.y = this.helperStartPosition.y;
      this.sorting = true;
    },

    // Swaps places with the sort item and its neighbor, if one is available.
    // If the argument is truthy, the right-hand neighbor is swapped, otherwise
    // the left-hand one is swapped.
    moveSortItem(right) {
      if (right && this.sortIndex + 1 < this.value.length) {
        var x = this.value.splice(this.sortIndex, 1);
        this.value.splice(this.sortIndex + 1, 0, ...x);
        this.sortIndex += 1;
        this.$emit("input", this.value);
      }
      else if (!right && this.sortIndex > 0) {
        var x = this.value.splice(this.sortIndex - 1, 1);
        this.value.splice(this.sortIndex, 0, ...x);
        this.sortIndex -= 1;
        this.$emit("input", this.value);
      }
    },
  },

  components: {
    ListItem,
  },
}
</script>

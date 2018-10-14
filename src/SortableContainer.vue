<template>
  <div>
    <transition-group :name="transitionName" tag="div" :class="transitionGroupClass">
      <slot
        v-for="(listItem, index) in value"
        v-bind="{
          listItem,
          index,
          isGhost: sortIndex === index,
          helper: null,
          sorting,
          settling,
          startDrag: (e) => handleStart(e, index),
        }"
      />
    </transition-group>
    <transition :name="transitionName" @after-leave="helperAfterLeave">
      <slot
        name="helper"
        v-if="sorting"
        v-bind="{
          listItem: value[sortIndex],
          index: sortIndex,
          isGhost: false,
          helper,
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
            helper,
            sorting,
            settling,
            startDrag: () => {},
          }"
        />
      </slot>
    </transition>
  </div>
</template>

<script>
export default {
  data: () => ({
    sortIndex: null,
    sorting: false,
    settling: false,
    helper: {
    },
    activationTimer: null, // Tracker for when `activationDelay` is used
    startPosition: { x: 0, y: 0 }, // Tracker for when `activationDistance` is used
  }),

  props: {
    value: { type: Array, required: true },
    transitionName: { type: String, default: "dnd-list" },
    transitionGroupClass: { type: String, default: "dnd-transition-group" },
    activationDelay: { type: Number, default: 0 },
    activationDistance: { type: Number, default: 0 },
  },

  methods: {
    handleStart(e, index) {
      if (this.sortIndex !== null) {
        return;
      }

      this.sortIndex = index;

      window.addEventListener("mousemove", this.handleSortMove, true);
      window.addEventListener("mouseup", this.handleSortEnd, true);

      // If an activation delay is set, wait before entering the sorting phase.
      if (this.activationDelay > 0) {
        this.activationTimer = setTimeout(
          () => this.sorting = true,
          this.activationDelay
        );
      }
      // Set a frame of reference for when activation distance is used.
      else if (this.activationDistance > 0) {
        this.startPosition.x = e.pageX;
        this.startPosition.y = e.pageY;
      }
      // Neither activation delay nor -distance is used: activate immediately
      else {
        this.sorting = true;
      }
    },

    handleSortMove(e) {
      e.stopPropagation();

      // Sorting has not begun and we are not waiting for an activation delay.
      // This is when drag distance is used to activate sorting.
      if (!this.sorting && this.activationDelay === 0) {
        this.checkActivationDistanceConstraint(e);
      }

      if (!this.sorting) {
        return;
      }
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

    helperAfterLeave(el) {
      this.sortIndex = null;
      this.settling = false;
    },

    checkActivationDistanceConstraint(e) {
      const delta = {
        x: this.startPosition.x - e.pageX,
        y: this.startPosition.y - e.pageY,
      };

      const distSq = delta.x * delta.x + delta.y * delta.y;

      if (distSq > this.activationDistance * this.activationDistance) {
        this.sorting = true;
      }
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
}
</script>

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
          startDrag: () => handleStart(index),
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
    activationTimer: null,
  }),

  props: {
    value: { type: Array, required: true },
    transitionName: { type: String, default: "dnd-list" },
    transitionGroupClass: { type: String, default: "dnd-transition-group" },
    activationDelay: { type: Number, default: 0 },
  },

  methods: {
    handleStart(index) {
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
    },

    handleSortMove(e) {
      e.stopPropagation();

      if (!this.sorting && this.activationDelay === 0) {
        this.sorting = true;
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
  },
}
</script>

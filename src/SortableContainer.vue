<template>
  <transition-group :name="transitionName" tag="div">
    <slot
      v-for="(listItem, index) in value"
      v-bind="{
        listItem,
        index,
        isGhost: sortIndex === index,
        startDrag: () => handleStart(index),
      }"
    />
  </transition-group>
</template>

<script>
export default {
  data: () => ({
    sortIndex: null,
  }),

  props: {
    value: { type: Array, required: true },
    transitionName: { type: String, default: "dnd-list" },
  },

  methods: {
    handleStart(index) {
      if (this.sortIndex !== null) {
        return;
      }

      this.sortIndex = index;

      window.addEventListener("mousemove", this.handleSortMove, true);
      window.addEventListener("mouseup", this.handleSortEnd, true);
    },

    handleSortMove(e) {
      e.stopPropagation();
    },

    handleSortEnd(e) {
      e.stopPropagation();

      window.removeEventListener("mousemove", this.handleSortMove, true);
      window.removeEventListener("mouseup", this.handleSortEnd, true);
    },
  },
}
</script>

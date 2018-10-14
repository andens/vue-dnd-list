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
    helper: {
    },
  }),

  props: {
    value: { type: Array, required: true },
    transitionName: { type: String, default: "dnd-list" },
    transitionGroupClass: { type: String, default: "dnd-transition-group" },
  },

  methods: {
    handleStart(index) {
      if (this.sortIndex !== null) {
        return;
      }

      this.sortIndex = index;

      window.addEventListener("mousemove", this.handleSortMove, true);
      window.addEventListener("mouseup", this.handleSortEnd, true);

      this.sorting = true;
    },

    handleSortMove(e) {
      e.stopPropagation();
    },

    handleSortEnd(e) {
      e.stopPropagation();

      window.removeEventListener("mousemove", this.handleSortMove, true);
      window.removeEventListener("mouseup", this.handleSortEnd, true);

      this.sorting = false;
    },

    helperAfterLeave(el) {
      this.sortIndex = null;
    },
  },
}
</script>

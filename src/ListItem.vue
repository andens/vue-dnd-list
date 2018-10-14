<template>
  <div>
    <slot />
  </div>
</template>

<script>
export default {
  props: {
    index: { type: Number, required: true },
    helper: { type: Boolean, default: false },
  },

  inject: ["nodeTracker"],

  mounted() {
    if (this.helper === true) {
      this.nodeTracker.setHelperNode(this.$el);
    }
    else {
      this.nodeTracker.add(this.index, this.$el);
    }
  },

  beforeDestroy() {
    if (!this.helper) {
      this.nodeTracker.remove(this.index);
    }
  },

  watch: {
    index(newIndex) {
      if (!this.helper) {
        this.nodeTracker.remove(this.index);
        this.nodeTracker.add(this.index, this.$el);
      }
    },
  },
}
</script>

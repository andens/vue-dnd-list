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
  },
}
</script>

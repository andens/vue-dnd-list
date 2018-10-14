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
}
</script>

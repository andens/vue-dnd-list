<template>
  <transition-group tag="div">
    <slot v-for="(listItem, index) in value" v-bind="{listItem, index}" />
  </transition-group>
</template>

<script>
export default {
  props: {
    value: { type: Array, required: true },
  },
}
</script>

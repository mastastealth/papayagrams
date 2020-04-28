<template>
  <div class="letter">
    {{letter}}
  </div>
</template>

<script>
export default {
  data() {
    return {
      draggie: null,
    };
  },
  props: ['letter'],
  mounted() {
    const el = this.$el;
    const draggie = new Draggabilly(el, {
      containment: true,
      grid: [40, 40],
    });

    this.draggie = draggie;
  },
};
</script>

<style scoped>
.letter {
  cursor: pointer;
  height: 40px;
  font-size: 2em;
  line-height: 40px;
  margin: 0;
  width: 40px;
}
</style>

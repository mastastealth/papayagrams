<template>
  <div class="letter">
    {{letter}}{{backupLetter}}
  </div>
</template>

<script>
export default {
  data() {
    return {
      draggie: null,
      backupLetter: null,
    };
  },
  props: ['letter', 'letterData'],
  mounted() {
    const el = this.$el;
    const draggie = new Draggabilly(el, {
      containment: true,
      grid: [40, 40],
    });

    this.draggie = draggie;
    this.$emit('dragBoard', draggie);

    if (this.letterData) {
      this.backupLetter = this.letterData.letter;
      draggie.setPosition(this.letterData.pos.x, this.letterData.pos.y);
    }
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

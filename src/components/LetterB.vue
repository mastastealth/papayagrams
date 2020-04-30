<template>
  <div class="letter">
    {{letter.letter}}{{backupLetter}}
  </div>
</template>

<script>
export default {
  props: ['letterKey', 'letter', 'letterData', 'dumpMode'],
  data() {
    return {
      backupLetter: null,
      draggie: null,
    };
  },
  mounted() {
    const el = this.$el;
    const draggie = new Draggabilly(el, {
      containment: true,
      grid: [40, 40],
    });

    this.draggie = draggie;
    console.log(draggie);

    if (this.letterData) {
      this.backupLetter = this.letterData.letter;
      draggie.setPosition(0, 0);
    }

    draggie.on('dragEnd', (e, p) => {
      console.log(e, p, draggie);
    });
  },
  methods: {
    fakeClick(x, y) {
      if (this.dumpMode) this.$emit('dumpLetter', this.letterKey);
      if (y < -40 && this.$el.parentNode.classList.contains('hand')) {
        this.$emit('placeLetter', {
          key: this.letterKey,
          el: this.$el,
        });
      }

      this.x = x;
      this.y = y;
    },
  },
};
</script>

<style lang="scss" scoped>
.letter {
  cursor: pointer;
  height: 40px;
  font-size: 2em;
  line-height: 40px;
  margin: 0;
  position: absolute;
  width: 40px;
}

[data-letter="0"] {
  pointer-events: none;
  visibility: hidden;
}
</style>

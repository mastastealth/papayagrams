<template>
  <vue-draggable-resizable v-if="safeLetter" :data-letter="safeLetter"
    class="letter" :data-boardtile="posX ? true : false"
    :w="40" :h="40"
    :x="posX || 0" :y="posY || 0"
    :grid="posX >= 0 ? grid : [1,1]"
    :resizable="false"
    @dragstop="fakeClick"
  >
    {{safeLetter}}
  </vue-draggable-resizable>
</template>

<script>
import Vue from 'vue';
import VueDraggableResizable from 'vue-draggable-resizable';

Vue.component('vue-draggable-resizable', VueDraggableResizable);

export default {
  computed: {
    safeLetter() { return this.letter?.letter || this.letterData?.letter || null; },
  },
  components: {
    VueDraggableResizable,
  },
  data() {
    return {
      grid: [40, 40],
      posX: this.letterData?.pos.x,
      posY: this.letterData?.pos.y,
    };
  },
  props: ['letterKey', 'letter', 'letterData', 'dumpMode'],
  methods: {
    fakeClick(x, y) {
      if (this.dumpMode) {
        this.$emit('dumpLetter', {
          index: this.letterKey,
          board: !!this.letterData,
        });
      }
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
  width: 40px;
}

[data-boardtile] {
  box-shadow: 0 0 3px rgb(189, 104, 0);
  opacity: 0.9;
  position: absolute;
}

[data-letter="0"] {
  pointer-events: none;
  visibility: hidden;
}
</style>

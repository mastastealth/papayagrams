<template>
  <vue-draggable-resizable v-if="safeLetter" :data-letter="safeLetter"
    class="letter" :data-boardtile="position ? true : false"
    :w="40" :h="40"
    :x="posX" :y="posY"
    :grid="position ? grid : [1,1]"
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
  components: {
    VueDraggableResizable,
  },
  mounted() {
    // Animate non-board tiles
    if (this.position) return false;

    this.$el.classList.add('animated', 'bounceInUp');
    setTimeout(() => {
      this.$el.classList.remove('animated', 'bounceInUp');
    }, 1000 + (100 * this.letterKey));

    return true;
  },
  data() {
    return {
      grid: [40, 40],
    };
  },
  computed: {
    posX() { return this.position?.[0] ?? null; },
    posY() { return this.position?.[1] ?? null; },
    safeLetter() { return this.letter?.letter || this.letterData?.letter || null; },
  },
  props: ['letterKey', 'letter', 'letterData', 'dumpMode', 'position'],
  methods: {
    fakeClick(x, y) {
      if (this.dumpMode) {
        this.$emit('dumpLetter', {
          index: this.letterKey,
          board: !!this.position,
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

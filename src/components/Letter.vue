<template>
  <vue-draggable-resizable v-if="letter || backupLetter" :data-letter="letter"
    class="letter"
    :w="40" :h="40"
    :x="letterData ? letterData.pos.x : 0" :y="letterData ? letterData.pos.y : 0"
    :grid="[40,40]"
    :resizable="false"
    @dragstop="fakeClick"
  >
    {{letter}}{{backupLetter}}
  </vue-draggable-resizable>
</template>

<script>
import Vue from 'vue';
import VueDraggableResizable from 'vue-draggable-resizable';

Vue.component('vue-draggable-resizable', VueDraggableResizable);

export default {
  computed: {
    backupLetter() { return this.letterData?.letter || null; },
  },
  components: {
    VueDraggableResizable,
  },
  props: ['letterKey', 'letter', 'letterData', 'dumpMode'],
  methods: {
    fakeClick(x, y) {
      if (this.dumpMode) this.$emit('dumpLetter', this.letterKey);
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

[data-letter="0"] {
  pointer-events: none;
  visibility: hidden;
}
</style>

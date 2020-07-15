<template>
  <div id="app">
    <header :data-peel="peeling" :data-dump="dumpMode">
      <img src="logo.svg" alt="🇵" @click="resetGame">
      <h1>Papayagrams</h1>

      <aside v-if="conn || this.pile.length">
        <span class="dict" :class="{ valid:validWord }" :data-word="checkingWord">
          <input type="text" placeholder="Check word..." @keyup.enter="checkWord">
        </span>
        <span v-if="lobby"><strong>{{lobby}}</strong></span>
        <span class="pilecount" :class="pshake">
          <span class="letter">A</span> × {{pile.length}}
        </span>
      </aside>
    </header>

    <main>
      <!-- Header bar with the player names or greeting -->
      <div class="squad">
        <template v-if="players.length">
          <span
            v-for="(player, i) in players"
            :key="i"
            class="fruit animated"
            :class="winner.id == player.id ? 'pulse infinite' : 'bounceIn'"
            :data-color="player.name.split(' ')[0]"
            :data-fruit="player.name.split(' ')[1]"
            :data-isme="whoami.id == player.id"
            :data-winner="winner.id == player.id"
            :data-notwinner="winner && winner.id !== player.id"
          >
            {{player.name}}
            <span
              v-if="isHosting && player.id !== whoami.id"
              @click="kick(player.id)"
              class="close"
            >×</span>
          </span>
        </template>
        <template v-else>
          <span
            class="letter animated bounceInDown"
            v-for="(letter, i) in greeting()"
            :key="i"
            :style="`animation-delay: ${50 * i}ms`"
            v-once
          >
            {{letter}}
          </span>
        </template>
      </div>

      <!-- Tile area -->
      <div class="boards">
        <button v-if="!finished && myboard.length" class="resize" @click="resize">
          Auto Resize
        </button>

        <!-- "Winner" board -->
        <div class="player iswinner" v-if="finished && (winner || Object.keys(dboard).length)">
          <div
            class="winner"
            :style="scrollAreaWinner || scrollArea"
          >
            <Letter
              v-for="(tile, i) in dboard.win"
              :key="i"
              :letter="tile.letter"
              :position="tile.pos"
            />
          </div>
        </div>

        <div
          v-if="(mypile.length || myboard.length) && players.length"
          class="player"
        >
          <!-- Player board -->
          <div
            class="scroll"
            v-if="whoami.id !== winner.id"
            :style="(winner && scrollArea) ? resizeEndBoard(scrollArea) : scrollArea"
            ref="playerScroll"
          >
            <span
                v-if="winner"
                class="fruit"
                :data-color="whoami.name.split(' ')[0]"
                :data-fruit="whoami.name.split(' ')[1]"
                data-isme
                style="position: absolute; top: 5px; left: 5px;"
              >{{whoami.name}}</span>
            <Letter
              v-for="(letter, i) in myboard"
              :key="letter.id"
              :letter=letter
              :letterKey="i"
              :dumpMode="dumpMode"
              :position="myboardPos[letter.id]"
              @dumpLetter="dumpLetter"
              @backHand="backHand"
            />
          </div>

          <!-- Other player boards -->
          <template v-if="dboardLen">
            <div
              class="scroll others"
              v-for="player in Object.values(dboard).filter(p => p.board)"
              :key="player.who.id"
              :style="player.scrollArea"
            >
              <span
                class="fruit"
                :data-color="player.who.name.split(' ')[0]"
                :data-fruit="player.who.name.split(' ')[1]"
                style="position: absolute; top: 5px; left: 5px;"
              >{{player.who.name}}</span>
              <Letter
                v-for="(letter, i) in player.board"
                :key="letter.letter.id"
                :letter=letter.letter
                :letterKey="i"
                :position="letter.pos"
              />
            </div>
          </template>
        </div>

        <div v-else class="empty">
          <div v-if="!conn || mypile.length">
            <input
              type="text"
              class="customName"
              v-model="customName"
              maxlength="15"
              placeholder="Enter nickname..."
            >

            <template v-if="!isHosting">
              <input type="text" v-model="inputLobby" maxlength="5">
              <button @click="join" :disabled="!inputLobby">Join</button>
            </template>

            <button @click="host">Host</button>

            <button
              v-if="env === 'development'"
              @click="host(false)"
              style="background: var(--red)"
            >Solo Test</button>
          </div>

          <template v-if="conn && pile.length === 0">
            <span v-if="finished">
              No more papayas for you. <br>
              <small>
                <strong
                  class="animated flash slower infinite"
                  style="display: inline-block;"
                >🥭</strong>
                Waiting for the other players to finish...
              </small>
            </span>
            <span v-else>
              <strong class="animated heartBeat infinite" style="display: inline-block;">🥭</strong>
              Waiting for papayas...
            </span>
          </template>

          <span v-if="conn && pile.length && whoami.id">Papayas Ready.</span>
          <span v-if="conn && pile.length && !whoami.id">Loading papayas...</span>
        </div>
      </div>
    </main>

    <footer v-if="players.length > 0">
      <aside class="hand" v-if="!finished">
        <Letter
          v-for="(letter, i) in mypile"
          :key="letter.id"
          :letter=letter
          :letterKey="i"
          :dumpMode="dumpMode"
          @dumpLetter="dumpLetter"
          @placeLetter="placeLetter"
          :style="`animation-delay: ${myboard.length ? 0 : 50 * i}ms`"
        />
      </aside>

      <aside class="buttons" :class="{ done : finished }">
        <button
          v-if="(
            isHosting && pile.length === 144)
            || (whoami.id === 'test-mode' && pile.length === 14)
          "
          @click="split"
        >Split</button>

        <template v-if="!mypile.length && myboard.length > 0">
          <button
            v-if="pile.length >= activePlayers.length"
            @click="peel(false)"
            :disabled="peeling"
          >Peel</button>
          <button
            v-if="pile.length < activePlayers.length && !finished"
            @click="papaya(false)"
          >Papaya</button>
        </template>

        <button
          v-if="finished && myboard.length"
          style="background: var(--green); border: 1px solid darkgreen;"
          @click="resetGame(false)"
        >New Game</button>

        <button
          v-if="finished && (myboard.length || mypile.length) && whoami.id !== winner.id"
          style="background: var(--red);"
          @click="rotten"
        >Rotten Papaya</button>

        <button
          v-if="pile.length >= 3 && (mypile.length || myboard.length)"
          @click="dumpMode = !dumpMode"
          style="background: var(--red);"
        >Dump</button>
      </aside>
    </footer>

    <h6>
      Created by <a href="https://brianfran.co">Brian Franco</a>.
      Available on <a href="https://github.com/mastastealth/papayagrams">Github</a>.
      Inspired by <a href="https://bananagrams.com/games/bananagrams">Bananagrams</a>.</h6>
  </div>
</template>

<script>
import { Howl } from 'howler';
import Letter from './components/Letter.vue';

import gameplay from './lib/gameplay';
import net from './lib/net';

const sow = require('pf-sowpods/src/sowpods');

export default {
  name: 'App',
  components: {
    Letter,
  },
  created() {
    const methods = {
      ...gameplay,
      ...net,
    };

    // Bind all methods to this
    Object.keys(methods).forEach((fn) => {
      this[fn] = methods[fn].bind(this);
    });

    this.sound = new Howl({
      src: [require('./assets/sfx.mp3')], // eslint-disable-line
      sprite: {
        shuffle: [0, 1534],
        place: [1635, 300],
        dump: [2160, 300],
        peel: [2590, 700],
        zip: [3400, 400],
      },
      volume: 0.75,
    });
  },
  mounted() {
    if (window.location.pathname.length > 1) {
      this.inputLobby = window.location.pathname.replace('/', '');
      if (window.location.hash === '#host') {
        this.host(true, this.inputLobby);
      } else { this.join(); }
    }

    window.addEventListener('beforeunload', () => {
      this.dcGame();
    }, false);
  },
  data() {
    return {
      sow,
      peer: null,
      conn: null,
      inputLobby: null,
      customName: null,
      isHosting: false,
      players: [],
      letterTEST: { A: 5, B: 4, C: 1 },
      letters: {
        A: 13,
        B: 3,
        C: 3,
        D: 6,
        E: 18,
        F: 3,
        G: 4,
        H: 3,
        I: 12,
        J: 2,
        K: 2,
        L: 5,
        M: 3,
        N: 8,
        O: 11,
        P: 3,
        Q: 2,
        R: 9,
        S: 6,
        T: 9,
        U: 6,
        V: 3,
        W: 3,
        X: 2,
        Y: 3,
        Z: 2,
      },
      pile: [],
      mypile: [],
      myboard: [],
      myboardPos: {},
      otherpiles: {},
      scrollArea: false,
      scrollAreaWinner: false,
      whoami: null,
      colors: ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'white', 'black'],
      fruits: ['apple', 'pear', 'banana', 'melon', 'berry', 'lemon', 'lime', 'papaya', 'kiwi'],
      peeling: false,
      dboard: {},
      finished: false,
      dumpMode: false,
      lastDrop: null,
      winner: false,
      losers: [],
      pshake: false,
      sound: null,
      checkingWord: null,
      validWord: false,
    };
  },
  computed: {
    env() { return process.env.NODE_ENV; },
    lobby() { return this.inputLobby?.toUpperCase() || ''; },
    dboardLen() { return Object.keys(this.dboard).length; },
    activePlayers() { return this.players.filter((p) => !this.losers.includes(p.id)); },
  },
  methods: {
    greeting() {
      const n = Math.floor(Math.random() * Math.floor(6));
      const greetings = [
        'Hello',
        'Bienvenidos',
        'こんにちは',
        'Wassup',
        'Bonjour',
        'Hola',
      ];

      return greetings[n].toUpperCase().split('');
    },
    debug(...msg) {
      if (this.env === 'development') { console.log(...msg); }
    },
    resetGame(disconnect = false, receive = false) {
      this.dboard = {};
      this.myboard = [];
      this.mypile = [];
      this.myboardPos = {};
      this.otherpiles = {};
      this.pile = [];
      this.scrollArea = false;
      this.scrollAreaWinner = false;
      this.winner = false;
      this.losers = [];

      if (disconnect) {
        this.dcGame();
      } else {
        this.shuffle(true);
        if (this.whoami.id === 'test-mode') {
          this.pile.splice(0, 130);
        } else if (!receive) {
          this.send({ key: 'new', data: this.pile });
        }
        document.title = 'Papayagrams - Waiting...';
      }

      this.finished = false;
    },
    makeName() {
      const n = Math.floor(Math.random() * Math.floor(8));
      const nn = Math.floor(Math.random() * Math.floor(8));
      return `${this.colors[n]} ${this.fruits[nn]}`;
    },
    roundTo(num, r) {
      const resto = num % r;
      if (resto <= (r / 2)) return num - resto;
      return num + r - resto;
    },
    async resize() {
      const e = [null, null, null, null]; // Top, right, bottom, left
      const boardTiles = [];

      // Get boundaries
      this.$children.forEach((c) => {
        if (c.position !== undefined) {
          if (e[0] === null || e[0] > c.$children[0].top) e[0] = c.$children[0].top;
          if (e[1] === null || e[1] < c.$children[0].left + 40) e[1] = c.$children[0].left + 40;
          if (e[2] === null || e[2] < c.$children[0].top + 40) e[2] = c.$children[0].top + 40;
          if (e[3] === null || e[3] > c.$children[0].left) e[3] = c.$children[0].left;
          boardTiles.push(c);
        }
      });

      // Calculate and set new dimensions (6 tile padding)
      const h = e[2] - e[0];
      const w = e[1] - e[3];
      this.debug(`Play area was ${w / 40} by ${h / 40} tiles. Enlarging to ${(w + 400) / 40} by ${(h + 400) / 40} tiles.`);
      this.scrollArea = `height: ${h + 400 + 1}px; width: ${w + 400 + 1}px;`;
      await this.$nextTick();

      // Shift all previous tiles by 6 tiles top and left
      const savedPos = [];

      boardTiles.forEach((c) => {
        const realX = c.$children[0].left;
        const realY = c.$children[0].top;
        const newX = 200 + (realX - e[3]);
        const newY = 200 + (realY - e[0]);

        savedPos.push({
          realX, realY, newX, newY,
        });
        this.$set(this.myboardPos, c.letter.id, [0, 0]);
      });

      await this.$nextTick();

      boardTiles.forEach((c, i) => {
        const {
          realX, realY, newX, newY,
        } = savedPos[i];
        this.debug(`Moving tile [${c.letter.letter}] at ${realX}, ${realY} to ${newX}, ${newY}`, c);
        this.$set(this.myboardPos, c.letter.id, [newX, newY]);
      });
    },
    resizeEndBoard(css) {
      console.log(css);
      const w = parseInt(css.slice(22).split('px')[0], 10);
      const mw = (this.$el.querySelector('main').offsetWidth) * 0.35;
      const scale = (mw / w < 1) ? `transform: scale(${mw / w})` : '';
      return `${css}${css.endsWith(';') ? '' : '; '} ${scale}`;
    },
    backHand(letter) {
      this.myboard.splice(letter.i, 1);
      this.mypile.push(letter.a);
    },
    async checkWord(e) {
      this.checkingWord = e.target.value === '' ? null : e.target.value;
      this.validWord = this.sow.verify(e.target.value);
    },
  },
  watch: {
    pile() {
      this.pshake = 'animated tada';
      setTimeout(() => {
        this.pshake = false;
      }, 1000);
    },
  },
};
</script>

<style lang="scss">
:root {
  --orange: #EE8E12;
  --yellow: #FAC146;
  --red: #FF403E;
  --white: #FBF0D2;
  --green: #B4C919;
  --blue: rgb(25, 131, 201);
  --purple: rgb(81, 25, 201);
  --pink: rgb(195, 25, 201);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  overflow: hidden;
}

body {
  background: var(--white);
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  display: grid;
  grid-template-areas:
  "header"
  "body";
  grid-template-rows: 60px calc(100vh - 60px);
  grid-template-columns: 100%;
  height: 100%;
  overflow: hidden;
}

button {
  background: var(--orange);
  border: 1px solid darkred;
  border-radius: 5px;
  color: white;
  font-size: 1.5rem;
  padding: 10px 20px;

  &[disabled] {
    background: #999;
    border-color: #666;
    opacity: 0.75;
  }

  @media screen and (max-width: 480px) {
    font-size: 1rem;
    padding: 5px 10px;
  }
}

header {
  background: var(--green);
  box-shadow: 0 0 5px rgb(100, 66, 3);
  color: var(--white);
  display: flex;
  grid-area: header;
  padding: 0 20px;
  position: relative;
  z-index: 2;

  @media screen and (max-width: 480px) {
    padding: 0 10px;
  }

  h1 {
    line-height: 60px;
    @media screen and (max-width: 700px) {
      display: none
    }
  }

  img {
    display: inline-block;
    margin-right: 10px;
    max-width: 40px;
    vertical-align: middle;
  }

  aside {
    align-items: center;
    display: flex;
    font-size: 1.25em;
    justify-self: flex-end;
    margin-left: auto;

    @media screen and (max-width: 480px) {
      font-size: 1em;

      strong {
        display: inline-block;
        position: relative;
        top: -10px;
      }
    }
  }

  .pilecount {
    border-radius: 3px;
    cursor: pointer;
    padding: 5px 10px 5px 5px;

    &:hover {
      background: var(--orange);
    }

    @media screen and (max-width: 480px) {
      word-spacing: -1px;
      position: absolute;
      right: 0; bottom: 5px;

      .letter {
        font-size: 12px;
        line-height: 17px;
        height: 17px;
        width: 17px;
      }
    }
  }

  &:before {
    background: var(--yellow);
    color: black;
    content: 'PEEL!';
    font-size: 3em;
    height: 100%;
    position: absolute;
    top: 0; left: 0;
    text-align: center;
    transition: transform 0.2s;
    transform: translateY(-100%);
    width: 100%;
  }

  &[data-peel]:before {
    transform: translateY(0);
  }

  &[data-dump]:before {
    background: var(--red);
    content: 'Select a letter to DUMP.';
    transform: translateY(0);
  }

  .dict {
    flex-grow: 1;
    margin-right: 20px;
    max-width: 180px;

    input {
      font-size: 0.9em;
      height: 40px;
      padding: 0 5px;
      text-align: left;
      text-transform: none;
      width: 100%;

      &:not(:placeholder-shown) { text-transform: uppercase; }
    }

    &.valid input { border-color: var(--blue); }
    &[data-word]:not(.valid) input { border-color: var(--red); }
  }
}

main {
  display: flex;
  flex-direction: column;
  grid-area: body;
  height: 100%;
  padding: 20px;
}

.squad {
  margin-bottom: 10px;

  .letter {
    margin: 2px;
  }
}

.fruit {
  border: 1px solid black;
  border-radius: 3px;
  color: white;
  display: inline-block;
  margin-right: 3px;
  padding: 5px 10px;
  text-transform: uppercase;

  &[data-isme]:before { content: '🌟'; margin-right: 5px; }

  &:nth-of-type(1) {
    background: var(--red);
  }

  &:nth-of-type(2) {
    background: var(--orange);
  }

  &:nth-of-type(3) {
    background: var(--yellow);
  }

  &:nth-of-type(4) {
    background: var(--green);
    border: 1px solid darkgreen;
  }

  &[data-notwinner] {
    border-color: #999 !important;
    background: #CCC !important;
    color: #999 !important;
  }

  &[data-color="red"] {
    background: var(--red);
  }

  &[data-color="orange"] {
    background: var(--orange);
  }

  &[data-color="yellow"] {
    background: var(--yellow);
  }

  &[data-color="green"] {
    background: var(--green);
    border: 1px solid darkgreen;
  }

  &[data-color="blue"] {
    background: var(--blue);
    border: 1px solid darkblue;
  }

  &[data-color="purple"] {
    background: var(--purple);
  }

  &[data-color="pink"] {
    background: var(--pink);
  }

  &[data-color="white"] {
    background: white;
    border: 1px solid #CCC;
    color: #666;
  }

  &[data-color="black"] {
    background: #222;
  }

  .close {
    background: rgba(0,0,0, 0.2);
    border-radius: 100%;
    cursor: pointer;
    display: inline-block;
    font-size: 16px;
    line-height: 19px;
    text-align: center;
    width: 19px;
  }
}

.letter {
  background: var(--white);
  border: 1px solid var(--orange);
  border-radius: 2px;
  color: black;
  display: inline-block;
  height: 24px;
  line-height: 24px;
  margin: 2px 5px;
  text-align: center;
  user-select: none;
  width: 24px;
}

input, button {
  display: block;
  font-size: 1.5rem;
  height: 50px;
  width: 300px;
}

input {
  text-align: center;
  text-transform: uppercase;

  &.customName {
    margin-bottom: 50px;
    text-transform: inherit;
  }
}

.boards {
  border: 1px solid var(--orange);
  display: flex;
  height: calc(100% - 80px);
  position: relative;

  .empty {
    align-items: center;
    background: var(--yellow);
    color: var(--orange);
    display: flex;
    font-size: 48px;
    height: 100%;
    justify-content: center;
    max-width: 100%;
    text-align: center;
    width: 100%;

    small {
      font-size: 0.5em;
    }
  }

  button {
    margin-bottom: 20px;
  }

  .resize {
    font-size: 1rem;
    padding: 5px 10px;
    position: absolute;
    top: 5px; right: 25px;
    width: auto;
    z-index: 1;

    @media screen and (max-width: 480px) {
      height: 40px;
      right: 5px;
    }
  }

  .player {
    background: var(--yellow);
    display: grid;
    height: 100%;
    overflow: auto;
    place-items: center;

    @media screen and (max-width: 480px) {
      display: block;
    }

    &:only-of-type {
      width: 100%;
    }

    > div {
      background-size: 40px 40px;
      background-image:
        linear-gradient(to right, var(--white) 1px, transparent 1px),
        linear-gradient(to bottom, var(--white) 1px, transparent 1px);
      box-shadow: 0 0 10px rgb(189, 104, 0);
      min-height: 481px;
      min-width: 481px;
      position: relative;
    }
  }

  .winner, [data-winner] {
    background: var(--green);
    z-index: 1;
  }

  .iswinner {
    background-color: var(--green);
    border-right: 1px solid darkgreen;
    flex-shrink: 0;
    width: 60%;

    > div { box-shadow: 0 0 10px rgb(5, 66, 1); }

    // Loser boards on the right side
    + .player {
      padding: 10px;
      padding-right: 0;
      width: 40%;
    }

    + .player > .scroll {
      justify-self: flex-start;
      transform-origin: left center;
    }
  }
}

footer {
  align-items: center;
  background: var(--green);
  bottom: 0; left: 0;
  box-shadow: 0 0 5px rgb(100, 66, 3);
  display: flex;
  padding: 5px 20px;
  position: fixed;
  user-select: none;
  width: 100%;
  z-index: 2;

  @media screen and (max-width: 480px) {
    flex-direction: column;
  }

  button {
    margin: 0 5px;
    padding: 10px 50px;

    @media screen and (max-width: 480px) {
      padding: 10px 30px;
    }
  }

  .hand {
    flex-grow: 1;

    @media screen and (max-width: 480px) {
      margin-bottom: 5px;
    }
  }

  .done:before {
    animation: tempBlock 3s;
    animation-fill-mode: forwards;
    background: var(--green);
    content: '';
    height: 100%;
    opacity: 0.5;
    position: absolute;
    top: 0; left: 0;
    width: 100%;
  }
}

@keyframes tempBlock {
  0%, 99% { top: 0; }
  100% { top: 100%; }
}

h6 {
  color: var(--yellow);
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);

  a { color: var(--orange); }
}
</style>

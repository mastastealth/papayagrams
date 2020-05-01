<template>
  <div id="app">
    <header :data-peel="peeling" :data-dump="dumpMode">
      <h1>Papayagrams</h1>

      <aside>
        <span v-if="lobby"><strong>{{lobby}}</strong> - </span>
        <span class="letter">A</span> × {{pile.length}}
      </aside>
    </header>

    <main>
      <div class="squad">
        <template v-if="pile.length && players.length">
          <span
            v-for="(player, i) in players"
            :key="i"
            class="fruit"
            :data-color="player.split(' ')[0]"
            :data-fruit="player.split(' ')[1]"
            :data-isme="whoami == player"
            :data-winner="winner == player"
          >{{player}}</span>
        </template>
        <template v-else>
          <span class="letter" v-for="(letter, i) in greeting()" :key="i">{{letter}}</span>
        </template>
      </div>
      <div class="boards">
        <div v-if="(mypile.length || myboard.length) && players.length" class="player">
          <div
            class="scroll"
            :style="scrollArea"
            v-show="!scrollAreaWinner"
            ref="playerScroll"
          >
            <Letter
              v-for="(letter, i) in myboard"
              :key="letter.id"
              :letter=letter
              :letterKey="i"
              :dumpMode="dumpMode"
              :position="myboardPos[letter.id]"
              @dumpLetter="dumpLetter"
            />
          </div>
          <div class="winner" v-if="finished && dboard.length" :style="scrollAreaWinner">
            <Letter
              v-for="(letter, i) in dboard"
              :key="i"
              :letterData="dboard[i]"
            />
          </div>
        </div>
        <div v-else class="empty">
          <div v-if="!conn || mypile.length">
            <button @click="host">Host</button>

            <template v-if="!isHosting">
              <input type="text" v-model="lobby" maxlength="5">
              <button @click="join">Join</button>
            </template>
          </div>
          <template v-if="conn && pile.length === 0">
            <span v-if="finished">No more papayas for you.</span>
            <span v-else>Waiting for papayas...</span>
          </template>
          <span v-if="conn && pile.length">Papayas Ready.</span>
        </div>
      </div>
    </main>

    <footer v-if="players.length > 0 ">
      <aside class="hand" v-if="!finished">
        <Letter
          v-for="(letter, i) in mypile"
          :key="letter.id"
          :letter=letter
          :letterKey="i"
          :dumpMode="dumpMode"
          @dumpLetter="dumpLetter"
          @placeLetter="placeLetter"
        />
      </aside>

      <aside class="buttons">
        <button
          v-if="isHosting && pile.length === 144"
          @click="split"
        >Split</button>

        <template v-if="!mypile.length && myboard.length > 0">
          <button
            v-if="pile.length >= players.length"
            @click="peel(false)"
            :disabled="peeling"
          >Peel</button>
          <button
            v-if="pile.length < players.length && !finished"
            @click="papaya(false)"
          >Papaya</button>
        </template>

        <button
          v-if="finished"
          style="background: var(--red);"
          @click="rotten"
        >Rotten Papaya</button>

        <button
          v-if="pile.length >= 3 && (mypile.length || myboard.length)"
          @click="dumpMode = !dumpMode"
          style="background: var(--red);"
        >Dump</button>

        <button v-if="myboard.length" @click="resize">↔️</button>
      </aside>
    </footer>
  </div>
</template>

<script>
import Letter from './components/Letter.vue';

export default {
  name: 'App',
  components: {
    Letter,
  },
  data() {
    return {
      peer: null,
      conn: null,
      lobby: null,
      isHosting: false,
      players: [],
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
      colors: ['red', 'orange', 'yellow', 'green', 'blue', 'purple'],
      fruits: ['apple', 'pear', 'banana', 'melon', 'berry', 'lemon'],
      peeling: false,
      dboard: [],
      finished: false,
      dumpMode: false,
      lastDrop: null,
      winner: false,
    };
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
    host() {
      this.lobby = Math.random().toString(36).substr(2, 5).toUpperCase();
      this.peer = new Peer(`papaya${this.lobby}`, {
        debug: 2,
        config: {
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        },
      });
      this.isHosting = true;
      this.whoami = this.makeName();
      this.players.push(this.whoami);
      this.shuffle(true);
      this.conn = [];

      // When another player connects
      this.peer.on('connection', (conn) => {
        // Listen for data from that player
        conn.on('data', (data) => {
          this.gotData(conn, data);
        });
      });
    },
    join() {
      this.peer = new Peer({ debug: 2 });
      const conn = this.peer.connect(`papaya${this.lobby.toUpperCase()}`, { reliable: true });
      this.conn = conn;
      this.whoami = this.makeName();
      this.players.push(this.whoami);

      conn.on('open', () => {
        conn.send({ key: 'connected' });
      });

      conn.on('data', (data) => {
        this.gotData(conn, data);
      });

      setTimeout(() => {
        if (this.pile.length === 0) {
          console.warn('Connection failed.');
          this.peer.destroy();
          this.resetMP();
        }
      }, 10000);
    },
    gotData(conn, data) {
      console.log('Data received.', data);

      switch (data.key) {
        case 'connected':
          // Send the pile of letters
          conn.send({ key: 'pile', data: this.pile });
          break;
        case 'success':
          // Add player who successfully joined
          this.players.push(data.data);
          this.conn.push(conn);
          this.conn.forEach((c) => {
            c.send({ key: 'players', data: this.players });
          });
          break;
        case 'pile':
          this.pile = data.data;
          conn.send({ key: 'success', data: this.whoami });
          break;
        case 'players':
          this.players = [...data.data];
          break;
        case 'split':
          this.split();
          break;
        case 'peel':
          if (data.data === 'nothost') this.peel();
          if (data.data === 'host') this.peel(true);
          break;
        case 'dump':
          this.dumpLetter(data.data, true);
          break;
        case 'papaya':
          this.papaya(data.data);
          break;
        case 'rotten':
          this.rotting(data.data);
          break;
        case 'ilied':
          this.rotPlayer(data.data);
          break;
        default:
          break;
      }
    },
    resetMP() {
      this.conn = null;
      this.peer = null;
      this.lobby = null;
      this.isHosting = false;
      this.players = [];
      this.whoami = null;
    },
    makeName() {
      const n = Math.floor(Math.random() * Math.floor(6));
      const nn = Math.floor(Math.random() * Math.floor(6));
      return `${this.colors[n]} ${this.fruits[nn]}`;
    },
    shuffle(fresh = false) {
      if (fresh) {
        Object.keys(this.letters).forEach((letter) => {
          for (let i = 0; i < this.letters[letter]; i += 1) {
            this.pile.push({
              letter,
              id: `${letter}-${i}`,
            });
          }
        });
      }

      // Durstenfled shuffle
      for (let i = this.pile.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.pile[i], this.pile[j]] = [this.pile[j], this.pile[i]];
      }
    },
    split() {
      if (this.isHosting) {
        // Send player list to everyone on split
        this.conn.forEach((c) => {
          c.send({ key: 'split', data: this.players });
        });
      }

      this.players.sort(); // Get the same array?

      let count = (this.players.length <= 4) ? 21 : 15; // 5-6 players
      if (this.players.length >= 7) count = 11;
      // if (this.players.length === 2) count = 70; // 2P Testing

      this.players.forEach((p) => {
        if (p === this.whoami) {
          for (let i = 0; i < count; i += 1) {
            this.mypile.push(this.pile.pop());
          }
        } else {
          if (!this.otherpiles[p]) this.otherpiles[p] = [];
          for (let i = 0; i < count; i += 1) {
            this.otherpiles[p].push(this.pile.pop());
          }
        }
      });

      // Fix scroll area so we can't jack it up later
      setTimeout(() => {
        const myScroll = document.querySelector('.scroll');
        this.scrollArea = `height: ${myScroll.offsetHeight}px; width: ${myScroll.offsetWidth}px`;
      }, 300);
    },
    peel(receive = false) {
      this.peeling = true;

      if (receive) {
        this.players.forEach((p) => {
          if (p === this.whoami) {
            this.mypile.push(this.pile.pop());
          } else {
            this.otherpiles[p].push(this.pile.pop());
          }
        });

        setTimeout(() => {
          this.peeling = false;
        }, 1000);
      }

      if (!receive) {
        // Send out call to peel
        if (this.isHosting) {
          this.conn.forEach((c) => {
            c.send({ key: 'peel', data: 'host' });
          });

          this.peel(true);
        } else {
          // Tell host to peel for you
          this.conn.send({ key: 'peel', data: 'nothost' });
        }
      }
    },
    dumpLetter(data, receive = false) {
      const index = data.index ?? null;
      const board = data.board ?? null;

      if (data.whoami === this.whoami) return false;
      let dumped;

      if (receive) {
        if (data.whoami !== this.whoami) this.pile = [...data.pile];
      } else {
        dumped = this[board ? 'myboard' : 'mypile'][index];

        // Grab 3
        this.mypile.push(this.pile.pop());
        this.mypile.push(this.pile.pop());
        this.mypile.push(this.pile.pop());

        // Put it back
        this.pile.push(dumped);
        this.shuffle();

        // Delete it
        this[board ? 'myboard' : 'mypile'].splice(index, 1);

        this.dumpMode = false;
      }

      if (this.isHosting) {
        this.conn.forEach((c) => {
          c.send({
            key: 'dump',
            data: {
              pile: this.pile,
              whoami: (receive) ? index.whoami : this.whoami,
            },
          });
        });
      } else {
        if (receive) return false;
        this.conn.send({
          key: 'dump',
          data: {
            pile: this.pile,
            whoami: this.whoami,
          },
        });
      }

      return true;
    },
    placeLetter(data) {
      const { key: index, el } = data;
      const scroll = this.$refs.playerScroll.getBoundingClientRect();
      const tile = el.getBoundingClientRect();
      const x = this.roundTo(tile.x - scroll.x, 40); // x position within the element.
      const y = this.roundTo(tile.y - scroll.y, 40); // y position within the element.

      const newLetter = this.mypile.splice(index, 1);
      this.$set(this.myboardPos, newLetter[0].id, [x, y]);
      this.myboard.push(...newLetter);
    },
    papaya(receive = false) {
      if (!receive) {
        const board = [];

        this.$children.forEach((c) => {
          if (c.letter) {
            board.push({
              pos: { x: c.$children[0].left, y: c.$children[0].top },
              letter: c.letter.letter,
            });
          }
        });

        const papaya = {
          key: 'papaya',
          data: {
            who: this.whoami,
            board,
            scrollArea: this.scrollArea,
          },
        };

        // Send out call to finish
        if (this.isHosting) {
          this.conn.forEach((c) => {
            c.send(papaya);
          });
        } else {
          // Tell host to finish for you
          this.conn.send(papaya);
        }

        this.winner = this.whoami;
      } else {
        if (receive.who === this.whoami) return false;

        this.dboard = receive.board;
        this.scrollAreaWinner = receive.scrollArea;
        this.winner = receive.who;

        if (this.isHosting) {
          this.conn.forEach((c) => {
            c.send({ key: 'papaya', data: receive });
          });
        }
      }

      this.finished = true;
      return true;
    },
    rotten() {
      // Host makes the call
      if (this.isHosting) {
        if (this.winner === this.whoami) {
          this.rotting(this.whoami);
        } else {
          this.conn.forEach((c) => {
            c.send({ key: 'rotten', data: this.winner });
          });
        }
      }
    },
    rotting(who) {
      if (who !== this.whoami) return false;
      // The fake winner now clears his board and sends his pile back
      if (this.isHosting) {
        if (this.isHosting) {
          this.conn.forEach((c) => {
            c.send({ key: 'ilied', data: this.myboard });
          });
        }
      } else {
        this.conn.send({ key: 'ilied', data: this.myboard });
      }

      this.winner = false;
      this.mypile = [];
      this.myboard = [];
      this.dboard = [];

      return true;
    },
    rotPlayer(data) {
      // Add all the pieces of rotten papaya back into pile
      data.forEach((tile) => {
        this.pile.push(tile);
      });

      this.winner = false;
      this.finished = false;
      this.scrollAreaWinner = false;

      // Tell everyone else to do it too
      if (this.isHosting) {
        this.conn.forEach((c) => {
          c.send({ key: 'ilied', data });
        });
      }
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
      console.log(`Play area was ${w / 40} by ${h / 40} tiles. Enlarging to ${(w + 400) / 40} by ${(h + 400) / 40} tiles.`);
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
        console.log(`Moving tile [${c.letter.letter}] at ${realX}, ${realY} to ${newX}, ${newY}`, c);
        this.$set(this.myboardPos, c.letter.id, [newX, newY]);
      });
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
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
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
}

header {
  background: var(--green);
  box-shadow: 0 0 5px rgb(100, 66, 3);
  color: var(--white);
  display: flex;
  grid-area: header;
  padding: 0 20px;
  position: relative;

  h1 {
    line-height: 60px;
    @media screen and (max-width: 480px) {
      font-size: 24px;
    }
  }

  aside {
    align-items: center;
    display: flex;
    font-size: 1.25em;
    justify-self: flex-end;
    margin-left: auto;
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

  .fruit {
    border: 1px solid black;
    border-radius: 3px;
    color: white;
    display: inline-block;
    margin-right: 3px;
    padding: 5px 10px;
    text-transform: uppercase;

    &[data-isme]:after { content: '🌟'; margin-left: 5px; }

    &[data-winner] { transform: scale(1.5); }

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
    width: 100%;
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
  }

  button {
    margin-bottom: 20px;
  }

  .player {
    align-items: center;
    background: var(--yellow);
    display: flex;
    height: 100%;
    flex-grow: 1;
    justify-content: center;
    max-width: 50%;
    overflow: auto;

    &:not(:last-child) {
      margin-right: 10px;
    }

    &:only-child {
      max-width: 100%;
    }

    > div {
      background-size: 40px 40px;
      background-image:
        linear-gradient(to right, var(--white) 1px, transparent 1px),
        linear-gradient(to bottom, var(--white) 1px, transparent 1px);
      min-height: 481px;
      min-width: 481px;
      position: relative;
    }
  }

  .winner {
    background: var(--green);
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

  button {
    margin: 0 5px;
    padding: 10px 50px;
  }

  .hand {
    flex-grow: 1;
  }
}
</style>

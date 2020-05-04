<template>
  <div id="app">
    <header :data-peel="peeling" :data-dump="dumpMode">
      <img src="logo.svg" alt="🇵" @click="resetGame">
      <h1>Papayagrams</h1>

      <aside v-if="conn || this.pile.length">
        <span v-if="lobby"><strong>{{lobby}}</strong> - </span>
        <span @click="showDictionary = !showDictionary" class="pilecount" :class="pshake">
          <span class="letter">A</span> × {{pile.length}}
        </span>
      </aside>
    </header>

    <!-- Hacky iframe for now, maybe use a proper API if this becomes bigger? -->
    <iframe
      v-if="showDictionary"
      class="dic"
      src="//scrabble.hasbro.com/en-us/tools#dictionary"
      frameborder="0" scrolling="no"
    ></iframe>

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
          >{{player.name}}</span>
        </template>
        <template v-else>
          <span
            class="letter animated bounceInDown"
            v-for="(letter, i) in greeting()"
            :key="i"
            :style="`animation-delay: ${50 * i}ms`"
          >
            {{letter}}
          </span>
        </template>
      </div>

      <!-- Tile area -->
      <div class="boards">
        <button v-if="myboard.length" class="resize" @click="resize">Auto Resize</button>

        <!-- "Winner" board -->
        <div class="player iswinner" v-if="finished && dboard.length">
          <div
            class="winner"
            :style="scrollAreaWinner"
          >
            <Letter
              v-for="(tile, i) in dboard"
              :key="i"
              :letter="tile.letter"
              :position="tile.pos"
            />
          </div>
        </div>

        <div
          v-if="(mypile.length || myboard.length) && players.length"
          class="player"
          :data-haswinner="!!winner"
        >
          <!-- Player board -->
          <div
            class="scroll"
            :data-winner="whoami.id === winner.id"
            :style="scrollArea"
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
        </div>

        <div v-else class="empty">
          <div v-if="!conn || mypile.length">
            <button @click="host">Host</button>

            <template v-if="!isHosting">
              <input type="text" v-model="inputLobby" maxlength="5">
              <button @click="join">Join</button>
            </template>

            <button
              v-if="env === 'development'"
              @click="host(false)"
              style="background: var(--red)"
            >Solo Test</button>
          </div>

          <template v-if="conn && pile.length === 0">
            <span v-if="finished">No more papayas for you.</span>
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
          :style="`animation-delay: ${myboard.length ? 0 : 50 * i}ms`"
        />
      </aside>

      <aside class="buttons">
        <button
          v-if="(
            isHosting && pile.length === 144)
            || (whoami.id === 'test-mode' && pile.length === 14)
          "
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
          v-if="finished && myboard.length"
          style="background: var(--green); border: 1px solid darkgreen;"
          @click="resetGame(false)"
        >New Game</button>

        <button
          v-if="finished && myboard.length && whoami.id !== winner.id"
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
  </div>
</template>

<script>
import Letter from './components/Letter.vue';

export default {
  name: 'App',
  components: {
    Letter,
  },
  mounted() {
    if (window.location.pathname.length > 1) {
      this.inputLobby = window.location.pathname.replace('/', '');
      if (window.location.hash === '#host') { this.host(); } else { this.join(); }
    }
  },
  data() {
    return {
      peer: null,
      conn: null,
      inputLobby: null,
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
      dboard: [],
      finished: false,
      dumpMode: false,
      lastDrop: null,
      winner: false,
      showDictionary: false,
      pshake: false,
    };
  },
  computed: {
    env() { return process.env.NODE_ENV; },
    lobby() { return this.inputLobby?.toUpperCase() || ''; },
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
    createConnection() {
      // Pubnub style
      this.$pnSubscribe({
        channels: [`papaya${this.lobby}`],
        withPresence: true,
      });

      this.conn = 'wait';
      this.$pnGetMessage(`papaya${this.lobby}`, this.gotData);
      this.$pnGetPresence(`papaya${this.lobby}`, this.gotPresence);
      this.$pnGetStatus(this.gotStatus);

      this.whoami = {
        name: this.makeName(),
        id: this.$pnGetInstance().getUUID(),
      };

      this.players.push(this.whoami);
      document.title = 'Papayagrams - Waiting...';
    },
    host(online = true) {
      this.inputLobby = Math.random().toString(36).substr(2, 5).toUpperCase();
      this.conn = [];
      this.isHosting = true;
      this.shuffle(true);

      if (online) {
        this.createConnection();
      } else {
        // Dummy user
        this.whoami = {
          name: this.makeName(),
          id: 'test-mode',
        };

        this.players.push(this.whoami);
        this.pile.splice(0, 130);
      }
    },
    join() {
      this.createConnection();
    },
    gotPresence(ps) {
      this.debug('Presence:', ps);

      // Received broadcast
      if (
        ps.uuid !== this.whoami.id
        && ps.action === 'state-change'
        && ps.state?.iamhere
      ) {
        // Add new player that has broadcasted themself
        const newuser = ps.state.iamhere;
        if (!this.players.some((p) => newuser.id === p.id)) this.players.push(newuser);
        // If host, send the pile of letters to new client
        if (this.isHosting) {
          this.send({
            key: 'pile',
            data: {
              pile: this.pile,
              players: this.players,
            },
          });
        }
      }

      // Remove a player that has left/timed out
      if (ps.action === 'leave' || ps.action === 'timeout') {
        let left = null;
        this.players.forEach((p, i) => {
          if (ps.uuid === p.id) left = i;
        });

        if (left !== null) this.players.splice(left, 1);
      }
    },
    gotData(d) {
      const data = d.message || d;
      console.info('Data received.', d);

      // Don't listen for events sent from yourself
      if (d.publisher === this.whoami.id) return false;
      this.debug('Data Action Performed:', data.key, data.data);

      switch (data.key) {
        case 'pile':
          // Set the pile from host
          if (!this.pile.length) this.pile = data.data.pile;
          // Check for players we don't know about, and add them
          data.data.players.forEach((all) => {
            if (!this.players.some((p) => all.id === p.id)) {
              this.players.push(all);
            } else {
              this.players.forEach((p, j) => {
                if (p.id === all.id) this.players[j] = all;
              });
            }
          });
          break;
        case 'split':
          // Only split with a full pile (new game)
          if (this.pile.length === 144) this.split();
          break;
        case 'peel':
          this.peel(data.data);
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
        case 'new':
          this.resetGame(false, true);
          this.pile = [...data.data];
          break;
        default:
          break;
      }

      return true;
    },
    gotStatus(s) {
      this.debug('Status:', s);

      // Broadcast self when status is connected
      if (s.category === 'PNConnectedCategory') {
        this.conn = 'success';
        this.$pnGetInstance().setState({
          state: { iamhere: this.whoami },
          channels: [`papaya${this.lobby}`],
        });

        setTimeout(() => {
          if (this.conn === 'wait' || !this.pile.length) {
            console.warn('Timed out waiting.');
            this.resetGame(true);
          }
        }, 10000);
      }
    },
    resetGame(disconnect = false, receive = false) {
      this.myboard = [];
      this.mypile = [];
      this.myboardPos = {};
      this.otherpiles = {};
      this.pile = [];
      this.scrollArea = false;
      this.scrollAreaWinner = false;
      this.winner = false;

      if (disconnect) {
        this.$pnGetInstance().unsubscribeAll();
        this.conn = null;
        this.peer = null;
        this.inputLobby = null;
        this.isHosting = false;
        this.players = [];
        this.whoami = null;
        document.title = 'Papayagrams';
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
    async split() {
      // Send player list to everyone on split
      if (this.isHosting) this.send({ key: 'split', data: this.players });

      // Get the same array?
      this.players.sort((a, b) => {
        if (a.id < b.id) return -1;
        if (a.id > b.id) return 1;
        // names must be equal
        return 0;
      });

      let count = (this.players.length <= 4) ? 21 : 15; // 5-6 players
      if (this.players.length >= 7) count = 11;

      // Testing modes
      if (this.players.length === 1) count = 10;
      if (this.players.length === 2 && this.env) {
        this.pile.splice(0, 120);
        count = 10;
      }

      const me = this.whoami.id;
      this.players.forEach((p) => {
        if (p.id === me) {
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

      await this.$nextTick();

      // Fix scroll area so we can't jack it up later
      const myScroll = document.querySelector('.scroll');
      this.scrollArea = `height: ${myScroll.offsetHeight}px; width: ${myScroll.offsetWidth}px`;

      document.title = `Papayagrams (${this.pile.length})`;
    },
    peel(receive = false) {
      this.peeling = true;

      this.players.forEach((p) => {
        if (p.id === this.whoami.id) {
          this.mypile.push(this.pile.pop());
        } else {
          this.otherpiles[p].push(this.pile.pop());
        }
      });

      setTimeout(() => {
        this.peeling = false;
      }, 1000);

      if (!receive) this.send({ key: 'peel', data: true });
      document.title = `Papayagrams (${this.pile.length})`;
    },
    dumpLetter(data, receive = false) {
      if (receive) {
        this.pile = [...data];
      } else {
        const index = data.index ?? null;
        const board = data.board ?? null;
        const dumped = this[board ? 'myboard' : 'mypile'][index];

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

        // Now tell everyone to update their pile
        this.send({
          key: 'dump',
          data: this.pile,
        });
      }

      document.title = `Papayagrams (${this.pile.length})`;
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
              pos: [c.$children[0].left, c.$children[0].top],
              letter: c.letter,
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

        this.send(papaya);

        this.winner = this.whoami;
      } else {
        this.dboard = receive.board;
        this.scrollAreaWinner = receive.scrollArea;
        this.winner = receive.who;
      }

      this.finished = true;
    },
    rotten() {
      // If I AM rotten, start rotting
      if (this.winner.id === this.whoami.id) {
        this.rotting(this.whoami);
      }

      // Let everyone know something is rotten
      this.send({ key: 'rotten', data: this.winner });
    },
    rotting(who) {
      // Don't rot if you aren't the fake winner
      if (who.id !== this.whoami.id) return false;

      // The fake winner now clears his board and sends his pile back
      this.send({ key: 'ilied', data: this.myboard });
      this.winner = false;
      this.mypile = [];
      this.myboard = [];
      this.dboard = [];

      return true;
    },
    rotPlayer(board) {
      // Add all the pieces of rotten papaya back into pile
      board.forEach((tile) => {
        this.pile.push(tile);
      });

      this.winner = false;
      this.finished = false;
      this.scrollAreaWinner = false;
      document.title = `Papayagrams (${this.pile.length})`;
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
    send(message) {
      // Don't send stuff if you start a solo game
      if (this.players.length === 1 && this.pile.length < 144) return false;

      this.$pnPublish({
        channel: `papaya${this.lobby}`,
        message,
      },
      (status, response) => {
        this.debug('Published:', status, response);
      });

      return true;
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

.dic {
  position: fixed;
  top: 60px; right: 0;
  height: calc(100vh - 60px);
  width: 400px;
  z-index: 1;
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
    @media screen and (max-width: 480px) {
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
    }
  }

  .pilecount {
    border-radius: 3px;
    cursor: pointer;
    padding: 5px 10px 5px 5px;

    &:hover {
      background: var(--orange);
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
  }

  .letter {
    margin: 2px;
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
}
</style>

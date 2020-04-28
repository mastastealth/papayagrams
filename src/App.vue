<template>
  <div id="app">
    <header>
      <h1>Papayagrams</h1>

      <aside>
        <button @click="host">Host</button> - {{lobby || "No Lobby"}}
        <template v-if="!isHosting">
          <button @click="join">Join</button> - <input type="text" v-model="lobby" maxlength="5">
        </template>
        <template v-if="isHosting && players.length > 0 && pile.length === 144">
          <button @click="split">Split</button>
        </template>
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
          >{{player}}</span>
        </template>
        <template v-else>
          <span class="letter">H</span>
          <span class="letter">E</span>
          <span class="letter">L</span>
          <span class="letter">L</span>
          <span class="letter">O</span>
        </template>
      </div>
      <div class="boards">
        <div v-if="mypile.length && players.length" class="player">
          <div class="scroll" :style="scrollArea">
              <Letter
                v-for="(letter, i) in mypile"
                :key="i"
                :letter=letter
              />
          </div>
        </div>
        <div v-else class="empty">
          <span v-if="!conn || mypile.length">No papayas.</span>
          <span v-if="conn && pile.length === 0">Waiting for papayas...</span>
          <span v-if="conn && pile.length">Papayas Ready.</span>
        </div>
      </div>
    </main>
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
      otherpiles: {},
      scrollArea: false,
      whoami: null,
      colors: ['red', 'orange', 'yellow', 'green', 'blue', 'purple'],
      fruits: ['apple', 'pear', 'banana', 'melon', 'berry', 'lemon'],
    };
  },
  methods: {
    host() {
      this.lobby = Math.random().toString(36).substr(2, 5).toUpperCase();
      this.peer = new Peer(`papaya${this.lobby}`, { debug: 2 });
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
        setTimeout(() => {
          if (!this.pile.length) {
            this.peer.destroy();
          }
        }, 5000);
      });

      conn.on('data', (data) => {
        this.gotData(conn, data);
      });
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
        case 'split':
          this.split();
          break;
        case 'players':
          this.players = [...data.data];
          break;
        default:
          break;
      }
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
            this.pile.push(letter);
          }
        });
      }

      // Durstenfled shuffle
      for (let i = this.pile.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.pile[i], this.pile[j]] = [this.pile[j], this.pile[i]];
      }

      console.log(this.pile);
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

      console.log(this.players, this.mypile, this.otherpiles);

      // Fix scroll area so we can't jack it up later
      setTimeout(() => {
        const myScroll = document.querySelector('.scroll');
        this.scrollArea = `height: ${myScroll.offsetHeight}px; width: ${myScroll.offsetWidth}px`;
      }, 300);
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
  background: var(--yellow);
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
  padding: 10px 20px;
}

header {
  background: var(--green);
  color: var(--white);
  display: flex;
  grid-area: header;
  padding: 0 20px;

  h1 {
    line-height: 60px;
  }

  aside {
    align-items: center;
    display: flex;
    font-weight: bold;
    justify-self: flex-end;
    margin-left: auto;
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
      background: blue;
      border: 1px solid darkblue;
    }

    &[data-color="purple"] {
      background: purple;
      border: 1px solid darkpurple;
    }
  }
}

.letter {
  background: var(--white);
  border: 1px solid var(--orange);
  border-radius: 2px;
  display: inline-block;
  font-size: bold;
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
  height: calc(100% - 40px);

  .empty {
    align-items: center;
    color: var(--orange);
    display: flex;
    font-size: 48px;
    height: 100%;
    justify-content: center;
    max-width: 100%;
    width: 100%;
  }

  .player {
    background: var(--yellow);
    height: 100%;
    flex-grow: 1;
    max-width: 50%;
    overflow: auto;

    &:not(:last-child) {
      margin-right: 10px;
    }

    &:only-child {
      max-width: 100%;
    }
  }

  .scroll {
    // height: 3200px;
    // width: 3200px;
    min-height: 100%;
  }
}
</style>

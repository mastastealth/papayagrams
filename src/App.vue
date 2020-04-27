<template>
  <div id="app">
    <header>
      <h1>Papayagrams</h1>

      <aside>
        <button @click="host">Host</button> - {{lobby || "No Lobby"}}
        <template v-if="!isHosting">
          <button @click="join">Join</button> - <input type="text" v-model="lobby" maxlength="5">
        </template>
        <template v-if="players.length > 0 && pile.length === 144">
          <button @click="split">Split</button>
        </template>
      </aside>
    </header>

    <main>
      <div class="pile" v-if="pile.length">
        <span class="letter">{{pile[0]}}</span>
        <span class="letter">{{pile[1]}}</span>
        <span class="letter">{{pile[2]}}</span>
        <span class="letter">{{pile[3]}}</span>
        <span class="letter">{{pile[4]}}</span>
      </div>
      <div class="boards">
        <div v-for="(player, i) in players" :key="i" class="player">
          <div class="scroll">
            <Letter
              v-for="(letter, i) in mypile"
              :key="i"
              :letter=letter
            />
          </div>
        </div>

        <div v-if="!players.length" class="empty">
          No papayas.
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
    };
  },
  methods: {
    host() {
      this.lobby = Math.random().toString(36).substr(2, 5).toUpperCase();
      this.peer = new Peer(`papaya${this.lobby}`, { debug: 3 });
      this.isHosting = true;
      this.players.push('host');
      this.shuffle(true);

      // When another player connects
      this.peer.on('connection', (conn) => {
        // Listen for data from that player
        conn.on('data', (data) => {
          this.players.push('joined');
          this.gotData(conn, data);
        });
      });
    },
    join() {
      this.peer = new Peer({ debug: 3 });
      const conn = this.peer.connect(`papaya${this.lobby.toUpperCase()}`, { reliable: true });
      this.players.push('joined');

      conn.on('open', () => {
        conn.send({ key: 'connected' });
        this.players.push('host');
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
        case 'pile':
          this.pile = data.data;
          break;
        case 'split':
          this.split();
          break;
        default:
          break;
      }
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
      this.players.forEach((p) => {
        if (p === 'host') {
          for (let i = 0; i < 21; i += 1) {
            this.mypile.push(this.pile.pop());
          }
        } else {
          this.pile.pop();
        }
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
  grid-template-rows: 60px auto;
  height: 100%;
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

.pile {
  margin-bottom: 10px;
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
  height: 100%;

  .empty {
    align-items: center;
    color: var(--orange);
    display: flex;
    font-size: 48px;
    height: 100%;
    justify-content: center;
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
  }

  .scroll {
    height: 4000px;
    width: 4000px;
  }
}
</style>

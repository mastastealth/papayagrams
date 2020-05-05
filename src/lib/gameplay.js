export default {
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

      this.sound.play('shuffle');
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
    this.sound.play('peel');
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
    this.sound.play('dump');

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
    this.sound.play('place');
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
};

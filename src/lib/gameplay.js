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
    this.conn = 'playing';

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
    if (this.players.length === 3 && this.env) {
      this.pile.splice(0, 110);
      count = 10;
    }
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
        if (!this.otherpiles[p.id]) this.otherpiles[p.id] = [];
        for (let i = 0; i < count; i += 1) {
          this.otherpiles[p.id].push(this.pile.pop());
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
    // Bail out if you don't have data, you probably joined late
    if (!this.mypile.length && Object.keys(this.otherpiles).length === 0) return false;

    this.sound.play('peel');
    this.peeling = true;

    this.players.forEach((p) => {
      // Only people who HAVENT lost can peel
      if (!this.losers.includes(p.id)) {
        if (p.id === this.whoami.id) {
          this.mypile.push(this.pile.pop());
        } else {
          this.otherpiles[p.id].push(this.pile.pop());
        }
      }
    });

    setTimeout(() => {
      this.peeling = false;
    }, 1000);

    if (!receive) this.send({ key: 'peel', data: true });
    document.title = `Papayagrams (${this.pile.length})`;
    return true;
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
    let x = this.roundTo(tile.x - scroll.x, 40); // x position within the element.
    let y = this.roundTo(tile.y - scroll.y, 40); // y position within the element.
    // Prevent placement outside of board
    if (x < 0 || x > scroll.width - 2) x = 0;
    if (y < 0 || y > scroll.height - 2) y = 0;

    const newLetter = this.mypile.splice(index, 1);
    this.$set(this.myboardPos, newLetter[0].id, [x, y]);
    this.myboard.push(...newLetter);
    this.sound.play('place');
  },
  papaya(receive = false) {
    const board = this.getBoard();

    if (!receive) {
      const papaya = {
        key: 'papaya',
        data: {
          who: this.whoami,
          board,
          scrollArea: this.scrollArea,
        },
      };

      this.send(papaya);
      this.dboard.win = board;
      this.winner = this.whoami;
    } else {
      this.dboard.win = receive.board;
      this.scrollAreaWinner = receive.scrollArea;
      this.winner = receive.who;
      this.send({
        key: 'boards',
        data: {
          who: this.whoami,
          board,
          scrollArea: this.scrollArea,
        },
      });
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
    this.losers.push(who.id);

    // Don't rot if you aren't the fake winner
    if (who.id !== this.whoami.id) return false;

    // The fake winner now clears his board and sends his pile back
    this.send({
      key: 'ilied',
      data: {
        board: this.myboard,
        who,
      },
    });

    this.winner = false;
    this.mypile = [];
    this.myboard = [];
    this.dboard = [];

    return true;
  },
  rotPlayer(data) {
    const { board, who } = data;

    // Add all the pieces of rotten papaya back into pile
    board.forEach((tile) => {
      this.pile.push(tile);
    });

    this.losers.push(who.id);
    this.winner = false;
    this.finished = false;
    this.scrollAreaWinner = false;
    this.dboard = {};
    document.title = `Papayagrams (${this.pile.length})`;
  },
  getBoard() {
    const board = [];
    this.$children.forEach((c) => {
      if (c.letter && c.position) {
        board.push({
          pos: [c.$children[0].left, c.$children[0].top],
          letter: c.letter,
        });
      }
    });

    return board;
  },
};

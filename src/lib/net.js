export default {
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
  host(online = true, lobbyName) {
    const randomLobby = Math.random().toString(36).substr(2, 5).toUpperCase();
    if (!this.inputLobby) this.inputLobby = lobbyName || randomLobby;
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
        if (!this.pile.length) {
          this.pile = data.data.pile;
          this.sound.play('shuffle');
        }
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
      case 'boards':
        this.$set(
          this.dboard,
          data.data.who.id,
          Object.assign(data.data, {
            scrollArea: this.resizeEndBoard(data.data.scrollArea),
          }),
        );
        break;
      case 'kick':
        if (data.data === this.whoami.id) this.dcGame();
        setTimeout(() => {
          this.players = this.players.filter((p) => p.id !== data.data);
        }, 500);
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
  dcGame() {
    this.$pnGetInstance().unsubscribeAll();
    this.conn = null;
    this.peer = null;
    this.inputLobby = null;
    this.isHosting = false;
    this.players = [];
    this.whoami = null;
    document.title = 'Papayagrams';
    this.sound.play('zip');
  },
  kick(player) {
    this.send({
      key: 'kick',
      data: player,
    });

    this.players = this.players.filter((p) => p.id !== player);
  },
};

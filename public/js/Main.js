/* eslint no-console: 0 */
/* eslint max-len: ["error", { "code": 100 }] */
/* eslint no-undef: 0 */

$(document).ready(() => {
  const socket = io.connect('', { path: '/socket.io' });

  const mapLoader = new MapLoader();

  const game = new Game(mapLoader);

  const botFactory = new BotFactory(game);
  botFactory.setMaxBots(4);

  // Let socket.io know this is the shared screen client
  socket.emit('register', { usertype: 'client_shared_screen' });

  socket.on('add-player', (data) => {
    // Shorten names
    const newName = data.nickname.substring(0, 15);
    const newData = data;
    newData.nickname = newName;
    game.addPlayer(newData);
  });

  socket.on('remove-player', (data) => {
    game.removePlayer(data);
  });

  socket.on('control-vector', (data) => {
    game.controlVector(data);
  });

  socket.on('control-tap', (data) => {
    game.controlTap(data);
  });

  socket.on('maintenance-event', (data) => {
    if (data.type === 'refresh-browser') {
      window.location.reload(true);
    }
  });

  // Manual Ping Pong with server
  // This is our way of knowing when we've
  // lost connection from the client side.
  let pongCounter = 0;
  setInterval(() => {
    pongCounter += 1;

    if (pongCounter >= 10) {
      console.warn('[Warning] Ping pong timeout. Connection broken. Reloading.');
      window.location.reload(true);
    }

    socket.emit('screen-ping-test', { timestamp: Date.now() });
  }, 5000);

  socket.on('screen-pong-test', (data) => {
    const pongDelay = Date.now() - data.timestamp;
    pongCounter -= 1;
    if (pongDelay > 500 || pongCounter >= 2) {
      console.warn(`[Warning] Slow server pong. delay:${pongDelay}, counter:${pongCounter}`);
    }
  });

  function onForceDisconnect(data) {
    // Emit idle player's socket id
    socket.emit('force-disconnect', { userid: data.userid, socketid: data.socketid });
  }

  function onWin(socketid) {
    // Emit winner's socket id
    socket.emit('controller-event', { type: 'win', socketid });
  }

  function onLose(socketid) {
    // Emit loser's socket id
    socket.emit('controller-event', { type: 'lose', socketid });
  }

  function onPoints(socketid) {
    // Emit point-getter's socket id
    socket.emit('controller-event', { type: 'points', socketid });
  }

  function onStun(socketid) {
    // Emit stunned user's socketid
    socket.emit('controller-event', { type: 'stun', socketid });
  }

  // Set game bounds on load/resize
  function onWindowSize() {
    const w = (this.window.innerWidth > 0) ? this.window.innerWidth : this.screen.width;
    const h = (this.window.innerHeight > 0) ? this.window.innerHeight : this.screen.height;
    game.setBounds(0, 0, w, h);
  }

  $(window).bind('load resize', onWindowSize);

  game.init($('#stage'));
  game.setCallbacks(onForceDisconnect, onWin, onLose, onPoints, onStun);
});

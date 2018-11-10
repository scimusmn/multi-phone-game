/* eslint no-console: 0 */
/* eslint max-len: ["error", { "code": 100 }] */
/* eslint no-undef: 0 */

$(document).ready(() => {
  const socket = io.connect('', { path: '/socket.io' });

  const mapLoader = new MapLoader();

  const game = new Game(mapLoader);

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
    console.log('socket says remove player?');
    game.removePlayer(data);
  });

  socket.on('control-vector', (data) => {
    game.controlVector(data);
  });

  socket.on('control-tap', (data) => {
    game.controlTap(data);
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

  // Set game bounds on load/resize
  function onWindowSize() {
    const w = (this.window.innerWidth > 0) ? this.window.innerWidth : this.screen.width;
    const h = (this.window.innerHeight > 0) ? this.window.innerHeight : this.screen.height;
    game.setBounds(0, 0, w, h);
  }

  $(window).bind('load resize', onWindowSize);

  game.init($('#stage'));

  game.setCallbacks(onForceDisconnect, onWin, onLose, onPoints);
});

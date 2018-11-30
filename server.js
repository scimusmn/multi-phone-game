/* eslint no-console: 0 */
/* eslint max-len: ["error", { "code": 100 }] */

// Imports
const express = require('express');
const childProcess = require('child_process');

const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http,
  {
    path: '/socket.io',
    pingInterval: 900000,
    pingTimeout: 2400000,
  });
const path = require('path');
const uaParser = require('ua-parser');
const Puid = require('puid');

const puid = new Puid(true);
const profanity = require('profanity-util');

const CLIENT_CONTROLLER = 'client_controller';
const CLIENT_SHARED_SCREEN = 'client_shared_screen';
const CLIENT_MAINTENANCE = 'client_maintenance';
const DEVICE_STORAGE_KEY = 'smm_player_profile';

// Holds reference to all
// connected clients using
// their socket-id as keys.
const clients = {};

let sharedScreenSID;
let sharedScreenConnected = false;

// Default to port 3000.
let portNumber = 3000;

// Search for '-port' flag
if (process.env.PORT) {
  portNumber = process.env.PORT;
  console.log('SETTING PORT BASED ON ENV VAR');
}

if (process.argv.indexOf('--port') !== -1) {
  portNumber = process.argv[process.argv.indexOf('--port') + 1];
}

app.set('port', portNumber);
app.use('/', express.static(path.join(__dirname, 'public')));

// Serve client files
app.get('/', (request, response) => {
  const userAgent = request.headers['user-agent'];
  // User agent browser. e.g. "Safari 5.0.1"
  const ua = uaParser.parseUA(userAgent).toString();
  // Operating system. e.g. "iOS 5.1"
  const os = uaParser.parseOS(userAgent).toString();
  // Device name. e.g. "iPhone"
  const device = uaParser.parseDevice(userAgent).toString();

  console.group('[Request -> controller.html]');
  console.log('device:', device);
  console.log('ua:', ua);
  console.log('os:', os);
  console.log('request.ip:', request.ip);
  console.log('request.ips:', request.ips);
  console.groupEnd();

  response.sendFile(`${__dirname}/controller.html`);
});

app.get('/screen', (request, response) => {
  console.group('[Request -> screen.html]');
  console.log('sharedScreenConnected:', sharedScreenConnected);
  console.log('request.ip', request.ip);
  console.log('request.ips', request.ips);
  console.groupEnd();

  if (sharedScreenConnected === true) {
    console.warn('[Warning] Shared screen already connected. Unexpectedly serving another.');
  }

  response.sendFile(`${__dirname}/screen.html`);
});

// Catch requests for maintenance page
app.get('/maintenance', (request, response) => {
  console.group('[Request -> maintenance.html]');
  console.log('request.ip', request.ip);
  console.log('request.ips', request.ips);
  console.groupEnd();

  response.sendFile(`${__dirname}/maintenance.html`);
});

// Socket.io connections
io.on('connection', (socket) => {
  // Variables unique to this client
  let userid;
  let socketid;
  let usertype;
  let nickname;
  let usercolor;

  function logStats() {
    console.group('[Game Stats]');
    console.log('client count:', Object.keys(clients).length);
    console.log('sharedScreenConnected:', sharedScreenConnected);
    console.log('sharedScreenSID:', sharedScreenSID);
    console.groupEnd();
  }

  function newUserData() {
    const dataObj = {
      userid,
      nickname,
      usercolor,
    };

    return JSON.stringify(dataObj);
  }

  function forceDisconnectUser(data) {
    console.group('[Force Disconnect User]');
    console.log(data);
    console.groupEnd();

    // Do nothing if shared big screen isn't connected
    if (!sharedScreenSID) return;

    // Tell the game to remove the player
    // using the userid to target the right game object.
    io.sockets.connected[sharedScreenSID].emit('remove-player', {
      nickname: 'idlePlayer',
      userid: data.userid,
    });

    // Before disconnecting this user,
    // display alert on their phone.
    const disconnectSocket = io.sockets.connected[data.socketid];
    if (disconnectSocket) {
      disconnectSocket.emit('alert-message', { message: data.disconnectMessage });
    } else {
      // TODO: This seems to happen often, probably when
      // a user puts their phone to sleep and walks away.
      console.group('[Warning] Blocked sending force-disconnect to non-existing socket client.');
      console.log(data);
      console.groupEnd();
    }

    // Disconnect and cease
    // tracking this socket
    if (clients[data.userid]) {
      clients[data.userid].disconnect();
      delete clients[data.userid];
    }

    logStats();
  }

  function purifyName(nameStr) {
    let nameStringOut = nameStr;

    // Check that string is not empty or full of spaces
    if (/\S/.test(nameStringOut) && nameStringOut !== undefined) {
      [nameStringOut] = profanity.purify(nameStr, {
        replace: 'true',
        replacementsList: ['PottyMouth', 'Gutter', 'DullMind', 'Gross'],
      });
    } else {
      nameStringOut = `Hero_${Math.round(Math.random() * 999)}`;
    }

    return nameStringOut;
  }

  // User registered
  socket.on('register', (data) => {
    console.group('[Register]');
    console.log(data);
    console.groupEnd();

    socketid = socket.id;
    ({ usertype, usercolor } = data);
    nickname = purifyName(data.nickname);

    if (usertype === CLIENT_SHARED_SCREEN) {
      if (sharedScreenConnected === true) {
        console.warn('[Warning] Shared screen already connected.');

        const screenSocket = io.sockets.connected[sharedScreenSID];

        if (screenSocket) {
          console.log('[Force Disconnect] Disconnecting current shared screen.');
          screenSocket.disconnect();
        } else {
          console.warn('[Warning] Prev screen socket null despite never disconnecting.');
        }

        // We are currently allowing
        // intruder screen to take over...
        // Accept new shared screen
        sharedScreenSID = socket.id;
        sharedScreenConnected = true;
      } else {
        // Accept new shared screen
        sharedScreenSID = socket.id;
        sharedScreenConnected = true;
      }
    } else if (usertype === CLIENT_CONTROLLER && sharedScreenConnected) {
      /**
       * If returning user, use
       * existing userid found on
       * device. If new user, perfom
       * initial data store to device
       * using generated unique id.
       */
      if (data.firstTime === false) {
        // Returning user
        ({ userid } = data);
        /**
         * Ensure no other clients
         * have the same userid. If
         * they do, it's most likely
         * two tabs open on the same
         * browser/device, so we disconnect
         * the previous connection.
         */
        console.group('[Return user]');
        console.log('userid:', userid);
        console.groupEnd();
        const prevConnected = clients[userid];
        if (prevConnected && prevConnected !== socket.id) {
          // TODO: Display "Disconnected" message on previous tab?
          console.log(`Disconnecting redundant user socket: ${clients[userid]}`);
          prevConnected.emit('alert-message', {
            message: 'Whoops you disconnected! Reload to play.',
          });
          clients[userid].disconnect();
          delete clients[userid];
        }
      } else {
        console.group('[First-time user]');
        console.log('userid:', userid);
        console.groupEnd();

        // New user
        userid = puid.generate();
        const userData = newUserData();
        socket.emit('store-local-data', { key: DEVICE_STORAGE_KEY, dataString: userData });
      }

      // Track clients' sockets so we can ensure only one socket per device.
      clients[userid] = socket;

      // Alert shared screen of new player
      io.sockets.connected[sharedScreenSID].emit('add-player', {
        nickname,
        userid,
        socketid,
        usercolor,
      });
    } else if (usertype === CLIENT_MAINTENANCE) {
      // Connecting fron maintenance interface
      console.log('[Client maintenance] new connection');
    }

    logStats();
  });

  // User disconnected
  socket.on('disconnect', (reason) => {
    console.group('[Disconnect]');
    console.log('reason:', reason);
    console.log('usertype:', usertype);
    console.log('nickname:', nickname);
    console.log('userid:', userid);

    if (usertype === CLIENT_CONTROLLER && sharedScreenConnected) {
      if (reason === 'ping timeout') {
        console.warn('[Warning] That dang ping timeout.');
        // TODO: Should we attempt to reconnect on ping timeout?
      } else {
        io.sockets.connected[sharedScreenSID].emit('remove-player', {
          nickname,
          userid,
        });
      }
    } else if (usertype === CLIENT_SHARED_SCREEN) {
      if (sharedScreenSID === socketid) {
        console.log('Disconnecting screen matches active screen as expected.');

        sharedScreenConnected = false;
        sharedScreenSID = null;
      } else {
        console.warn('[Warning] Disconnecting screen did not match active screen.');

        sharedScreenConnected = false;
        sharedScreenSID = null;
      }
    }

    console.groupEnd();

    // Stop tracking this socket
    delete clients[userid];

    logStats();
  });

  /*
  // This is for debugging purpose only
  // this socket event is pre-disconnect
  socket.on('disconnecting', (reason) => {
    console.group('[Disconnecting...]');
    console.log('reason:', reason);
    console.log('usertype:', usertype);
    console.log('nickname:', nickname);
    console.log('userid:', userid);
    console.groupEnd();
  });
*/
  // Force specific client to disconnect
  socket.on('force-disconnect', (data) => {
    const newData = data;
    const msg = 'Disconnected due to inactivity. Reload play.smm.org to join again.';
    newData.disconnectMessage = msg;
    forceDisconnectUser(newData);
  });

  // Force specific client to disconnect
  // Usually when user has left their mobile
  // browser or opened a new tab.
  socket.on('controller-lost-focus', (data) => {
    console.group('[Controller Lost Focus]');
    console.log(data);
    console.groupEnd();
    const freshData = {};
    freshData.socketid = socketid;
    freshData.userid = userid;
    freshData.disconnectMessage = 'You left the browser! Reload play.smm.org to join again.';
    forceDisconnectUser(freshData);
  });

  // Controller vector update
  socket.on('control-vector', (data) => {
    if (!sharedScreenConnected) return;
    const newData = data;
    newData.userid = userid;
    io.sockets.connected[sharedScreenSID].emit('control-vector', newData);
  });

  // Controller tap
  socket.on('control-tap', (data) => {
    if (!sharedScreenConnected) return;
    const newData = data;
    newData.userid = userid;
    io.sockets.connected[sharedScreenSID].emit('control-tap', newData);
  });

  // Forward events to specific controllers
  socket.on('controller-event', (data) => {
    const targetSocket = io.sockets.connected[data.socketid];
    if (targetSocket) {
      targetSocket.emit('controller-event', data);
    } else {
      console.group('[Warning] Blocked attempt to send controller-event to non existing socket.');
      console.log(data);
      console.groupEnd();
    }
  });

  // Maintenance event
  socket.on('maintenance-event', (data) => {
    console.group('[Maintenance Event]');
    console.log(data);
    if (data.type === 'restart-server') {
      childProcess.execFile('pm2', ['restart', 'org.smm.play'], (error, stdout, stderr) => {
        if (error) {
          console.warn('[Warning] Attempt to use pm2 restart errored:', stderr);
          // throw error;
        }
        console.log(stdout);
      });
      console.groupEnd();
    }

    // Forward to game screen
    if (!sharedScreenConnected) return;
    io.sockets.connected[sharedScreenSID].emit('maintenance-event', data);
  });
});

// Listen for http requests on port <portNumber>
http.listen(portNumber, () => {
  console.group('[Express Settings]');
  console.log('port:', app.settings.port);
  console.groupEnd();
});


// Log header
console.log('[>>------>                                           <------<<]');
console.log('[>>------> Starting Multiplayer Phone Game Server... <------<<]');
console.log('[>>------>                                           <------<<]');

// Print socket io settings
console.group('[Socket.io Settings]');
console.log('pingTimeout:', io.engine.pingTimeout);
console.log('pingInterval:', io.engine.pingInterval);
console.groupEnd();

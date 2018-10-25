// Imports
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http, {path: '/socket.io', pingInterval: 900000, pingTimeout: 2400000});
var path = require('path');
var uaParser = require('ua-parser');
var Puid = require('puid');
var puid = new Puid(true);
var profanity = require('profanity-util');

var CLIENT_CONTROLLER = 'client_controller';
var CLIENT_SHARED_SCREEN = 'client_shared_screen';
var DEVICE_STORAGE_KEY = 'smm_player_profile';
var clients = {};
var sharedScreenSID;
var sharedScreenConnected = false;

// Search for '-port' flag
// default to port 3000.
var portNumber = 3000;

if (process.env.PORT) {
  portNumber = process.env.PORT;
  console.log('SETTING PORT BASED ON ENV VAR');
}

if (process.argv.indexOf('--port') != -1) {
  portNumber = process.argv[process.argv.indexOf('--port') + 1];
}

app.set('port', portNumber);
app.use('/', express.static(path.join(__dirname, 'public')));

// This allows ability sniff IP addresses (https://goo.gl/rHLCgE)
// app.enable('trust proxy');

// Serve client files
app.get('/', function(request, response) {

  var userAgent = request.headers['user-agent'];
  var ua = uaParser.parseUA(userAgent).toString();// -> "Safari 5.0.1"
  var os = uaParser.parseOS(userAgent).toString();// -> "iOS 5.1"
  var device = uaParser.parseDevice(userAgent).toString();// -> "iPhone"

  // TODO: Serve warning to any user on unsupported OS, browser, or device.

  console.log('Serving controller.html to: ', device, ' running ', ua, ' on ', os);
  console.log('Controller IP:', request.ip, request.ips);
  response.sendFile(__dirname + '/controller.html');

});

app.get('/screen', function(request, response) {

  console.log('[Serving /screen.html] Is sharedScreenConnected:', sharedScreenConnected);
  console.log('Screen IP:', request.ip, request.ips);

  if (sharedScreenConnected == true) {
    console.log('Warning! Shared screen already connected. Unexpectedly serving another.');
  }

  response.sendFile(__dirname + '/screen.html');

  var userAgent = request.headers['user-agent'];
  var ua = uaParser.parseUA(userAgent).toString();// -> "Safari 5.0.1"
  var os = uaParser.parseOS(userAgent).toString();// -> "iOS 5.1"
  var device = uaParser.parseDevice(userAgent).toString();// -> "iPhone"

});

// Socket.io connections
io.on('connection', function(socket) {

  // Variables unique to this client
  var userid;
  var socketid;
  var usertype;
  var nickname;
  var usercolor;

  // console.log('User has connected. Connection:', socket.request.connection._peername);

  // User registered
  socket.on('register', function(data) {

    console.log('[REGISTER]', data.nickname, data.usertype, data.userid);

    socketid = socket.id;
    usertype = data.usertype;
    nickname = purifyName(data.nickname);
    usercolor = data.usercolor;

    if (usertype == CLIENT_SHARED_SCREEN) {

      if (sharedScreenConnected == true) {

        console.log('Warning! Shared screen was already connected. Another browser is taking over game. Is this intentional? Disconnecting current connected screen.');

        var screenSocket = io.sockets.connected[sharedScreenSID];

        if (screenSocket) {
          console.log('Force disconnecting current shared screen.');
          screenSocket.disconnect();
        } else {
          console.log('Previous screen socket did not exist despite never disconnecting.');
        }

        // We are currently allowing
        // intruder screen to take over...
        // Accept new shared screen
        sharedScreenSID =  socket.id;
        sharedScreenConnected = true;

      } else {
        // Accept new shared screen
        sharedScreenSID =  socket.id;
        sharedScreenConnected = true;
      }

    } else if (usertype == CLIENT_CONTROLLER && sharedScreenConnected) {

      /**
       * If returning user, use
       * existing userid found on
       * device. If new user, perfom
       * initial data store to device
       * using generated unique id.
       */
      if (data.firstTime === false) {
        // Returning user
        userid = data.userid;
        /**
         * Ensure no other clients
         * have the same userid. If
         * they do, it's most likely
         * two tabs open on the same
         * browser/device, so we disconnect
         * the previous connection.
         */
        console.log('Returning user ' + userid);
        var prevConnected = clients[userid];
        if (prevConnected && prevConnected !== socket.id) {

          // TODO: Display "Disconnected" message on previous tab.
          console.log('Disconnecting redundant user socket: ' + clients[userid]);
          prevConnected.emit('alert-message', {message: 'Whoops you disconnected! Reload to play.'});
          clients[userid].disconnect();
          delete clients[userid];
        }

      } else {

        console.log('Registered first timer:', userid);

        // New user
        userid = puid.generate();
        var userData = newUserData();
        socket.emit('store-local-data', {key: DEVICE_STORAGE_KEY, dataString: userData});

      }

      // Track clients' sockets so we can ensure only one socket per device.
      clients[userid] = socket;

      // Alert shared screen of new player
      io.sockets.connected[sharedScreenSID].emit('add-player', {  nickname: nickname,
                                                                  userid: userid,
                                                                  socketid: socketid,
                                                                  usercolor: usercolor,
                                                              });

    }

    logStats();

  });

  // User disconnected
  socket.on('disconnect', function(reason) {

    console.log('[DISCONNECT] event recieved:', reason, usertype, nickname, userid);

    if (usertype == CLIENT_CONTROLLER && sharedScreenConnected) {

      if (reason == 'ping timeout') {
        console.log('What just a second. That dang ping timeout. Should attempt reconnect?');

      } else {
        io.sockets.connected[sharedScreenSID].emit('remove-player', {   nickname:nickname,
                                                                      userid:userid,
                                                                  });
      }

    } else if (usertype == CLIENT_SHARED_SCREEN) {

      if (sharedScreenSID == socketid) {
        console.log('Disconnecting screen matches active screen. Expected.');

        sharedScreenConnected = false;
        sharedScreenSID = null;

        console.log('[No SHARED SCREEN!] The shared screen is no longer connected.');

      } else {

        sharedScreenConnected = false;
        sharedScreenSID = null;

        console.log('Warning! Socket ID is mismatched on disconnect. Ensure only one screen is being served!');

      }

    }

    // Stop tracking this socket
    delete clients[userid];

    logStats();

  });

  socket.on('disconnecting', (reason) => {
    console.log('[DISCONNECTING...]', reason, userid, nickname);
  });

  // Force specific client to disconnect
  socket.on('force-disconnect', function(data) {

    console.log('[FORCE-DISCONNECT]', data);
    data.disconnectMessage = 'Disconnected due to inactivity. Reload play.smm.org to join again.';
    forceDisconnectUser(data);

  });

  // Force specific client to disconnect
  // Usually when user has left their mobile
  // browser or opened a new tab.
  socket.on('controller-lost-focus', function(data) {

    console.log('[CONTROLLER-LOST-FOCUS]', data);
    var freshData = {};
    freshData.socketid = socketid;
    freshData.userid = userid;
    freshData.disconnectMessage = 'Whoops, looks like you left the browser. Reload play.smm.org to join again.';
    forceDisconnectUser(freshData);

  });

  // Controller vector update
  socket.on('control-vector', function(data) {

    if (!sharedScreenConnected) return;
    data.userid = userid;
    io.sockets.connected[sharedScreenSID].emit('control-vector', data);

  });

  // Controller tap
  socket.on('control-tap', function(data) {

    if (!sharedScreenConnected) return;
    data.userid = userid;
    io.sockets.connected[sharedScreenSID].emit('control-tap', data);

  });

  // Forward events to specific controllers
  socket.on('controller-event', function(data) {

    var targetSocket = io.sockets.connected[data.socketid];
    if (targetSocket) {
      targetSocket.emit('controller-event', data);
    } else {
      console.log('Blocked attempt to send controller-event to non existing socket:');
      console.log(data);
    }

  });

  function forceDisconnectUser(data) {

    console.log('forceDisconnectUser()', data);

    // Do nothing if shared big screen isn't connected
    if (!sharedScreenSID) return;

    // Tell the game to remove the player
    // using the userid to target the right game object.
    io.sockets.connected[sharedScreenSID].emit('remove-player', {   nickname:'idlePlayer',
                                                                    userid:data.userid,
                                                                });

    // Before disconnecting this user,
    // display alert on their phone.
    var disconnectSocket = io.sockets.connected[data.socketid];
    if (disconnectSocket) {

      disconnectSocket.emit('alert-message', {message: data.disconnectMessage});

    } else {
      console.log('Blocked attempt to send force-disconnect to non-existing socket:', data);
    }

    // Disconnect and cease
    // tracking this socket
    if (clients[data.userid]) {
      clients[data.userid].disconnect();
      delete clients[data.userid];
    }

    logStats();

  }

  function logStats() {

    console.log('[STATS] client count:', Object.keys(clients).length, '| shared screen status:', sharedScreenConnected, sharedScreenSID);

  }

  function purifyName(nameStr) {

    // Check that string is not empty or full of spaces
    if (/\S/.test(nameStr) && nameStr !== undefined) {
      nameStr = profanity.purify(nameStr, { replace: 'true', replacementsList: ['PottyMouth', 'GutterMind', 'Turdington', 'DullMind', 'Blue'] })[0];
    } else {
      nameStr = 'Hero_' + Math.round(Math.random() * 999);
    }

    return nameStr;
  }

  function newUserData() {

    var dataObj = { userid: userid,
                    nickname: nickname,
                    usercolor: usercolor,
                    };

    return JSON.stringify(dataObj);

  }

});

// Listen for http requests on port <portNumber>
http.listen(portNumber, function() {

  console.log('Listening to Node server on port ' + portNumber + '...');

});

// Set socket io settings
console.log('+++++ SOCKET.IO ++++');
console.log('pingTimeout:', io.engine.pingTimeout);
console.log('pingInterval:', io.engine.pingInterval);

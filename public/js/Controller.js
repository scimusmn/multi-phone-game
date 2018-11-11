/* eslint no-console: 0 */
/* eslint max-len: ["error", { "code": 100 }] */
/* eslint no-undef: 0 */
/* eslint no-alert: 0 */

$(document).ready(() => {
  const socket = io.connect('', { path: '/socket.io' });

  /**
      * Check if this device allows
      * Local Storage, which will
      * error out in incognito mode when
      * you attempt to use.
      */
  function localStorageAvailable() {
    const test = 'test';
    try {
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }
  if (localStorageAvailable() === false) {
    $('body').empty();
    $('body').append('<h1><br/>Unable to connect.</h1><br/>');
    $('body').append('<h3>Make sure your device is not in private-browsing mode.</h3>');
    return;
  }

  function sanitize(nameStr) {
    // Max length : 13 chars
    const name = nameStr.substring(0, 15);

    // Strip out HTML
    const strippedName = $(`<p>${name}</p>`).text();

    return strippedName;
  }

  function setupTouchControls(data) {
    const touchControl = new VectorTouchControls(socket, data.usercolor);
    touchControl.enable();

    // Uncomment for simulations
    touchControl.simulateUserInput();
  }

  /**
      * Check for previously stored
      * data to determine whether
      * this is a first-time or
      * returning user.
      */

  function register(data) {
    const newData = data;
    newData.usertype = 'client_controller';
    newData.usercolor = randomColor({ luminosity: 'light' });
    socket.emit('register', newData);

    setupTouchControls(newData);
  }

  function promptReturnUser(data) {
    const nickname = prompt('Welcome back!\nEnter your nickname.', '');
    const newData = data;
    newData.nickname = sanitize(nickname);
    newData.firstTime = false;
    register(newData);
  }

  function promptFirstTimer() {
    const msg = 'Enter your nickname. Touch and drag to move. Tap screen to perform action.';
    const nickname = prompt(msg, '');
    nickame = sanitize(nickname);
    const data = { nickname };
    data.firstTime = true;
    register(data);
  }

  const localData = localStorage.getItem('smm_player_data');
  if (localData !== null) {
    const data = JSON.parse(localData);
    promptReturnUser(data);
  } else {
    promptFirstTimer();
  }

  function displayMessageToUser(msg, showAlert) {
    if (!showAlert) {
      console.log('Do not show alert');
    }

    $('#instruct').empty();
    $('#instruct').append(`<h2>&#x26a0;<br/>${msg}</h2>`);
    alert(msg);
  }


  /**
      * Due to mobile limitations,
      * we must instantiate our
      * sounds in a user-triggered
      * function. Important: The
      * 'buffer' parameter must
      * be set to true for mobile.
      */
  let soundPlayer;

  function initSounds() {
    soundPlayer = new Howl({
      src: ['sounds/sounds.mp3', 'sounds/sounds.ogg'],
      buffer: true,
      sprite: {

        winner: [1, 4467],
        stun: [4513, 1285],
        loser1: [6026, 1270],
        loser2: [7300, 1120],
        loser3: [8434, 1282],
        points: [9775, 1459],

      },
    });

    document.removeEventListener('touchend', initSounds, false);
    document.removeEventListener('mouseup', initSounds, false);
  }

  document.addEventListener('touchend', initSounds, false);
  document.addEventListener('mouseup', initSounds, false);

  function playSound(sndId) {
    if (soundPlayer) {
      soundPlayer.play(sndId);
    }
  }


  /**
      * Listen for useful socket.io events
      */
  socket.on('disconnect', (reason) => {
    console.log('Disconnect. reason:', reason);

    displayMessageToUser(`Disconnected. Reload play.smm.org to join again. (${reason})`);

    // TODO - Can I attempt to reconnect?

    if (reason === 'ping timeout') {
      // you should renew token or do another important things before reconnecting
      console.log('That darn ping timeout. Attemptoin');
      setTimeout(() => {
        console.log('Attempting reconnect');
        displayMessageToUser(`Attempting reconnect after ping timeout. (${reason})`, false);
        socket.connect();
      }, 9000);
    }
  });

  socket.on('disconnecting', (reason) => {
    console.log('Disconnecting... reason', reason);
    displayMessageToUser(`Disconnecting... (${reason})`, false);
  });

  /**
      * Generalized message reciever
      * to display full screen alerts
      */
  socket.on('alert-message', (data) => {
    console.log('alert-message recieved:', data);
    displayMessageToUser(data.message);
  });

  /**
      * Listen for instruction from
      * node to store new or updated
      * user data, specific to this
      * device. e.g., unique ids,
      * scores, customizations...
      */
  socket.on('store-local-data', (data) => {
    if (typeof window.localStorage !== 'undefined') {
      localStorage.setItem(data.key, data.dataString);
    } else {
      console.log('WARNING: localstorage unavailable on this device');
    }
  });

  /**
      * Listen for events targeted
      * specically at this controller
      * from the game. Useful for
      * triggering sfx, game-states,
      * alerts, secrets, high-score, etc.
      */
  socket.on('controller-event', (data) => {
    if (data.type === 'stun') {
      playSound('stun');
    } else if (data.type === 'points') {
      playSound('points');

      // Vibrate phone if capabable
      navigator.vibrate(300);
    } else if (data.type === 'win') {
      playSound('winner');

      // Winner vibrations if capable
      // on this phone.
      navigator.vibrate([500, 150, 250, 150, 250, 150, 250, 250, 500]);
    } else if (data.type === 'lose') {
      setTimeout(() => {
        playSound(`loser${Math.ceil(Math.random() * 3)}`);
      }, 5000);
    }
  });

  /**
      * Watch for change in page focus.
      * This should catch if a user
      * opens a new tab, then we
      * disconnect them.
      */
  Visibility.change((e, state) => {
    console.log('Visibility change', state);
    if (Visibility.hidden()) {
      console.log('Controller lost tab focus or has been minimized.');
      socket.emit('controller-lost-focus', socket.id);
    }
  });
});

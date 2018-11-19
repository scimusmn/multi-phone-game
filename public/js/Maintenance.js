/* eslint no-console: 0 */
/* eslint max-len: ["error", { "code": 100 }] */
/* eslint no-undef: 0 */
/* eslint no-alert: 0 */

$(document).ready(() => {
  const socket = io.connect('', { path: '/socket.io' });

  function register() {
    const data = { usertype: 'client_maintenance' };
    socket.emit('register', data);
  }

  const REQUIRE_PASSWORD = false;
  const MAINTENANCE_ENTRY_PW = 'temp';

  /**
   * Listen for useful socket.io events
   */
  socket.on('disconnect', (reason) => {
    console.log('Disconnect. reason:', reason);
    displayMessageToUser(`Disconnected. Reload page. (${reason})`);
  });

  socket.on('disconnecting', (reason) => {
    console.log('Disconnecting... reason', reason);
    displayMessageToUser(`Disconnecting... (${reason})`, false);
  });

  function goRefreshGameBrowser() {
    const eventData = { type: 'refresh-browser' };
    socket.emit('maintenance-event', eventData);
  }

  // Append log message
  function addLog(logMsg) {
    const li = document.createElement('li');
    const timestamp = new Date().toUTCString();
    li.appendChild(document.createTextNode(`${logMsg}      [ ${timestamp} ]`));
    document.getElementById('maintenance-log').appendChild(li);
  }

  // Require password prompt
  function passwordPrompt() {
    if (REQUIRE_PASSWORD === true) {
      const msg = 'Enter your nickname. Touch and drag to move. Tap screen to perform action.';
      const enteredPW = prompt(msg, '');

      if (enteredPW === MAINTENANCE_ENTRY_PW) {
        addLog('Correct password entered.');
        register();
      } else {
        addLog('Incorrect password entered.');
      }
    } else {
      register();
    }
  }

  // Listen for button click
  document.getElementById('refresh-btn').addEventListener('click', () => {
    goRefreshGameBrowser();
    addLog('Refresh request sent...');
  });

  // Kick things off
  passwordPrompt();
});

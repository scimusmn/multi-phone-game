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

  // Holds password to restrict access.
  // Optionally filled by command flag
  // (TEMP) will come from config file.
  const MAINTENANCE_ENTRY_PW = 'Lasley';

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

  function goRestartGameServer() {
    const eventData = { type: 'restart-server' };
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
    if (MAINTENANCE_ENTRY_PW !== ''
          && MAINTENANCE_ENTRY_PW !== null
          && MAINTENANCE_ENTRY_PW !== undefined) {
      const msg = 'Enter maintenance password.';
      const enteredPW = prompt(msg, '');

      if (enteredPW === MAINTENANCE_ENTRY_PW) {
        addLog('Correct password entered.');
        register();
      } else {
        addLog('Incorrect password entered.');
        document.querySelector('#btn-container').style.display = 'none';
      }
    } else {
      register();
    }
  }

  // Listen for button clicks
  document.getElementById('refresh-btn').addEventListener('click', () => {
    goRefreshGameBrowser();
    addLog('Refresh request sent...');
  });
  document.getElementById('restart-btn').addEventListener('click', () => {
    goRestartGameServer();
    addLog('Server restart request sent...');

    // Reconnect this page in 15 secs post server restart
    addLog('This page will reconnect in 15 seconds');
    setTimeout(() => {
      window.location.reload(true);
    }, 15000);
  });

  // Kick things off
  passwordPrompt();
});

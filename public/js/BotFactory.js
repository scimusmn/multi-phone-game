/* eslint no-console: 0 */
/* eslint max-len: ["error", { "code": 100 }] */
/* eslint-disable no-unused-vars */
/* eslint no-undef: 0 */

function BotFactory(_game) {
  const ANGLE_ADJUST_MAX = Math.PI / 5;
  const MAGNITUDE_ADJUST_MAX = 0.2;

  const BOT_NAMES = [
    'Trygve',
    'Elias',
    'Manuel',
    'Annie',
    'Bryan',
    'Roger',
    'Ryan',
    'Travis',
  ];

  const bots = [];

  function setNewDirections() {
    let degs;
    let newAngle;
    bots.forEach((bot) => {

      if (Math.random() < 0.6) {
        // Skip
        if (Math.random() < 0.5) _game.controlTap(bot);
        return;
      }

      // Angle never set
      if (bot.angle === undefined) {
        bot.angle = (Math.random() * Math.PI * 2).toFixed(4);
      }

      if (bot.directionCounter < 0) {
        bot.directionSwitch *= -1;
        bot.directionCounter = Math.ceil(Math.random() * 10 + 5);
      } else {
        bot.directionCounter -= 1;
      }

      if (bot.directionSwitch < 0) {
        // North-east movement
        degs = 180 + Math.random() * 90;
      } else {
        // North-west movement
        degs = 0 - Math.random() * 90;
      }

      newAngle = degreesToRadians(degs);
      bot.angle = newAngle;

      // Magnitude never set,
      // go completely random.
      if (bot.magnitude === undefined || Math.random() < 0.1) {
        bot.magnitude = Math.random() * 0.9 + 0.1;
      } else if (Math.random() > 0.925) {
        bot.magnitude = 0.0;
        _game.controlTap(bot);
      }

      _game.controlVector(bot);
    });
  }

  function degreesToRadians(degrees) {
    const pi = Math.PI;
    return degrees * (pi / 180);
  }

  // _game.controlVector(data);

  // _game.controlTap(data);

  function getFreshBotData() {
    const botData = {};
    const rNameIndex = Math.floor(Math.random() * BOT_NAMES.length);
    botData.nickname = BOT_NAMES[rNameIndex];

    const rIntegerId = Math.ceil(Math.random() * 9999);
    const rBotId = `_BOT_${botData.nickname}-${rIntegerId}`;

    botData.userid = `${rBotId}-user`;
    botData.socketid = `${rBotId}-socket`;
    botData.usercolor = randomColor({ luminosity: 'light' });

    botData.directionCounter = 15;
    botData.directionSwitch = 1;
    if (Math.random() < 0.5) botData.directionSwitch = -1;

    return botData;
  }

  // Called externally
  function makeNewBot() {
    const newBot = getFreshBotData();
    bots.push(newBot);
    return newBot;
  }

  // Check occasionally for a dead
  // game and add bots as needed
  setInterval(() => {
    const humanPlayers = _game.getNumActivePlayers();
    // console.log('humanPlayers', humanPlayers);

    if (humanPlayers < 4) {
      // Add a bot
      const botData = makeNewBot();
      _game.addPlayer(botData);
    } else {
      // Remove a bot
      const botData = bots.splice(0, 1)[0];
      _game.removePlayer(botData);
    }
  }, 20 * 1000);

  setInterval(() => {
    setNewDirections();
  }, 234);


  return {
    makeNewBot,
  };
}

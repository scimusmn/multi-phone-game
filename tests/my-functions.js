module.exports = {
  generateRandomData,
};

// Make sure to "npm install faker" first.
const Faker = require('faker');

function generateRandomNumber(min_value, max_value) {
  const random_number = Math.abs(Math.random() * (min_value - max_value) + min_value);
  return Math.floor(random_number);
}

function generateRandomData(userContext, events, done) {
  // generate data with Faker:
  const name = `${Faker.internet.userName()}`;
  const color = Faker.internet.color();
  const timeEnter = generateRandomNumber(2, 20);
  const timeExit = generateRandomNumber(2, 30);
  // add variables to virtual user's context:
  userContext.vars.userName = name;
  userContext.vars.userColor = color;
  userContext.vars.timeEnter = timeEnter;
  userContext.vars.timeExit = timeExit;
  // continue with executing the scenario:
  return done();
}

function setupQueryParams(userContext, events, done) {
  userContext.vars.querySimulateInput = 'true'; // set the "query" variable for the virtual user
  userContext.vars.queryPrefillName = 'YaYa'; // set the "query" variable for the virtual user
  return done();
}

function simInputLoop(context, next) {
  const rNumber = Math.random();
  let doContinueLooping = true;
  if (rNumber < 0.2) {
    doContinueLooping = false;
  }
  return next(doContinueLooping); // call back with true to loop again
}

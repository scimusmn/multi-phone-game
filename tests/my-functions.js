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

const webdriver = require('selenium-webdriver');

const NUM_DEVICES_TO_LAUNCH = 15;

// 1 minute is maximum delay before launch
const MAX_LAUNCH_DELAY = 1 * 60 * 1000;

// 5 minutes is maximum playtime
const MAX_PLAY_TIME = 3 * 60 * 1000;


// TODO: This should draw from a large of array
// of different testing device configurations...
// SEE: https://www.browserstack.com/automate/capabilities
function getDeviceCapabilities() {
  // Input capabilities
  const capabilities = {
    browserName: 'android',
    device: 'Samsung Galaxy S8',
    realMobile: 'true',
    os_version: '7.0',
    'browserstack.user': 'XXXX-USER-XXXX',
    'browserstack.key': 'XXXX-KEY-XXXX',
  };

  return capabilities;
}

function launchDeviceSimulation(launchDelay) {
  const capabilities = getDeviceCapabilities();
  const playTime = 10000 + Math.ceil(Math.random() * MAX_PLAY_TIME);
  const prefillName = `AI_${Math.round(Math.random() * 999999)}`;


  setTimeout(() => {
    const driver = new webdriver.Builder()
      .usingServer('http://hub-cloud.browserstack.com/wd/hub')
      .withCapabilities(capabilities)
      .build();

    driver.get(`https://play.smm.org/?simulateInput=true+&prefillName=${prefillName}`);

    console.log('tn-> web driver opening', prefillName);
    setTimeout(() => {
      console.log('tn-> quitting driver', prefillName);
      driver.quit();
    }, playTime);
  }, launchDelay);

  console.log(`[${prefillName}] Delay: ${launchDelay / 1000}. Playtime: ${playTime / 1000}`);
}


for (let i = 0; i < NUM_DEVICES_TO_LAUNCH; i += 1) {
  const launchDelay = Math.ceil(Math.random() * MAX_LAUNCH_DELAY);
  launchDeviceSimulation(launchDelay);
}

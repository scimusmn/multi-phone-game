/* eslint no-console: 0 */
/* eslint max-len: ["error", { "code": 100 }] */
/* eslint-disable no-unused-vars */

// Map brick arrays can be exported from the brick-mapper system
// (https://github.com/scimusmn/brick-mapper)

function MapLoader() {
  const MAP_CONFIGS = [
    'Eyeballs',
    'Generic',
    'Mario',
    'Minnesota',
    'Tee',
    'Temple',
    'TRex',
    'Vase',
    'Wings',
  ];

  const maps = [];

  // De-center x/y values as they come from brick mapper.
  // Neccessary to use with PHASER physics engine,
  function deCenterBricks(arr) {
    const levelBricks = arr;
    for (let i = 0; i < levelBricks.length; i += 1) {
      const b = levelBricks[i];
      b.x -= (b.w / 2);
      b.y -= (b.h / 2);
    }
  }

  // Called externally to grab random level data.
  function getRandomBrickMap() {
    if (maps.length > 0) {
      const randomLevelIndex = Math.floor(Math.random() * maps.length);
      return maps[randomLevelIndex].bricks;
    }
    console.log('Warning: no maps have loaded.');
    return {};
  }

  // Load all maps in map_configs
  for (let i = 0; i < MAP_CONFIGS.length; i += 1) {
  // Send AJAX request to each individual JSON file

    $.getJSON(`js/maps/${MAP_CONFIGS[i]}.json`, {})
      .done((json) => {
        // console.log(`Map loaded: ${json.name}. Brick count: ${json.bricks.length}`);

        deCenterBricks(json.bricks);
        maps.push(json);
      })
      .fail((jqxhr, textStatus, error) => {
        const err = `${textStatus}, ${error}`;
        console.log(`Map load failed: ${err}`);
      });
  }

  return {
    getRandomBrickMap,
  };
}

/* eslint no-console: 0 */
/* eslint max-len: ["error", { "code": 100 }] */
/* eslint-disable no-unused-vars */
/* eslint func-names: 0 */

// Map brick arrays can be exported from the brick-mapper system
// (https://github.com/scimusmn/brick-mapper)

function MapLoader() {
  const MAP_CONFIGS = [
    // 'Eyeballs',
    // 'Generic',
    // 'Mario',
    // 'Minnesota',
    // 'Tee',
    // 'Temple',
    // 'TRex',
    // 'Vase',
    // 'Wings',
    // 'CliffsNRamps',
    // 'Pillars',
    // 'HangingVines',
    'HappyFace',
    'Pedestals',
    // 'Triangles',
    'Mushrooms',
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

  /* LOGO SHAPES */
  const logoPath = 'img/gc_logo.svg';
  const logoShapes = [];
  const svgScale = 0.144675;

  // Load external SVG file
  $.get(logoPath, (svg) => {
    const svgRef = $('#svg-container').append(svg);

    const offsetLeft = parseInt($(svgRef).children('svg').css('left'), 10);
    const offsetTop = parseInt($(svgRef).children('svg').css('top'), 10);

    const panesGroup = $(svgRef).children().children('#panes').children().children();
    const goldsGroup = $(svgRef).children().children('#golds');
    const staticsGroup = $(svgRef).children().children('#statics');

    console.log(panesGroup);
    $(panesGroup).children('path').each(function () {
      const boundsBox = $(this)[0].getBBox();
      const shapeObj = {
        ref: $(this),
        type: 'pane',
        x: (boundsBox.x * svgScale) + offsetLeft,
        y: (boundsBox.y * svgScale) + offsetTop,
        w: boundsBox.width * svgScale,
        h: boundsBox.height * svgScale,
      };
      logoShapes.push(shapeObj);
    });

    $(goldsGroup).children().each(function () {
      console.log('gold found');
      const boundsBox = $(this)[0].getBBox();
      const shapeObj = {
        ref: $(this),
        type: 'gold',
        x: (boundsBox.x * svgScale) + offsetLeft,
        y: (boundsBox.y * svgScale) + offsetTop,
        w: boundsBox.width * svgScale,
        h: boundsBox.height * svgScale,
      };
      logoShapes.push(shapeObj);
    });
  }, 'text');


  function getLogoShapes() {
    return logoShapes;
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
    getLogoShapes,
  };
}

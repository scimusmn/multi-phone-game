// This array can be exported from the brick-mapper system... (https://github.com/scimusmn/brick-mapper)

require { level1 } from './maps/Temple';

// Collect all levels (Weight randomness by adding levels multiple times...)
// const levels = [level1, level2, level3, level4, level5, level6, level7, level8, level8, level9, level4, level4, level4, level7, level7];
const levels = [level1];

// IMPORTANT. In order to use in physics engine,
// we need to de-center the bricks as they come from brick mapper.
function deCenterBricks(arr) {
  const levelBricks = arr;
  for (let i = 0; i < levelBricks.length; i++) {
    const b = levelBricks[i];
    b.x -= (b.w / 2);
    b.y -= (b.h / 2);
  }
}

// Call externally to grab random level data.
function FishRandomBrickLevel() {
  const randomLevelIndex = Math.floor(Math.random() * levels.length);

  console.log('BrickTileMap.FishRandomBrickLevel() : random level index:', randomLevelIndex);

  return levels[randomLevelIndex];
}


// De-center all bricks (brick-mapper exports as centered)
deCenterBricks(level1);
// deCenterBricks(level2);
// deCenterBricks(level3);
// deCenterBricks(level4);
// deCenterBricks(level5);
// deCenterBricks(level6);
// deCenterBricks(level7);
// deCenterBricks(level8);
// deCenterBricks(level9);

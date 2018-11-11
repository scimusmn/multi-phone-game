/* eslint no-console: 0 */
/* eslint max-len: ["error", { "code": 100 }] */
/* eslint no-use-before-define: 0 */
/* eslint no-undef: 0 */
/* eslint no-param-reassign: 0 */

// eslint-disable-next-line no-unused-vars
function Game(_mapLoader) {
  // Game settings
  const DEBUG_MODE = false;
  const ROUND_DURATION = 9; // 75
  const LOBBY_DURATION = 5; // 35
  const STUNS_ENABLED = true;
  const CROWNS_ENABLED = true;
  const POINTS_PER_BRICK = 10;
  const GAME_STAGE_WIDTH = 1666;
  const GAME_STAGE_HEIGHT = 1080;

  const thisRef = this;
  let currentFrameRequest = 0;
  const flyers = [];
  const asteroids = [];
  let stageDiv = {};
  let stageBounds = {};
  let roundCountdown = -LOBBY_DURATION;
  let onForceDisconnectCallback;
  let winCallback;
  let loseCallback;
  let pointsCallback;
  let stunCallback;

  /* ================= */
  /* PHASER GAME LAYER */
  /* ================= */
  const game = new Phaser.Game(
    GAME_STAGE_WIDTH,
    GAME_STAGE_HEIGHT,
    Phaser.AUTO, 'stage', {
      preload: phaserPreload,
      create: phaserCreate,
      update: phaserUpdate,
      render: phaserRender,
    },
  );

  // Physics variables
  const flyerSpeedVertical = 30;
  const flyerSpeedHorizontal = 25;

  const debugFlyerData = {
    userid: 'debug-user-id12345',
    usercolor: '#FD6E83',
    nickname: 'Debug',
    socketid: 'debug-socket-id-abc',
  };

  let cursors;
  let brickPlatforms;
  let allFlyersGroup;
  let winnerCrown;

  let brickEmitter;

  function phaserPreload() {
    /* Phaser game settings */

    // Prevent game from pausing when browser loses focus
    game.stage.disableVisibilityChange = true;

    /* Preload game assets */
    game.load.image('block', 'img/sprites/block.png');
    game.load.image('block-damaged', 'img/sprites/block-damaged.png');
    game.load.image('block-damaged-2', 'img/sprites/block-damaged-2.png');
    game.load.image('block-piece', 'img/sprites/block-piece.png');
    game.load.image('crown', 'img/sprites/crown.png');

    game.load.atlasJSONHash('led', 'img/sprites/led.png', 'img/sprites/led.json');
  }

  function clearAllBricks() {
    brickPlatforms.removeAll(true);
  }

  function createBrickPlatforms() {
    if (brickPlatforms) {
      clearAllBricks();
    } else {
      brickPlatforms = game.add.group();
    }

    const brickRects = _mapLoader.getRandomBrickMap();

    for (let i = 0; i < brickRects.length; i += 1) {
      const br = brickRects[i];

      const platform = brickPlatforms.create(br.x, br.y, 'block');
      platform.width = br.w;
      platform.height = br.h;

      game.physics.ninja.enable(platform, 3);
      platform.body.immovable = true;
      platform.body.gravityScale = 0;
    }
  }

  function phaserCreate() {
    // Physics system
    game.physics.startSystem(Phaser.Physics.NINJA);

    // Turn down gravity a bit (default was 0.2)
    game.physics.ninja.gravity = 0.07;

    // Keyboard for debug
    cursors = game.input.keyboard.createCursorKeys();
    spaceButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
    spaceButton.onDown.add(() => {
      thisRef.controlTap(debugFlyerData);
    }, this);

    winnerCrown = game.add.sprite(0, 0, 'crown');
    winnerCrown.name = 'crown';
    winnerCrown.anchor.x = 0.5;
    winnerCrown.anchor.y = 2.4;
    winnerCrown.scale.setTo(0.1, 0.1);

    // Prepare particle effects
    brickEmitter = game.add.emitter(0, 0, 100);
    brickEmitter.physicsBodyType = Phaser.Physics.NINJA;
    brickEmitter.enableBody = true;
    brickEmitter.makeParticles('block-piece', 0, 100, true, true);
    brickEmitter.gravity = 620;
    brickEmitter.bounce.setTo(0.4, 0.6);
    brickEmitter.setScale(0.25, 0.45, 0.25, 0.45);
    brickEmitter.setAlpha(0.45, 0.85);

    // Game objects
    allFlyersGroup = game.add.group();

    // Generate brick tile pattern.
    createBrickPlatforms();

    if (DEBUG_MODE === true) {
      thisRef.addPlayer(debugFlyerData);

      setTimeout(() => {
        crownWinner(flyers[0]);
      }, 2000);
    }
  }

  function addPhaserBody(userdata) {
    const userColor = parseInt(userdata.usercolor.replace(/^#/, ''), 16);

    const spawnX = Math.round(Math.random() * 600) + 600;
    const spawnY = 300 - Math.round(Math.random() * 150);
    const flyerGroup = allFlyersGroup.create(spawnX, spawnY, '');
    flyerGroup.width = 40;
    flyerGroup.height = 58;

    const flyerSprite = game.add.sprite(0, 0, 'led');

    let frames = Phaser.Animation.generateFrameNames('idle_', 0, 4, '.png', 4);
    flyerSprite.animations.add('idle', frames, 10, true, false);

    frames = Phaser.Animation.generateFrameNames('side_', 1, 6, '.png', 4);
    flyerSprite.animations.add('fly', frames, 10, true, false);

    const flyerInner = game.add.sprite(0, 0, 'led');

    // Inner/white
    frames = Phaser.Animation.generateFrameNames('idle-inner', 1, 5, '.png', 0);
    flyerInner.animations.add('idle', frames, 10, true, false);

    frames = Phaser.Animation.generateFrameNames('side-inner', 1, 6, '.png', 0);
    flyerInner.animations.add('fly', frames, 10, true, false);

    flyerSprite.animations.play('fly');
    flyerSprite.tint = userColor;
    flyerSprite.setScaleMinMax(-0.8, 0.8, 0.8, 0.8);

    flyerSprite.anchor.x = 0.5;
    flyerSprite.anchor.y = 0.5;

    flyerInner.anchor.x = 0.5;
    flyerInner.anchor.y = 0.48;

    flyerInner.animations.play('fly');
    flyerInner.setScaleMinMax(-0.8, 0.8, 0.8, 0.8);

    // Swipe collision object.
    const flyerRange = game.add.sprite(0, 0, '');

    flyerRange.anchor.x = 0.5;
    flyerRange.anchor.y = 0.5;

    flyerRange.width = 150;
    flyerRange.height = 100;

    // Combine into single flyer sprite
    flyerGroup.addChild(flyerRange);
    flyerGroup.addChild(flyerSprite);
    flyerGroup.addChild(flyerInner);

    game.physics.ninja.enableAABB(flyerGroup, false);

    // Speed cap for flyers (default was 8)
    flyerGroup.body.maxSpeed = 9;

    // Make brick platforms a little sticky.
    // Default friction was 0.05
    flyerGroup.body.friction = 0.1;

    // How much air drag affects flyer
    // Default drag was 1.0 (0-1 range)
    flyerGroup.body.drag = 0.988;

    // Set bouncincess of bricks
    // Default is 0.3
    flyerGroup.body.bounce = 0.36;

    return [flyerGroup.body, flyerSprite, flyerInner];
  }

  function phaserUpdate() {
    // Collisions between flyers and brick platforms
    game.physics.ninja.collide(allFlyersGroup, brickPlatforms);

    // Brick pieces... (not working)
    // game.physics.ninja.collide(brickEmitter, brickPlatforms);

    for (let i = 0; i < flyers.length; i += 1) {
      controllerInput(flyers[i]);
    }

    if (DEBUG_MODE === true) {
      keyboardInput(flyers[0]);
    }
  }

  function controllerInput(flyer) {
    const f = flyer;
    const fBody = f.phaserBody;
    const fSprite = f.phaserSprite;
    const fInner = f.phaserInner;

    if (f.ax < 0) {
      fBody.moveLeft(flyerSpeedHorizontal * Math.abs(f.ax));
      fSprite.animations.play('fly');
      fInner.animations.play('fly');
      f.dir = -1.0;
      fSprite.scale.setTo(f.dir, 1.0);
      fInner.scale.setTo(-f.dir, 1.0);
      if (f.crowned === true) {
        winnerCrown.angle = -40;
        winnerCrown.anchor.x = 1.0;
        winnerCrown.anchor.y = 3.2;
      }
    } else if (f.ax > 0) {
      fBody.moveRight(flyerSpeedHorizontal * Math.abs(f.ax));
      fSprite.animations.play('fly');
      fInner.animations.play('fly');
      f.dir = 1.0;
      fSprite.scale.setTo(f.dir, 1.0);
      fInner.scale.setTo(-f.dir, 1.0);
      if (f.crowned === true) {
        winnerCrown.angle = 40;
        winnerCrown.anchor.x = 0.0;
        winnerCrown.anchor.y = 3.2;
      }
    } else {
      fSprite.animations.play('idle');
      fInner.animations.play('idle');
      if (f.crowned === true) {
        winnerCrown.angle = 0;
        winnerCrown.anchor.x = 0.5;
        winnerCrown.anchor.y = 2.9;
      }
    }

    if (flyer.ay < 0) {
      fBody.moveUp(flyerSpeedVertical * Math.abs(flyer.ay));
    } else if (flyer.ay > 0) {
      fBody.moveDown(flyerSpeedVertical * Math.abs(flyer.ay));
    }
  }

  function keyboardInput(flyer) {
    if (flyers.length === 0) return;

    const f = flyer;
    f.gas = false;

    if (cursors.left.isDown) {
      // Mimic leftward phone input
      f.gas = true;
      f.ax = -flyerSpeedHorizontal * 0.025;
    } else if (cursors.right.isDown) {
      // Mimic rightward phone input
      f.gas = true;
      f.ax = flyerSpeedHorizontal * 0.025;
    } else {
      // Mimic no phone input
      f.ax = 0.0;
    }

    if (cursors.up.isDown) {
      // Mimic upward phone input
      f.gas = true;
      f.ay = -flyerSpeedVertical * 0.025;
    } else if (cursors.down.isDown) {
      // Mimic downward phone input
      f.gas = true;
      f.ay = flyerSpeedVertical * 0.025;
    } else {
      // Mimic no phone input
      f.ay = 0.0;
    }
  }

  function crownWinner(flyer) {
    console.log('crownWinner', flyer);

    // If not already wearing crown, add.
    // if (flyer.phaserBody.sprite.children.indexOf(winnerCrown) === -1) {
    // sprite is a part of groupA
    // flyer.phaserBody.sprite.addChild(winnerCrown);
    // }

    for (let i = 0; i < flyers.length; i += 1) {
      if (flyer === flyers[i]) {
        flyers[i].crowned = true;
        flyers[i].phaserBody.sprite.addChild(winnerCrown);
      } else {
        flyers[i].crowned = false;
      }
    }
  }

  function flyerBrickSwipe(f) {
    // Detect if any bricks were hit

    // Default to swing from upper left of flyer
    const swipeRadius = 50;
    const swipeCircle = {
      x: f.phaserBody.x,
      y: f.phaserBody.y + (f.phaserBody.height * 0.125),
      r: swipeRadius,
    };

    // If facing right, swipe from middle right
    if (f.dir > 0) swipeCircle.x += f.phaserBody.width;

    let brick;
    let testRect;
    let didBustBrick = false;

    for (let i = brickPlatforms.children.length - 1; i >= 0; i -= 1) {
      brick = brickPlatforms.children[i];

      // Skip bricks that are
      // already smashed
      if (brick.visible) {
        testRect = {
          x: brick.x, y: brick.y, w: brick.width, h: brick.height,
        };

        if (rectCircleCollision(swipeCircle, testRect)) {
          damageBrick(brick, f);
          didBustBrick = true;
        }
      }
    }

    return didBustBrick;
  }

  function damageBrick(brick, flyer) {
    if (brick.key === 'block') {
      brick.loadTexture('block-damaged');
    } else if (brick.key === 'block-damaged') {
      brick.loadTexture('block-damaged-2');
    } else {
      brick.kill();

      // TODO - If we don't plan to
      // turn this brick back 'on'
      // we should destroy, not kill.
      // Otherwise, bring back into
      // gameplay with 'revive'

      if (roundCountdown > 0) {
        // Increment player points
        flyer.score += POINTS_PER_BRICK;

        // Display in-game points
        releasePoints(POINTS_PER_BRICK, flyer.color, brick.x, brick.y - 15, flyer.dir);
      }

      particleBrickBurst(brick.x, brick.y, flyer.dir);
    }
  }

  function particleBrickBurst(x, y, dir) {
    //  Position the emitter where the event was
    brickEmitter.x = x;
    brickEmitter.y = y;

    brickEmitter.setXSpeed(20 * dir, 400 * dir);

    //  First parameter sets effect to "explode" which means all particles are emitted at once
    //  The second gives each particle a 2000ms lifespan
    //  The third is ignored when using burst/explode mode
    //  The final parameter (10) is how many particles will be emitted in this single burst

    // brickEmitter.start(true, 5500, null, 10);

    brickEmitter.explode(5555, Math.round(Math.random() * 2 + 3));
  }

  function attemptStun(attackingFlyer) {
    let didStun = false;
    const stunRadius = 70;
    let otherFlyer;
    let oX;
    let oY;
    let tX;
    let tY;
    let stunDist;
    for (i = flyers.length - 1; i >= 0; i -= 1) {
      // Skip attacking flyer and stunned flyers
      if (flyers[i].userid !== attackingFlyer.userid && flyers[i].stunned === false) {
        otherFlyer = flyers[i];

        oX = parseInt(otherFlyer.phaserBody.x, 10);
        oY = parseInt(otherFlyer.phaserBody.y, 10);
        tX = parseInt(attackingFlyer.phaserBody.x, 10);
        tY = parseInt(attackingFlyer.phaserBody.y, 10);

        stunDist = dist(oX, oY, tX, tY);

        if (stunDist < stunRadius) {
          // Successful stun!
          didStun = true;

          // Freeze associated phaser physics obj
          otherFlyer.stunned = true;
          otherFlyer.phaserBody.reset(oX, oY);
          otherFlyer.phaserBody.gravityScale = 0;
          otherFlyer.phaserSprite.alpha = 0.7;
          otherFlyer.phaserSprite.animations.paused = true;

          TweenMax.to($(otherFlyer.div), 0.2, {
            css: { opacity: 0.5 },
            ease: Power2.easeInOut,
            repeat: 12,
            yoyo: true,
            onComplete: liftStun,
            onCompleteParams: [otherFlyer],
          });
          if (stunCallback) {
            stunCallback.call(undefined, otherFlyer.socketid);
          }
        }
      }
    }
    return didStun;
  }

  function liftStun(flyer) {
    flyer.stunned = false;

    // Reapply gravity
    flyer.phaserBody.gravityScale = 1;
    flyer.phaserSprite.alpha = 1.0;
    flyer.phaserSprite.animations.paused = false;

    TweenLite.set($(flyer.div), { css: { opacity: 1 } });
  }

  function phaserLevelReset() {
    // Generate brick tile pattern.
    createBrickPlatforms();
  }

  function phaserRender() {
    if (DEBUG_MODE === true) {
      game.debug.text(`flyer count: ${flyers.length}`, 256, 64);

      if (flyers.length > 0) {
        game.debug.body(flyers[0].phaserBody.sprite, '#F00', false);
        game.debug.spriteBounds(flyers[0].phaserBody.sprite.getChildAt(1), '#0FF', false);

        // game.debug.spriteBounds(flyers[0].phaserBody.sprite.getChildAt(0), '#F0F', false);
        game.debug.body(flyers[0].phaserBody.sprite.getChildAt(0), '#F0F', false);
      }
    }
  }

  /* ============== */
  /* PUBLIC METHODS */
  /* ============== */

  this.init = (_stageDiv) => {
    stageDiv = _stageDiv;
    this.start();
  };

  this.setCallbacks = (forceDisconnect, win, lose, points, stun) => {
    onForceDisconnectCallback = forceDisconnect;
    winCallback = win;
    loseCallback = lose;
    pointsCallback = points;
    stunCallback = stun;
  };

  this.start = () => {
    // Start game loop
    currentFrameRequest = window.requestAnimationFrame(gameLoop);

    // Begin releasing asteroids
    setInterval(() => {
      if (flyers.length > 0 && roundCountdown > 0) {
        releaseAsteroid();

        // Extra asteroids for more players
        for (let i = 0; i < Math.floor(flyers.length / 3); i += 1) {
          releaseAsteroid();
        }
      }
    }, 4500);

    // Begin updating scoreboard & round countdowns
    setInterval(() => {
      if (flyers.length > 0) updateScoreboard();

      if (roundCountdown < 0) {
        roundCountdown += 1;

        $('#round-countdown').text(Math.abs(roundCountdown));

        if (roundCountdown === 0) {
          startRound();
          $('#game-countdown').removeClass('show');
        }
      } else if (roundCountdown > 0) {
        roundCountdown -= 1;

        // Only display countdown below 15 seconds
        if (roundCountdown <= 15) {
          $('#game-countdown').text(Math.abs(roundCountdown));
          $('#game-countdown').addClass('show');
        }

        if (roundCountdown === 0) {
          endRound();
        }
      }
    }, 1000);
  };

  this.stop = () => {
    // Stop game loop
    window.cancelAnimationFrame(currentFrameRequest);
  };

  this.setBounds = (x, y, w, h) => {
    stageBounds = {
      left: x, ceil: y, floor: h, right: w,
    };

    // Add padding for flyer height
    stageBounds.floor -= 46;
  };

  this.addPlayer = (data) => {
    // Add new flyer div to stage

    const htmlString = `<div id="flyer_${data.userid}" class="flyer" >`
                          + `<p style="color:${data.usercolor};">${data.nickname}</p>`
                          + '<img id="fist" src="img/hero_fist.png"/>'
                          + '<img id="idle" src="img/hero_idle.png"/>'
                          + '<img id="fly" src="img/hero_fly.png"/>'
                        + '</div>';

    $(stageDiv).append(htmlString);

    const flyerDiv = $(`#flyer_${data.userid}`);

    // Pop in
    const startX = Math.random() * (stageBounds.right - 100) + 50;
    const startY = Math.random() * (stageBounds.floor - 300) + 50;
    TweenLite.set($(flyerDiv), { css: { left: startX, top: startY } });
    TweenLite.from($(flyerDiv), 1, { css: { scale: 0 }, ease: Elastic.easeOut });

    // Flash colored ring around new player for a few seconds
    const highlightRing = $(`<div class="highlightRing" style="color:${data.usercolor};"></div>`);
    $(flyerDiv).append(highlightRing);
    TweenMax.set($(highlightRing), { css: { opacity: 0.0 } });
    TweenMax.to($(highlightRing), 0.2, {
      css: { opacity: 1, scale: 0.9 },
      ease: Power1.easeOut,
      delay: 0.3,
      repeat: 11,
      yoyo: true,
      onComplete: removeElement,
      onCompleteParams: [highlightRing],
    });

    const phaserObj = addPhaserBody(data);
    const pBody = phaserObj[0];
    const pSprite = phaserObj[1];
    const pInner = phaserObj[2];

    // Add to game loop
    const newFlyer = {
      userid: data.userid,
      socketid: data.socketid,
      div: flyerDiv,
      flyDiv: $(flyerDiv).children('#fly'),
      idleDiv: $(flyerDiv).children('#idle'),
      fistDiv: $(flyerDiv).children('#fist'),
      phaserBody: pBody,
      phaserSprite: pSprite,
      phaserInner: pInner,
      nickname: data.nickname,
      color: data.usercolor,
      deadCount: 0,
      score: 0,
      gas: false,
      stunned: false,
      crowned: false,
      dir: 1,
      x: startX,
      y: startY,
      ax: 0,
      ay: 0,
      vx: 0,
      vy: -0.1,
    };

    flyers.push(newFlyer);
  };

  this.removePlayer = (data) => {
    console.log(`Game.removePlayer: ${data}`);

    // Remove flyer from stage, phaser system, and game loop
    const flyer = lookupFlyer(data.userid);

    if (flyer !== null && flyer !== undefined) {
      // Remove div from html
      $(flyer.div).remove();

      // Remove Phaser sprite
      flyer.phaserBody.sprite.destroy();
    }

    // Remove from flyers array.
    for (i = flyers.length - 1; i >= 0; i -= 1) {
      if (flyers[i].userid === data.userid) flyers.splice(i, 1);
    }
  };

  this.controlVector = (data) => {
    const f = lookupFlyer(data.userid);
    if (f === undefined) return;
    if (f.stunned) return;

    if (data.magnitude === 0) {
      // No acceleration
      f.gas = false;
    } else {
      // Is accelerating
      f.gas = true;
    }

    // Set acceleration for phaser
    f.ax = Math.cos(data.angle) * data.magnitude;
    f.ay = Math.sin(data.angle) * data.magnitude;
  };

  this.controlTap = (data) => {
    const f = lookupFlyer(data.userid);
    if (f === undefined) return;
    if (f.stunned) return;

    // Swipe action
    TweenLite.set(f.fistDiv, {
      css: {
        rotation: -60 * f.dir,
        opacity: 1,
        transformOrigin: '50% 100% 0',
      },
    });
    TweenMax.to(f.fistDiv, 0.4, {
      css: {
        rotation: 330 * f.dir,
        opacity: 0,
      },
      ease: Power3.easeOut,
    });

    // Destroy asteroids
    const points = smashAsteroids(f.phaserBody.x + 17, f.phaserBody.y + 25, f.dir, f.color);
    if (points > 0) {
      f.score += points;

      // Emit points event to scorer
      if (pointsCallback) {
        pointsCallback.call(undefined, f.socketid);
      }
    }

    // Stun others
    if (STUNS_ENABLED === true) {
      attemptStun(f);
    }

    // Phaser attempt swipe (for bricks)
    flyerBrickSwipe(f);
  };

  /* =============== */
  /* PRIVATE METHODS */
  /* =============== */

  function gameLoop() {
    // Update game objects here...
    flyers.forEach((flyer) => {
      if (flyer.gas === true) {
        flyer.deadCount = 0;
      } else {
        flyer.deadCount += 1;

        if (flyer.deadCount > 1800) {
          // Never kill debug flyer.
          if (flyer.userid === 'debug-user-id12345') {
            flyer.deadCount = 0;
            return;
          }

          // Assume player has lost connection. Remove from game.
          // Emit disconnect event to node
          // 1800 frames at 60fps is about 30 seconds
          if (onForceDisconnectCallback) {
            onForceDisconnectCallback.call(undefined,
              {
                userid: flyer.userid,
                socketid: flyer.socketid,
              });
          }

          return;
        }
      }

      // Update position based on Phaser physics body
      TweenLite.set($(flyer.div),
        {
          css:
        {
          left: flyer.phaserBody.x - (flyer.phaserBody.width * 0.6),
          top: flyer.phaserBody.y - (flyer.phaserBody.height * 0.9),
        },
        });
    });

    // Wait for next frame
    currentFrameRequest = window.requestAnimationFrame(gameLoop);
  }

  function smashAsteroids(mineX, mineY, smashDir, ptColor) {
    let damageDealt = 0;

    for (a = asteroids.length - 1; a >= 0; a -= 1) {
      const ast = asteroids[a];
      const aL = parseInt($(ast.div).css('left'), 10) + (ast.diam * 0.5);
      const aT = parseInt($(ast.div).css('top'), 10) + (ast.diam * 0.5);

      if (dist(aL, aT, mineX, mineY) < ast.diam * 1.15) {
        // Successful strike

        if (ast.diam < 200) {
          // Normal asteroid requires one hit
          damageDealt = ast.health;
          ast.health = 0;
          releasePoints(damageDealt, ptColor, aL - 10, aT - (ast.diam * 0.5) + 3, smashDir);
        } else {
          // Monster asteroid requires multiple swings
          damageDealt = 10 + Math.ceil(Math.random() * 15);
          ast.health -= damageDealt;
          releasePoints(damageDealt, ptColor, aL - 10, aT - (ast.diam * 0.5) - 10, 0);
        }

        if (ast.health <= 0) {
          // Remove from stage
          TweenLite.to($(ast.div), 0.3, {
            css: { opacity: 0 },
            onComplete: removeElement,
            onCompleteParams: [ast.div],
          });

          // Remove from game loop
          asteroids.splice(a, 1);

          // Animate explosion
          explodeAsteroid(aL - (ast.diam * 0.5), aT - (ast.diam * 0.25), ast.diam, smashDir);
        }

        return damageDealt;
      }
    }

    return damageDealt;
  }

  function startRound() {
    // Hide new-round screen
    $('#new-round').hide();
    $('#join-msg').show();

    roundCountdown = ROUND_DURATION;

    // Reset everyone's score
    resetScoreboard();

    // Reset bricks and physics
    phaserLevelReset();
  }

  function endRound() {
    // Clear gameplay
    // Show new-round screen
    $('#new-round').show();
    $('#join-msg').hide();
    roundCountdown = -LOBBY_DURATION;
    clearAsteroids();
    clearAllBricks();
    updateScoreboard();
    $('#game-countdown').text(' ');

    if (flyers.length > 1) {
      // Emit win event to top-scorer
      if (winCallback) {
        winCallback.call(undefined, flyers[0].socketid);
      }

      // Emit lose event to every other player
      if (loseCallback) {
        for (let i = 1; i < flyers.length; i += 1) {
          loseCallback.call(undefined, flyers[i].socketid);
        }
      }

      if (CROWNS_ENABLED === true) {
        crownWinner(flyers[0]);
      }
    }
  }

  function updateScoreboard() {
    // Sort by score
    flyers.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));

    if (roundCountdown < 0) {
      // TEMP (shouldn't reach outside game stage.
      // Should be passed in through variable)
      $('#player-list').empty();
      for (let i = 0; i < flyers.length; i += 1) {
        let htmlString = `<span style="color:${flyers[i].color};">`
                          + `${flyers[i].nickname} </span> &nbsp; ${flyers[i].score}`;

        // Include crown icon for first place
        if (i === 0) {
          htmlString += ' &nbsp;  &nbsp;<img width="40px" src="img/sprites/crown.png"/>';
        }
        $('#player-list').append($('<li>').html(htmlString));
      }
    }
  }

  function resetScoreboard() {
    for (let i = 0; i < flyers.length; i += 1) {
      flyers[i].score = 0;
    }
  }

  function releasePoints(val, col, x, y, dir) {
    // Add to stage
    const pDiv = $(`<p class="points" style="color:${col};">+${val}</p>`);

    $(stageDiv).append(pDiv);

    // Starting point
    TweenLite.set($(pDiv), { css: { left: x, top: y, scale: 0.25 } });

    // Target point
    let myX = x;
    let myY = y;
    myX += Math.random() * 80 - 40 + (dir * 115);
    myY -= 45;

    // Scale and fade
    TweenLite.to($(pDiv), 0.35, { css: { scale: 1, left: myX, top: myY }, ease: Power3.easeOut });
    TweenLite.to($(pDiv), 0.5, {
      css: { opacity: 0 },
      delay: 0.35,
      ease: Power1.easeIn,
      onComplete: removeElement,
      onCompleteParams: [pDiv],
    });
  }

  function releaseAsteroid() {
    // Add new asteroid to stage
    let astType = '';
    let diam = 0;
    const r = Math.random();

    if (r < 0.5) {
      astType = 'c';
      diam = 160;
    } else if (r < 0.85) {
      astType = 'b';
      diam = 150;
    } else if (r < 0.975) {
      astType = 'd';
      diam = 165;
    } else {
      astType = 'a';
      diam = 490;
    }

    const htmlString = '<div class="asteroid" style="">'
                        + `<img src="img/asteroids/${astType}-asteroid-dark.png"/>`
                        + '</div>';

    const aDiv = $(htmlString);

    $(stageDiv).append(aDiv);

    // Scale asteroids between 50-100% orig size
    const scale = 0.5 + (Math.random() * 0.5);
    diam *= scale;

    // Release point
    // var startX = Math.random() * (stageBounds.right - 60) + 30;
    // var startY = Math.random() * (stageBounds.floor - 60) + 30;

    const startX = Math.random() * (game.width - 160) + 30;
    const startY = Math.random() * (stageBounds.floor - 60) + 30;

    TweenLite.set($(aDiv), { css: { scale, left: startX, top: startY } });

    const health = roundToNearest(diam / 2, 5);

    // Pop in
    TweenLite.from($(aDiv), 1.5, { css: { scale: 0, opacity: 0 }, ease: Elastic.easeOut });
    TweenLite.from($(aDiv), 10, {
      css: {
        left: startX + (Math.random() * 200 - 100),
        top: startY + (Math.random() * 200 - 100),
        rotation: Math.random() * 90 - 45,
      },
    });

    const ast = {
      div: aDiv, x: startX, y: startY, diam, health,
    };
    asteroids.push(ast);
  }

  function explodeAsteroid(x, y, diam, dir) {
    // Replace with chunks of asteroid dispersing
    for (let i = 0; i < 5; i += 1) {
      const astNum = Math.ceil(Math.random() * 6);

      const aDiv = $(`<div class="asteroid"><img src="img/asteroids/a${astNum}.png"/></div>`);

      $(stageDiv).append(aDiv);

      // Starting point
      let scale = Math.random() * 0.15 + 0.2;
      if (diam > 300) scale *= 2;
      TweenLite.set($(aDiv), { css: { left: x, top: y, scale } });

      // Tween from center
      TweenLite.to($(aDiv), 0.4, {
        css: {
          left: (x + Math.random() * 200 - 100) + (dir * 100),
          top: (y + Math.random() * 240 - 120),
          rotation: Math.random() * 250 - 125,
        },
        ease: Power2.easeOut,
      });

      // Fade out and remove chunk
      TweenLite.to($(aDiv), 0.4, {
        css: { opacity: 0 }, delay: 0.1, onComplete: removeElement, onCompleteParams: [aDiv],
      });
    }
  }

  function clearAsteroids() {
    for (a = asteroids.length - 1; a >= 0; a -= 1) {
      const ast = asteroids[a];

      // Fade out
      TweenLite.to($(ast.div), 0.5, {
        css: { opacity: 0 },
        delay: Math.random() * 0.5,
        onComplete: removeElement,
        onCompleteParams: [ast.div],
      });

      // Remove from game loop
      asteroids.splice(a, 1);
    }
  }

  /**
   *
   * Utility Methods
   *
   */

  function lookupFlyer(id) {
    for (let i = 0; i < flyers.length; i += 1) {
      if (flyers[i].userid === id) return flyers[i];
    }
    return null;
  }

  function removeElement(el) {
    $(el).remove();
  }

  function dist(x, y, x0, y0) {
    const result = Math.sqrt((x -= x0) * x + (y -= y0) * y);
    return result;
  }

  function roundToNearest(val, n) {
    return n * Math.round(val / n);
  }

  // Return true if the rectangle and circle are colliding
  function rectCircleCollision(circle, rect) {
    const distX = Math.abs(circle.x - rect.x - rect.w / 2);
    const distY = Math.abs(circle.y - rect.y - rect.h / 2);

    if (distX > (rect.w / 2 + circle.r)) {
      return false;
    }

    if (distY > (rect.h / 2 + circle.r)) {
      return false;
    }

    if (distX <= (rect.w / 2)) {
      return true;
    }

    if (distY <= (rect.h / 2)) {
      return true;
    }

    const dx = distX - rect.w / 2;
    const dy = distY - rect.h / 2;

    return (dx * dx + dy * dy <= (circle.r * circle.r));
  }
}

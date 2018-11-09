/* eslint no-console: 0 */
/* eslint max-len: ["error", { "code": 100 }] */
/* eslint-disable no-unused-vars */
/* eslint no-undef: 0 */

function VectorTouchControls(socket, color) {
  const currentsColor = color || 'gray';
  let angle;
  let dist;
  let magnitude;
  const screenWidth = parseInt($('body').width(), 2);
  const screenHeight = parseInt($('body').height(), 2);
  let centerX = parseInt(screenWidth / 2, 2);
  let centerY = parseInt(screenHeight / 2, 2);
  const shortest = Math.min(centerX, centerY);
  let mouseIsDown = false;

  // Setup canvas drawing
  const ctx = document.getElementById('canvas').getContext('2d');
  $('#canvas').attr('width', screenWidth);
  $('#canvas').attr('height', screenHeight);

  // Util map function
  function map(value, low1, high1, low2, high2) {
    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
  }

  // Util clamp function
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, screenWidth, screenHeight);
  }

  // Caculate gradient color
  function calcColor(min, max, val) {
    const minHue = 240;
    const maxHue = 0;
    const curPercent = (val - min) / (max - min);
    const colString = `hsl(${(curPercent * (maxHue - minHue)) + minHue},100%,50%)`;
    return colString;
  }

  function drawArrow(xPos, yPos) {
    // Length
    // var r = clamp((0.5 + 1) * 5, min, max);
    const r = (0.5 + 1) * 5;
    const endX = xPos + r * Math.cos(angle);
    const endY = yPos + r * Math.sin(angle);

    const p1x = xPos + (r * 0.81) * Math.cos(angle - 83);
    const p1y = yPos + (r * 0.81) * Math.sin(angle - 83);
    const p2x = xPos + (r * 0.81) * Math.cos(angle + 83);
    const p2y = yPos + (r * 0.81) * Math.sin(angle + 83);

    ctx.strokeStyle = '#666';
    // var pdist = Math.sqrt((endX - xPos) * endX + (endY - yPos) * endY);

    const a = xPos - centerX;
    const b = yPos - centerY;
    const c = Math.sqrt(a * a + b * b);

    // Normalized (0-1) based on shortest screen side.
    const pdist = map(c, 0, shortest, 0, 0.3) + 0.4;

    // Uncomment for user color
    ctx.strokeStyle = currentsColor;

    // Uncomment for rainbow colors
    ctx.strokeStyle = calcColor(0, 1, pdist);

    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.lineTo(endX, endY);
    ctx.lineTo(p2x, p2y);
    ctx.stroke();
  }

  function drawCurrents(tx, ty) {
    const padding = 15 + ((magnitude + 1.0) * 15);

    // var padding = 30;

    let xPos = 0;
    let yPos = 0;
    ctx.strokeStyle = '#666';
    ctx.lineWidth = clamp(0.1 + (magnitude * 2.0), 0, 1.0);

    yPos = ty - padding;

    // Downward
    while (yPos <= screenHeight) {
      yPos += padding;
      xPos = tx;

      // Leftward
      while (xPos >= 0) {
        xPos -= padding;
        drawArrow(xPos, yPos);
      }

      xPos = tx - padding;

      // Rightward
      while (xPos <= screenWidth) {
        xPos += padding;
        drawArrow(xPos, yPos);
      }
    }

    // Upward
    yPos = ty;
    while (yPos >= 0) {
      yPos -= padding;
      xPos = tx;

      // Leftward
      while (xPos >= 0) {
        xPos -= padding;
        drawArrow(xPos, yPos);
      }

      xPos = tx - padding;

      // Rightward
      while (xPos <= screenWidth) {
        xPos += padding;
        drawArrow(xPos, yPos);
      }
    }
  }

  // Canvas drawing
  function drawUI(tx, ty) {
    clearCanvas();

    // Fill background with rainbow currents
    drawCurrents(tx, ty);

    ctx.beginPath();
    ctx.lineWidth = 5 - (2 * magnitude);
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(tx, ty);
    ctx.strokeStyle = '#fff';
    ctx.fillStyle = '#333';
    ctx.fill();
    ctx.stroke();

    // Ring around center/origin
    ctx.beginPath();
    ctx.lineWidth = (3 * magnitude);
    ctx.arc(centerX, centerY, 12 - (4 * magnitude), 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // Ring around touch point
    ctx.beginPath();
    ctx.arc(tx, ty, 8, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(angle);
    const fingyOffset = 95;

    ctx.fillStyle = '#ddd';
    ctx.beginPath();
    ctx.moveTo(0 + fingyOffset, 0);
    ctx.lineTo(-24 + fingyOffset, -20);
    ctx.lineTo(-19 + fingyOffset, 0);
    ctx.lineTo(-24 + fingyOffset, 20);
    ctx.fill();

    ctx.restore();
  }

  function inputMove(inputX, inputY) {
    // Angle from center of screen
    angle = Math.atan2(inputY - centerY, inputX - centerX);

    // Distance from center in pixels
    let ix = inputX;
    let iy = inputY;
    dist = Math.sqrt((ix -= centerX) * ix + (iy -= centerY) * iy);

    // Normalized magnitude (0-1) based on shortest screen side.
    magnitude = map(dist, 0, shortest, 0, 1);

    // Dispatch updated control vector
    socket.emit('control-vector', {
      angle: angle.toFixed(4),
      magnitude: magnitude.toFixed(4),
    });

    // Draw UI
    drawUI(inputX, inputY);
  }

  function inputUp() {
    if (magnitude === 0) {
      // Touch never moved. Was tap.
      socket.emit('control-tap', {});
    } else {
      // Touch finished. Set vectors to 0;
      socket.emit('control-vector', {
        angle: 0,
        magnitude: 0,
      });
      magnitude = 0;
      angle = 0;
    }

    clearCanvas();
  }

  function inputStart(inputX, inputY) {
    centerX = inputX;
    centerY = inputY;
    clearCanvas();
  }

  function mousedown(event) {
    mouseIsDown = true;
    inputStart(event.pageX, event.pageY);
  }

  function mousemove(event) {
    if (mouseIsDown === true) {
      inputMove(event.pageX, event.pageY);
    }
  }

  function mouseup(event) {
    mouseIsDown = false;
    inputUp();
  }

  function touchEvent(event) {
    if (event.type === 'touchmove') {
      inputMove(event.touches[0].pageX, event.touches[0].pageY);
    } else if (event.type === 'touchstart') {
      inputStart(event.touches[0].pageX, event.touches[0].pageY);
    } else if (event.touches.length === 0) {
      inputUp();
    }
  }

  // Publically available enable all
  this.enable = () => {
    document.addEventListener('mousedown', mousedown, false);
    document.addEventListener('mousemove', mousemove, false);
    document.addEventListener('mouseup', mouseup, false);

    document.addEventListener('touchstart', touchEvent, false);
    document.addEventListener('touchend', touchEvent, false);
    document.addEventListener('touchcancel', touchEvent, false);
    document.addEventListener('touchmove', touchEvent, false);
  };

  // Publically available disable all
  this.disable = () => {
    document.removeEventListener('mousedown', mousedown, false);
    document.removeEventListener('mousemove', mousemove, false);
    document.removeEventListener('mouseup', mouseup, false);

    document.removeEventListener('touchstart', touchEvent, false);
    document.removeEventListener('touchend', touchEvent, false);
    document.removeEventListener('touchcancel', touchEvent, false);
    document.removeEventListener('touchmove', touchEvent, false);
  };

  // This can be manually triggered
  // for stress testing many simultaneous
  // controllers without real humans.
  this.simulateUserInput = () => {
    let simInputX = 0;
    let simInputY = 0;
    let simInputVX = 0;
    let simInputVY = 0;

    setInterval(() => {
      simInputX = (Math.random() * screenWidth) * 0.25 + (screenWidth * 0.375);
      simInputY = (Math.random() * screenHeight) * 0.25 + (screenHeight * 0.375);
      simInputVX = Math.random() * 10 - 5;

      // Slightly favor upwards
      simInputVY = Math.random() * 10 - 7;
    }, 3000);

    setInterval(() => {
      simInputX += simInputVX;
      simInputY += simInputVY;

      if (Math.random() > 0.25) {
        // Touchmove
        inputMove(simInputX, simInputY);
      } else if (Math.random() < 0.5) {
        // Touchstart
        centerX = Math.random() * screenWidth;
        centerY = Math.random() * screenHeight + 20;
      } else {
        // Touchend
        inputUp();
      }
    }, 20);
  };

  // Touchglow effect
  $('body').touchglow({

    touchColor: '#fff',
    touchBlurRadius: 60,
    touchSpread: 30,
    fadeInDuration: 12,
    fadeOutDuration: 250,

    onUpdatePosition() {
      return true;
    },

    onFadeIn(fadeDur) {
      $('#instruct').stop().fadeTo(fadeDur, 0.01);
      return true;
    },

    onFadeOut(fadeDur) {
      $('#instruct').stop().fadeTo(fadeDur, 1);
      return true;
    },

  });
}

function VectorTouchController(socket, color) {

  var currentsColor = color || 'gray';
  var angle;
  var dist;
  var magnitude;
  var screenWidth = parseInt($('body').width());
  var screenHeight = parseInt($('body').height());
  var centerX = parseInt(screenWidth / 2);
  var centerY = parseInt(screenHeight / 2);
  var shortest = Math.min(centerX, centerY);
  var mouseIsDown = false;

  // Setup canvas drawing
  var ctx = document.getElementById('canvas').getContext('2d');
  $('#canvas').attr('width', screenWidth);
  $('#canvas').attr('height', screenHeight);

  this.enable = function() {

    document.addEventListener('mousedown', mousedown, false);
    document.addEventListener('mousemove', mousemove, false);
    document.addEventListener('mouseup', mouseup, false);

    document.addEventListener('touchstart', touchEvent, false);
    document.addEventListener('touchend', touchEvent, false);
    document.addEventListener('touchcancel', touchEvent, false);
    document.addEventListener('touchmove', touchEvent, false);

  };

  this.disable = function() {

    document.removeEventListener('mousedown', mousedown, false);
    document.removeEventListener('mousemove', mousemove, false);
    document.removeEventListener('mouseup', mouseup, false);

    document.removeEventListener('touchstart', touchEvent, false);
    document.removeEventListener('touchend', touchEvent, false);
    document.removeEventListener('touchcancel', touchEvent, false);
    document.removeEventListener('touchmove', touchEvent, false);

  };

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

    if (event.type == 'touchmove') {

      inputMove(event.touches[0].pageX, event.touches[0].pageY);

    } else if (event.type == 'touchstart') {

      inputStart(event.touches[0].pageX, event.touches[0].pageY);

    } else if (event.touches.length === 0) {

      inputUp();

    }

  }

  function inputStart(inputX, inputY) {

    centerX = inputX;
    centerY = inputY;
    clearCanvas();

  }

  function inputMove(inputX, inputY) {

    // Angle from center of screen
    angle = Math.atan2(inputY - centerY, inputX - centerX);

    // Distance from center in pixels
    var ix = inputX;
    var iy = inputY;
    dist = Math.sqrt((ix -= centerX) * ix + (iy -= centerY) * iy);

    // Normalized magnitude (0-1) based on shortest screen side.
    magnitude = map(dist, 0, shortest, 0, 1);

    // Dispatch updated control vector
    socket.emit('control-vector', {     angle: angle.toFixed(4),
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
      socket.emit('control-vector', {   angle: 0,
                                        magnitude: 0,
                                    });
      magnitude = angle = 0;

    }

    clearCanvas();

  }

  // Canvas drawing
  function drawUI(tx,ty) {

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

    // Screen cross-hair
    /*    ctx.beginPath();
        ctx.moveTo(centerX, 0);
        ctx.lineTo(centerX, screenHeight);
        ctx.moveTo(0, centerY);
        ctx.lineTo(screenWidth, centerY);
        ctx.strokeStyle = '#c88';
        ctx.stroke();*/

    // Ring around touch point
    ctx.beginPath();
    ctx.arc(tx, ty, 8, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(angle);
    var fingyOffset = 95;

    ctx.fillStyle = '#ddd';
    ctx.beginPath();
    ctx.moveTo(0 + fingyOffset, 0);
    ctx.lineTo(-24 + fingyOffset, -20);
    ctx.lineTo(-19 + fingyOffset, 0);
    ctx.lineTo(-24 + fingyOffset, 20);
    ctx.fill();

    ctx.restore();

  }

  function drawCurrents(tx,ty) {

    var padding = 15 + ((magnitude + 1.0) * 15);

    // var padding = 30;

    var xPos = 0;
    var yPos = 0;
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

  function drawArrow(xPos, yPos) {

    // Length
    // var r = clamp((0.5 + 1) * 5, min, max);
    var r = (0.5 + 1) * 5;
    var endX = xPos + r * Math.cos(angle);
    var endY = yPos + r * Math.sin(angle);

    var p1x = xPos + (r * .81) * Math.cos(angle - 83);
    var p1y = yPos + (r * .81) * Math.sin(angle - 83);
    var p2x = xPos + (r * .81) * Math.cos(angle + 83);
    var p2y = yPos + (r * .81) * Math.sin(angle + 83);

    ctx.strokeStyle = '#666';
    var pdist = Math.sqrt((endX - xPos) * endX + (endY - yPos) * endY);

    var a = xPos - centerX;
    var b = yPos - centerY;
    var c = Math.sqrt(a * a + b * b);

    // Normalized (0-1) based on shortest screen side.
    var pdist = map(c, 0, shortest, 0, 0.3) + 0.4;

    // Uncomment for rainbow colors
    // ctx.strokeStyle = calcColor(0, 1, pdist);

    ctx.strokeStyle = currentsColor;
    ctx.beginPath();
    ctx.moveTo(p1x, p1y);
    ctx.lineTo(endX, endY);
    ctx.lineTo(p2x, p2y);
    ctx.stroke();

  }

  function calcColor(min, max, val) {
    var minHue = 240;
    var maxHue = 0;
    var curPercent = (val - min) / (max - min);
    var colString = 'hsl(' + ((curPercent * (maxHue - minHue)) + minHue) + ',100%,50%)';
    return colString;
  }

  function clearCanvas() {
    ctx.clearRect(0, 0, screenWidth, screenHeight);
  }

  // This can be manually triggered
  // for stress testing many simultaneous
  // controllers without real humans.
  this.simulateUserInput = function() {

    var simInputX = 0;
    var simInputY = 0;
    var simInputVX = 0;
    var simInputVY = 0;

    setInterval(function() {

      simInputX = (Math.random() * screenWidth) * 0.25 + (screenWidth * 0.375);
      simInputY = (Math.random() * screenHeight) * 0.25 + (screenHeight * 0.375);
      simInputVX = Math.random() * 10 - 5;

      // Slightly favor upwards
      simInputVY = Math.random() * 10 - 7;

    }, 3000);

    setInterval(function() {

      simInputX += simInputVX;
      simInputY += simInputVY;

      if (Math.random() > 0.25) {
        // Touchmove
        inputMove(simInputX, simInputY);
      }else {

        if (Math.random() < 0.5) {
          // Touchstart
          centerX = Math.random() * screenWidth;
          centerY = Math.random() * screenHeight + 20;
        } else {
          // Touchend
          inputUp();
        }

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

    onUpdatePosition: function(x,y) {
      return true;

    },

    onFadeIn: function(fadeDur) {
      $('#instruct').stop().fadeTo(fadeDur, 0.01);
      return true;
    },

    onFadeOut: function(fadeDur) {
      $('#instruct').stop().fadeTo(fadeDur, 1);
      return true;
    },

  });

  function map(value, low1, high1, low2, high2) {

    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);

  }

  function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
};

};

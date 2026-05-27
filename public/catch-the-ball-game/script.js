const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const missedEl = document.getElementById("missed");
const bestScoreEl = document.getElementById("bestScore");
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");

const game = {
  score: 0,
  missed: 0,
  maxMissed: 3,
  running: false,
  paused: false,
  lastTime: 0,
  spawnTimer: 0,
  spawnDelay: 900,
  balls: [],
  keys: {
    left: false,
    right: false
  }
};

const difficulty = {
  baseSpawnDelay: 780,
  minSpawnDelay: 310,
  baseBallSpeed: 230,
  ballSpeedRange: 150,
  scoreSpeedBonus: 8
};

const basket = {
  x: canvas.width / 2 - 75,
  y: canvas.height - 62,
  baseWidth: 132,
  width: 132,
  height: 46,
  speed: 610
};

let bestScore = Number(localStorage.getItem("catchBallBestScore")) || 0;
bestScoreEl.textContent = bestScore;

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * scale);
  canvas.height = Math.floor(rect.height * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  basket.y = rect.height - 62;
  basket.x = Math.min(basket.x, rect.width - basket.width);
}

function visibleWidth() {
  return canvas.getBoundingClientRect().width;
}

function visibleHeight() {
  return canvas.getBoundingClientRect().height;
}

function resetGame() {
  game.score = 0;
  game.missed = 0;
  game.running = true;
  game.paused = false;
  game.lastTime = 0;
  game.spawnTimer = 0;
  game.spawnDelay = difficulty.baseSpawnDelay;
  game.balls = [];
  updateBasketSize();
  basket.x = visibleWidth() / 2 - basket.width / 2;
  basket.y = visibleHeight() - 62;
  updateHud();
  pauseBtn.textContent = "Pause";
  overlay.classList.add("hidden");
  requestAnimationFrame(update);
}

function updateHud() {
  scoreEl.textContent = game.score;
  missedEl.textContent = game.missed;
  bestScoreEl.textContent = bestScore;
}

function spawnBall() {
  const radius = 12 + Math.random() * 11;
  const maxX = visibleWidth() - radius;
  const colors = ["#ef476f", "#ffd166", "#06d6a0", "#118ab2", "#f77f00"];

  game.balls.push({
    x: radius + Math.random() * (maxX - radius),
    y: -radius,
    radius,
    speed: difficulty.baseBallSpeed + Math.random() * difficulty.ballSpeedRange + game.score * difficulty.scoreSpeedBonus,
    color: colors[Math.floor(Math.random() * colors.length)]
  });
}

function update(time) {
  if (!game.running) {
    return;
  }

  if (!game.lastTime) {
    game.lastTime = time;
  }

  const delta = Math.min((time - game.lastTime) / 1000, 0.035);
  game.lastTime = time;

  if (!game.paused) {
    moveBasket(delta);
    moveBalls(delta);
    game.spawnTimer += delta * 1000;

    if (game.spawnTimer >= game.spawnDelay) {
      spawnBall();
      game.spawnTimer = 0;
      game.spawnDelay = Math.max(difficulty.minSpawnDelay, difficulty.baseSpawnDelay - game.score * 22);
    }
  }

  draw();
  requestAnimationFrame(update);
}

function moveBasket(delta) {
  if (game.keys.left) {
    basket.x -= basket.speed * delta;
  }

  if (game.keys.right) {
    basket.x += basket.speed * delta;
  }

  basket.x = Math.max(0, Math.min(visibleWidth() - basket.width, basket.x));
}

function moveBalls(delta) {
  for (let i = game.balls.length - 1; i >= 0; i -= 1) {
    const ball = game.balls[i];
    ball.y += ball.speed * delta;

    if (isCaught(ball)) {
      game.balls.splice(i, 1);
      game.score += 1;
      updateBasketSize();

      if (game.score > bestScore) {
        bestScore = game.score;
        localStorage.setItem("catchBallBestScore", bestScore);
      }

      updateHud();
      continue;
    }

    if (ball.y - ball.radius > visibleHeight()) {
      game.balls.splice(i, 1);
      game.missed += 1;
      updateHud();

      if (game.missed >= game.maxMissed) {
        endGame();
      }
    }
  }
}

function isCaught(ball) {
  const closestX = Math.max(basket.x, Math.min(ball.x, basket.x + basket.width));
  const closestY = Math.max(basket.y, Math.min(ball.y, basket.y + basket.height));
  const distanceX = ball.x - closestX;
  const distanceY = ball.y - closestY;

  return distanceX * distanceX + distanceY * distanceY < ball.radius * ball.radius;
}

function draw() {
  const width = visibleWidth();
  const height = visibleHeight();

  ctx.clearRect(0, 0, width, height);
  drawBackground(width, height);
  drawBasket();
  game.balls.forEach(drawBall);

  if (game.paused && game.running) {
    drawCenterText("Paused");
  }
}

function drawBackground(width, height) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#dff6ff");
  sky.addColorStop(1, "#eef8ef");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(24, 33, 47, 0.08)";
  for (let x = 0; x < width; x += 44) {
    ctx.fillRect(x, 0, 1, height);
  }

  ctx.fillStyle = "#8bd17c";
  ctx.fillRect(0, height - 22, width, 22);
}

function drawBasket() {
  const lipHeight = 13;
  const bottomInset = 24;
  const rimY = basket.y + 4;
  const bodyY = basket.y + lipHeight;
  const bodyHeight = basket.height - lipHeight;

  ctx.save();
  ctx.shadowColor = "rgba(20, 24, 31, 0.28)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 5;

  ctx.fillStyle = "#3f6f5f";
  ctx.beginPath();
  ctx.roundRect(basket.x - 12, rimY, basket.width + 24, lipHeight, 8);
  ctx.fill();

  const basketFill = ctx.createLinearGradient(0, bodyY, 0, basket.y + basket.height);
  basketFill.addColorStop(0, "#f2a541");
  basketFill.addColorStop(1, "#b85c1c");
  ctx.fillStyle = basketFill;
  ctx.beginPath();
  ctx.moveTo(basket.x + 4, bodyY);
  ctx.lineTo(basket.x + basket.width - 4, bodyY);
  ctx.lineTo(basket.x + basket.width - bottomInset, basket.y + basket.height);
  ctx.lineTo(basket.x + bottomInset, basket.y + basket.height);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(89, 42, 16, 0.55)";
  ctx.lineWidth = 3;
  for (let i = 1; i <= 4; i += 1) {
    const x = basket.x + (basket.width / 5) * i;
    ctx.beginPath();
    ctx.moveTo(x, bodyY + 3);
    ctx.lineTo(x - 8, basket.y + basket.height - 3);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255, 238, 199, 0.72)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(basket.x + 20, bodyY + 7);
  ctx.quadraticCurveTo(basket.x + basket.width / 2, basket.y + basket.height + 10, basket.x + basket.width - 20, bodyY + 7);
  ctx.stroke();

  ctx.fillStyle = "#254d43";
  ctx.beginPath();
  ctx.roundRect(basket.x + 8, rimY - 6, basket.width - 16, 9, 6);
  ctx.fill();
  ctx.restore();
}

function drawBall(ball) {
  const shineX = ball.x - ball.radius * 0.35;
  const shineY = ball.y - ball.radius * 0.35;

  ctx.fillStyle = ball.color;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.beginPath();
  ctx.arc(shineX, shineY, ball.radius * 0.28, 0, Math.PI * 2);
  ctx.fill();
}

function drawCenterText(text) {
  ctx.save();
  ctx.fillStyle = "rgba(16, 23, 34, 0.62)";
  ctx.fillRect(0, 0, visibleWidth(), visibleHeight());
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 42px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, visibleWidth() / 2, visibleHeight() / 2);
  ctx.restore();
}

function endGame() {
  game.running = false;
  overlay.classList.remove("hidden");
  overlay.querySelector("h1").textContent = "Game Over";
  overlay.querySelector("p").textContent = `Your score is ${game.score}. Try again and beat your best score.`;
  startBtn.textContent = "Play Again";
}

function setButtonMove(direction, active) {
  if (direction === "left") {
    game.keys.left = active;
  } else {
    game.keys.right = active;
  }
}

function updateBasketSize() {
  const shrink = Math.min(28, Math.floor(game.score / 5) * 5);
  basket.width = Math.min(basket.baseWidth - shrink, visibleWidth() * 0.28);
  basket.width = Math.max(92, basket.width);
  basket.x = Math.max(0, Math.min(visibleWidth() - basket.width, basket.x));
}

startBtn.addEventListener("click", resetGame);

pauseBtn.addEventListener("click", () => {
  if (!game.running) {
    return;
  }

  game.paused = !game.paused;
  pauseBtn.textContent = game.paused ? "Resume" : "Pause";
});

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    event.preventDefault();
    game.keys.left = true;
  }

  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    event.preventDefault();
    game.keys.right = true;
  }

  if (event.key === " " && game.running) {
    event.preventDefault();
    game.paused = !game.paused;
    pauseBtn.textContent = game.paused ? "Resume" : "Pause";
  }
});

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
    game.keys.left = false;
  }

  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
    game.keys.right = false;
  }
});

canvas.addEventListener("pointermove", (event) => {
  if (!game.running || game.paused) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  basket.x = event.clientX - rect.left - basket.width / 2;
  basket.x = Math.max(0, Math.min(visibleWidth() - basket.width, basket.x));
});

leftBtn.addEventListener("pointerdown", () => setButtonMove("left", true));
leftBtn.addEventListener("pointerup", () => setButtonMove("left", false));
leftBtn.addEventListener("pointerleave", () => setButtonMove("left", false));
leftBtn.addEventListener("pointercancel", () => setButtonMove("left", false));
rightBtn.addEventListener("pointerdown", () => setButtonMove("right", true));
rightBtn.addEventListener("pointerup", () => setButtonMove("right", false));
rightBtn.addEventListener("pointerleave", () => setButtonMove("right", false));
rightBtn.addEventListener("pointercancel", () => setButtonMove("right", false));

window.addEventListener("resize", () => {
  resizeCanvas();
  draw();
});

resizeCanvas();
draw();

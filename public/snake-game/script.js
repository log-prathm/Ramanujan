const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const highScoreEl = document.getElementById("highScore");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");
const musicBtn = document.getElementById("musicBtn");
const screenStartBtn = document.getElementById("screenStartBtn");
const resumeBtn = document.getElementById("resumeBtn");
const playAgainBtn = document.getElementById("playAgainBtn");
const finalScoreEl = document.getElementById("finalScore");
const startScreen = document.getElementById("startScreen");
const pauseScreen = document.getElementById("pauseScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const difficultyButtons = document.querySelectorAll(".difficulty-btn");
const boardWrap = document.querySelector(".board-wrap");

const touchButtons = {
  up: document.getElementById("upBtn"),
  down: document.getElementById("downBtn"),
  left: document.getElementById("leftBtn"),
  right: document.getElementById("rightBtn")
};

const difficultySettings = {
  easy: { startSpeed: 8, maxSpeed: 16, speedStep: 1, pointsPerLevel: 5 },
  medium: { startSpeed: 10, maxSpeed: 20, speedStep: 1, pointsPerLevel: 4 },
  hard: { startSpeed: 13, maxSpeed: 25, speedStep: 2, pointsPerLevel: 3 }
};

// Central game state keeps rendering, controls, score, and difficulty predictable.
const state = {
  gridSize: 24,
  score: 0,
  highScore: Number(localStorage.getItem("neonSnakeHighScore")) || 0,
  difficulty: "easy",
  running: false,
  paused: false,
  gameOver: false,
  speed: 8,
  animationId: null,
  lastFrameTime: 0,
  moveAccumulator: 0,
  snake: [],
  direction: { x: 1, y: 0 },
  nextDirection: { x: 1, y: 0 },
  food: { x: 10, y: 10 },
  particles: [],
  touchStart: null
};

const audio = {
  context: null,
  musicOn: false,
  musicNodes: []
};

highScoreEl.textContent = state.highScore;

function setupCanvas() {
  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(rect.width * scale);
  canvas.height = Math.floor(rect.height * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  draw();
}

function boardSize() {
  return Math.min(canvas.getBoundingClientRect().width, canvas.getBoundingClientRect().height);
}

function cellSize() {
  return boardSize() / state.gridSize;
}

// A full reset is used for Start, Restart, and Play Again.
function resetGame() {
  const middle = Math.floor(state.gridSize / 2);
  const settings = difficultySettings[state.difficulty];

  if (state.animationId) {
    cancelAnimationFrame(state.animationId);
  }

  state.score = 0;
  state.speed = settings.startSpeed;
  state.running = true;
  state.paused = false;
  state.gameOver = false;
  state.lastFrameTime = 0;
  state.moveAccumulator = 0;
  state.direction = { x: 1, y: 0 };
  state.nextDirection = { x: 1, y: 0 };
  state.snake = [
    { x: middle, y: middle },
    { x: middle - 1, y: middle },
    { x: middle - 2, y: middle }
  ];
  state.particles = [];
  spawnFood();
  updateScore();
  showOnlyScreen(null);
  state.animationId = requestAnimationFrame(gameLoop);
}

// Time-based loop keeps the game smooth on different screen refresh rates.
function gameLoop(time) {
  if (!state.running) {
    draw();
    state.animationId = null;
    return;
  }

  if (!state.lastFrameTime) {
    state.lastFrameTime = time;
  }

  const delta = Math.min((time - state.lastFrameTime) / 1000, 0.05);
  state.lastFrameTime = time;

  updateParticles(delta);

  if (!state.paused) {
    state.moveAccumulator += delta;
    const moveInterval = 1 / state.speed;

    while (state.moveAccumulator >= moveInterval) {
      moveSnake();
      state.moveAccumulator -= moveInterval;
    }
  }

  draw();
  state.animationId = requestAnimationFrame(gameLoop);
}

function moveSnake() {
  state.direction = state.nextDirection;
  const head = state.snake[0];
  const newHead = {
    x: head.x + state.direction.x,
    y: head.y + state.direction.y
  };

  if (hitsWall(newHead) || hitsSnake(newHead)) {
    endGame();
    return;
  }

  state.snake.unshift(newHead);

  if (newHead.x === state.food.x && newHead.y === state.food.y) {
    state.score += 1;
    createFoodParticles(state.food);
    playEatSound();
    increaseDifficulty();
    spawnFood();
    updateScore();
  } else {
    state.snake.pop();
  }
}

function hitsWall(part) {
  return part.x < 0 || part.y < 0 || part.x >= state.gridSize || part.y >= state.gridSize;
}

function hitsSnake(part) {
  return state.snake.some((segment) => segment.x === part.x && segment.y === part.y);
}

// Food never appears inside the snake body.
function spawnFood() {
  let food;

  do {
    food = {
      x: Math.floor(Math.random() * state.gridSize),
      y: Math.floor(Math.random() * state.gridSize)
    };
  } while (state.snake.some((segment) => segment.x === food.x && segment.y === food.y));

  state.food = food;
}

function increaseDifficulty() {
  const settings = difficultySettings[state.difficulty];

  if (state.score % settings.pointsPerLevel === 0) {
    state.speed = Math.min(settings.maxSpeed, state.speed + settings.speedStep);
  }
}

function updateScore() {
  scoreEl.textContent = state.score;

  if (state.score > state.highScore) {
    state.highScore = state.score;
    localStorage.setItem("neonSnakeHighScore", state.highScore);
  }

  highScoreEl.textContent = state.highScore;
}

function draw() {
  const size = boardSize();
  const cell = cellSize();

  ctx.clearRect(0, 0, size, size);
  drawBoard(size, cell);
  drawFood(cell);
  drawSnake(cell);
  drawParticles(cell);
}

function drawBoard(size, cell) {
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, "#06101d");
  gradient.addColorStop(1, "#0a1728");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(63, 252, 255, 0.08)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= state.gridSize; i += 1) {
    const pos = i * cell;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, size);
    ctx.moveTo(0, pos);
    ctx.lineTo(size, pos);
    ctx.stroke();
  }
}

// Canvas drawing keeps the snake and particles fast without external libraries.
function drawSnake(cell) {
  state.snake.forEach((segment, index) => {
    const padding = index === 0 ? cell * 0.09 : cell * 0.14;
    const x = segment.x * cell + padding;
    const y = segment.y * cell + padding;
    const size = cell - padding * 2;

    ctx.save();
    ctx.shadowColor = index === 0 ? "#52ff8f" : "#3ffcff";
    ctx.shadowBlur = index === 0 ? 24 : 16;
    ctx.fillStyle = index === 0 ? "#52ff8f" : "#21d4fd";
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, Math.max(5, cell * 0.24));
    ctx.fill();

    if (index === 0) {
      ctx.fillStyle = "#06100d";
      const eyeSize = Math.max(2, cell * 0.1);
      ctx.beginPath();
      ctx.arc(x + size * 0.34, y + size * 0.35, eyeSize, 0, Math.PI * 2);
      ctx.arc(x + size * 0.66, y + size * 0.35, eyeSize, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  });
}

function drawFood(cell) {
  const centerX = state.food.x * cell + cell / 2;
  const centerY = state.food.y * cell + cell / 2;
  const radius = cell * 0.28 + Math.sin(performance.now() / 140) * 1.5;

  ctx.save();
  ctx.shadowColor = "#ff4fd8";
  ctx.shadowBlur = 26;
  ctx.fillStyle = "#ff4fd8";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  ctx.beginPath();
  ctx.arc(centerX - radius * 0.3, centerY - radius * 0.35, radius * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function createFoodParticles(food) {
  const colors = ["#ff4fd8", "#ffd166", "#3ffcff", "#52ff8f"];

  for (let i = 0; i < 18; i += 1) {
    state.particles.push({
      x: food.x + 0.5,
      y: food.y + 0.5,
      vx: (Math.random() - 0.5) * 7,
      vy: (Math.random() - 0.5) * 7,
      life: 0.55,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
}

function updateParticles(delta) {
  state.particles = state.particles.filter((particle) => {
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.life -= delta;
    return particle.life > 0;
  });
}

function drawParticles(cell) {
  state.particles.forEach((particle) => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, particle.life / 0.55);
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x * cell, particle.y * cell, cell * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function setDirection(direction) {
  const directions = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };
  const next = directions[direction];

  if (!next) {
    return;
  }

  const reversing = next.x + state.direction.x === 0 && next.y + state.direction.y === 0;

  if (!reversing) {
    state.nextDirection = next;
  }
}

function togglePause() {
  if (!state.running || state.gameOver) {
    return;
  }

  state.paused = !state.paused;
  showOnlyScreen(state.paused ? pauseScreen : null);
}

function endGame() {
  state.running = false;
  state.gameOver = true;
  finalScoreEl.textContent = `Your score is ${state.score}. High score is ${state.highScore}.`;
  showOnlyScreen(gameOverScreen);
  playGameOverSound();
}

function showOnlyScreen(screen) {
  [startScreen, pauseScreen, gameOverScreen].forEach((item) => {
    item.classList.toggle("hidden", item !== screen);
  });
}

// Web Audio creates lightweight sound effects and background music in code.
function ensureAudioContext() {
  if (!audio.context) {
    audio.context = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audio.context.state === "suspended") {
    audio.context.resume();
  }
}

function playTone(frequency, duration, type, volume) {
  ensureAudioContext();

  const oscillator = audio.context.createOscillator();
  const gain = audio.context.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, audio.context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.context.currentTime + duration);

  oscillator.connect(gain);
  gain.connect(audio.context.destination);
  oscillator.start();
  oscillator.stop(audio.context.currentTime + duration);
}

function playEatSound() {
  playTone(620, 0.08, "sine", 0.08);
  setTimeout(() => playTone(880, 0.08, "triangle", 0.06), 45);
}

function playGameOverSound() {
  playTone(180, 0.22, "sawtooth", 0.08);
  setTimeout(() => playTone(92, 0.28, "sawtooth", 0.07), 120);
}

function toggleMusic() {
  ensureAudioContext();
  audio.musicOn = !audio.musicOn;
  musicBtn.textContent = audio.musicOn ? "Music On" : "Music Off";
  musicBtn.setAttribute("aria-pressed", String(audio.musicOn));

  if (audio.musicOn) {
    startMusic();
  } else {
    stopMusic();
  }
}

function startMusic() {
  stopMusic();

  const gain = audio.context.createGain();
  const bass = audio.context.createOscillator();
  const pulse = audio.context.createOscillator();

  bass.type = "sine";
  pulse.type = "triangle";
  bass.frequency.value = 82;
  pulse.frequency.value = 164;
  gain.gain.value = 0.025;

  bass.connect(gain);
  pulse.connect(gain);
  gain.connect(audio.context.destination);
  bass.start();
  pulse.start();
  audio.musicNodes = [bass, pulse, gain];
}

function stopMusic() {
  audio.musicNodes.forEach((node) => {
    if (typeof node.stop === "function") {
      node.stop();
    }
  });
  audio.musicNodes = [];
}

function handleKeydown(event) {
  const keyMap = {
    ArrowUp: "up",
    w: "up",
    W: "up",
    ArrowDown: "down",
    s: "down",
    S: "down",
    ArrowLeft: "left",
    a: "left",
    A: "left",
    ArrowRight: "right",
    d: "right",
    D: "right"
  };

  if (keyMap[event.key]) {
    event.preventDefault();
    setDirection(keyMap[event.key]);
  }

  if (event.key === " ") {
    event.preventDefault();
    togglePause();
  }
}

// Swipe support mirrors the keyboard directions for phones and tablets.
function handleSwipeStart(event) {
  if (event.cancelable) {
    event.preventDefault();
  }

  const point = event.touches ? event.touches[0] : event;
  state.touchStart = { x: point.clientX, y: point.clientY };
}

function handleSwipeEnd(event) {
  if (event.cancelable) {
    event.preventDefault();
  }

  if (!state.touchStart) {
    return;
  }

  const point = event.changedTouches ? event.changedTouches[0] : event;
  const dx = point.clientX - state.touchStart.x;
  const dy = point.clientY - state.touchStart.y;
  const distance = Math.max(Math.abs(dx), Math.abs(dy));

  if (distance > 24) {
    setDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  }

  state.touchStart = null;
}

function stopTouchScroll(event) {
  if (event.cancelable) {
    event.preventDefault();
  }
}

difficultyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.difficulty = button.dataset.difficulty;
    difficultyButtons.forEach((item) => item.classList.toggle("active", item === button));

    if (!state.running) {
      state.speed = difficultySettings[state.difficulty].startSpeed;
    }
  });
});

Object.entries(touchButtons).forEach(([direction, button]) => {
  button.addEventListener("click", () => setDirection(direction));
});

startBtn.addEventListener("click", resetGame);
screenStartBtn.addEventListener("click", resetGame);
restartBtn.addEventListener("click", resetGame);
playAgainBtn.addEventListener("click", resetGame);
pauseBtn.addEventListener("click", togglePause);
resumeBtn.addEventListener("click", togglePause);
musicBtn.addEventListener("click", toggleMusic);

window.addEventListener("keydown", handleKeydown);
window.addEventListener("resize", setupCanvas);
boardWrap.addEventListener("touchstart", handleSwipeStart, { passive: false });
boardWrap.addEventListener("touchmove", stopTouchScroll, { passive: false });
boardWrap.addEventListener("touchend", handleSwipeEnd, { passive: false });
boardWrap.addEventListener("pointerdown", handleSwipeStart);
boardWrap.addEventListener("pointerup", handleSwipeEnd);

setupCanvas();

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const ruleEl = document.getElementById("rule");

canvas.width = 390;
canvas.height = 700;

const CENTER_X = canvas.width / 2;
const CENTER_Y = canvas.height / 2 + 20;

let keys = {};
let round = 1;
let score = 0;
let timeLeft = 30;
let zoneRadius = 150;
let zoneShrinkRate = 0.12;
let gameRunning = true;
let currentRule = "star";
let statusMessage = "Collect stars";

const player = {
  x: CENTER_X,
  y: CENTER_Y,
  r: 14,
  speed: 3.2,
  color: "#7dd3fc"
};

let targets = [];
let particles = [];
let timerInterval = null;
let switchTimer = null;

document.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
});

document.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function pickRule() {
  return Math.random() > 0.5 ? "star" : "circle";
}

function spawnTargets(count = 8) {
  targets = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = randomBetween(30, zoneRadius - 25);
    const x = CENTER_X + Math.cos(angle) * radius;
    const y = CENTER_Y + Math.sin(angle) * radius;

    targets.push({
      x,
      y,
      r: 16,
      type: Math.random() > 0.5 ? "star" : "circle",
      pulse: Math.random() * Math.PI * 2
    });
  }
}

function resetRound() {
  player.x = CENTER_X;
  player.y = CENTER_Y;
  timeLeft = 30;
  zoneRadius = Math.max(95, 150 - (round - 1) * 6);
  zoneShrinkRate = 0.12 + (round - 1) * 0.015;
  currentRule = "star";
  statusMessage = "Collect stars";
  ruleEl.textContent = "Rule: Collect stars";
  spawnTargets(Math.min(14, 8 + round));
  clearTimers();
  startTimers();
  gameRunning = true;
}

function clearTimers() {
  if (timerInterval) clearInterval(timerInterval);
  if (switchTimer) clearTimeout(switchTimer);
}

function startTimers() {
  timerInterval = setInterval(() => {
    if (!gameRunning) return;

    timeLeft--;

    if (timeLeft <= 15 && round >= 2) {
      scheduleRuleSwitch();
    }

    if (timeLeft <= 0) {
      endRound("Time up");
    }
  }, 1000);
}

let switchedThisRound = false;

function scheduleRuleSwitch() {
  if (switchedThisRound) return;
  switchedThisRound = true;

  switchTimer = setTimeout(() => {
    if (!gameRunning) return;
    currentRule = currentRule === "star" ? "circle" : "star";
    statusMessage = currentRule === "star" ? "Rule changed: collect stars" : "Rule changed: collect circles";
    ruleEl.textContent = currentRule === "star" ? "Rule: Collect stars" : "Rule: Collect circles";
  }, 2500);
}

function endRound(reason) {
  gameRunning = false;
  clearTimers();
  setTimeout(() => {
    alert(`Round ${round} complete\nScore: ${score}\n${reason}`);
    round++;
    switchedThisRound = false;
    resetRound();
  }, 100);
}

function failRound(reason) {
  gameRunning = false;
  clearTimers();
  setTimeout(() => {
    alert(`Round failed: ${reason}`);
    round = 1;
    score = 0;
    switchedThisRound = false;
    resetRound();
  }, 100);
}

function createBurst(x, y, color) {
  for (let i = 0; i < 10; i++) {
    particles.push({
      x,
      y,
      vx: randomBetween(-2, 2),
      vy: randomBetween(-2, 2),
      life: 30,
      color
    });
  }
}

function updateParticles() {
  particles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
  });
  particles = particles.filter((p) => p.life > 0);
}

function movePlayer() {
  if (keys["arrowup"] || keys["w"]) player.y -= player.speed;
  if (keys["arrowdown"] || keys["s"]) player.y += player.speed;
  if (keys["arrowleft"] || keys["a"]) player.x -= player.speed;
  if (keys["arrowright"] || keys["d"]) player.x += player.speed;

  player.x = Math.max(player.r, Math.min(canvas.width - player.r, player.x));
  player.y = Math.max(player.r, Math.min(canvas.height - player.r, player.y));
}

function checkZone() {
  const dx = player.x - CENTER_X;
  const dy = player.y - CENTER_Y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > zoneRadius) {
    failRound("You left the zone");
  }
}

function checkTargetCollisions() {
  for (let i = targets.length - 1; i >= 0; i--) {
    const t = targets[i];
    const dx = player.x - t.x;
    const dy = player.y - t.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < player.r + t.r) {
      if (t.type === currentRule) {
        score += 10;
        createBurst(t.x, t.y, "#34d399");
        targets.splice(i, 1);
      } else {
        createBurst(t.x, t.y, "#f87171");
        failRound("Wrong target");
        return;
      }
    }
  }

  const remainingCorrect = targets.filter((t) => t.type === currentRule).length;
  if (remainingCorrect === 0) {
    score += Math.max(5, timeLeft);
    endRound("Round cleared");
  }
}

function update() {
  if (!gameRunning) return;

  movePlayer();

  zoneRadius -= zoneShrinkRate;
  if (zoneRadius < 55) {
    failRound("Zone collapsed");
    return;
  }

  checkZone();
  checkTargetCollisions();
  updateParticles();
}

function drawBackground() {
  const grad = ctx.createRadialGradient(CENTER_X, CENTER_Y, 40, CENTER_X, CENTER_Y, 380);
  grad.addColorStop(0, "#132238");
  grad.addColorStop(1, "#08111d");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawZone() {
  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, zoneRadius, 0, Math.PI * 2);
  ctx.strokeStyle = "#2dd4bf";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(CENTER_X, CENTER_Y, zoneRadius + 8, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(45,212,191,0.18)";
  ctx.lineWidth = 12;
  ctx.stroke();
}

function drawStar(x, y, r, color) {
  ctx.save();
  ctx.beginPath();
  ctx.translate(x, y);
  ctx.moveTo(0, -r);
  for (let i = 0; i < 5; i++) {
    ctx.rotate(Math.PI / 5);
    ctx.lineTo(0, -r * 0.45);
    ctx.rotate(Math.PI / 5);
    ctx.lineTo(0, -r);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawTargets() {
  targets.forEach((t) => {
    const glow = 1 + Math.sin(Date.now() * 0.004 + t.pulse) * 0.08;
    if (t.type === "star") {
      drawStar(t.x, t.y, t.r * glow, "#facc15");
    } else {
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r * glow, 0, Math.PI * 2);
      ctx.fillStyle = "#60a5fa";
      ctx.fill();
    }
  });
}

function drawPlayer() {
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  ctx.fillStyle = player.color;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r + 6, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(125,211,252,0.25)";
  ctx.lineWidth = 6;
  ctx.stroke();
}

function drawParticles() {
  particles.forEach((p) => {
    ctx.globalAlpha = p.life / 30;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function drawHUD() {
  ctx.fillStyle = "white";
  ctx.font = "18px Arial";
  ctx.fillText(`Round: ${round}`, 16, 30);
  ctx.fillText(`Score: ${score}`, 16, 56);
  ctx.fillText(`Time: ${timeLeft}`, 300, 30);

  ctx.font = "16px Arial";
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText(statusMessage, 16, canvas.height - 20);
}

function draw() {
  drawBackground();
  drawZone();
  drawTargets();
  drawParticles();
  drawPlayer();
  drawHUD();
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

resetRound();
gameLoop();

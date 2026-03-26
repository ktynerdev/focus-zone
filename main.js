const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const startOverlay = document.getElementById("startOverlay");
const summaryOverlay = document.getElementById("summaryOverlay");
const startBtn = document.getElementById("startBtn");
const nextRoundBtn = document.getElementById("nextRoundBtn");
const restartBtn = document.getElementById("restartBtn");
const pauseBtn = document.getElementById("pauseBtn");

const roundPill = document.getElementById("roundPill");
const rulePill = document.getElementById("rulePill");
const scorePill = document.getElementById("scorePill");
const zonePill = document.getElementById("zonePill");
const timePill = document.getElementById("timePill");
const statusPill = document.getElementById("statusPill");
const summaryTitle = document.getElementById("summaryTitle");
const summaryStats = document.getElementById("summaryStats");

const joystickBase = document.getElementById("joystickBase");
const joystickKnob = document.getElementById("joystickKnob");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

let gameStarted = false;
let gamePaused = false;
let gameRunning = false;

let round = 1;
let score = 0;
let timeLeft = 30;
let zoneRadius = 140;
let zoneShrinkRate = 0.09;
let currentRule = "star";
let switchedThisRound = false;

let keys = {};
let targets = [];
let particles = [];
let starsBg = [];
let timeAccumulator = 0;

let roundStats = {
  correctHits: 0,
  wrongHits: 0,
  zoneExitMs: 0,
  survivedMs: 0,
  switchOccurred: false
};

const player = {
  x: 0,
  y: 0,
  r: 16,
  speed: 3.6,
  tint: "#7dd3fc"
};

function centerX() {
  return canvas.width / 2;
}
function centerY() {
  return canvas.height / 2;
}

function resetPlayerPosition() {
  player.x = centerX();
  player.y = centerY();
}

function initStarsBg() {
  starsBg = [];
  for (let i = 0; i < 60; i++) {
    starsBg.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      a: Math.random() * 0.5 + 0.2
    });
  }
}
initStarsBg();

document.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
});
document.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function updateHud() {
  roundPill.textContent = `Round ${round}`;
  rulePill.textContent = currentRule === "star" ? "Collect Stars" : "Collect Circles";
  scorePill.textContent = `Score ${score}`;
  timePill.textContent = `Time ${timeLeft}`;
}

function setStatus(text) {
  statusPill.textContent = text;
}

function setZoneStatus(text) {
  zonePill.textContent = text;
}

function getAdaptiveSettings() {
  return {
    targetCount: Math.min(16, 6 + round),
    shrinkRate: Math.min(0.22, 0.09 + (round - 1) * 0.012),
    allowSwitch: round >= 2,
    duration: Math.max(16, 30 - Math.floor((round - 1) / 2))
  };
}

function spawnTargets(count) {
  targets = [];
  const cx = centerX();
  const cy = centerY();

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = randomBetween(45, Math.max(70, zoneRadius - 45));
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;

    targets.push({
      x,
      y,
      r: 18,
      type: Math.random() > 0.5 ? "star" : "circle",
      pulse: Math.random() * Math.PI * 2
    });
  }

  if (!targets.some(t => t.type === currentRule)) {
    targets[0].type = currentRule;
  }
}

function resetRoundState() {
  const settings = getAdaptiveSettings();
  timeLeft = settings.duration;
  zoneRadius = Math.min(canvas.width, canvas.height) * 0.28;
  zoneShrinkRate = settings.shrinkRate;
  currentRule = "star";
  switchedThisRound = false;

  roundStats = {
    correctHits: 0,
    wrongHits: 0,
    zoneExitMs: 0,
    survivedMs: 0,
    switchOccurred: false
  };

  resetPlayerPosition();
  spawnTargets(settings.targetCount);
  updateHud();
  setStatus("Get Ready");
  setZoneStatus("Zone Stable");
}

function startGame() {
  gameStarted = true;
  gamePaused = false;
  gameRunning = true;
  round = 1;
  score = 0;
  startOverlay.classList.add("hidden");
  summaryOverlay.classList.add("hidden");
  resetRoundState();
}

function nextRound() {
  round++;
  summaryOverlay.classList.add("hidden");
  gamePaused = false;
  gameRunning = true;
  resetRoundState();
}

function restartGame() {
  summaryOverlay.classList.add("hidden");
  startOverlay.classList.remove("hidden");
  gameStarted = false;
  gamePaused = false;
  gameRunning = false;
  round = 1;
  score = 0;
  resetRoundState();
}

startBtn.addEventListener("click", startGame);
nextRoundBtn.addEventListener("click", nextRound);
restartBtn.addEventListener("click", restartGame);

pauseBtn.addEventListener("click", () => {
  if (!gameStarted) return;
  gamePaused = !gamePaused;
  gameRunning = !gamePaused;
  setStatus(gamePaused ? "Paused" : "Stay focused");
  pauseBtn.textContent = gamePaused ? "Resume" : "Pause";
});

let joystickActive = false;
let joyVector = { x: 0, y: 0 };
const joyMax = 35;

function setJoystickFromClient(clientX, clientY) {
  const rect = joystickBase.getBoundingClientRect();
  const joyCenter = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };

  let dx = clientX - joyCenter.x;
  let dy = clientY - joyCenter.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > joyMax) {
    dx = (dx / dist) * joyMax;
    dy = (dy / dist) * joyMax;
  }

  joyVector.x = dx / joyMax;
  joyVector.y = dy / joyMax;

  joystickKnob.style.left = `${35 + dx}px`;
  joystickKnob.style.top = `${35 + dy}px`;
}

function resetJoystick() {
  joyVector.x = 0;
  joyVector.y = 0;
  joystickKnob.style.left = `35px`;
  joystickKnob.style.top = `35px`;
}

joystickBase.addEventListener("pointerdown", (e) => {
  joystickActive = true;
  setJoystickFromClient(e.clientX, e.clientY);
});
window.addEventListener("pointermove", (e) => {
  if (!joystickActive) return;
  setJoystickFromClient(e.clientX, e.clientY);
});
window.addEventListener("pointerup", () => {
  joystickActive = false;
  resetJoystick();
});
window.addEventListener("pointercancel", () => {
  joystickActive = false;
  resetJoystick();
});

function createBurst(x, y, color) {
  for (let i = 0; i < 12; i++) {
    particles.push({
      x,
      y,
      vx: randomBetween(-2.4, 2.4),
      vy: randomBetween(-2.4, 2.4),
      life: 32,
      color
    });
  }
}

function updateParticles() {
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 1;
  }
  particles = particles.filter(p => p.life > 0);
}

function maybeSwitchRule() {
  const settings = getAdaptiveSettings();
  if (!settings.allowSwitch || switchedThisRound || timeLeft > Math.floor(settings.duration / 2)) return;

  switchedThisRound = true;
  roundStats.switchOccurred = true;
  currentRule = currentRule === "star" ? "circle" : "star";
  updateHud();
  setStatus(currentRule === "star" ? "Rule changed: stars" : "Rule changed: circles");

  if (!targets.some(t => t.type === currentRule)) {
    targets[0].type = currentRule;
  }
}

function movePlayer() {
  let moveX = 0;
  let moveY = 0;

  if (keys["arrowup"] || keys["w"]) moveY -= 1;
  if (keys["arrowdown"] || keys["s"]) moveY += 1;
  if (keys["arrowleft"] || keys["a"]) moveX -= 1;
  if (keys["arrowright"] || keys["d"]) moveX += 1;

  moveX += joyVector.x;
  moveY += joyVector.y;

  const mag = Math.sqrt(moveX * moveX + moveY * moveY);
  if (mag > 1) {
    moveX /= mag;
    moveY /= mag;
  }

  player.x += moveX * player.speed * 3.2;
  player.y += moveY * player.speed * 3.2;

  player.x = Math.max(player.r, Math.min(canvas.width - player.r, player.x));
  player.y = Math.max(player.r, Math.min(canvas.height - player.r, player.y));
}

function failRound(reason) {
  gameRunning = false;
  gamePaused = true;
  showSummary("Round Failed", reason);
}

function completeRound(reason) {
  gameRunning = false;
  gamePaused = true;
  showSummary("Round Complete", reason);
}

function showSummary(title, reason) {
  summaryTitle.textContent = title;
  const zoneCompliance = Math.max(0, 100 - Math.round(roundStats.zoneExitMs / 100));
  summaryStats.innerHTML = `
    <div><strong>Status:</strong> ${reason}</div>
    <div><strong>Correct Hits:</strong> ${roundStats.correctHits}</div>
    <div><strong>Wrong Hits:</strong> ${roundStats.wrongHits}</div>
    <div><strong>Switch Event:</strong> ${roundStats.switchOccurred ? "Yes" : "No"}</div>
    <div><strong>Zone Compliance:</strong> ${zoneCompliance}%</div>
    <div><strong>Score:</strong> ${score}</div>
  `;
  summaryOverlay.classList.remove("hidden");
}

function checkZone(deltaMs) {
  const dx = player.x - centerX();
  const dy = player.y - centerY();
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > zoneRadius) {
    roundStats.zoneExitMs += deltaMs;
    setZoneStatus("Outside Zone");
    if (roundStats.zoneExitMs > 1200) {
      failRound("Zone lost");
    }
  } else {
    setZoneStatus(zoneRadius < Math.min(canvas.width, canvas.height) * 0.15 ? "Critical" : "Zone Stable");
  }
}

function checkCollisions() {
  for (let i = targets.length - 1; i >= 0; i--) {
    const t = targets[i];
    const dx = player.x - t.x;
    const dy = player.y - t.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < player.r + t.r) {
      if (t.type === currentRule) {
        roundStats.correctHits++;
        score += 10;
        createBurst(t.x, t.y, "#34d399");
        targets.splice(i, 1);
      } else {
        roundStats.wrongHits++;
        createBurst(t.x, t.y, "#f87171");
        failRound("Wrong target");
        return;
      }
    }
  }

  const remainingCorrect = targets.filter(t => t.type === currentRule).length;
  if (remainingCorrect === 0) {
    score += Math.max(5, timeLeft);
    completeRound("Targets cleared");
  }
}

function updateGame(deltaMs) {
  if (!gameStarted || !gameRunning || gamePaused) return;

  roundStats.survivedMs += deltaMs;
  movePlayer();

  zoneRadius -= zoneShrinkRate;
  if (zoneRadius < 48) {
    failRound("Zone collapsed");
    return;
  }

  checkZone(deltaMs);
  checkCollisions();
  updateParticles();
}

function updateClock(deltaMs) {
  if (!gameStarted || !gameRunning || gamePaused) return;

  timeAccumulator += deltaMs;
  if (timeAccumulator >= 1000) {
    timeAccumulator -= 1000;
    timeLeft -= 1;
    updateHud();
    maybeSwitchRule();

    if (timeLeft <= 0) {
      failRound("Time up");
    }
  }
}

function drawBackground() {
  const bg = ctx.createRadialGradient(centerX(), centerY(), 60, centerX(), centerY(), Math.max(canvas.width, canvas.height));
  bg.addColorStop(0, "#162742");
  bg.addColorStop(1, "#07111f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const s of starsBg) {
    ctx.globalAlpha = s.a;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = "#d9f4ff";
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawArenaGlow() {
  ctx.beginPath();
  ctx.arc(centerX(), centerY(), zoneRadius + 14, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(55, 226, 255, 0.14)";
  ctx.lineWidth = 16;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX(), centerY(), zoneRadius, 0, Math.PI * 2);
  ctx.strokeStyle = "#39d6ff";
  ctx.lineWidth = 4;
  ctx.stroke();
}

function drawStar(x, y, r, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
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
  for (const t of targets) {
    const glow = 1 + Math.sin(Date.now() * 0.004 + t.pulse) * 0.08;
    if (t.type === "star") {
      drawStar(t.x, t.y, t.r * glow, "#ffd84d");
    } else {
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r * glow, 0, Math.PI * 2);
      ctx.fillStyle = "#68a8ff";
      ctx.fill();
    }
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = p.life / 32;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawPlayer() {
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r + 8, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(125, 211, 252, 0.12)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  ctx.fillStyle = player.tint;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r - 6, 0, Math.PI * 2);
  ctx.fillStyle = "#e7f9ff";
  ctx.fill();
}

function drawCenterPulse() {
  ctx.beginPath();
  ctx.arc(centerX(), centerY(), 10, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(100, 230, 255, 0.22)";
  ctx.fill();
}

let lastTs = performance.now();

function loop(ts) {
  const deltaMs = Math.min(34, ts - lastTs);
  lastTs = ts;

  updateClock(deltaMs);
  updateGame(deltaMs);

  drawBackground();
  drawArenaGlow();
  drawCenterPulse();
  drawTargets();
  drawParticles();
  drawPlayer();

  requestAnimationFrame(loop);
}

resetRoundState();
requestAnimationFrame(loop);

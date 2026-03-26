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
  player

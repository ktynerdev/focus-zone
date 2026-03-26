const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = 350;
canvas.height = 600;

let player = { x: 175, y: 300, size: 10, speed: 3 };
let keys = {};

let zoneRadius = 150;

let objects = [];
let rule = "star";

function spawnObjects() {
  objects = [];
  for (let i = 0; i < 6; i++) {
    objects.push({
      x: Math.random() * 300 + 25,
      y: Math.random() * 500 + 50,
      type: Math.random() > 0.5 ? "star" : "circle"
    });
  }
}

spawnObjects();

document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

function update() {
  if (keys["ArrowUp"]) player.y -= player.speed;
  if (keys["ArrowDown"]) player.y += player.speed;
  if (keys["ArrowLeft"]) player.x -= player.speed;
  if (keys["ArrowRight"]) player.x += player.speed;

  zoneRadius -= 0.1;

  objects.forEach((obj, i) => {
    let dx = player.x - obj.x;
    let dy = player.y - obj.y;
    let dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 15) {
      if (obj.type === rule) {
        objects.splice(i, 1);
      } else {
        alert("Wrong object!");
        reset();
      }
    }
  });

  if (objects.length === 0) {
    rule = Math.random() > 0.5 ? "star" : "circle";
    document.getElementById("rule").innerText = "Collect " + rule;
    spawnObjects();
  }

  let dx = player.x - 175;
  let dy = player.y - 300;
  let dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > zoneRadius) {
    alert("Zone got you!");
    reset();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.beginPath();
  ctx.arc(175, 300, zoneRadius, 0, Math.PI * 2);
  ctx.strokeStyle = "#00ffcc";
  ctx.stroke();

  objects.forEach(obj => {
    ctx.fillStyle = obj.type === "star" ? "yellow" : "blue";
    ctx.beginPath();
    ctx.arc(obj.x, obj.y, 8, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
  ctx.fill();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

function reset() {
  zoneRadius = 150;
  player.x = 175;
  player.y = 300;
  spawnObjects();
}

loop();

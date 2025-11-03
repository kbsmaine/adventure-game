// basic character creation -> world

const charScreen = document.getElementById("char-screen");
const gameScreen = document.getElementById("game-screen");
const startBtn = document.getElementById("start-btn");
const heroNameInput = document.getElementById("hero-name");
const heroColorInput = document.getElementById("hero-color");
const heroClassSelect = document.getElementById("hero-class");

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const hudName = document.getElementById("hud-name");
const hudClass = document.getElementById("hud-class");
const hudPos = document.getElementById("hud-pos");
const interactBox = document.getElementById("interact-box");

let hero = null;

// simple tile map (1 = wall, 0 = floor, 2 = NPC)
const mapCols = 25;
const mapRows = 15;
const tileSize = 32;

// a simple room with walls
const mapData = [
  "1111111111111111111111111",
  "1000000000000000000020001",
  "1000011110000000000000001",
  "1000000000000011100000001",
  "1000000000000010000000001",
  "1000000000000010000000001",
  "1000000000000010000000001",
  "1000000000000010000000001",
  "1000000000000000000000001",
  "1000000000000000000000001",
  "1000000001100000000000001",
  "1000000001100000000000001",
  "1002000000000000000000001",
  "1000000000000000000000001",
  "1111111111111111111111111",
];

const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  w: false,
  a: false,
  s: false,
  d: false,
};

startBtn.addEventListener("click", () => {
  const nm = heroNameInput.value.trim() || "Hero";
  const col = heroColorInput.value;
  const cls = heroClassSelect.value;

  hero = {
    name: nm,
    color: col,
    class: cls,
    x: 64,
    y: 64,
    speed: 2.2,
    width: 26,
    height: 26,
  };

  hudName.textContent = nm;
  hudClass.textContent = `Class: ${cls}`;

  charScreen.classList.remove("active");
  gameScreen.classList.add("active");

  requestAnimationFrame(gameLoop);
});

window.addEventListener("keydown", (e) => {
  if (keys.hasOwnProperty(e.key)) {
    keys[e.key] = true;
  }
  if (e.key === "e" || e.key === "E") {
    tryInteract();
  }
});

window.addEventListener("keyup", (e) => {
  if (keys.hasOwnProperty(e.key)) {
    keys[e.key] = false;
  }
});

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

function update() {
  if (!hero) return;

  let dx = 0,
    dy = 0;
  if (keys.ArrowUp || keys.w) dy -= hero.speed;
  if (keys.ArrowDown || keys.s) dy += hero.speed;
  if (keys.ArrowLeft || keys.a) dx -= hero.speed;
  if (keys.ArrowRight || keys.d) dx += hero.speed;

  moveHero(dx, dy);

  hudPos.textContent = `(${hero.x.toFixed(0)}, ${hero.y.toFixed(0)})`;

  if (isNearNPC(hero.x, hero.y)) {
    interactBox.classList.remove("hidden");
  } else {
    interactBox.classList.add("hidden");
  }
}

function moveHero(dx, dy) {
  const newX = hero.x + dx;
  if (!isCollision(newX, hero.y)) {
    hero.x = newX;
  }
  const newY = hero.y + dy;
  if (!isCollision(hero.x, newY)) {
    hero.y = newY;
  }
}

function isCollision(x, y) {
  const halfW = hero.width / 2;
  const halfH = hero.height / 2;

  const left = x - halfW;
  const right = x + halfW;
  const top = y - halfH;
  const bottom = y + halfH;

  const tilesToCheck = [
    tileAtPixel(left, top),
    tileAtPixel(right, top),
    tileAtPixel(left, bottom),
    tileAtPixel(right, bottom),
  ];

  return tilesToCheck.some((t) => t === "1");
}

function tileAtPixel(px, py) {
  const col = Math.floor(px / tileSize);
  const row = Math.floor(py / tileSize);

  if (row < 0 || row >= mapRows || col < 0 || col >= mapCols) {
    return "1";
  }
  return mapData[row][col];
}

function isNearNPC(x, y) {
  const col = Math.floor(x / tileSize);
  const row = Math.floor(y / tileSize);
  const radius = 1;

  for (let r = row - radius; r <= row + radius; r++) {
    for (let c = col - radius; c <= col + radius; c++) {
      if (r >= 0 && r < mapRows && c >= 0 && c < mapCols) {
        if (mapData[r][c] === "2") {
          return true;
        }
      }
    }
  }
  return false;
}

function tryInteract() {
  if (!hero) return;
  if (isNearNPC(hero.x, hero.y)) {
    alert("NPC: Hey " + hero.name + "! Nice " + hero.class + " outfit!");
  }
}

function draw() {
  if (!hero) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < mapRows; r++) {
    for (let c = 0; c < mapCols; c++) {
      const tile = mapData[r][c];
      const x = c * tileSize;
      const y = r * tileSize;

      if (tile === "1") {
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(x, y, tileSize, tileSize);
        ctx.strokeStyle = "rgba(248,250,252,0.02)";
        ctx.strokeRect(x, y, tileSize, tileSize);
      } else {
        ctx.fillStyle = (r + c) % 2 === 0 ? "#1e293b" : "#1f2937";
        ctx.fillRect(x, y, tileSize, tileSize);
      }

      if (tile === "2") {
        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.arc(x + tileSize / 2, y + tileSize / 2, 10, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.fillStyle = hero.color;
  ctx.beginPath();
  ctx.arc(hero.x, hero.y, hero.width / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "white";
  ctx.font = "12px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(hero.name, hero.x, hero.y - 20);
}

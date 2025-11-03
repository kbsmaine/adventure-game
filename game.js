// Quarantine Streets - darker, flashlight, zombies, survivor presets
const charScreen = document.getElementById("char-screen");
const gameScreen = document.getElementById("game-screen");
const startBtn = document.getElementById("start-btn");
const heroNameInput = document.getElementById("hero-name");
const charGrid = document.getElementById("character-grid");

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const hudName = document.getElementById("hud-name");
const hudClass = document.getElementById("hud-class");
const interactBox = document.getElementById("interact-box");

let hero = null;
let selectedCharId = null;

const survivorPresets = [
  {
    id: "operator",
    name: "Zone Operator",
    role: "Pistol / Flashlight",
    body: "#1f2937",
    jacket: "#f97316",
    pants: "#0f172a",
    skin: "#fef3c7",
    gear: "helmet",
    class: "operator"
  },
  {
    id: "scout",
    name: "Tunnel Scout",
    role: "Light, fast",
    body: "#0f172a",
    jacket: "#38bdf8",
    pants: "#020617",
    skin: "#fee2e2",
    gear: "hood",
    class: "scout"
  },
  {
    id: "medic",
    name: "Outpost Medic",
    role: "Support",
    body: "#166534",
    jacket: "#22c55e",
    pants: "#052e16",
    skin: "#fde68a",
    gear: "cap",
    class: "medic"
  },
  {
    id: "ranger",
    name: "Perimeter Ranger",
    role: "Marksman",
    body: "#1f2937",
    jacket: "#eab308",
    pants: "#0f172a",
    skin: "#fef3c7",
    gear: "goggles",
    class: "ranger"
  }
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

const zombies = [
  { x: 560, y: 250, phase: 0 },
  { x: 600, y: 330, phase: 1.3 },
  { x: 660, y: 210, phase: 2.1 },
  { x: 720, y: 280, phase: 0.7 },
  { x: 800, y: 350, phase: 2.8 },
];

function renderCharacterGrid() {
  charGrid.innerHTML = "";
  survivorPresets.forEach((p, idx) => {
    const card = document.createElement("div");
    card.className = "character-card" + (idx === 0 ? " selected" : "");
    if (idx === 0) selectedCharId = p.id;

    const sw = document.createElement("div");
    sw.className = "swatch";
    sw.style.background = p.jacket;

    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = p.name;

    const role = document.createElement("div");
    role.className = "card-role";
    role.textContent = p.role;

    card.appendChild(sw);
    card.appendChild(title);
    card.appendChild(role);

    card.addEventListener("click", () => {
      selectedCharId = p.id;
      document.querySelectorAll(".character-card").forEach((el) => el.classList.remove("selected"));
      card.classList.add("selected");
    });

    charGrid.appendChild(card);
  });
}
renderCharacterGrid();

(function loadSavedHero() {
  const saved = localStorage.getItem("qs_hero");
  if (saved) {
    const data = JSON.parse(saved);
    hero = {
      ...data,
      x: 420,
      y: 290,
      angle: data.angle || 0,
      speed: 2.2,
    };
    hudName.textContent = hero.name;
    hudClass.textContent = hero.class;
    charScreen.classList.remove("active");
    gameScreen.classList.add("active");
    requestAnimationFrame(gameLoop);
  } else {
    charScreen.classList.add("active");
  }
})();

startBtn.addEventListener("click", () => {
  const nm = heroNameInput.value.trim() || "Survivor";
  const preset = survivorPresets.find((p) => p.id === selectedCharId) || survivorPresets[0];

  hero = {
    name: nm,
    class: preset.class,
    presetId: preset.id,
    body: preset.body,
    jacket: preset.jacket,
    pants: preset.pants,
    skin: preset.skin,
    gear: preset.gear,
    x: 420,
    y: 290,
    angle: 0,
    speed: 2.2,
  };

  localStorage.setItem("qs_hero", JSON.stringify({
    name: hero.name,
    class: hero.class,
    presetId: hero.presetId,
    body: hero.body,
    jacket: hero.jacket,
    pants: hero.pants,
    skin: hero.skin,
    gear: hero.gear,
  }));

  hudName.textContent = hero.name;
  hudClass.textContent = hero.class;

  charScreen.classList.remove("active");
  gameScreen.classList.add("active");
  requestAnimationFrame(gameLoop);
});

window.addEventListener("keydown", (e) => {
  if (keys.hasOwnProperty(e.key)) {
    keys[e.key] = true;
  }
  if (e.key === "e" || e.key === "E") {
    // future interactions
  }
});

window.addEventListener("keyup", (e) => {
  if (keys.hasOwnProperty(e.key)) {
    keys[e.key] = false;
  }
});

function gameLoop(timestamp) {
  update(timestamp);
  draw();
  requestAnimationFrame(gameLoop);
}

function update(t) {
  if (!hero) return;

  let dx = 0, dy = 0;
  if (keys.ArrowUp || keys.w) dy -= hero.speed;
  if (keys.ArrowDown || keys.s) dy += hero.speed;
  if (keys.ArrowLeft || keys.a) dx -= hero.speed;
  if (keys.ArrowRight || keys.d) dx += hero.speed;

  hero.x += dx;
  hero.y += dy;

  // clamp to canvas
  hero.x = Math.max(60, Math.min(canvas.width - 60, hero.x));
  hero.y = Math.max(60, Math.min(canvas.height - 60, hero.y));

  // face movement direction
  if (dx !== 0 || dy !== 0) {
    hero.angle = Math.atan2(dy, dx);
  }

  // animate zombies slowly forward
  zombies.forEach((z) => {
    z.phase += 0.01;
    z.y += Math.sin(z.phase) * 0.2;
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBackground();
  drawBiohazards();
  drawZombies();
  drawHero();
  drawFlashlight();
}

function drawBackground() {
  // dark asphalt
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, "#0f172a");
  g.addColorStop(1, "#020617");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // road lines
  ctx.strokeStyle = "rgba(148,163,184,0.08)";
  ctx.lineWidth = 2;
  for (let i = 80; i < canvas.height; i += 90) {
    ctx.beginPath();
    ctx.moveTo(80, i);
    ctx.lineTo(canvas.width - 120, i + 6);
    ctx.stroke();
  }

  // perimeter building
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(canvas.width - 180, 80, 120, 140);
  ctx.strokeStyle = "rgba(248,113,113,0.1)";
  ctx.strokeRect(canvas.width - 180, 80, 120, 140);
}

function drawBiohazards() {
  // glowing sign on right building
  drawBiohazard(canvas.width - 120, 150, 32, "rgba(252, 76, 2, 0.9)");

  // on ground in front
  drawBiohazard(240, 420, 46, "rgba(252, 76, 2, 0.85)");

  // fence sign
  drawBiohazard(130, 160, 26, "rgba(252, 76, 2, 0.85)");
}

function drawBiohazard(x, y, r, color) {
  // glow
  const g = ctx.createRadialGradient(x, y, 4, x, y, r * 2.2);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(252,76,2,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  for (let i = 0; i < 3; i++) {
    ctx.rotate((Math.PI * 2) / 3);
    ctx.beginPath();
    ctx.arc(r * 0.6, 0, r * 0.4, Math.PI * 0.2, -Math.PI * 0.2, true);
    ctx.lineTo(r * 0.1, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawZombies() {
  zombies.forEach((z) => {
    drawZombie(z.x, z.y);
  });
}

function drawZombie(x, y) {
  // body
  ctx.fillStyle = "#14532d";
  ctx.fillRect(x - 12, y - 10, 24, 32);

  // arms
  ctx.fillStyle = "#1c7c45";
  ctx.fillRect(x - 20, y - 6, 8, 20);
  ctx.fillRect(x + 12, y - 6, 8, 20);

  // head
  ctx.fillStyle = "#166534";
  ctx.beginPath();
  ctx.arc(x, y - 16, 10, 0, Math.PI * 2);
  ctx.fill();

  // red eyes
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(x - 4, y - 18, 2, 2);
  ctx.fillRect(x + 2, y - 18, 2, 2);
}

function drawHero() {
  const x = hero.x;
  const y = hero.y;

  // legs
  ctx.fillStyle = hero.pants;
  ctx.fillRect(x - 6, y + 4, 5, 14);
  ctx.fillRect(x + 1, y + 4, 5, 14);

  // torso
  ctx.fillStyle = hero.jacket;
  ctx.fillRect(x - 9, y - 6, 18, 18);

  // head
  ctx.fillStyle = hero.skin;
  ctx.beginPath();
  ctx.arc(x, y - 16, 8, 0, Math.PI * 2);
  ctx.fill();

  // eyes
  ctx.fillStyle = "#020617";
  ctx.fillRect(x - 4, y - 18, 2, 2);
  ctx.fillRect(x + 2, y - 18, 2, 2);

  // gear
  if (hero.gear === "helmet") {
    ctx.fillStyle = "#f97316";
    ctx.fillRect(x - 9, y - 23, 18, 5);
  } else if (hero.gear === "hood") {
    ctx.fillStyle = hero.jacket;
    ctx.beginPath();
    ctx.arc(x, y - 16, 10, Math.PI, 0);
    ctx.fill();
  } else if (hero.gear === "cap") {
    ctx.fillStyle = "#fef9c3";
    ctx.fillRect(x - 8, y - 22, 16, 4);
    ctx.fillRect(x, y - 22, 8, 3);
  } else if (hero.gear === "goggles") {
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(x - 7, y - 19, 14, 3);
  }

  // pistol hand
  ctx.fillStyle = hero.jacket;
  ctx.fillRect(x + 6, y - 2, 9, 3);
  // gun tip
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(x + 14, y - 3, 5, 5);
}

function drawFlashlight() {
  const beamLen = 260;
  const beamWidth = 75;
  const angle = hero.angle;

  ctx.save();
  ctx.translate(hero.x + 16, hero.y - 2);
  ctx.rotate(angle);

  const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, beamLen);
  grad.addColorStop(0, "rgba(202,252,255,0.8)");
  grad.addColorStop(1, "rgba(202,252,255,0)");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(beamLen, -beamWidth);
  ctx.lineTo(beamLen, beamWidth);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

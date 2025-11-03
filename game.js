// Quarantine Streets - flashlight -> gun upgrade + deeper player model

const charScreen = document.getElementById("char-screen");
const gameScreen = document.getElementById("game-screen");
const startBtn = document.getElementById("start-btn");
const heroNameInput = document.getElementById("hero-name");
const charGrid = document.getElementById("character-grid");

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const hudName = document.getElementById("hud-name");
const hudClass = document.getElementById("hud-class");
const hudItem = document.getElementById("hud-item");
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

// pickup location for gun
const gunPickup = { x: 720, y: 150, taken: false };

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
  const saved = localStorage.getItem("qs_hero_v2");
  if (saved) {
    const data = JSON.parse(saved);
    hero = {
      ...data,
      x: 420,
      y: 290,
      angle: 0,
      speed: 2.2,
      inventory: { flashlight: true, gun: false, ...(data.inventory || {}) },
    };
    hudName.textContent = hero.name;
    hudClass.textContent = hero.class;
    hudItem.textContent = hero.inventory.gun ? "Item: Laser sight" : "Item: Flashlight";
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
    inventory: {
      flashlight: true,
      gun: false,
    },
  };

  saveHero();
  hudName.textContent = hero.name;
  hudClass.textContent = hero.class;
  hudItem.textContent = "Item: Flashlight";

  charScreen.classList.remove("active");
  gameScreen.classList.add("active");
  requestAnimationFrame(gameLoop);
});

function saveHero() {
  localStorage.setItem(
    "qs_hero_v2",
    JSON.stringify({
      name: hero.name,
      class: hero.class,
      presetId: hero.presetId,
      body: hero.body,
      jacket: hero.jacket,
      pants: hero.pants,
      skin: hero.skin,
      gear: hero.gear,
      inventory: hero.inventory,
    })
  );
}

window.addEventListener("keydown", (e) => {
  if (keys.hasOwnProperty(e.key)) {
    keys[e.key] = true;
  }
  if (e.key === "e" || e.key === "E") {
    tryPickup();
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

  hero.x = Math.max(60, Math.min(canvas.width - 60, hero.x));
  hero.y = Math.max(60, Math.min(canvas.height - 60, hero.y));

  if (dx !== 0 || dy !== 0) {
    hero.angle = Math.atan2(dy, dx);
  }

  zombies.forEach((z) => {
    z.phase += 0.01;
    z.y += Math.sin(z.phase) * 0.2;
  });

  // show pickup prompt if close
  if (!gunPickup.taken && dist(hero.x, hero.y, gunPickup.x, gunPickup.y) < 35) {
    interactBox.classList.remove("hidden");
  } else {
    interactBox.classList.add("hidden");
  }
}

function dist(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx*dx + dy*dy);
}

function tryPickup() {
  if (!gunPickup.taken && dist(hero.x, hero.y, gunPickup.x, gunPickup.y) < 35) {
    gunPickup.taken = true;
    hero.inventory.gun = true;
    hudItem.textContent = "Item: Laser sight";
    saveHero();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawBackground();
  drawGunPickup();
  drawBiohazards();
  drawZombies();
  drawHero();
  if (hero.inventory.gun) {
    drawLaser();
  } else {
    drawFlashlight();
  }
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, "#0f172a");
  g.addColorStop(1, "#020617");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(148,163,184,0.08)";
  ctx.lineWidth = 2;
  for (let i = 80; i < canvas.height; i += 90) {
    ctx.beginPath();
    ctx.moveTo(80, i);
    ctx.lineTo(canvas.width - 120, i + 6);
    ctx.stroke();
  }

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(canvas.width - 180, 80, 120, 140);
  ctx.strokeStyle = "rgba(248,113,113,0.1)";
  ctx.strokeRect(canvas.width - 180, 80, 120, 140);
}

function drawGunPickup() {
  if (gunPickup.taken) return;
  const { x, y } = gunPickup;
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(x - 16, y - 10, 32, 20);
  ctx.strokeStyle = "rgba(202,252,255,0.3)";
  ctx.strokeRect(x - 16, y - 10, 32, 20);

  // glowing pistol icon
  ctx.fillStyle = "#f97316";
  ctx.fillRect(x - 6, y - 2, 12, 4);
  ctx.fillRect(x + 3, y - 6, 3, 4);
}

function drawBiohazards() {
  drawBiohazard(canvas.width - 120, 150, 32, "rgba(252, 76, 2, 0.9)");
  drawBiohazard(240, 420, 46, "rgba(252, 76, 2, 0.85)");
  drawBiohazard(130, 160, 26, "rgba(252, 76, 2, 0.85)");
}

function drawBiohazard(x, y, r, color) {
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
  ctx.fillStyle = "#14532d";
  ctx.fillRect(x - 12, y - 10, 24, 32);
  ctx.fillStyle = "#1c7c45";
  ctx.fillRect(x - 20, y - 6, 8, 20);
  ctx.fillRect(x + 12, y - 6, 8, 20);
  ctx.fillStyle = "#166534";
  ctx.beginPath();
  ctx.arc(x, y - 16, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(x - 4, y - 18, 2, 2);
  ctx.fillRect(x + 2, y - 18, 2, 2);
}

function drawHero() {
  const x = hero.x;
  const y = hero.y;

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(x, y + 14, 16, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // backpack
  ctx.fillStyle = "#7f1d1d";
  ctx.fillRect(x - 6, y - 4, 12, 10);
  ctx.fillStyle = "#b91c1c";
  ctx.fillRect(x - 4, y - 2, 8, 3);

  // legs
  ctx.fillStyle = hero.pants;
  ctx.fillRect(x - 6, y + 4, 5, 14);
  ctx.fillRect(x + 1, y + 4, 5, 14);
  // boots
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(x - 6, y + 16, 6, 3);
  ctx.fillRect(x + 1, y + 16, 6, 3);

  // torso/armor
  ctx.fillStyle = hero.jacket;
  ctx.fillRect(x - 10, y - 8, 20, 18);

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

  // right arm holding tool/gun forward
  ctx.save();
  ctx.translate(x, y - 2);
  ctx.rotate(hero.angle);
  ctx.fillStyle = hero.jacket;
  ctx.fillRect(4, -2, 10, 4); // arm

  // tool/gun rendered in flashlight/laser fn
  ctx.restore();

  // left arm down
  ctx.fillStyle = hero.jacket;
  ctx.fillRect(x - 12, y - 3, 4, 10);
}

function drawFlashlight() {
  // flashlight at hero hand
  const handX = hero.x + Math.cos(hero.angle) * 14;
  const handY = hero.y - 2 + Math.sin(hero.angle) * 14;

  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(hero.angle);

  const beamLen = 260;
  const beamWidth = 80;
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

  // flashlight body
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, -2, 10, 4);

  ctx.restore();
}

function drawLaser() {
  const handX = hero.x + Math.cos(hero.angle) * 14;
  const handY = hero.y - 2 + Math.sin(hero.angle) * 14;

  ctx.save();
  ctx.lineWidth = 3;
  const grad = ctx.createLinearGradient(handX, handY, handX + Math.cos(hero.angle)*280, handY + Math.sin(hero.angle)*280);
  grad.addColorStop(0, "rgba(252,76,2,1)");
  grad.addColorStop(1, "rgba(252,76,2,0)");
  ctx.strokeStyle = grad;
  ctx.beginPath();
  ctx.moveTo(handX, handY);
  ctx.lineTo(handX + Math.cos(hero.angle)*280, handY + Math.sin(hero.angle)*280);
  ctx.stroke();

  // gun body
  ctx.translate(handX, handY);
  ctx.rotate(hero.angle);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, -3, 14, 6);
  ctx.restore();
}

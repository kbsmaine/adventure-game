// game.js — full version
// - spawn baked in at (696, 493)
// - weapon spawn baked in at (1130.2, 809.9)
// - exit arrow at (307, 102), hidden until all enemies dead
// - inventory (1/2/3) + bandages (4)
// - bullets collide with walls + spark
// - collision editor (B)
// - pause menu with editor access
// - zombies slide along walls + now have cooler, varied models
// - retry resets level so zombies don’t get harder each time

// ===== DOM refs =====
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
const hudLevel = document.getElementById("hud-level");
const hudHp = document.getElementById("hud-hp");
const interactBox = document.getElementById("interact-box");
const deathScreen = document.getElementById("death-screen");
const retryBtn = document.getElementById("retry-btn");

// ===== flags =====
let DEBUG_COLLISIONS = true;
let coordMode = false;
let EDIT_COLLISIONS = false;
let isPaused = false;
let GHOST_MODE = false;

// ===== editor vars =====
let lastMousePos = null;
let paintedColliders = [];
let dragStart = null;

// ===== collisions =====
let collisionRects = [];

// ===== map image =====
const bgImage = new Image();
bgImage.src = "map.png";

// ===== game state =====
let hero = null;
let selectedCharId = null;
let level = 1;
let zombies = [];
let bullets = [];
let bulletImpacts = [];
let door = null;
let gameOver = false;
let worldPickups = [];

// ===== baked spawn + weapon spawns =====
let savedSpawn = { x: 696, y: 493 };
let weaponSpawns = [
  { x: 1130.2, y: 809.9, type: "weapon", weaponId: "pistol" }
];

// ===== character presets =====
const survivorPresets = [
  { id: "operator", name: "Zone Operator", role: "Armored", body: "#1f2937", jacket: "#f97316", pants: "#0f172a", skin: "#fef3c7", gear: "helmet", class: "operator" },
  { id: "scout", name: "Tunnel Scout", role: "Light", body: "#0f172a", jacket: "#38bdf8", pants: "#020617", skin: "#fee2e2", gear: "hood", class: "scout" },
  { id: "medic", name: "Outpost Medic", role: "Support", body: "#166534", jacket: "#22c55e", pants: "#052e16", skin: "#fde68a", gear: "cap", class: "medic" },
  { id: "ranger", name: "Perimeter Ranger", role: "Marksman", body: "#1f2937", jacket: "#eab308", pants: "#0f172a", skin: "#fef3c7", gear: "goggles", class: "ranger" }
];

const weapons = {
  flashlight: { id: "flashlight", name: "Flashlight", canFire: false },
  pistol: { id: "pistol", name: "9mm Pistol", canFire: true, fireRate: 280, bulletSpeed: 7, damage: 1, spread: 0 }
};

// ===== input =====
const keys = {
  w: false, a: false, s: false, d: false,
  ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
  mouseDown: false
};

// ===== coord HUD =====
const coordOverlay = document.createElement("div");
coordOverlay.style.position = "fixed";
coordOverlay.style.bottom = "8px";
coordOverlay.style.right = "8px";
coordOverlay.style.padding = "4px 8px";
coordOverlay.style.background = "rgba(2,6,23,0.7)";
coordOverlay.style.color = "#e2e8f0";
coordOverlay.style.fontSize = "11px";
coordOverlay.style.border = "1px solid rgba(255,255,255,0.05)";
coordOverlay.style.borderRadius = "6px";
coordOverlay.style.pointerEvents = "none";
coordOverlay.style.zIndex = "999";
coordOverlay.style.display = "none";
document.body.appendChild(coordOverlay);

// ===== pause menu =====
const pauseOverlay = document.createElement("div");
pauseOverlay.style.position = "fixed";
pauseOverlay.style.inset = "0";
pauseOverlay.style.display = "none";
pauseOverlay.style.background = "rgba(2,6,23,0.75)";
pauseOverlay.style.backdropFilter = "blur(4px)";
pauseOverlay.style.zIndex = "998";
pauseOverlay.style.alignItems = "center";
pauseOverlay.style.justifyContent = "center";

const pausePanel = document.createElement("div");
pausePanel.style.background = "rgba(15,23,42,0.9)";
pausePanel.style.border = "1px solid rgba(148,163,184,0.25)";
pausePanel.style.borderRadius = "12px";
pausePanel.style.padding = "16px";
pausePanel.style.minWidth = "220px";
pausePanel.style.display = "flex";
pausePanel.style.flexDirection = "column";
pausePanel.style.gap = "8px";
pausePanel.style.color = "#e2e8f0";
pausePanel.innerHTML = `<h3 style="margin:0 0 6px 0;font-size:15px;">Paused</h3>`;
pauseOverlay.appendChild(pausePanel);
document.body.appendChild(pauseOverlay);

function makePauseBtn(label, onClick) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.style.background = "rgba(30,41,59,0.7)";
  btn.style.border = "1px solid rgba(148,163,184,0.2)";
  btn.style.borderRadius = "6px";
  btn.style.padding = "5px 8px";
  btn.style.color = "#e2e8f0";
  btn.style.cursor = "pointer";
  btn.onclick = onClick;
  pausePanel.appendChild(btn);
}

makePauseBtn("Resume", () => togglePause(false));
makePauseBtn("Editor mode (B)", () => {
  EDIT_COLLISIONS = true;
  console.log("🧱 collision editor ON from pause");
});
makePauseBtn("Set spawn to here", () => {
  if (hero) {
    savedSpawn = { x: hero.x, y: hero.y };
    console.log(`📍 spawn set to x:${savedSpawn.x.toFixed(0)} y:${savedSpawn.y.toFixed(0)}`);
  }
});
makePauseBtn("Add weapon spawn here", () => {
  if (hero) {
    weaponSpawns.push({ x: hero.x, y: hero.y, type: "weapon", weaponId: "pistol" });
    console.log("🔫 weapon spawn added", hero.x, hero.y);
  }
});
makePauseBtn("Toggle ghost (walk through)", () => {
  GHOST_MODE = !GHOST_MODE;
  console.log(GHOST_MODE ? "👻 ghost mode ON" : "👻 ghost mode OFF");
});
makePauseBtn("Teleport to safe spot", () => {
  if (hero) {
    hero.x = canvas.width / 2;
    hero.y = canvas.height - 200;
    console.log("🟢 teleported to safe spot");
  }
});
makePauseBtn("Close", () => togglePause(false));

// ===== init / resize =====
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  placeDoor();
  buildCollisionMapFromImage();
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

bgImage.onload = () => {
  buildCollisionMapFromImage();
};

charScreen.classList.add("active");

// ===== character screen =====
function renderCharacterGrid() {
  charGrid.innerHTML = "";
  survivorPresets.forEach((p, i) => {
    const card = document.createElement("div");
    card.className = "character-card" + (i === 0 ? " selected" : "");
    if (i === 0) selectedCharId = p.id;

    const sw = document.createElement("div");
    sw.className = "swatch";
    sw.style.background = p.jacket;

    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = p.name;

    const role = document.createElement("div");
    role.className = "card-role";
    role.textContent = p.role;

    card.append(sw, title, role);
    card.addEventListener("click", () => {
      selectedCharId = p.id;
      document.querySelectorAll(".character-card").forEach(el => el.classList.remove("selected"));
      card.classList.add("selected");
    });

    charGrid.appendChild(card);
  });
}
renderCharacterGrid();

// ===== start game =====
startBtn.addEventListener("click", startGame);
function startGame() {
  const nm = heroNameInput.value.trim() || "Survivor";
  const preset = survivorPresets.find(p => p.id === selectedCharId) || survivorPresets[0];

  const spawnX = savedSpawn ? savedSpawn.x : canvas.width / 2;
  const spawnY = savedSpawn ? savedSpawn.y : canvas.height - 200;

  hero = {
    name: nm,
    class: preset.class,
    presetId: preset.id,
    body: preset.body,
    jacket: preset.jacket,
    pants: preset.pants,
    skin: preset.skin,
    gear: preset.gear,
    x: spawnX,
    y: spawnY,
    angle: 0,
    speed: 2.3,
    walkTime: 0,
    hp: 100,
    maxHp: 100,
    inventory: ["flashlight"],
    activeSlot: 0,
    meds: 0
  };

  level = 1;
  hudName.textContent = hero.name;
  hudClass.textContent = hero.class;
  hudItem.textContent = "Item: Flashlight";
  hudLevel.textContent = "Zone: " + level;
  hudHp.textContent = "HP: " + hero.hp;

  charScreen.classList.remove("active");
  gameScreen.classList.add("active");
  placeDoor();
  spawnZombies();
  isPaused = false;
  requestAnimationFrame(gameLoop);
}

retryBtn.addEventListener("click", () => {
  // important: reset level so zombies don't feel faster each time
  level = 1;
  deathScreen.classList.add("hidden");
  gameOver = false;
  hero.hp = hero.maxHp;
  placeDoor();
  spawnZombies();
  isPaused = false;
});

// ===== pause helpers =====
function togglePause(state) {
  isPaused = state;
  pauseOverlay.style.display = state ? "flex" : "none";
}

// ===== input handlers =====
window.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    togglePause(!isPaused);
    return;
  }
  if (isPaused) return;

  if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
  if (e.key === "e" || e.key === "E") tryInteract();
  if (e.key === "l" || e.key === "L") DEBUG_COLLISIONS = !DEBUG_COLLISIONS;
  if (e.key === "c" || e.key === "C") {
    coordMode = !coordMode;
    coordOverlay.style.display = coordMode ? "block" : "none";
  }
  if (e.key === "b" || e.key === "B") {
    if (e.shiftKey) {
      paintedColliders = [];
      console.log("🧹 cleared painted colliders");
    } else {
      EDIT_COLLISIONS = !EDIT_COLLISIONS;
      console.log(EDIT_COLLISIONS ? "🧱 collision editor ON (drag)" : "collision editor OFF");
    }
  }

  // inventory
  if (e.key === "1") selectSlot(0);
  if (e.key === "2") selectSlot(1);
  if (e.key === "3") selectSlot(2);
  if (e.key === "4") useBandage();
});

window.addEventListener("keyup", e => {
  if (isPaused) return;
  if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

canvas.addEventListener("mousedown", e => {
  if (isPaused) return;
  if (EDIT_COLLISIONS) {
    const rect = canvas.getBoundingClientRect();
    dragStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  } else {
    keys.mouseDown = true;
  }
});
canvas.addEventListener("mouseup", e => {
  if (isPaused) return;
  if (EDIT_COLLISIONS && dragStart) {
    const rect = canvas.getBoundingClientRect();
    const x2 = e.clientX - rect.left;
    const y2 = e.clientY - rect.top;
    const x = Math.min(dragStart.x, x2);
    const y = Math.min(dragStart.y, y2);
    const w = Math.abs(x2 - dragStart.x);
    const h = Math.abs(y2 - dragStart.y);
    dragStart = null;
    paintedColliders.push({ x, y, w, h });
    console.log(`collisionRects.push({ x: ${Math.round(x)}, y: ${Math.round(y)}, w: ${Math.round(w)}, h: ${Math.round(h)} });`);
  } else {
    keys.mouseDown = false;
  }
});
canvas.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  lastMousePos = { x: mx, y: my };

  if (!isPaused && hero) {
    hero.angle = Math.atan2(my - hero.y, mx - hero.x);
  }

  if (coordMode) {
    const rx = (mx / canvas.width).toFixed(2);
    const ry = (my / canvas.height).toFixed(2);
    coordOverlay.textContent = `x:${mx.toFixed(0)} y:${my.toFixed(0)} | rx:${rx} ry:${ry}`;
  }
});
canvas.addEventListener("contextmenu", e => {
  if (EDIT_COLLISIONS) e.preventDefault();
});

// ===== inventory helpers =====
function selectSlot(n) {
  if (!hero) return;
  if (n < hero.inventory.length) {
    hero.activeSlot = n;
    const wid = hero.inventory[n];
    hudItem.textContent = "Item: " + weapons[wid].name;
  }
}
function useBandage() {
  if (!hero) return;
  if (hero.meds > 0) {
    hero.meds--;
    hero.hp = Math.min(hero.maxHp, hero.hp + 35);
    hudHp.textContent = "HP: " + Math.ceil(hero.hp);
    console.log("💊 used bandage, remaining:", hero.meds);
  }
}

// ===== collisions =====
function buildCollisionMapFromImage() {
  const compiled = [];
  // all the collision rects you logged
  compiled.push({ x: 755, y: 431, w: 379, h: 111 });
  compiled.push({ x: 887, y: 213, w: 38, h: 23 });
  compiled.push({ x: 926, y: 211, w: 42, h: 13 });
  compiled.push({ x: 931, y: 222, w: 24, h: 21 });
  compiled.push({ x: 950, y: 225, w: 16, h: 17 });
  compiled.push({ x: 887, y: 224, w: 49, h: 51 });
  compiled.push({ x: 932, y: 243, w: 25, h: 25 });
  compiled.push({ x: 907, y: 263, w: 3, h: 26 });
  compiled.push({ x: 911, y: 267, w: 29, h: 13 });
  compiled.push({ x: 938, y: 259, w: 25, h: 21 });
  compiled.push({ x: 911, y: 277, w: 16, h: 11 });
  compiled.push({ x: 923, y: 271, w: 28, h: 16 });
  compiled.push({ x: 958, y: 223, w: 62, h: 54 });
  compiled.push({ x: 1100, y: 224, w: 45, h: 55 });
  compiled.push({ x: 653, y: 127, w: 55, h: 52 });
  compiled.push({ x: 642, y: 158, w: 40, h: 33 });
  compiled.push({ x: 633, y: 171, w: 21, h: 36 });
  compiled.push({ x: 674, y: 181, w: 19, h: 26 });
  compiled.push({ x: 645, y: 186, w: 34, h: 25 });
  compiled.push({ x: 615, y: 175, w: 25, h: 28 });
  compiled.push({ x: 678, y: 169, w: 20, h: 18 });
  compiled.push({ x: 704, y: 139, w: 23, h: 18 });
  compiled.push({ x: 701, y: 151, w: 21, h: 22 });
  compiled.push({ x: 642, y: 148, w: 17, h: 14 });
  compiled.push({ x: 1668, y: 193, w: 10, h: 54 });
  compiled.push({ x: 1597, y: 245, w: 83, h: 6 });
  compiled.push({ x: 1598, y: 248, w: 25, h: 100 });
  compiled.push({ x: 1622, y: 343, w: 237, h: 5 });
  compiled.push({ x: 1794, y: 257, w: 10, h: 54 });
  compiled.push({ x: 1689, y: 206, w: 49, h: 38 });
  compiled.push({ x: 1682, y: 241, w: 122, h: 14 });
  compiled.push({ x: 1852, y: 34, w: 22, h: 306 });
  compiled.push({ x: 1765, y: 150, w: 33, h: 5 });
  compiled.push({ x: 1784, y: 78, w: 11, h: 72 });
  compiled.push({ x: 1679, y: 73, w: 112, h: 7 });
  compiled.push({ x: 1678, y: 73, w: 4, h: 78 });
  compiled.push({ x: 1667, y: 116, w: 14, h: 37 });
  compiled.push({ x: 1678, y: 148, w: 29, h: 6 });
  compiled.push({ x: 1546, y: 100, w: 132, h: 15 });
  compiled.push({ x: 1524, y: 24, w: 23, h: 89 });
  compiled.push({ x: 1544, y: 18, w: 325, h: 17 });
  compiled.push({ x: 1671, y: 263, w: 111, h: 35 });
  compiled.push({ x: 828, y: 109, w: 121, h: 21 });
  compiled.push({ x: 941, y: 122, w: 87, h: 19 });
  compiled.push({ x: 1024, y: 123, w: 72, h: 20 });
  compiled.push({ x: 1094, y: 131, w: 51, h: 23 });
  compiled.push({ x: 1150, y: 144, w: 44, h: 20 });
  compiled.push({ x: 1191, y: 148, w: 52, h: 19 });
  compiled.push({ x: 1244, y: 155, w: 46, h: 23 });
  compiled.push({ x: 1276, y: 162, w: 45, h: 20 });
  compiled.push({ x: 1318, y: 167, w: 29, h: 17 });
  compiled.push({ x: 1340, y: 173, w: 23, h: 23 });
  compiled.push({ x: 1357, y: 182, w: 11, h: 39 });
  compiled.push({ x: 1358, y: 194, w: 13, h: 50 });
  compiled.push({ x: 1364, y: 212, w: 12, h: 51 });
  compiled.push({ x: 1371, y: 245, w: 15, h: 21 });
  compiled.push({ x: 1369, y: 259, w: 20, h: 17 });
  compiled.push({ x: 1372, y: 258, w: 4, h: 33 });
  compiled.push({ x: 1362, y: 269, w: 16, h: 29 });
  compiled.push({ x: 1356, y: 285, w: 12, h: 26 });
  compiled.push({ x: 1350, y: 299, w: 15, h: 25 });
  compiled.push({ x: 1348, y: 310, w: 11, h: 38 });
  compiled.push({ x: 1337, y: 318, w: 14, h: 29 });
  compiled.push({ x: 1329, y: 336, w: 11, h: 23 });
  compiled.push({ x: 1246, y: 386, w: 22, h: 19 });
  compiled.push({ x: 1263, y: 379, w: 24, h: 20 });
  compiled.push({ x: 1276, y: 373, w: 24, h: 6 });
  compiled.push({ x: 1292, y: 360, w: 17, h: 25 });
  compiled.push({ x: 1300, y: 354, w: 28, h: 23 });
  compiled.push({ x: 1316, y: 349, w: 19, h: 12 });
  compiled.push({ x: 937, y: 381, w: 154, h: 16 });
  compiled.push({ x: 1095, y: 386, w: 166, h: 15 });
  compiled.push({ x: 887, y: 380, w: 62, h: 13 });
  compiled.push({ x: 857, y: 342, w: 45, h: 39 });
  compiled.push({ x: 902, y: 349, w: 41, h: 26 });
  compiled.push({ x: 777, y: 355, w: 124, h: 34 });
  compiled.push({ x: 609, y: 347, w: 171, h: 28 });
  compiled.push({ x: 590, y: 359, w: 25, h: 13 });
  compiled.push({ x: 570, y: 402, w: 14, h: 38 });
  compiled.push({ x: 423, y: 433, w: 156, h: 15 });
  compiled.push({ x: 223, y: 435, w: 219, h: 9 });
  compiled.push({ x: 249, y: 442, w: 94, h: 74 });
  compiled.push({ x: 433, y: 535, w: 119, h: 14 });
  compiled.push({ x: 83, y: 433, w: 133, h: 66 });
  compiled.push({ x: 315, y: 335, w: 34, h: 24 });
  compiled.push({ x: 239, y: 292, w: 68, h: 54 });
  compiled.push({ x: 295, y: 304, w: 73, h: 65 });
  compiled.push({ x: 214, y: 319, w: 66, h: 48 });
  compiled.push({ x: 213, y: 286, w: 56, h: 42 });
  compiled.push({ x: 337, y: 330, w: 57, h: 48 });
  compiled.push({ x: 141, y: 178, w: 142, h: 14 });
  compiled.push({ x: 323, y: 176, w: 139, h: 11 });
  compiled.push({ x: 443, y: 70, w: 17, h: 113 });
  compiled.push({ x: 142, y: 67, w: 317, h: 14 });
  compiled.push({ x: 140, y: 73, w: 29, h: 105 });
  compiled.push({ x: 178, y: 97, w: 61, h: 20 });
  compiled.push({ x: 170, y: 138, w: 49, h: 40 });
  compiled.push({ x: 363, y: 157, w: 75, h: 9 });
  compiled.push({ x: 618, y: 573, w: 81, h: 36 });
  compiled.push({ x: 699, y: 565, w: 28, h: 76 });
  compiled.push({ x: 702, y: 674, w: 27, h: 100 });
  compiled.push({ x: 211, y: 752, w: 496, h: 17 });
  compiled.push({ x: 210, y: 563, w: 12, h: 193 });
  compiled.push({ x: 222, y: 563, w: 495, h: 4 });
  compiled.push({ x: 458, y: 570, w: 92, h: 36 });
  compiled.push({ x: 456, y: 606, w: 98, h: 14 });
  compiled.push({ x: 455, y: 701, w: 237, h: 47 });
  compiled.push({ x: 340, y: 655, w: 63, h: 14 });
  compiled.push({ x: 718, y: 861, w: 229, h: 23 });
  compiled.push({ x: 58, y: 864, w: 661, h: 16 });
  compiled.push({ x: 54, y: 366, w: 39, h: 500 });
  compiled.push({ x: 49, y: 44, w: 28, h: 328 });
  compiled.push({ x: 288, y: 19, w: 614, h: 11 });
  compiled.push({ x: 905, y: 20, w: 620, h: 19 });
  compiled.push({ x: 665, y: 25, w: 10, h: 7 });
  compiled.push({ x: 666, y: 33, w: 15, h: 24 });
  compiled.push({ x: 666, y: 87, w: 17, h: 30 });
  compiled.push({ x: 685, y: 107, w: 88, h: 10 });
  compiled.push({ x: 760, y: 102, w: 77, h: 19 });
  compiled.push({ x: 689, y: 37, w: 289, h: 30 });
  compiled.push({ x: 972, y: 43, w: 547, h: 21 });
  compiled.push({ x: 1401, y: 594, w: 60, h: 143 });
  compiled.push({ x: 1504, y: 600, w: 43, h: 135 });
  compiled.push({ x: 1590, y: 599, w: 35, h: 134 });
  compiled.push({ x: 1669, y: 599, w: 39, h: 137 });
  compiled.push({ x: 1757, y: 689, w: 37, h: 44 });
  compiled.push({ x: 1758, y: 508, w: 51, h: 55 });
  compiled.push({ x: 1674, y: 503, w: 41, h: 48 });
  compiled.push({ x: 1582, y: 502, w: 47, h: 52 });
  compiled.push({ x: 1413, y: 494, w: 15, h: 53 });
  compiled.push({ x: 1417, y: 494, w: 41, h: 57 });
  compiled.push({ x: 1495, y: 502, w: 45, h: 46 });
  compiled.push({ x: 1795, y: 378, w: 54, h: 52 });
  compiled.push({ x: 1307, y: 780, w: 128, h: 78 });
  compiled.push({ x: 1429, y: 841, w: 455, h: 47 });
  compiled.push({ x: 1850, y: 604, w: 30, h: 236 });
  compiled.push({ x: 1847, y: 337, w: 23, h: 266 });
  compiled.push({ x: 873, y: 693, w: 152, h: 36 });
  compiled.push({ x: 881, y: 725, w: 140, h: 33 });

  collisionRects = compiled;
}

// ===== door =====
function placeDoor() {
  door = { x: 307, y: 102, active: false };
}

// ===== enemy variant picker (for cooler peds) =====
function pickPedVariant() {
  const variants = [
    {
      name: "civilian",
      head: "#fdbba3",
      torso: "#374151",
      accent: "#9ca3af",
      pants: "#111827"
    },
    {
      name: "raider",
      head: "#fef3c7",
      torso: "#991b1b",
      accent: "#f97316",
      pants: "#1f2937"
    },
    {
      name: "hazmat",
      head: "#fef9c3",
      torso: "#facc15",
      accent: "#0f172a",
      pants: "#0f172a"
    },
    {
      name: "infected",
      head: "#fda4af",
      torso: "#14532d",
      accent: "#dc2626",
      pants: "#052e16"
    }
  ];
  return variants[Math.floor(Math.random() * variants.length)];
}

// ===== game logic =====
function spawnZombies() {
  zombies = [];
  worldPickups = [];
  bulletImpacts = [];

  const count = 5 + level * 2;
  for (let i = 0; i < count; i++) {
    zombies.push({
      x: canvas.width * (0.2 + Math.random() * 0.6),
      y: canvas.height * (0.15 + Math.random() * 0.6),
      hp: 1,
      speed: 0.35 + Math.random() * 0.2,
      dying: false,
      dieTimer: 0,
      variant: pickPedVariant()
    });
  }

  // spawn baked weapon pickups
  weaponSpawns.forEach(sp => {
    worldPickups.push({
      type: "weapon",
      weaponId: sp.weaponId || "pistol",
      x: sp.x,
      y: sp.y
    });
  });

  // drop a bandage
  if (hero) {
    worldPickups.push({
      type: "med",
      x: hero.x - 60,
      y: hero.y - 40
    });
  }
}

function gameLoop(t) {
  if (!isPaused && !gameOver) update(t);
  draw();
  requestAnimationFrame(gameLoop);
}

function update(t) {
  let dx = 0, dy = 0;
  if (keys.w || keys.ArrowUp) dy -= hero.speed;
  if (keys.s || keys.ArrowDown) dy += hero.speed;
  if (keys.a || keys.ArrowLeft) dx -= hero.speed;
  if (keys.d || keys.ArrowRight) dx += hero.speed;

  if (dx !== 0 || dy !== 0) hero.walkTime += 0.12;
  moveHeroWithCollisions(dx, dy);

  if (keys.mouseDown) tryFire(t);

  // bullets with wall hit + spark
  bullets = bullets.filter(b => {
    b.x += Math.cos(b.angle) * b.speed;
    b.y += Math.sin(b.angle) * b.speed;
    b.life--;

    if (isBulletBlocked(b.x, b.y)) {
      bulletImpacts.push({ x: b.x, y: b.y, life: 10 });
      return false;
    }

    return b.life > 0;
  });

  // bullet vs zombies
  bullets.forEach(b => {
    zombies.forEach(z => {
      if (!z.dying) {
        const d = Math.hypot(b.x - z.x, b.y - z.y);
        if (d < 20) {
          z.dying = true;
          z.dieTimer = 30;
          b.life = 0;
        }
      }
    });
  });

  // zombies move, but slide instead of getting stuck
  zombies.forEach(z => {
    if (z.dying) {
      z.dieTimer--;
    } else {
      const ang = Math.atan2(hero.y - z.y, hero.x - z.x);
      const step = z.speed;
      const tryX = z.x + Math.cos(ang) * step;
      const tryY = z.y + Math.sin(ang) * step;

      const blockX = isBlockedPoint(tryX, z.y);
      const blockY = isBlockedPoint(z.x, tryY);

      if (!blockX) z.x = tryX;
      if (!blockY) z.y = tryY;

      if (blockX && blockY) {
        const altX = z.x + (Math.cos(ang) > 0 ? 1 : -1) * step;
        if (!isBlockedPoint(altX, z.y)) {
          z.x = altX;
        } else {
          const altY = z.y + (Math.sin(ang) > 0 ? 1 : -1) * step;
          if (!isBlockedPoint(z.x, altY)) z.y = altY;
        }
      }

      // contact damage
      if (!GHOST_MODE && Math.hypot(hero.x - z.x, hero.y - z.y) < 22) {
        hero.hp -= 0.35;
        if (hero.hp <= 0) {
          hero.hp = 0;
          gameOver = true;
          deathScreen.classList.remove("hidden");
        }
      }
    }
  });

  zombies = zombies.filter(z => !z.dying || z.dieTimer > 0);

  // open door when all dead
  if (zombies.filter(z => !z.dying).length === 0) {
    door.active = true;
  }

  // show interact
  const nearPickup = worldPickups.some(p => Math.hypot(hero.x - p.x, hero.y - p.y) < 40);
  const nearDoor = door && door.active && Math.hypot(hero.x - (door.x + 40), hero.y - (door.y + 30)) < 60;
  if (nearPickup || nearDoor) interactBox.classList.remove("hidden");
  else interactBox.classList.add("hidden");

  hudHp.textContent = "HP: " + Math.ceil(hero.hp);
}

// ===== collision helpers =====
function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}
function isBlockedPoint(px, py) {
  return (
    collisionRects.some(r => pointInRect(px, py, r)) ||
    paintedColliders.some(r => pointInRect(px, py, r))
  );
}
function isBulletBlocked(px, py) {
  return isBlockedPoint(px, py);
}
function moveHeroWithCollisions(dx, dy) {
  if (GHOST_MODE) {
    hero.x += dx;
    hero.y += dy;
    return;
  }
  const half = 14;

  const newX = hero.x + dx;
  const xBlocked =
    isBlockedPoint(newX - half, hero.y) ||
    isBlockedPoint(newX + half, hero.y) ||
    isBlockedPoint(newX, hero.y - half) ||
    isBlockedPoint(newX, hero.y + half);
  if (!xBlocked) hero.x = newX;

  const newY = hero.y + dy;
  const yBlocked =
    isBlockedPoint(hero.x, newY - half) ||
    isBlockedPoint(hero.x, newY + half) ||
    isBlockedPoint(hero.x - half, newY) ||
    isBlockedPoint(hero.x + half, newY);
  if (!yBlocked) hero.y = newY;
}

// ===== interact / inventory =====
function tryInteract() {
  // pickups
  for (let i = 0; i < worldPickups.length; i++) {
    const p = worldPickups[i];
    if (Math.hypot(hero.x - p.x, hero.y - p.y) < 40) {
      if (p.type === "weapon") {
        pickUpWeapon(p.weaponId, p.x, p.y);
      } else if (p.type === "med") {
        hero.meds++;
        console.log("💊 picked bandage, total:", hero.meds);
      }
      worldPickups.splice(i, 1);
      return;
    }
  }
  // door
  if (door && door.active && Math.hypot(hero.x - (door.x + 40), hero.y - (door.y + 30)) < 60) {
    level++;
    hudLevel.textContent = "Zone: " + level;
    placeDoor();
    spawnZombies();
  }
}

function pickUpWeapon(weaponId, dropX, dropY) {
  if (!hero) return;
  const already = hero.inventory.indexOf(weaponId);
  if (already !== -1) {
    hero.activeSlot = already;
    hudItem.textContent = "Item: " + weapons[weaponId].name;
    return;
  }
  if (hero.inventory.length < 3) {
    hero.inventory.push(weaponId);
    hero.activeSlot = hero.inventory.length - 1;
    hudItem.textContent = "Item: " + weapons[weaponId].name;
  } else {
    const currentId = hero.inventory[hero.activeSlot];
    worldPickups.push({
      type: "weapon",
      weaponId: currentId,
      x: dropX ?? hero.x + 20,
      y: dropY ?? hero.y + 10
    });
    hero.inventory[hero.activeSlot] = weaponId;
    hudItem.textContent = "Item: " + weapons[weaponId].name;
  }
}

// ===== firing =====
function tryFire(t) {
  const wid = hero.inventory[hero.activeSlot];
  const weap = weapons[wid];
  if (!weap || !weap.canFire) return;
  const last = hero.lastFire || 0;
  if (t - last < weap.fireRate) return;
  hero.lastFire = t;
  bullets.push({
    x: hero.x + Math.cos(hero.angle) * 20,
    y: hero.y + Math.sin(hero.angle) * 20,
    angle: hero.angle,
    speed: weap.bulletSpeed,
    life: 70
  });
}

// ===== drawing =====
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (bgImage.complete) {
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (DEBUG_COLLISIONS) drawCollisionDebug();
  drawDoorArrow();
  drawWeaponSpawns();
  drawWorldPickups();
  drawZombies(); // new cooler peds
  drawBullets();
  drawBulletImpacts();
  if (hero) {
    drawHero();
    drawWeaponLight();
  }
  drawPaintedColliders();
}

function drawCollisionDebug() {
  ctx.save();
  ctx.strokeStyle = "rgba(255,0,0,0.5)";
  ctx.fillStyle = "rgba(255,0,0,0.15)";
  collisionRects.forEach(r => {
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  });
  ctx.restore();
}

function drawPaintedColliders() {
  if (!EDIT_COLLISIONS) return;
  ctx.save();
  ctx.strokeStyle = "rgba(255,165,0,0.95)";
  ctx.fillStyle = "rgba(255,165,0,0.25)";
  paintedColliders.forEach(r => {
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeRect(r.x, r.y, r.w, r.h);
  });
  if (dragStart && lastMousePos) {
    const x = Math.min(dragStart.x, lastMousePos.x);
    const y = Math.min(dragStart.y, lastMousePos.y);
    const w = Math.abs(lastMousePos.x - dragStart.x);
    const h = Math.abs(lastMousePos.y - dragStart.y);
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
  }
  ctx.restore();
}

function drawDoorArrow() {
  if (!door) return;
  if (!door.active) return;
  const cx = door.x + 40;
  const cy = door.y + 30;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = "rgba(34,197,94,0.85)";
  ctx.strokeStyle = "rgba(15,23,42,0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.lineTo(22, 10);
  ctx.lineTo(10, 10);
  ctx.lineTo(10, 26);
  ctx.lineTo(-10, 26);
  ctx.lineTo(-10, 10);
  ctx.lineTo(-22, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawWeaponSpawns() {
  if (weaponSpawns.length === 0) return;
  ctx.save();
  ctx.strokeStyle = "rgba(59,130,246,0.9)";
  ctx.fillStyle = "rgba(59,130,246,0.4)";
  weaponSpawns.forEach(s => {
    ctx.beginPath();
    ctx.arc(s.x, s.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

function drawWorldPickups() {
  worldPickups.forEach(p => {
    if (p.type === "weapon") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(-Math.PI / 8);
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(-10, -4, 22, 8);
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(-5, -1, 6, 10);
      ctx.restore();
    } else if (p.type === "med") {
      ctx.save();
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(p.x - 10, p.y - 6, 20, 12);
      ctx.fillStyle = "#fff";
      ctx.fillRect(p.x - 3, p.y - 6, 6, 12);
      ctx.fillRect(p.x - 10, p.y - 2, 20, 4);
      ctx.restore();
    }
  });
}

function drawZombies() {
  zombies.forEach(z => {
    if (z.dying) {
      const p = z.dieTimer / 30;
      ctx.save();
      ctx.globalAlpha = p;
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(z.x, z.y - 4, 20 * p, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    const v = z.variant || {
      head: "#fef3c7",
      torso: "#14532d",
      accent: "#dc2626",
      pants: "#0f172a",
      name: "infected"
    };

    // shadow
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(z.x, z.y + 12, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // legs
    ctx.fillStyle = v.pants;
    ctx.fillRect(z.x - 6, z.y + 2, 5, 14);
    ctx.fillRect(z.x + 1, z.y + 2, 5, 14);

    // torso
    ctx.fillStyle = v.torso;
    ctx.fillRect(z.x - 11, z.y - 10, 22, 20);

    // accent
    ctx.fillStyle = v.accent;
    if (v.name === "infected") {
      ctx.fillRect(z.x - 2, z.y - 10, 4, 16);
    } else if (v.name === "raider") {
      ctx.save();
      ctx.translate(z.x, z.y);
      ctx.rotate(-0.4);
      ctx.fillRect(-2, -12, 4, 24);
      ctx.restore();
    } else {
      ctx.fillRect(z.x - 4, z.y - 6, 8, 10);
    }

    // head
    ctx.fillStyle = v.head;
    ctx.beginPath();
    ctx.arc(z.x, z.y - 16, 8, 0, Math.PI * 2);
    ctx.fill();

    // eyes
    ctx.fillStyle = "rgba(15,23,42,0.8)";
    ctx.fillRect(z.x - 3, z.y - 18, 2, 2);
    ctx.fillRect(z.x + 1, z.y - 18, 2, 2);
  });
}

function drawBullets() {
  ctx.strokeStyle = "rgba(252,252,252,0.7)";
  ctx.lineWidth = 2;
  bullets.forEach(b => {
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - Math.cos(b.angle) * 6, b.y - Math.sin(b.angle) * 6);
    ctx.stroke();
  });
}

function drawBulletImpacts() {
  bulletImpacts = bulletImpacts.filter(s => {
    ctx.save();
    const alpha = s.life / 10;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "rgba(248,250,252,1)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s.x - 4, s.y);
    ctx.lineTo(s.x + 4, s.y);
    ctx.moveTo(s.x, s.y - 4);
    ctx.lineTo(s.x, s.y + 4);
    ctx.stroke();
    ctx.restore();
    s.life--;
    return s.life > 0;
  });
}

function drawHero() {
  const x = hero.x;
  const y = hero.y;
  const bob = Math.sin(hero.walkTime) * 1.5;

  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(x, y + 16, 16, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // legs
  ctx.fillStyle = hero.pants;
  ctx.fillRect(x - 6, y + 4, 5, 14);
  ctx.fillRect(x + 1, y + 4, 5, 14);

  // torso by preset
  ctx.save();
  if (hero.presetId === "operator") {
    ctx.fillStyle = hero.jacket;
    ctx.fillRect(x - 11, y - 8 + bob, 22, 20);
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(x - 8, y - 4 + bob, 16, 10);
  } else if (hero.presetId === "scout") {
    ctx.fillStyle = hero.jacket;
    ctx.fillRect(x - 9, y - 8 + bob, 18, 18);
    ctx.fillStyle = "rgba(56,189,248,0.3)";
    ctx.fillRect(x - 7, y - 12 + bob, 14, 6);
  } else if (hero.presetId === "medic") {
    ctx.fillStyle = hero.jacket;
    ctx.fillRect(x - 10, y - 8 + bob, 20, 18);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(x - 4, y - 4 + bob, 8, 8);
  } else {
    ctx.fillStyle = hero.jacket;
    ctx.fillRect(x - 10, y - 8 + bob, 20, 18);
  }
  ctx.restore();

  // head
  ctx.fillStyle = hero.skin;
  ctx.beginPath();
  ctx.arc(x, y - 16 + bob, 8, 0, Math.PI * 2);
  ctx.fill();

  // gear overlays
  if (hero.presetId === "operator") {
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(x - 8, y - 22 + bob, 16, 6);
  } else if (hero.presetId === "scout") {
    ctx.strokeStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(x, y - 16 + bob, 9, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
  } else if (hero.presetId === "ranger") {
    ctx.fillStyle = "#020617";
    ctx.fillRect(x - 10, y - 20 + bob, 20, 4);
  }
}

function drawWeaponLight() {
  const wid = hero.inventory[hero.activeSlot];
  if (wid === "flashlight") {
    const handX = hero.x + Math.cos(hero.angle) * 14;
    const handY = hero.y + Math.sin(hero.angle) * 14;
    ctx.save();
    ctx.translate(handX, handY);
    ctx.rotate(hero.angle);
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 320);
    grad.addColorStop(0, "rgba(202,252,255,0.9)");
    grad.addColorStop(1, "rgba(202,252,255,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(320, -90);
    ctx.lineTo(320, 90);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else {
    const handX = hero.x + Math.cos(hero.angle) * 14;
    const handY = hero.y + Math.sin(hero.angle) * 14;
    const endX = handX + Math.cos(hero.angle) * 360;
    const endY = handY + Math.sin(hero.angle) * 360;
    ctx.save();
    ctx.lineWidth = 3;
    const grad = ctx.createLinearGradient(handX, handY, endX, endY);
    grad.addColorStop(0, "rgba(252,76,2,1)");
    grad.addColorStop(1, "rgba(252,76,2,0)");
    ctx.strokeStyle = grad;
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.restore();
  }
}

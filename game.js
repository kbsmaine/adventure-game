// Quarantine Graveyard - image map + auto collisions

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

// load background image (PUT map.png in same folder)
const bgImage = new Image();
bgImage.src = "map.png";

let hero = null;
let selectedCharId = null;
let level = 1;
let zombies = [];
let bullets = [];
let door = null;
let gameOver = false;
let muzzleFlashTimer = 0;
let pendingPickup = null; // pistol pickup

// collision rectangles
let collisionRects = [];

const survivorPresets = [
  { id: "operator", name: "Zone Operator", role: "Armored", body: "#1f2937", jacket: "#f97316", pants: "#0f172a", skin: "#fef3c7", gear: "helmet", class: "operator" },
  { id: "scout", name: "Tunnel Scout", role: "Light", body: "#0f172a", jacket: "#38bdf8", pants: "#020617", skin: "#fee2e2", gear: "hood", class: "scout" },
  { id: "medic", name: "Outpost Medic", role: "Support", body: "#166534", jacket: "#22c55e", pants: "#052e16", skin: "#fde68a", gear: "cap", class: "medic" },
  { id: "ranger", name: "Perimeter Ranger", role: "Marksman", body: "#1f2937", jacket: "#eab308", pants: "#0f172a", skin: "#fef3c7", gear: "goggles", class: "ranger" }
];

const weapons = {
  flashlight: { name: "Flashlight", canFire: false },
  pistol: { name: "9mm Pistol", canFire: true, fireRate: 280, bulletSpeed: 7, damage: 1, spread: 0 }
};
let lastFire = 0;

const keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false,
  w: false,
  a: false,
  s: false,
  d: false,
  mouseDown: false
};

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  placeDoor();
  autoPlaceColliders();
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// build character selection
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
      document.querySelectorAll(".character-card").forEach(el => el.classList.remove("selected"));
      card.classList.add("selected");
    });

    charGrid.appendChild(card);
  });
}
renderCharacterGrid();

// load from localStorage
(function loadSavedHero() {
  const saved = localStorage.getItem("grave_hero_v1");
  if (saved) {
    const d = JSON.parse(saved);
    hero = {
      ...d,
      x: canvas.width / 2,
      y: canvas.height - 200,
      angle: 0,
      speed: 2.25,
      walkTime: 0,
      hp: d.hp || 100,
      maxHp: 100
    };
    level = d.level || 1;
    hudName.textContent = hero.name;
    hudClass.textContent = hero.class;
    hudItem.textContent = "Item: " + weapons[hero.currentWeapon].name;
    hudLevel.textContent = "Zone: " + level;
    hudHp.textContent = "HP: " + hero.hp;
    charScreen.classList.remove("active");
    gameScreen.classList.add("active");
    placeDoor();
    autoPlaceColliders();
    spawnZombies();
    requestAnimationFrame(gameLoop);
  } else {
    charScreen.classList.add("active");
  }
})();

startBtn.addEventListener("click", () => {
  const nm = heroNameInput.value.trim() || "Survivor";
  const preset = survivorPresets.find(p => p.id === selectedCharId) || survivorPresets[0];

  hero = {
    name: nm,
    class: preset.class,
    presetId: preset.id,
    body: preset.body,
    jacket: preset.jacket,
    pants: preset.pants,
    skin: preset.skin,
    gear: preset.gear,
    x: canvas.width / 2,
    y: canvas.height - 200,
    angle: 0,
    speed: 2.3,
    walkTime: 0,
    currentWeapon: "flashlight",
    hp: 100,
    maxHp: 100
  };
  level = 1;

  saveHero();
  hudName.textContent = hero.name;
  hudClass.textContent = hero.class;
  hudItem.textContent = "Item: " + weapons[hero.currentWeapon].name;
  hudLevel.textContent = "Zone: " + level;
  hudHp.textContent = "HP: " + hero.hp;

  charScreen.classList.remove("active");
  gameScreen.classList.add("active");
  placeDoor();
  autoPlaceColliders();
  spawnZombies();
  requestAnimationFrame(gameLoop);
});

retryBtn.addEventListener("click", () => {
  deathScreen.classList.add("hidden");
  gameOver = false;
  hero.hp = hero.maxHp;
  spawnZombies();
  requestAnimationFrame(gameLoop);
});

function saveHero() {
  localStorage.setItem(
    "grave_hero_v1",
    JSON.stringify({
      name: hero.name,
      class: hero.class,
      presetId: hero.presetId,
      body: hero.body,
      jacket: hero.jacket,
      pants: hero.pants,
      skin: hero.skin,
      gear: hero.gear,
      currentWeapon: hero.currentWeapon,
      level: level,
      hp: hero.hp
    })
  );
}

window.addEventListener("keydown", e => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
  if (e.key === "e" || e.key === "E") tryInteract();
});
window.addEventListener("keyup", e => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});
canvas.addEventListener("mousedown", () => {
  keys.mouseDown = true;
});
canvas.addEventListener("mouseup", () => {
  keys.mouseDown = false;
});
canvas.addEventListener("mousemove", e => {
  if (!hero) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  hero.angle = Math.atan2(my - hero.y, mx - hero.x);
});

// place door at bottom center
function placeDoor() {
  door = {
    x: canvas.width / 2 - 40,
    y: canvas.height - 120,
    active: false
  };
}

// auto collision rectangles to match the image layout
function autoPlaceColliders() {
  const w = canvas.width;
  const h = canvas.height;
  collisionRects = [];

  // outer walls
  collisionRects.push({ x: 0, y: 0, w: w, h: 30 });
  collisionRects.push({ x: 0, y: 0, w: 30, h: h });
  collisionRects.push({ x: 0, y: h - 30, w: w, h: 30 });
  collisionRects.push({ x: w - 30, y: 0, w: 30, h: h });

  // top-left building
  collisionRects.push({ x: w * 0.03, y: h * 0.03, w: w * 0.25, h: h * 0.22 });

  // top-right building
  collisionRects.push({ x: w * 0.72, y: h * 0.03, w: w * 0.23, h: h * 0.25 });

  // bottom-left building
  collisionRects.push({ x: w * 0.05, y: h * 0.60, w: w * 0.28, h: h * 0.27 });

  // central monument area
  collisionRects.push({ x: w * 0.40, y: h * 0.48, w: w * 0.15, h: h * 0.12 });

  // right graves
  collisionRects.push({ x: w * 0.68, y: h * 0.48, w: w * 0.23, h: h * 0.30 });

  // inner fence: 4 segments approximating the grey fence
  collisionRects.push({ x: w * 0.30, y: h * 0.20, w: w * 0.45, h: 10 });
  collisionRects.push({ x: w * 0.30, y: h * 0.20, w: 10, h: h * 0.40 });
  collisionRects.push({ x: w * 0.30, y: h * 0.60, w: w * 0.45, h: 10 });
  collisionRects.push({ x: w * 0.75, y: h * 0.20, w: 10, h: h * 0.40 });
}

function spawnZombies() {
  zombies = [];
  const count = 5 + level * 2;
  for (let i = 0; i < count; i++) {
    zombies.push({
      x: canvas.width * (0.2 + Math.random() * 0.6),
      y: canvas.height * (0.15 + Math.random() * 0.6),
      hp: 1,
      speed: 0.35 + Math.random() * 0.2,
      dying: false,
      dieTimer: 0
    });
  }
  bullets = [];
  // if player still only has flashlight, spawn pistol near them
  if (hero && hero.currentWeapon === "flashlight") {
    pendingPickup = {
      x: hero.x + 80,
      y: hero.y - 40
    };
  } else {
    pendingPickup = null;
  }
}

function gameLoop(t) {
  if (gameOver) return;
  update(t);
  draw();
  requestAnimationFrame(gameLoop);
}

function update(t) {
  let dx = 0,
    dy = 0;
  if (keys.w || keys.ArrowUp) dy -= hero.speed;
  if (keys.s || keys.ArrowDown) dy += hero.speed;
  if (keys.a || keys.ArrowLeft) dx -= hero.speed;
  if (keys.d || keys.ArrowRight) dx += hero.speed;

  if (dx !== 0 || dy !== 0) hero.walkTime += 0.12;

  tryMoveHero(dx, dy);

  if (keys.mouseDown) tryFire(t);

  // bullets
  bullets = bullets.filter(b => {
    b.x += Math.cos(b.angle) * b.speed;
    b.y += Math.sin(b.angle) * b.speed;
    b.life -= 1;
    return b.life > 0;
  });

  // bullet -> zombie
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

  // zombies move and bite
  zombies.forEach(z => {
    if (z.dying) {
      z.dieTimer -= 1;
    } else {
      const ang = Math.atan2(hero.y - z.y, hero.x - z.x);
      z.x += Math.cos(ang) * z.speed;
      z.y += Math.sin(ang) * z.speed;
      const d = Math.hypot(hero.x - z.x, hero.y - z.y);
      if (d < 22) {
        hero.hp -= 0.35;
        if (hero.hp <= 0) {
          hero.hp = 0;
          hudHp.textContent = "HP: 0";
          gameOver = true;
          deathScreen.classList.remove("hidden");
        }
      }
    }
  });
  zombies = zombies.filter(z => !z.dying || z.dieTimer > 0);

  // all dead -> door active
  if (zombies.filter(z => !z.dying).length === 0) {
    door.active = true;
  }

  // show interact if near pickup or door
  const nearPickup =
    pendingPickup &&
    Math.hypot(hero.x - pendingPickup.x, hero.y - pendingPickup.y) < 40;
  const nearDoor =
    door &&
    door.active &&
    Math.hypot(
      hero.x - (door.x + 40),
      hero.y - (door.y + 30)
    ) < 50;

  if (nearPickup || nearDoor) {
    interactBox.classList.remove("hidden");
  } else {
    interactBox.classList.add("hidden");
  }

  hudHp.textContent = "HP: " + Math.ceil(hero.hp);
  if (muzzleFlashTimer > 0) muzzleFlashTimer -= 16;
}

function tryMoveHero(dx, dy) {
  const newX = hero.x + dx;
  const newY = hero.y + dy;
  const half = 14;

  // X
  const xBlocked = collisionRects.some(r =>
    rectContainsPoint(r, newX - half, hero.y)
  ) ||
    collisionRects.some(r => rectContainsPoint(r, newX + half, hero.y)) ||
    collisionRects.some(r => rectContainsPoint(r, newX, hero.y - half)) ||
    collisionRects.some(r => rectContainsPoint(r, newX, hero.y + half));
  if (!xBlocked) hero.x = newX;

  // Y
  const yBlocked = collisionRects.some(r =>
    rectContainsPoint(r, hero.x, newY - half)
  ) ||
    collisionRects.some(r => rectContainsPoint(r, hero.x, newY + half)) ||
    collisionRects.some(r => rectContainsPoint(r, hero.x - half, newY)) ||
    collisionRects.some(r => rectContainsPoint(r, hero.x + half, newY));
  if (!yBlocked) hero.y = newY;
}

function rectContainsPoint(r, px, py) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function tryFire(t) {
  const weap = weapons[hero.currentWeapon];
  if (!weap.canFire) return;
  if (t - lastFire < weap.fireRate) return;
  lastFire = t;

  bullets.push({
    x: hero.x + Math.cos(hero.angle) * 20,
    y: hero.y + Math.sin(hero.angle) * 20,
    angle: hero.angle,
    speed: weap.bulletSpeed,
    life: 70
  });
  muzzleFlashTimer = 90;
}

function tryInteract() {
  // pickup
  if (
    pendingPickup &&
    Math.hypot(hero.x - pendingPickup.x, hero.y - pendingPickup.y) < 40
  ) {
    hero.currentWeapon = "pistol";
    pendingPickup = null;
    hudItem.textContent = "Item: " + weapons[hero.currentWeapon].name;
    saveHero();
    return;
  }

  // door
  if (
    door &&
    door.active &&
    Math.hypot(hero.x - (door.x + 40), hero.y - (door.y + 30)) < 50
  ) {
    level += 1;
    hudLevel.textContent = "Zone: " + level;
    spawnZombies();
    door.active = false;
    saveHero();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawDoor();
  drawZombies();
  drawBullets();
  drawHero();
  drawLightOrLaser();
  drawPickup();
}

function drawBackground() {
  if (bgImage.complete) {
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function drawDoor() {
  if (!door) return;
  ctx.fillStyle = door.active
    ? "rgba(34,197,94,0.9)"
    : "rgba(15,23,42,0.8)";
  ctx.fillRect(door.x, door.y, 80, 60);
}

function drawZombies() {
  zombies.forEach(z => {
    if (z.dying) {
      const prog = z.dieTimer / 30;
      ctx.save();
      ctx.globalAlpha = prog;
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(z.x, z.y - 8, 20 * prog, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = "#14532d";
      ctx.fillRect(z.x - 12, z.y - 10, 24, 32);
      ctx.fillStyle = "#166534";
      ctx.beginPath();
      ctx.arc(z.x, z.y - 16, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(z.x - 4, z.y - 18, 2, 2);
      ctx.fillRect(z.x + 2, z.y - 18, 2, 2);
    }
  });
}

function drawBullets() {
  bullets.forEach(b => {
    ctx.strokeStyle = "rgba(252,252,252,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(
      b.x - Math.cos(b.angle) * 6,
      b.y - Math.sin(b.angle) * 6
    );
    ctx.stroke();
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
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(x - 6, y + 16, 6, 3);
  ctx.fillRect(x + 1, y + 16, 6, 3);

  // torso
  ctx.fillStyle = hero.jacket;
  ctx.fillRect(x - 10, y - 8 + bob, 20, 18);

  // head
  ctx.fillStyle = hero.skin;
  ctx.beginPath();
  ctx.arc(x, y - 16 + bob, 8, 0, Math.PI * 2);
  ctx.fill();

  // eyes
  ctx.fillStyle = "#020617";
  ctx.fillRect(x - 4, y - 18 + bob, 2, 2);
  ctx.fillRect(x + 2, y - 18 + bob, 2, 2);

  // gear
  if (hero.gear === "helmet") {
    ctx.fillStyle = "#f97316";
    ctx.fillRect(x - 9, y - 23 + bob, 18, 5);
  }
}

function drawLightOrLaser() {
  if (hero.currentWeapon === "flashlight") {
    const handX = hero.x + Math.cos(hero.angle) * 14;
    const handY = hero.y - 2 + Math.sin(hero.angle) * 14;
    ctx.save();
    ctx.translate(handX, handY);
    ctx.rotate(hero.angle);
    const beamLen = 320;
    const beamWidth = 90;
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, beamLen);
    grad.addColorStop(0, "rgba(202,252,255,0.9)");
    grad.addColorStop(1, "rgba(202,252,255,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(beamLen, -beamWidth);
    ctx.lineTo(beamLen, beamWidth);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else {
    const handX = hero.x + Math.cos(hero.angle) * 14;
    const handY = hero.y - 2 + Math.sin(hero.angle) * 14;
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

function drawPickup() {
  if (!pendingPickup) return;
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(pendingPickup.x - 14, pendingPickup.y - 8, 28, 16);
  ctx.fillStyle = "#fb7185";
  ctx.fillRect(pendingPickup.x - 4, pendingPickup.y - 3, 12, 6);
}

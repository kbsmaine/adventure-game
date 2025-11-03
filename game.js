// game.js
// Auto collisions + manual obstacles + collision editor (B) + coord mode (C)

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

let DEBUG_COLLISIONS = true; // L
let coordMode = false;       // C
let EDIT_COLLISIONS = false; // B

const bgImage = new Image();
bgImage.src = "map.png";

let hero = null;
let selectedCharId = null;
let level = 1;
let zombies = [];
let bullets = [];
let door = null;
let gameOver = false;
let pendingPickup = null;

let collisionRects = [];     // auto + manual
let paintedColliders = [];   // drawn in editor mode
let dragStart = null;        // for editor drag

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

const keys = {
  w: false, a: false, s: false, d: false,
  ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
  mouseDown: false
};

// coord overlay
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
coordOverlay.textContent = "coord mode";
document.body.appendChild(coordOverlay);

// ------------- init / resize -------------
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  placeDoor();
  if (bgImage.complete) buildCollisionMapFromImage(bgImage);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

bgImage.onload = () => {
  buildCollisionMapFromImage(bgImage);
};

// show char screen
charScreen.classList.add("active");

// ------------- character select -------------
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

// ------------- start game -------------
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

  hudName.textContent = hero.name;
  hudClass.textContent = hero.class;
  hudItem.textContent = "Item: " + weapons[hero.currentWeapon].name;
  hudLevel.textContent = "Zone: " + level;
  hudHp.textContent = "HP: " + hero.hp;

  charScreen.classList.remove("active");
  gameScreen.classList.add("active");
  placeDoor();
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

// ------------- input -------------
window.addEventListener("keydown", e => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
  if (e.key === "e" || e.key === "E") tryInteract();
  if (e.key === "l" || e.key === "L") DEBUG_COLLISIONS = !DEBUG_COLLISIONS;
  if (e.key === "c" || e.key === "C") {
    coordMode = !coordMode;
    coordOverlay.style.display = coordMode ? "block" : "none";
    console.log(coordMode ? "📍 coord mode ON" : "coord mode OFF");
  }
  if (e.key === "b" || e.key === "B") {
    EDIT_COLLISIONS = !EDIT_COLLISIONS;
    console.log(EDIT_COLLISIONS ? "🧱 collision editor ON (drag on canvas)" : "collision editor OFF");
  }
});

window.addEventListener("keyup", e => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

canvas.addEventListener("mousedown", e => {
  // editor drag
  if (EDIT_COLLISIONS) {
    const rect = canvas.getBoundingClientRect();
    dragStart = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  } else {
    keys.mouseDown = true;
  }
});

canvas.addEventListener("mouseup", e => {
  if (EDIT_COLLISIONS && dragStart) {
    const rect = canvas.getBoundingClientRect();
    const x2 = e.clientX - rect.left;
    const y2 = e.clientY - rect.top;
    const x = Math.min(dragStart.x, x2);
    const y = Math.min(dragStart.y, y2);
    const w = Math.abs(x2 - dragStart.x);
    const h = Math.abs(y2 - dragStart.y);
    dragStart = null;

    // add to temporary colliders so it blocks right away
    paintedColliders.push({ x, y, w, h });

    // print code for you to paste in buildCollisionMapFromImage
    console.log(`collisionRects.push({ x: ${Math.round(x)}, y: ${Math.round(y)}, w: ${Math.round(w)}, h: ${Math.round(h)} });`);
  } else {
    keys.mouseDown = false;
  }
});

canvas.addEventListener("mousemove", e => {
  if (!hero) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  hero.angle = Math.atan2(my - hero.y, mx - hero.x);

  if (coordMode) {
    const rx = (mx / canvas.width).toFixed(2);
    const ry = (my / canvas.height).toFixed(2);
    coordOverlay.textContent = `x:${mx.toFixed(0)} y:${my.toFixed(0)} | rx:${rx} ry:${ry}`;
  }
});

// ------------- collision from image + manual -------------
function buildCollisionMapFromImage(img) {
  const off = document.createElement("canvas");
  off.width = img.width;
  off.height = img.height;
  const octx = off.getContext("2d");
  octx.drawImage(img, 0, 0);
  const data = octx.getImageData(0, 0, img.width, img.height).data;

  const step = 32;
  const scaleX = canvas.width / img.width;
  const scaleY = canvas.height / img.height;
  const rects = [];

  for (let y = 0; y < img.height; y += step) {
    for (let x = 0; x < img.width; x += step) {
      const idx = (y * img.width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      if (a < 10) continue;

      const brightness = (r + g + b) / 3;
      const isWalkable = brightness > 90 && brightness < 190;
      if (!isWalkable) {
        rects.push({
          x: x * scaleX,
          y: y * scaleY,
          w: step * scaleX,
          h: step * scaleY
        });
      }
    }
  }

  // bottom open zone
  const openW = canvas.width * 0.22;
  const openH = canvas.height * 0.25;
  const openX = canvas.width / 2 - openW / 2;
  const openY = canvas.height - openH;

  let compiled = rects.filter(r => {
    const inOpen =
      r.x < openX + openW &&
      r.x + r.w > openX &&
      r.y < openY + openH &&
      r.y + r.h > openY;
    return !inOpen;
  });

  // sample manual stuff (you can move/remove these)
  compiled.push({ x: canvas.width * 0.12, y: canvas.height * 0.22, w: 55, h: 55 });
  compiled.push({ x: canvas.width * 0.72, y: canvas.height * 0.40, w: 60, h: 50 });
  compiled.push({ x: canvas.width * 0.38, y: canvas.height * 0.58, w: 130, h: 48 });
  compiled.push({ x: canvas.width * 0.05, y: canvas.height * 0.30, w: canvas.width * 0.26, h: 18 });
  compiled.push({ x: canvas.width * 0.62, y: canvas.height * 0.26, w: canvas.width * 0.30, h: 18 });

  // doorway
  const doorHole = {
    x: canvas.width * 0.47,
    y: canvas.height * 0.50,
    w: canvas.width * 0.08,
    h: canvas.height * 0.05
  };
  compiled = compiled.filter(r => !rectsOverlap(r, doorHole));

  collisionRects = compiled;
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

// ------------- game logic -------------
function placeDoor() {
  door = { x: canvas.width / 2 - 40, y: canvas.height - 120, active: false };
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
  if (hero && hero.currentWeapon === "flashlight") {
    pendingPickup = { x: hero.x + 80, y: hero.y - 40 };
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
  let dx = 0, dy = 0;
  if (keys.w || keys.ArrowUp) dy -= hero.speed;
  if (keys.s || keys.ArrowDown) dy += hero.speed;
  if (keys.a || keys.ArrowLeft) dx -= hero.speed;
  if (keys.d || keys.ArrowRight) dx += hero.speed;

  if (dx !== 0 || dy !== 0) hero.walkTime += 0.12;
  moveHeroWithCollisions(dx, dy);

  if (keys.mouseDown) tryFire(t);

  bullets = bullets.filter(b => {
    b.x += Math.cos(b.angle) * b.speed;
    b.y += Math.sin(b.angle) * b.speed;
    b.life--;
    return b.life > 0;
  });

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

  zombies.forEach(z => {
    if (z.dying) {
      z.dieTimer--;
    } else {
      const ang = Math.atan2(hero.y - z.y, hero.x - z.x);
      z.x += Math.cos(ang) * z.speed;
      z.y += Math.sin(ang) * z.speed;
      if (Math.hypot(hero.x - z.x, hero.y - z.y) < 22) {
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

  if (zombies.filter(z => !z.dying).length === 0) {
    door.active = true;
  }

  const nearPickup = pendingPickup && Math.hypot(hero.x - pendingPickup.x, hero.y - pendingPickup.y) < 40;
  const nearDoor = door && door.active && Math.hypot(hero.x - (door.x + 40), hero.y - (door.y + 30)) < 50;
  if (nearPickup || nearDoor) {
    interactBox.classList.remove("hidden");
  } else {
    interactBox.classList.add("hidden");
  }

  hudHp.textContent = "HP: " + Math.ceil(hero.hp);
}

function isBlockedPoint(px, py) {
  return (
    collisionRects.some(r => pointInRect(px, py, r)) ||
    paintedColliders.some(r => pointInRect(px, py, r))
  );
}

function moveHeroWithCollisions(dx, dy) {
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

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function tryFire(t) {
  const weap = weapons[hero.currentWeapon];
  if (!weap.canFire) return;
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

function tryInteract() {
  if (pendingPickup && Math.hypot(hero.x - pendingPickup.x, hero.y - pendingPickup.y) < 40) {
    hero.currentWeapon = "pistol";
    pendingPickup = null;
    hudItem.textContent = "Item: " + weapons[hero.currentWeapon].name;
    return;
  }
  if (door && door.active && Math.hypot(hero.x - (door.x + 40), hero.y - (door.y + 30)) < 50) {
    level++;
    hudLevel.textContent = "Zone: " + level;
    spawnZombies();
    door.active = false;
  }
}

// ------------- drawing -------------
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (bgImage.complete) {
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (DEBUG_COLLISIONS) drawCollisionDebug();
  drawDoor();
  drawZombies();
  drawBullets();
  drawHero();
  drawWeaponLight();
  drawPickup();
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
  // live drag preview
  if (dragStart) {
    const mx = hero.x; // not needed, leave blank
  }
  ctx.restore();
}

function drawDoor() {
  if (!door) return;
  ctx.fillStyle = door.active ? "rgba(34,197,94,0.9)" : "rgba(15,23,42,0.8)";
  ctx.fillRect(door.x, door.y, 80, 60);
}

function drawZombies() {
  zombies.forEach(z => {
    if (z.dying) {
      const p = z.dieTimer / 30;
      ctx.save();
      ctx.globalAlpha = p;
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(z.x, z.y - 8, 20 * p, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = "#14532d";
      ctx.fillRect(z.x - 12, z.y - 10, 24, 32);
      ctx.fillStyle = "#166534";
      ctx.beginPath();
      ctx.arc(z.x, z.y - 16, 10, 0, Math.PI * 2);
      ctx.fill();
    }
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

function drawHero() {
  const x = hero.x;
  const y = hero.y;
  const bob = Math.sin(hero.walkTime) * 1.5;

  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(x, y + 16, 16, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = hero.pants;
  ctx.fillRect(x - 6, y + 4, 5, 14);
  ctx.fillRect(x + 1, y + 4, 5, 14);

  ctx.fillStyle = hero.jacket;
  ctx.fillRect(x - 10, y - 8 + bob, 20, 18);

  ctx.fillStyle = hero.skin;
  ctx.beginPath();
  ctx.arc(x, y - 16 + bob, 8, 0, Math.PI * 2);
  ctx.fill();
}

function drawWeaponLight() {
  if (hero.currentWeapon === "flashlight") {
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

function drawPickup() {
  if (!pendingPickup) return;
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(pendingPickup.x - 14, pendingPickup.y - 8, 28, 16);
  ctx.fillStyle = "#fb7185";
  ctx.fillRect(pendingPickup.x - 4, pendingPickup.y - 3, 12, 6);
}

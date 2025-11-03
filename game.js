// Quarantine Streets v4
// apocalyptic map: buildings, burning cars, chests; player health; zombie damage; death anim; loot; attachments

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

let hero = null;
let selectedCharId = null;
let level = 1;
let tiles = [];
let zombies = [];
let bullets = [];
let muzzleFlashTimer = 0;
let door = null;
let gameOver = false;

const survivorPresets = [
  {
    id: "operator",
    name: "Zone Operator",
    role: "Armored",
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

const weapons = {
  flashlight: {
    name: "Flashlight",
    canFire: false,
  },
  pistol: {
    name: "9mm Pistol",
    canFire: true,
    fireRate: 280,
    bulletSpeed: 7,
    damage: 1,
    color: "rgba(252,76,2,1)",
    spread: 0
  }
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
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

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
  const saved = localStorage.getItem("qs_hero_v4");
  if (saved) {
    const data = JSON.parse(saved);
    hero = {
      ...data,
      x: canvas.width * 0.35,
      y: canvas.height * 0.55,
      angle: 0,
      speed: 2.2,
      walkTime: 0,
      currentWeapon: data.currentWeapon || "flashlight",
      hp: data.hp || 100,
      maxHp: 100,
      attachments: data.attachments || []
    };
    level = data.level || 1;
    hudName.textContent = hero.name;
    hudClass.textContent = hero.class;
    hudItem.textContent = "Item: " + weapons[hero.currentWeapon].name;
    hudLevel.textContent = "Zone: " + level;
    hudHp.textContent = "HP: " + hero.hp;
    charScreen.classList.remove("active");
    gameScreen.classList.add("active");
    generateLevel();
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
    x: canvas.width * 0.35,
    y: canvas.height * 0.55,
    angle: 0,
    speed: 2.3,
    walkTime: 0,
    currentWeapon: "flashlight",
    hp: 100,
    maxHp: 100,
    attachments: []
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
  generateLevel();
  requestAnimationFrame(gameLoop);
});

retryBtn.addEventListener("click", () => {
  deathScreen.classList.add("hidden");
  gameOver = false;
  hero.hp = hero.maxHp;
  generateLevel();
  requestAnimationFrame(gameLoop);
});

function saveHero() {
  localStorage.setItem(
    "qs_hero_v4",
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
      hp: hero.hp,
      attachments: hero.attachments
    })
  );
}

window.addEventListener("keydown", (e) => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = true;
  if (e.key === "e" || e.key === "E") {
    tryInteract();
  }
});
window.addEventListener("keyup", (e) => {
  if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});
canvas.addEventListener("mousedown", () => { keys.mouseDown = true; });
canvas.addEventListener("mouseup", () => { keys.mouseDown = false; });
canvas.addEventListener("mousemove", (e) => {
  if (!hero) return;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  hero.angle = Math.atan2(my - hero.y, mx - hero.x);
});

function generateLevel() {
  tiles = [];
  const cols = Math.ceil(canvas.width / 96);
  const rows = Math.ceil(canvas.height / 96);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let kind = "road";
      if (r === 0 || c === 0 || r === rows - 1 || c === cols - 1) {
        kind = "wall";
      } else {
        const roll = Math.random();
        if (roll < 0.08) kind = "building";
        else if (roll < 0.14) kind = "car";
        else if (roll < 0.18) kind = "chest";
        else kind = "road";
      }
      tiles.push({ x: c * 96, y: r * 96, kind, opened: false });
    }
  }

  zombies = [];
  const count = 5 + level * 2;
  for (let i = 0; i < count; i++) {
    zombies.push({
      x: canvas.width * (0.5 + Math.random() * 0.4),
      y: canvas.height * (0.2 + Math.random() * 0.5),
      hp: 1,
      phase: Math.random() * Math.PI * 2,
      speed: 0.35 + Math.random() * 0.2,
      dying: false,
      dieTimer: 0
    });
  }

  door = {
    x: canvas.width - 120,
    y: canvas.height * 0.5,
    active: false,
  };

  bullets = [];
}

function gameLoop(t) {
  if (gameOver) return;
  update(t);
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

  if (dx !== 0 || dy !== 0) {
    hero.walkTime += 0.12;
  } else {
    hero.walkTime *= 0.8;
  }

  hero.x += dx;
  hero.y += dy;
  hero.x = Math.max(40, Math.min(canvas.width - 40, hero.x));
  hero.y = Math.max(40, Math.min(canvas.height - 40, hero.y));

  if (keys.mouseDown) {
    tryFire(t);
  }

  bullets = bullets.filter((b) => {
    b.x += Math.cos(b.angle) * b.speed;
    b.y += Math.sin(b.angle) * b.speed;
    b.life -= 1;
    return b.life > 0;
  });

  bullets.forEach((b) => {
    zombies.forEach((z) => {
      if (!z.dying && z.hp > 0) {
        const d = Math.hypot(b.x - z.x, b.y - z.y);
        if (d < 18) {
          z.hp -= weapons[hero.currentWeapon].damage || 1;
          b.life = 0;
          if (z.hp <= 0) {
            z.dying = true;
            z.dieTimer = 30;
          }
        }
      }
    });
  });

  zombies.forEach((z) => {
    if (z.dying) {
      z.dieTimer -= 1;
    } else {
      const ang = Math.atan2(hero.y - z.y, hero.x - z.x);
      z.x += Math.cos(ang) * z.speed;
      z.y += Math.sin(ang) * z.speed;

      // bite player
      const d = Math.hypot(hero.x - z.x, hero.y - z.y);
      if (d < 22) {
        hero.hp -= 0.35; // damage
        if (hero.hp <= 0) {
          hero.hp = 0;
          hudHp.textContent = "HP: 0";
          gameOver = true;
          deathScreen.classList.remove("hidden");
        }
      }
    }
  });

  zombies = zombies.filter((z) => !z.dying || z.dieTimer > 0);

  if (zombies.filter((z) => !z.dying).length === 0) {
    door.active = true;
  }

  const nearChest = tiles.find((t) => t.kind === "chest" && !t.opened && dist(hero.x, hero.y, t.x + 48, t.y + 48) < 45);
  const nearDoor = door && door.active && dist(hero.x, hero.y, door.x + 32, door.y + 32) < 45;
  if (nearChest || nearDoor) {
    interactBox.classList.remove("hidden");
  } else {
    interactBox.classList.add("hidden");
  }

  hudHp.textContent = "HP: " + Math.ceil(hero.hp);
  if (muzzleFlashTimer > 0) muzzleFlashTimer -= 16;
}

function dist(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx*dx + dy*dy);
}

function tryFire(t) {
  const weap = weapons[hero.currentWeapon];
  if (!weap.canFire) return;
  if (t - lastFire < weap.fireRate) return;
  lastFire = t;

  const spread = weap.spread || 0;
  const angle = hero.angle + (Math.random() * spread - spread / 2);

  bullets.push({
    x: hero.x + Math.cos(angle) * 20,
    y: hero.y + Math.sin(angle) * 20,
    angle: angle,
    speed: weap.bulletSpeed,
    life: 70,
  });
  muzzleFlashTimer = 90;
}

function tryInteract() {
  // chest
  const chest = tiles.find((t) => t.kind === "chest" && !t.opened && dist(hero.x, hero.y, t.x + 48, t.y + 48) < 45);
  if (chest) {
    chest.opened = true;
    // loot roll: bandage or attachment
    if (Math.random() < 0.6) {
      // bandage: heal 30
      hero.hp = Math.min(hero.maxHp, hero.hp + 30);
    } else {
      // attachment: improve pistol
      hero.attachments.push("improved-slide");
      if (hero.currentWeapon === "pistol") {
        weapons.pistol.fireRate = 200;
        weapons.pistol.damage = 1.3;
      }
    }
    saveHero();
    return;
  }

  // door
  if (door && door.active && dist(hero.x, hero.y, door.x + 32, door.y + 32) < 45) {
    level += 1;
    hudLevel.textContent = "Zone: " + level;
    generateLevel();
    saveHero();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawTiles();
  drawDoor();
  drawZombies();
  drawBullets();
  drawHero();
  drawLightOrLaser();
}

function drawBackground() {
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawTiles() {
  tiles.forEach((t) => {
    if (t.kind === "road") {
      ctx.fillStyle = "#111827";
      ctx.fillRect(t.x, t.y, 96, 96);
      ctx.strokeStyle = "rgba(15,23,42,0.25)";
      ctx.strokeRect(t.x, t.y, 96, 96);
    } else if (t.kind === "building") {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(t.x, t.y, 96, 96);
      ctx.fillStyle = "rgba(148,163,184,0.12)";
      ctx.fillRect(t.x + 10, t.y + 10, 20, 14);
      ctx.fillRect(t.x + 40, t.y + 10, 20, 14);
      ctx.fillRect(t.x + 10, t.y + 36, 20, 14);
    } else if (t.kind === "car") {
      // burnt car
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(t.x + 10, t.y + 28, 70, 30);
      ctx.fillStyle = "#020617";
      ctx.fillRect(t.x + 18, t.y + 22, 40, 18);
      // fire
      const fx = t.x + 50;
      const fy = t.y + 28;
      const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, 35);
      g.addColorStop(0, "rgba(251,113,133,1)");
      g.addColorStop(1, "rgba(251,113,133,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(fx, fy, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(254,249,195,0.6)";
      ctx.beginPath();
      ctx.arc(fx, fy - 10, 12, 0, Math.PI * 2);
      ctx.fill();
    } else if (t.kind === "chest") {
      ctx.fillStyle = "#78350f";
      ctx.fillRect(t.x + 18, t.y + 28, 60, 36);
      if (t.opened) {
        ctx.strokeStyle = "rgba(254,243,199,0.5)";
        ctx.strokeRect(t.x + 18, t.y + 28, 60, 36);
      } else {
        ctx.fillStyle = "#f97316";
        ctx.fillRect(t.x + 43, t.y + 38, 10, 12);
      }
    } else if (t.kind === "wall") {
      ctx.fillStyle = "#020617";
      ctx.fillRect(t.x, t.y, 96, 96);
    }
  });
}

function drawDoor() {
  if (!door) return;
  ctx.fillStyle = door.active ? "#22c55e" : "#0f172a";
  ctx.fillRect(door.x, door.y, 64, 80);
  ctx.strokeStyle = door.active ? "rgba(34,197,94,0.7)" : "rgba(15,23,42,0.6)";
  ctx.strokeRect(door.x, door.y, 64, 80);
}

function drawZombies() {
  zombies.forEach((z) => {
    if (z.dying) {
      // death animation: fade/red flash + shrink
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
      ctx.fillStyle = "#1c7c45";
      ctx.fillRect(z.x - 20, z.y - 6, 8, 20);
      ctx.fillRect(z.x + 12, z.y - 6, 8, 20);
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
  bullets.forEach((b) => {
    ctx.strokeStyle = "rgba(252,252,252,0.6)";
    ctx.lineWidth = 2;
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

  ctx.fillStyle = "#7f1d1d";
  ctx.fillRect(x - 6, y - 2 + bob, 12, 10);

  const legOffset = Math.sin(hero.walkTime * 1.5) * 2;
  ctx.fillStyle = hero.pants;
  ctx.fillRect(x - 6 - legOffset, y + 4, 5, 14);
  ctx.fillRect(x + 1 + legOffset, y + 4, 5, 14);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(x - 6 - legOffset, y + 16, 6, 3);
  ctx.fillRect(x + 1 + legOffset, y + 16, 6, 3);

  ctx.fillStyle = hero.jacket;
  ctx.fillRect(x - 10, y - 8 + bob, 20, 18);

  ctx.fillStyle = hero.skin;
  ctx.beginPath();
  ctx.arc(x, y - 16 + bob, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#020617";
  ctx.fillRect(x - 4, y - 18 + bob, 2, 2);
  ctx.fillRect(x + 2, y - 18 + bob, 2, 2);

  if (hero.gear === "helmet") {
    ctx.fillStyle = "#f97316";
    ctx.fillRect(x - 9, y - 23 + bob, 18, 5);
  } else if (hero.gear === "hood") {
    ctx.fillStyle = hero.jacket;
    ctx.beginPath();
    ctx.arc(x, y - 16 + bob, 10, Math.PI, 0);
    ctx.fill();
  } else if (hero.gear === "cap") {
    ctx.fillStyle = "#fef9c3";
    ctx.fillRect(x - 8, y - 22 + bob, 16, 4);
    ctx.fillRect(x, y - 22 + bob, 8, 3);
  } else if (hero.gear === "goggles") {
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(x - 7, y - 19 + bob, 14, 3);
  }

  ctx.fillStyle = hero.jacket;
  ctx.fillRect(x - 12, y - 2 + Math.cos(hero.walkTime) * 2, 4, 10);
}

function drawLightOrLaser() {
  if (hero.currentWeapon === "flashlight") {
    drawFlashlight();
  } else {
    drawLaser();
  }
}

function drawFlashlight() {
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

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, -2, 12, 4);

  ctx.restore();
}

function drawLaser() {
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

  ctx.translate(handX, handY);
  ctx.rotate(hero.angle);
  ctx.fillStyle = "#020617";
  ctx.fillRect(0, -3, 16, 6);

  if (muzzleFlashTimer > 0) {
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(26, -3);
    ctx.lineTo(26, 3);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

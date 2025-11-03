// character creation and game with localStorage for persistence + better drawn character

const charScreen = document.getElementById("char-screen");
const gameScreen = document.getElementById("game-screen");
const startBtn = document.getElementById("start-btn");
const heroNameInput = document.getElementById("hero-name");
const heroClassSelect = document.getElementById("hero-class");
const charGrid = document.getElementById("character-grid");

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const hudName = document.getElementById("hud-name");
const hudClass = document.getElementById("hud-class");
const hudPos = document.getElementById("hud-pos");
const interactBox = document.getElementById("interact-box");

let hero = null;
let selectedCharId = null;

// survivor / soldier themed characters
const characterPresets = [
  {
    id: "scout-girl",
    name: "Scout",
    desc: "Quick survivor",
    bodyColor: "#f97316",
    trimColor: "#fde68a",
    faceColor: "#fed7aa",
    class: "scavenger",
    gear: "bandana"
  },
  {
    id: "urban-soldier",
    name: "Urban Soldier",
    desc: "Armored infantry",
    bodyColor: "#0ea5e9",
    trimColor: "#e2e8f0",
    faceColor: "#e2e8f0",
    class: "soldier",
    gear: "helmet"
  },
  {
    id: "field-medic",
    name: "Field Medic",
    desc: "Heals the squad",
    bodyColor: "#22c55e",
    trimColor: "#fef9c3",
    faceColor: "#ffe4e6",
    class: "medic",
    gear: "cap"
  },
  {
    id: "wasteland-hunter",
    name: "Hunter",
    desc: "Ranged survivor",
    bodyColor: "#eab308",
    trimColor: "#fef3c7",
    faceColor: "#fde68a",
    class: "ranger",
    gear: "goggles"
  }
];

// map settings
const mapCols = 25;
const mapRows = 15;
const tileSize = 32;
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

// render character cards
function renderCharacterCards() {
  charGrid.innerHTML = "";
  characterPresets.forEach((ch, idx) => {
    const card = document.createElement("div");
    card.className = "character-card" + (idx === 0 ? " selected" : "");
    if (idx === 0) selectedCharId = ch.id;

    const preview = document.createElement("div");
    preview.className = "char-preview";
    preview.style.background = ch.bodyColor;

    const title = document.createElement("div");
    title.textContent = ch.name;
    title.style.fontWeight = "600";
    title.style.fontSize = "0.75rem";

    const meta = document.createElement("div");
    meta.className = "char-meta";
    meta.textContent = ch.desc;

    card.appendChild(preview);
    card.appendChild(title);
    card.appendChild(meta);

    card.addEventListener("click", () => {
      selectedCharId = ch.id;
      document.querySelectorAll(".character-card").forEach((el) => el.classList.remove("selected"));
      card.classList.add("selected");
      heroClassSelect.value = ch.class;
    });

    charGrid.appendChild(card);
  });
}
renderCharacterCards();

// load from localStorage
(function loadSavedHero() {
  const saved = localStorage.getItem("miniAdventureHero");
  if (saved) {
    const data = JSON.parse(saved);
    hero = {
      ...data,
      x: 64,
      y: 64,
      speed: 2.2,
      width: 26,
      height: 26,
    };
    selectedCharId = data.presetId || characterPresets[0].id;
    hudName.textContent = hero.name;
    hudClass.textContent = "Class: " + hero.class;
    charScreen.classList.remove("active");
    gameScreen.classList.add("active");
    requestAnimationFrame(gameLoop);
  } else {
    charScreen.classList.add("active");
  }
})();

startBtn.addEventListener("click", () => {
  const nm = heroNameInput.value.trim() || "Hero";
  const cls = heroClassSelect.value;
  const preset = characterPresets.find((c) => c.id === selectedCharId) || characterPresets[0];

  hero = {
    name: nm,
    class: cls,
    presetId: preset.id,
    bodyColor: preset.bodyColor,
    trimColor: preset.trimColor,
    faceColor: preset.faceColor,
    gear: preset.gear,
    x: 64,
    y: 64,
    speed: 2.2,
    width: 26,
    height: 36, // a bit taller to draw a body
  };

  localStorage.setItem(
    "miniAdventureHero",
    JSON.stringify({
      name: hero.name,
      class: hero.class,
      presetId: hero.presetId,
      bodyColor: hero.bodyColor,
      trimColor: hero.trimColor,
      faceColor: hero.faceColor,
      gear: hero.gear,
    })
  );

  hudName.textContent = hero.name;
  hudClass.textContent = "Class: " + hero.class;

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
    alert("NPC: Hey " + hero.name + "! Stay safe out there, " + hero.class + "!");
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

  drawHero();
}

function drawHero() {
  const x = hero.x;
  const y = hero.y;

  // body
  ctx.fillStyle = hero.bodyColor || "#38bdf8";
  ctx.fillRect(x - 10, y - 14, 20, 22); // torso

  // legs
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(x - 10, y + 8, 8, 12);
  ctx.fillRect(x + 2, y + 8, 8, 12);

  // head
  ctx.fillStyle = hero.faceColor || "#ffe4c4";
  ctx.beginPath();
  ctx.arc(x, y - 22, 8, 0, Math.PI * 2);
  ctx.fill();

  // eyes
  ctx.fillStyle = "#020617";
  ctx.fillRect(x - 4, y - 24, 2, 2);
  ctx.fillRect(x + 2, y - 24, 2, 2);

  // gear
  if (hero.gear === "helmet") {
    ctx.fillStyle = hero.trimColor || "#e2e8f0";
    ctx.fillRect(x - 9, y - 30, 18, 6);
    ctx.fillRect(x - 9, y - 30, 3, 10);
    ctx.fillRect(x + 6, y - 30, 3, 10);
  } else if (hero.gear === "bandana") {
    ctx.fillStyle = hero.trimColor || "#ef4444";
    ctx.fillRect(x - 8, y - 26, 16, 4);
  } else if (hero.gear === "cap") {
    ctx.fillStyle = hero.trimColor || "#fef9c3";
    ctx.fillRect(x - 8, y - 29, 16, 5);
    ctx.fillRect(x, y - 29, 8, 3);
  } else if (hero.gear === "goggles") {
    ctx.fillStyle = hero.trimColor || "#fef3c7";
    ctx.fillRect(x - 7, y - 26, 14, 4);
  }

  // trim/armor
  if (hero.trimColor) {
    ctx.strokeStyle = hero.trimColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 10, y - 14, 20, 22);
  }

  // name
  ctx.fillStyle = "white";
  ctx.font = "12px system-ui";
  ctx.textAlign = "center";
  ctx.fillText(hero.name, x, y - 36);
}

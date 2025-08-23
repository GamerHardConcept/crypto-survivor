// WS: Fichier pour les classes et fonctions utilitaires

class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    add(v) {
        return new Vector(this.x + v.x, this.y + v.y);
    }

    subtract(v) {
        return new Vector(this.x - v.x, this.y - v.y);
    }

    multiply(s) {
        return new Vector(this.x * s, this.y * s);
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const mag = this.magnitude();
        return mag > 0 ? new Vector(this.x / mag, this.y / mag) : new Vector();
    }

    static distance(v1, v2) {
        return Math.sqrt(Math.pow(v1.x - v2.x, 2) + Math.pow(v1.y - v2.y, 2));
    }
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gameState.lastScreenWidth = canvas.width;
    gameState.lastScreenHeight = canvas.height;
    if (typeof draw === 'function') {
        draw(); // Redessine immédiatement après le redimensionnement
    }
}

function centerCameraOnPlayer() {
    if (!gameState.player) return;
    const targetZoom = 1; // On pourrait le rendre dynamique
    gameState.camera.zoom = targetZoom;
    gameState.camera.x = gameState.player.pos.x - (canvas.width / 2) / gameState.camera.zoom;
    gameState.camera.y = gameState.player.pos.y - (canvas.height / 2) / gameState.camera.zoom;
}

function worldToScreen(worldPos, camera) {
    const screenX = (worldPos.x - camera.x) * camera.zoom;
    const screenY = (worldPos.y - camera.y) * camera.zoom;
    return new Vector(screenX, screenY);
}

function screenToWorld(screenPos, camera) {
    const worldX = (screenPos.x / camera.zoom) + camera.x;
    const worldY = (screenPos.y / camera.zoom) + camera.y;
    return new Vector(worldX, worldY);
}

function drawGrid(ctx, camera) {
    const gridSize = 100 * camera.zoom;
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.1)';
    ctx.lineWidth = 1;

    const startX = -camera.x * camera.zoom % gridSize;
    const startY = -camera.y * camera.zoom % gridSize;

    for (let x = startX; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = startY; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function createFloatingText(text, pos, color, size, duration) {
    const ft = new FloatingText(text, pos, color, size, duration);
    gameState.floatingTexts.push(ft);
}
// --- Reset de l'état du jeu (safe defaults) ---
window.resetGameState = window.resetGameState || function () {
    // tableaux et entités
    window.players   = [];
    window.entities  = {
      enemies: [], projectiles: [], particles: [], floatingTexts: [],
      xpOrbs: [], healthPickups: [], soldiers: [], bonusUpgrades: []
    };
  
    // timers/état
    window.timers    = { game: 0 };
    window.gameTime  = 0;
    window.lastTime  = 0;
    window.activeMiniBoss = null;
    window.enemySpawnTimer = 0;
  
    // sélection/UP
    window.selectedUpgrades = [];
    window.selectedCharType = null;
  
    // statut général (sera mis à 'playing' par startGame)
    window.gameState = 'mainMenu';
  
    // petit nettoyage UI si présent
    if (dom?.displays?.weaponUI) dom.displays.weaponUI.innerHTML = '';
    if (typeof updateGameUI === 'function') updateGameUI();
  };
  // --- Calcule les bonus permanents achetés au shop ---
window.getPermanentBonuses = window.getPermanentBonuses || function () {
    const pu = window.permanentUpgrades || {};
    const sd = window.shopData || {};
  
    // additionne les bonus des niveaux déjà achetés
    function totalBonus(key) {
      const lvl = pu[key] || 0;
      const levels = (sd[key]?.levels) || [];
      let sum = 0;
      for (let i = 0; i < Math.min(lvl, levels.length); i++) {
        sum += levels[i].bonus;
      }
      return sum;
    }
  
    return {
      // mapping vers les noms attendus par Player (entities.js)
      damage:      totalBonus('perm_damage') || 0, // +x (ex: 0.16 -> +16%)
      health:      totalBonus('perm_hp')     || 0,
      xpGain:      totalBonus('perm_luck')   || 0, // on mappe "chance" à un bonus XP global
      attackSpeed: totalBonus('perm_speed')  || 0,
    };
  };
  // --- Gestion clavier minimale pour le joueur ---
window.inputManager = window.inputManager || {
    keys: new Set(),
    isDown(key) {
      // accepte maj/min et alias
      return this.keys.has(key) ||
             this.keys.has(key.toLowerCase()) ||
             this.keys.has(key.toUpperCase());
    },
    getAxis() {
      let x = 0, y = 0;
      if (this.isDown('ArrowLeft') || this.isDown('a')) x -= 1;
      if (this.isDown('ArrowRight')|| this.isDown('d')) x += 1;
      if (this.isDown('ArrowUp')   || this.isDown('w')) y -= 1;
      if (this.isDown('ArrowDown') || this.isDown('s')) y += 1;
      const m = Math.hypot(x, y);
      if (m > 0) { x /= m; y /= m; } // normalise diagonales
      return { x, y };
    }
  };
  
  window.initInput = window.initInput || function () {
    const im = window.inputManager;
    const down = (e) => im.keys.add(e.key);
    const up   = (e) => im.keys.delete(e.key);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
  
    // (optionnel) empêcher le scroll avec flèches/espace :
    // window.addEventListener('keydown', (e) => {
    //   if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    // }, { passive:false });
  };
  // Wrapper compat: createFloatingText(text, x, y, color)
window.createFloatingText = window.createFloatingText || function (text, x, y, color) {
    const colorValue = String(color).startsWith('var')
      ? getComputedStyle(document.documentElement).getPropertyValue(color.replace(/var\(|\)/g, ''))
      : color;
    window.entities?.floatingTexts?.push(new FloatingText(text, { x, y }, colorValue, /*size*/undefined, /*duration*/undefined));
  };
  // === INPUT MANAGER (clavier + joystick tactile) ===
window.inputManager = window.inputManager || {
    keys: { up:false, down:false, left:false, right:false },
  
    handleKey(key, isDown) {
      switch (key.toLowerCase()) {
        case 'arrowup': case 'z': case 'w': this.keys.up = isDown; break;
        case 'arrowdown': case 's':        this.keys.down = isDown; break;
        case 'arrowleft': case 'q': case 'a': this.keys.left = isDown; break;
        case 'arrowright': case 'd':       this.keys.right = isDown; break;
        default: break;
      }
    },
  
    // Joystick virtuel attendu par entities.js (inputX / inputY)
    joystick: {
      container: null,
      handle: null,
      active: false, touchId: null, radius: 60,
      inputX: 0, inputY: 0, centerX: 0, centerY: 0,
  
      _setEls(container, handle) {
        this.container = container;
        this.handle = handle;
      },
      start(e) {
        e.preventDefault();
        if (!this.container || !this.handle) return;
        if (this.touchId !== null) return;
        const t = e.changedTouches[0];
        this.touchId = t.identifier;
        this.active = true;
        this.container.style.display = 'block';
        this.centerX = t.clientX; this.centerY = t.clientY;
        this.container.style.left = `${this.centerX - this.radius}px`;
        this.container.style.top  = `${this.centerY - this.radius}px`;
      },
      move(e) {
        e.preventDefault();
        if (!this.active) return;
        const t = Array.from(e.changedTouches).find(tt => tt.identifier === this.touchId);
        if (!t) return;
        const dx = t.clientX - this.centerX;
        const dy = t.clientY - this.centerY;
        const dist = Math.hypot(dx, dy);
        const ang = Math.atan2(dy, dx);
        const clamped = Math.min(dist, this.radius);
        this.inputX = Math.cos(ang) * (clamped / this.radius);
        this.inputY = Math.sin(ang) * (clamped / this.radius);
        this.handle.style.transform =
          `translate(-50%, -50%) translate(${this.inputX * this.radius}px, ${this.inputY * this.radius}px)`;
      },
      end(e) {
        if (Array.from(e.changedTouches).some(tt => tt.identifier === this.touchId)) {
          this.active = false; this.touchId = null;
          this.inputX = 0; this.inputY = 0;
          if (this.handle) this.handle.style.transform = 'translate(-50%, -50%)';
          if (this.container) this.container.style.display = 'none';
        }
      }
    }
  };
  
  // Initialise les listeners clavier + tactile
  window.initInput = window.initInput || function initInput() {
    // clavier
    window.addEventListener('keydown', (e) => window.inputManager.handleKey(e.key, true));
    window.addEventListener('keyup',   (e) => window.inputManager.handleKey(e.key, false));
  
    // joystick (si présent dans le DOM)
    const jc = document.getElementById('joystick-container');
    const jh = document.getElementById('joystick-handle');
    if (jc && jh) {
      window.inputManager.joystick._setEls(jc, jh);
      const js = window.inputManager.joystick;
      const opts = { passive: false };
      const canvas = document.getElementById('game-canvas') || document.body;
      canvas.addEventListener('touchstart', (e) => js.start(e), opts);
      canvas.addEventListener('touchmove',  (e) => js.move(e),  opts);
      canvas.addEventListener('touchend',   (e) => js.end(e));
      canvas.addEventListener('touchcancel',(e) => js.end(e));
    }
  };
  
  

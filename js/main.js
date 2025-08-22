// --- VARIABLES GLOBALES ---
let canvas, ctx;
let players = [];
let entities = {
    projectiles: [],
    enemies: [],
    xpOrbs: [],
    particles: [],
    magnets: [],
    healthPickups: [],
    floatingTexts: [],
    bonusUpgrades: [],
    soldiers: [],
    pentagrams: []
};
let timers = {
    game: 0,
    enemySpawn: 0,
    magnetSpawn: 0,
    healthSpawn: 0,
};
let armyAttackTimers = {
    wave: 0,
    waveCount: 0
};
let camera = { x: 0, y: 0 };
let zoomFactor = 1.0;
let lastTime = 0;
let animationFrameId = null;
let gameState = 'mainMenu'; // mainMenu, running, paused, gameOver, levelUp, shop, charSelect
let gameMode = 'survivor'; // survivor, armyAttack
let activeMiniBoss = null;
let selectedUpgrades = [];
let selectedMap = 'quadrant_4p'; // 'quadrant_4p' or 'vertical_2p'

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    loadGameState(); // Charger les données au démarrage
    updateZoom();
    resizeCanvas();
    setupEventListeners();
    setupCharacterSelection();
    displayShop();
    showScreen('mainMenu');
    audioManager.playMusic('menu');
}

function setupEventListeners() {
    window.addEventListener('resize', resizeCanvas);

    // --- BOUTONS MENU PRINCIPAL ---
    dom.buttons.start.addEventListener('click', () => showScreen('charSelect'));
    dom.buttons.shop.addEventListener('click', () => {
        displayShop();
        showScreen('shop');
    });
    dom.buttons.multiplayer.addEventListener('click', () => showScreen('multiplayerModeSelect'));

    // --- BOUTONS AUTRES ECRANS ---
    dom.buttons.backToMenu.forEach(btn => {
        btn.addEventListener('click', () => {
            showScreen('mainMenu');
            audioManager.playMusic('menu');
        });
    });
    dom.buttons.armyAttack.addEventListener('click', () => showScreen('multiplayerLobby'));
    dom.buttons.backToModeSelect.addEventListener('click', () => showScreen('multiplayerModeSelect'));
    dom.buttons.backToLobby.addEventListener('click', () => showScreen('multiplayerLobby'));

    // --- BOUTONS EN JEU ---
    dom.buttons.pause.addEventListener('click', togglePause);
    dom.buttons.resume.addEventListener('click', togglePause);
    dom.buttons.restart.addEventListener('click', () => startGame(players[0].charType));
    dom.buttons.mainMenuFromPause.addEventListener('click', () => showScreen('confirmQuit'));
    dom.buttons.quitYes.addEventListener('click', () => {
        showScreen('mainMenu');
        audioManager.playMusic('menu');
    });
    dom.buttons.quitNo.addEventListener('click', () => showScreen('pause'));
    dom.buttons.specialAbility.addEventListener('click', () => players[0]?.useSpecial());
    dom.buttons.confirmUpgrade.addEventListener('click', () => {
        selectedUpgrades.forEach(option => applyUpgrade(option));
        gameState = 'running';
        lastTime = performance.now();
        showScreen(null);
        updateAllUI();
        requestAnimationFrame(gameLoop);
    });

    // --- GESTION DES ENTREES ---
    window.addEventListener('keydown', (e) => inputManager.handleKey(e.key, true));
    window.addEventListener('keyup', (e) => inputManager.handleKey(e.key, false));
    canvas.addEventListener('touchstart', (e) => inputManager.joystick.start(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => inputManager.joystick.move(e), { passive: false });
    canvas.addEventListener('touchend', (e) => inputManager.joystick.end(e));
    canvas.addEventListener('touchcancel', (e) => inputManager.joystick.end(e));
}

function updateZoom() {
    if (window.innerWidth < 768) {
        zoomFactor = 1.5; 
    } else {
        zoomFactor = 1.0; 
    }
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    updateZoom();
}

function togglePause() {
    if (gameState === 'running') {
        gameState = 'paused';
        showScreen('pause');
    } else if (gameState === 'paused') {
        gameState = 'running';
        lastTime = performance.now(); // Pour éviter un saut de temps
        showScreen(null);
        requestAnimationFrame(gameLoop);
    }
}

function startGame(charType) {
    gameMode = 'survivor';
    resetGameState(charType);
    audioManager.playMusic('game');

    showScreen(null);
    dom.gameHud.classList.remove('hidden');
    
    updateAllUI();
    
    gameState = 'running';
    lastTime = performance.now();
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(gameLoop);
}

function endGame() {
    gameState = 'gameOver';
    audioManager.playMusic('gameOver');
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    const humanPlayer = players[0];
    globalWallet += humanPlayer.wallet;
    saveGameState();
    
    dom.displays.finalTime.textContent = formatTime(timers.game);
    dom.displays.finalLevel.textContent = humanPlayer.level;
    dom.displays.finalGain.textContent = humanPlayer.wallet;
    
    showScreen('gameOver');
}

function resetGameState(charType) {
    const player = new Player(charType, 1);
    players = [player];

    player.x = WORLD_WIDTH / 2;
    player.y = WORLD_HEIGHT / 2;
    
    Object.keys(entities).forEach(key => entities[key] = []);
    Object.keys(timers).forEach(key => timers[key] = 0);
    
    activeMiniBoss = null;
    spawnBonusUpgrade();
}

function gameLoop(timestamp) {
    if (gameState !== 'running') {
        if (gameState === 'levelUp' || gameState === 'paused') {
            draw(); // Continue de dessiner pour l'effet de fond
        }
        return;
    };

    const dt = timestamp - lastTime;
    lastTime = timestamp;

    update(dt);
    draw();
    
    animationFrameId = requestAnimationFrame(gameLoop);
}

function update(dt) {
    const humanPlayer = players[0];
    timers.game += dt / 1000;
    timers.enemySpawn += dt;
    timers.magnetSpawn += dt;
    timers.healthSpawn += dt;
    
    if (timers.enemySpawn > ENEMY_BASE_SPAWN_RATE) {
        spawnEnemyWave();
        timers.enemySpawn = 0;
    }
    if (timers.magnetSpawn > MAGNET_SPAWN_RATE) {
        entities.magnets.push(new Magnet(camera.x + Math.random() * canvas.width, camera.y + Math.random() * canvas.height));
        timers.magnetSpawn = 0;
    }
    if (timers.healthSpawn > HEALTH_SPAWN_RATE) {
        entities.healthPickups.push(new HealthPickup(camera.x + Math.random() * canvas.width, camera.y + Math.random() * canvas.height));
        timers.healthSpawn = 0;
    }

    humanPlayer.update(dt);
    updateCamera();
    Object.values(entities).flat().forEach(e => e.update(dt));

    handleCollisions();
    
    Object.keys(entities).forEach(key => {
        entities[key] = entities[key].filter(e => e.lifespan === undefined || e.lifespan > 0);
    });
    entities.enemies = entities.enemies.filter(e => e.hp > 0);

    updateHud();

    if (humanPlayer.hp <= 0) {
        endGame();
    }
}

function draw() {
    const humanPlayer = players[0];
    if (!humanPlayer) return;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.scale(1 / zoomFactor, 1 / zoomFactor);
    ctx.translate(-camera.x, -camera.y);

    drawWorldBackground();
    
    Object.values(entities).flat().forEach(e => e.draw());
    players.forEach(p => {
        if (p.hp > 0) p.draw();
    });

    ctx.restore();
    
    drawMinimap();
}

function updateCamera() {
    const humanPlayer = players[0];
    if (!humanPlayer) return;

    const viewWidth = canvas.width * zoomFactor;
    const viewHeight = canvas.height * zoomFactor;

    camera.x = humanPlayer.x - viewWidth / 2;
    camera.y = humanPlayer.y - viewHeight / 2;
    
    camera.x = Math.max(0, Math.min(WORLD_WIDTH - viewWidth, camera.x));
    camera.y = Math.max(0, Math.min(WORLD_HEIGHT - viewHeight, camera.y));
}

function handleCollisions() {
    const humanPlayer = players[0];
    if (!humanPlayer) return;

    // Projectile vs Enemy
    for (let p of entities.projectiles) {
        if (p.lifespan <= 0 || p instanceof LaserBeam) continue;
        for (let e of entities.enemies) {
            if (e.hp > 0 && Math.hypot(p.x - e.x, p.y - e.y) < p.radius + e.radius) {
                e.takeDamage(p.damage);
                if (p.onHit) p.onHit();
                if (p.pierce > 0) p.pierce--;
                else p.lifespan = 0;
                if (p.lifespan <= 0) break;
            }
        }
    }
    
    // Player vs Enemy
    for (let e of entities.enemies) {
        if (Math.hypot(humanPlayer.x - e.x, humanPlayer.y - e.y) < humanPlayer.radius + e.radius) {
            humanPlayer.takeDamage(e.damage);
        }
    }
    
    // Player vs Pickups
    for (let i = entities.xpOrbs.length - 1; i >= 0; i--) {
        const orb = entities.xpOrbs[i];
        if (Math.hypot(humanPlayer.x - orb.x, humanPlayer.y - orb.y) < humanPlayer.pickupRadius) {
            audioManager.play('collect');
            humanPlayer.gainXp(orb.value);
            entities.xpOrbs.splice(i, 1);
        }
    }
    
    for (let i = entities.magnets.length - 1; i >= 0; i--) {
        const magnet = entities.magnets[i];
        if (Math.hypot(humanPlayer.x - magnet.x, humanPlayer.y - magnet.y) < humanPlayer.radius + magnet.radius) {
            entities.xpOrbs.forEach(orb => orb.isAttracted = true);
            entities.magnets.splice(i, 1);
        }
    }

    for (let i = entities.healthPickups.length - 1; i >= 0; i--) {
        const pickup = entities.healthPickups[i];
        if (Math.hypot(humanPlayer.x - pickup.x, humanPlayer.y - pickup.y) < humanPlayer.radius + pickup.radius) {
            humanPlayer.hp = Math.min(humanPlayer.maxHp, humanPlayer.hp + pickup.healAmount);
            audioManager.play('healthPickup');
            createFloatingText(`+${pickup.healAmount} HP`, humanPlayer.x, humanPlayer.y, 'var(--health-color)');
            entities.healthPickups.splice(i, 1);
        }
    }

    for (let i = entities.bonusUpgrades.length - 1; i >= 0; i--) {
        const bonus = entities.bonusUpgrades[i];
        if (Math.hypot(humanPlayer.x - bonus.x, humanPlayer.y - bonus.y) < humanPlayer.radius + bonus.radius) {
            audioManager.play('healthPickup');
            humanPlayer.extraUpgradeCharges++;
            createFloatingText('+1 Amélioration!', humanPlayer.x, humanPlayer.y, 'gold');
            entities.bonusUpgrades.splice(i, 1);
        }
    }
}

function spawnEnemyWave() {
    const gameTimeInSeconds = timers.game;
    const waveData = getWaveData(gameTimeInSeconds);

    for (let i = 0; i < waveData.count; i++) {
        const enemyType = waveData.types[Math.floor(Math.random() * waveData.types.length)];
        const spawnPos = getOffscreenPosition();
        const enemy = new Enemy(spawnPos.x, spawnPos.y, enemyType);
        entities.enemies.push(enemy);
    }

    if (waveData.boss) {
        const spawnPos = getOffscreenPosition();
        activeMiniBoss = new MiniBoss(spawnPos.x, spawnPos.y, waveData.boss);
        entities.enemies.push(activeMiniBoss);
    }
}

function spawnBonusUpgrade() {
    const x = Math.random() * WORLD_WIDTH;
    const y = Math.random() * WORLD_HEIGHT;
    entities.bonusUpgrades.push(new BonusUpgrade(x, y));
}

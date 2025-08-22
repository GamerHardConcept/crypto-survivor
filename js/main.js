// WS: Fichier principal pour l'initialisation et la boucle de jeu

let lastTime = 0;
let animationFrameId;

function initGame() {
    loadGameData();
    showScreen('main-menu');
    updateShop();
    populateCharacterSelection();
    setupEventListeners();
    resizeCanvas();
}

function startGame(charId) {
    resetGameState();
    gameState.player = new Player(GAME_WIDTH / 2, GAME_HEIGHT / 2, charId);
    gameState.entities.push(gameState.player);
    
    // Appliquer les améliorations permanentes
    for(const id in saveData.permanentUpgrades) {
        const level = saveData.permanentUpgrades[id];
        const upgrade = permanentUpgrades.find(u => u.id === id);
        if(upgrade) {
            upgrade.apply(gameState.player, level);
        }
    }

    showScreen('game');
    gameState.isGameRunning = true;
    gameState.gameTime = 0;
    lastTime = 0;
    audioManager.playMusic('game');
    gameLoop(0);
}

function resetGameState() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    Object.assign(gameState, {
        isGameRunning: false,
        isPaused: false,
        isGameOver: false,
        gameTime: 0,
        killCount: 0,
        player: null,
        enemies: [],
        projectiles: [],
        xpOrbs: [],
        pickups: [],
        particles: [],
        floatingTexts: [],
        entities: [],
        camera: {
            pos: new Vector(0, 0),
            zoom: 1.0
        },
        enemySpawnTimer: 0,
        pentagram: null,
        pentagramCharge: 0,
        pentagramMaxCharge: 100,
    });
}

function gameLoop(timestamp) {
    if (!gameState.isGameRunning) return;
    if (gameState.isPaused) return;

    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    if (dt > 0.1) return; // Empêcher les sauts de temps

    gameState.gameTime += dt;

    // --- UPDATE --- 
    updateAll(dt);

    // --- DRAW ---
    drawAll();

    animationFrameId = requestAnimationFrame(gameLoop);
}

function updateAll(dt) {
    // Mise à jour de toutes les entités
    gameState.entities.forEach(e => e.update(dt));

    // Gestion des collisions
    checkCollisions();

    // Nettoyage des entités marquées pour suppression
    gameState.entities = gameState.entities.filter(e => !e.shouldBeRemoved);
    gameState.enemies = gameState.enemies.filter(e => !e.shouldBeRemoved);
    gameState.projectiles = gameState.projectiles.filter(p => !p.shouldBeRemoved);
    gameState.xpOrbs = gameState.xpOrbs.filter(o => !o.shouldBeRemoved);
    gameState.pickups = gameState.pickups.filter(p => !p.shouldBeRemoved);
    gameState.particles = gameState.particles.filter(p => !p.shouldBeRemoved);
    gameState.floatingTexts = gameState.floatingTexts.filter(ft => !ft.shouldBeRemoved);

    // Apparition des ennemis
    spawnEnemies(dt);

    // Mise à jour de la caméra
    centerCameraOnPlayer();

    // Mise à jour de l'interface
    updateHUD();
    updateSpecialAbilityButton();
}

function drawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    // Appliquer la transformation de la caméra
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(gameState.camera.zoom, gameState.camera.zoom);
    ctx.translate(-gameState.camera.pos.x, -gameState.camera.pos.y);

    // Dessiner la grille
    drawGrid(ctx, gameState.camera, canvas);

    // Dessiner les entités
    gameState.entities.forEach(e => e.draw(ctx, gameState.camera));
    gameState.floatingTexts.forEach(ft => ft.draw(ctx, gameState.camera));

    ctx.restore();
}

function checkCollisions() {
    // Projectiles alliés vs Ennemis
    gameState.projectiles.forEach(p => {
        if (p.shouldBeRemoved || p.isAllyProjectile === false) return;
        gameState.enemies.forEach(e => {
            if (e.shouldBeRemoved) return;
            if (Vector.distance(p.pos, e.pos) < p.radius + e.radius) {
                e.takeDamage(p.damage);
                p.shouldBeRemoved = true;
            }
        });
    });

    // Ennemis vs Joueur
    gameState.enemies.forEach(e => {
        if (e.shouldBeRemoved || !gameState.player) return;
        if (Vector.distance(e.pos, gameState.player.pos) < e.radius + gameState.player.radius) {
            gameState.player.takeDamage(e.damage);
        }
    });

    // Joueur vs Orbes d'XP
    gameState.xpOrbs.forEach(orb => {
        if (orb.shouldBeRemoved || !gameState.player) return;
        if (Vector.distance(orb.pos, gameState.player.pos) < gameState.player.pickupRadius) {
            gameState.player.gainXP(orb.value);
            orb.shouldBeRemoved = true;
        }
    });

    // Joueur vs Pickups
    gameState.pickups.forEach(pickup => {
        if (pickup.shouldBeRemoved || !gameState.player) return;
        if (Vector.distance(pickup.pos, gameState.player.pos) < gameState.player.pickupRadius) {
            if (pickup instanceof HealthPickup) {
                gameState.player.health = Math.min(gameState.player.maxHealth, gameState.player.health + pickup.healAmount);
            }
            pickup.shouldBeRemoved = true;
        }
    });
}

function spawnEnemies(dt) {
    gameState.enemySpawnTimer -= dt;
    if (gameState.enemySpawnTimer <= 0) {
        const wave = waves[Math.min(waves.length - 1, Math.floor(gameState.gameTime / 30))];
        gameState.enemySpawnTimer = wave.interval;

        for (let i = 0; i < wave.count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.max(canvas.width, canvas.height) / gameState.camera.zoom;
            const x = gameState.player.pos.x + Math.cos(angle) * radius;
            const y = gameState.player.pos.y + Math.sin(angle) * radius;

            const enemyType = wave.types[Math.floor(Math.random() * wave.types.length)];
            let enemy;
            if (enemyType === 'tank') {
                enemy = new TankEnemy(x, y);
            } else if (enemyType === 'miniboss') {
                enemy = new MiniBoss(x, y);
            } else {
                enemy = new Enemy(x, y, 12, 'red', 100, 80, 10, 10);
            }
            gameState.enemies.push(enemy);
            gameState.entities.push(enemy);
        }
    }
}

function setupEventListeners() {
    // Commandes du joueur
    document.addEventListener('keydown', e => {
        if (!gameState.player) return;
        if (e.key === 'w' || e.key === 'ArrowUp') gameState.player.input.y = -1;
        if (e.key === 's' || e.key === 'ArrowDown') gameState.player.input.y = 1;
        if (e.key === 'a' || e.key === 'ArrowLeft') gameState.player.input.x = -1;
        if (e.key === 'd' || e.key === 'ArrowRight') gameState.player.input.x = 1;
    });
    document.addEventListener('keyup', e => {
        if (!gameState.player) return;
        if ((e.key === 'w' || e.key === 'ArrowUp') && gameState.player.input.y === -1) gameState.player.input.y = 0;
        if ((e.key === 's' || e.key === 'ArrowDown') && gameState.player.input.y === 1) gameState.player.input.y = 0;
        if ((e.key === 'a' || e.key === 'ArrowLeft') && gameState.player.input.x === -1) gameState.player.input.x = 0;
        if ((e.key === 'd' || e.key === 'ArrowRight') && gameState.player.input.x === 1) gameState.player.input.x = 0;
    });

    // --- Boutons des Menus ---
    // Menu Principal
    // WS: Correction du nom de l'écran pour correspondre à l'ID HTML
    document.getElementById('start-game-button').addEventListener('click', () => showScreen('character-selection-screen'));
    document.getElementById('shop-button').addEventListener('click', () => showScreen('shop'));
    document.getElementById('multiplayer-button').addEventListener('click', () => showScreen('multiplayer-mode'));

    // Boutique
    document.getElementById('back-to-menu-button').addEventListener('click', () => showScreen('main-menu'));

    // Sélection Personnage
    document.getElementById('back-to-menu-from-char-select-button').addEventListener('click', () => showScreen('main-menu'));

    // Sélection Mode Multijoueur
    document.getElementById('army-attack-button').addEventListener('click', () => showScreen('multiplayer-lobby'));
    document.getElementById('back-to-menu-from-mode-select-button').addEventListener('click', () => showScreen('main-menu'));

    // Lobby Multijoueur
    document.getElementById('back-to-menu-from-lobby-button').addEventListener('click', () => showScreen('multiplayer-mode'));

    // --- Boutons en jeu ---
    document.getElementById('pause-button').addEventListener('click', () => {
        gameState.isPaused = true;
        showScreen('pause');
    });
    document.getElementById('special-ability-button').addEventListener('click', () => {
        if (gameState.player) {
            gameState.player.activateSpecial();
        }
    });

    // --- Boutons des écrans modaux ---
    // Pause
    document.getElementById('resume-button').addEventListener('click', () => {
        gameState.isPaused = false;
        showScreen('game');
        gameLoop(lastTime); // Reprendre la boucle
    });
    document.getElementById('main-menu-from-pause-button').addEventListener('click', () => showScreen('confirm-quit'));
    
    // Confirmation Quitter
    document.getElementById('confirm-quit-yes-button').addEventListener('click', () => {
        resetGameState();
        showScreen('main-menu');
    });
    document.getElementById('confirm-quit-no-button').addEventListener('click', () => showScreen('pause'));

    // Game Over
    document.getElementById('restart-button').addEventListener('click', () => {
        resetGameState();
        showScreen('main-menu');
    });

    // Redimensionnement de la fenêtre
    window.addEventListener('resize', resizeCanvas);
    
    // Initialisation audio au premier clic
    document.body.addEventListener('click', initializeAudio, { once: true });

    // --- Logique Multijoueur ---
    const socket = io();

    document.getElementById('create-game-button').addEventListener('click', () => {
        const playerName = document.getElementById('player-name-input').value || 'Player';
        socket.emit('createGame', { playerName });
    });

    document.getElementById('join-game-button').addEventListener('click', () => {
        const playerName = document.getElementById('player-name-input').value || 'Player';
        const gameId = document.getElementById('game-id-input').value;
        if (gameId) {
            socket.emit('joinGame', { playerName, gameId });
        }
    });

    socket.on('gameCreated', (game) => {
        // console.log('Partie créée:', game);
        updateWaitingRoom(game);
        showScreen('waiting-room');
    });

    socket.on('gameJoined', (game) => {
        // console.log('Partie rejointe:', game);
        updateWaitingRoom(game);
        showScreen('waiting-room');
    });

    socket.on('playerJoined', (game) => {
        // console.log('Un joueur a rejoint:', game);
        updateWaitingRoom(game);
    });

    socket.on('gameError', (message) => {
        alert('Erreur: ' + message);
    });
}

// Point d'entrée
window.onload = initGame;

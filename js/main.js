document.addEventListener('DOMContentLoaded', () => {

    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
         
            // --- Fonctions utilitaires ---

            function getQuadrantBoundaries(quadrantId) {
                const halfW = canvas.width / 2;
                const halfH = canvas.height / 2;
                switch (quadrantId) {
                    case 1: return { minX: 0, minY: 0, maxX: halfW, maxY: halfH };
                    case 2: return { minX: halfW, minY: 0, maxX: canvas.width, maxY: halfH };
                    case 3: return { minX: 0, minY: halfH, maxX: halfW, maxY: canvas.height };
                    case 4: return { minX: halfW, minY: halfH, maxX: canvas.width, maxY: canvas.height };
                    default: return { minX: 0, minY: 0, maxX: canvas.width, maxY: canvas.height }; // Pour les boss
                }
            }

            function spawnEnemy(tier = 0, quadrant) {
                const bounds = getQuadrantBoundaries(quadrant);
                const edge = Math.floor(Math.random() * 4);
                let x, y;
                switch (edge) {
                    case 0: x = bounds.minX; y = Math.random() * (bounds.maxY - bounds.minY) + bounds.minY; break; // Gauche
                    case 1: x = bounds.maxX; y = Math.random() * (bounds.maxY - bounds.minY) + bounds.minY; break; // Droite
                    case 2: y = bounds.minY; x = Math.random() * (bounds.maxX - bounds.minX) + bounds.minX; break; // Haut
                    case 3: y = bounds.maxY; x = Math.random() * (bounds.maxX - bounds.minX) + bounds.minX; break; // Bas
                }
                
                const enemyType = Math.random() < 0.1 ? TankEnemy : Enemy;
                entities.enemies.push(new enemyType(tier, x, y, quadrant));
            }
            
            function spawnMiniBoss(tier, isDemiBoss = false) {
                const x = canvas.width / 2;
                const y = canvas.height / 2;
                const boss = new MiniBoss(tier, x, y, 0, isDemiBoss);
                entities.enemies.push(boss);
                activeMiniBoss = boss;
                audioManager.playMusic('boss');
            }

            function spawnBonusUpgrade() {
                const humanPlayer = players[0];
                if (!humanPlayer) return;
                const angle = Math.random() * Math.PI * 2;
                const dist = 200;
                const x = humanPlayer.x + Math.cos(angle) * dist;
                const y = humanPlayer.y + Math.sin(angle) * dist;
                entities.healthPickups.push(new HealthPickup(x, y));
            }

            function createFloatingText(text, x, y, color) {
                entities.floatingTexts.push({
                    text, x, y, color,
                    lifespan: 1000,
                    opacity: 1
                });
            }

            function checkCollisions() {
                const humanPlayer = players[0];
                if (!humanPlayer) return;

                // Ennemis vs Joueur
                entities.enemies.forEach(enemy => {
                    if (Math.hypot(humanPlayer.x - enemy.x, humanPlayer.y - enemy.y) < humanPlayer.radius + enemy.radius) {
                        humanPlayer.takeDamage(enemy.damage);
                    }
                });
                
                 // Ennemis vs Bots
                for (let i = 1; i < players.length; i++) {
                    const bot = players[i];
                    if (bot.hp <= 0) continue;
                    entities.enemies.forEach(enemy => {
                        if (enemy.quadrant === bot.playerId && Math.hypot(bot.x - enemy.x, bot.y - enemy.y) < bot.radius + enemy.radius) {
                            bot.takeDamage(enemy.damage);
                        }
                    });
                }

                // Projectiles vs Ennemis
                entities.projectiles.forEach(p => {
                    entities.enemies.forEach(e => {
                        if (p.lifespan > 0 && e.hp > 0 && Math.hypot(p.x - e.x, p.y - e.y) < p.radius + e.radius) {
                            e.takeDamage(p.damage);
                            if (p.onHit) p.onHit(e);
                            p.pierce--;
                            if (p.pierce < 0) p.lifespan = 0;
                        }
                    });
                });

                // Orbes d'XP vs Joueur
                entities.xpOrbs.forEach((orb, index) => {
                    if (Math.hypot(humanPlayer.x - orb.x, humanPlayer.y - orb.y) < humanPlayer.radius) {
                        humanPlayer.gainXp(orb.value);
                        entities.xpOrbs.splice(index, 1);
                    }
                });
                
                // Soin vs Joueur
                entities.healthPickups.forEach((pickup, index) => {
                     if (Math.hypot(humanPlayer.x - pickup.x, humanPlayer.y - pickup.y) < humanPlayer.radius) {
                        humanPlayer.hp = Math.min(humanPlayer.maxHp, humanPlayer.hp + pickup.healAmount);
                        audioManager.play('powerUp');
                        createFloatingText(`+${pickup.healAmount} HP`, humanPlayer.x, humanPlayer.y, 'lime');
                        entities.healthPickups.splice(index, 1);
                    }
                });
            }

            function cleanupEntities() {
                entities.enemies = entities.enemies.filter(e => e.hp > 0);
                entities.projectiles = entities.projectiles.filter(p => p.lifespan > 0);
                entities.particles = entities.particles.filter(p => p.lifespan > 0);
                entities.floatingTexts = entities.floatingTexts.filter(t => t.opacity > 0);
                entities.xpOrbs = entities.xpOrbs.filter(orb => Math.hypot(players[0].x - orb.x, players[0].y - orb.y) < canvas.width); // Nettoie les orbes trop lointaines
                entities.healthPickups = entities.healthPickups.filter(p => p.lifespan > 0);
                entities.soldiers = entities.soldiers.filter(s => s.hp > 0);
            }
            
            // --- Boucle de jeu principale ---

            function gameLoop(timestamp) {
                if (!lastTime) lastTime = timestamp;
                const dt = timestamp - lastTime;
                lastTime = timestamp;

                if (gameState === 'paused' || gameState === 'levelUp' || gameState === 'gameOver' || gameState === 'victory' || gameState === 'mainMenu' || gameState === 'charSelect' || gameState === 'shop') {
                    requestAnimationFrame(gameLoop);
                    return;
                }
                
                gameTime += dt / 1000;
                
                // --- Mise à jour ---
                
                // Joueurs
                players.forEach(p => p.update(dt));
                
                // Ennemis
                enemySpawnTimer -= dt;
                if (enemySpawnTimer <= 0 && !activeMiniBoss) {
                    const currentTier = Math.floor(gameTime / 60);
                    const spawnCount = 1 + Math.floor(gameTime / 20);
                    for (let i = 0; i < spawnCount; i++) {
                        if (gameMode === 'survival') {
                            spawnEnemy(currentTier, 1);
                        } else if (gameMode === 'armyAttack') {
                            for(let j=1; j<=4; j++) {
                                spawnEnemy(currentTier, j);
                            }
                        }
                    }
                    enemySpawnTimer = Math.max(500, 3000 - gameTime * 10);
                }
                
                // Boss spawn logic
                const humanPlayer = players[0];
                if (humanPlayer && humanPlayer.level >= 20 && humanPlayer.level % 20 === 0 && humanPlayer.level !== humanPlayer.lastBossSpawnLevel && !activeMiniBoss) {
                    const bossTier = (humanPlayer.level / 20) - 1;
                    spawnMiniBoss(bossTier, false); 
                    humanPlayer.lastBossSpawnLevel = humanPlayer.level;
                }
                if (humanPlayer && humanPlayer.level >= 10 && humanPlayer.level % 10 === 0 && humanPlayer.level % 20 !== 0 && humanPlayer.level !== humanPlayer.lastBossSpawnLevel && !activeMiniBoss) {
                    const bossTier = Math.floor(humanPlayer.level / 20);
                    spawnMiniBoss(bossTier, true);
                    humanPlayer.lastBossSpawnLevel = humanPlayer.level;
                }

                Object.values(entities).flat().forEach(e => e.update(dt));
                
                entities.floatingTexts.forEach(t => {
                    t.y -= 0.5;
                    t.lifespan -= dt;
                    t.opacity = t.lifespan / 1000;
                });

                checkCollisions();
                cleanupEntities();

                // --- Dessin ---
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                
                // Grille et séparateurs
                drawGrid();
                if (gameMode === 'armyAttack') {
                    drawQuadrantSeparators();
                }

                Object.values(entities).flat().forEach(e => e.draw());
                players.forEach(p => p.draw());
                
                // Dessin des textes flottants
                entities.floatingTexts.forEach(t => {
                    ctx.fillStyle = `rgba(${hexToRgb(t.color)}, ${t.opacity})`;
                    ctx.font = 'bold 20px "Roboto Mono"';
                    ctx.textAlign = 'center';
                    ctx.fillText(t.text, t.x, t.y);
                });
                
                // --- Mise à jour UI ---
                updateGameUI();
                
                // --- Conditions de fin ---
                if (humanPlayer && humanPlayer.hp <= 0) {
                    gameState = 'gameOver';
                    audioManager.playMusic('gameOver');
                    showGameOverScreen();
                }

                if (gameTime >= 60 * 20) { // 20 minutes
                    gameState = 'victory';
                    showVictoryScreen();
                }
                
                requestAnimationFrame(gameLoop);
            }
            
            // --- Démarrage ---
            
            function startGame(mode, charType) {
                gameMode = mode;
                selectedCharType = charType;
                resetGameState();
                
                // Créer le joueur humain
                players.push(new Player(charType, 1));
                
                if (gameMode === 'armyAttack') {
                    // Créer les bots
                    const botChars = Object.keys(characterData).filter(c => c !== charType);
                    for (let i = 0; i < 3; i++) {
                        const botChar = botChars[i % botChars.length];
                        players.push(new BotPlayer(botChar, i + 2));
                    }
                }
                
                gameState = 'playing';
                audioManager.playMusic('game');
                hideAllScreens();
                dom.containers.gameUi.style.display = 'flex';
                lastTime = performance.now();
                gameLoop();
            }
            window.startGame = startGame;

            // Initialisation
            loadGameState();
            initInput();
            initUI();
            showMainMenu();
            audioManager.playMusic('menu');
        });
        // utils.js — stub d'inputs clavier (WASD / flèches / espace)
window.input = window.input || { keys: new Set() };

window.initInput = window.initInput || function () {
  const down = (e) => input.keys.add(e.key);
  const up   = (e) => input.keys.delete(e.key);

  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);

  // (optionnel) empêcher le scroll avec certaines touches :
  // window.addEventListener('keydown', (e) => {
  //   if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
  // }, { passive:false });
};

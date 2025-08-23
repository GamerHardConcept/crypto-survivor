class Entity {
    constructor(x, y, radius) {
        Object.assign(this, { x, y, radius });
    }
    update(dt) { /* a implémenter par les enfants */ }
    draw() { /* a implémenter par les enfants */ }
}

class Player extends Entity {
    constructor(charType, playerId = 1) {
        super(0, 0, 15); // La position sera définie dans resetGameState
        this.playerId = playerId;
        this.charType = charType;
        const charData = characterData[this.charType];

        // Application des bonus permanents
        const permBonuses = getPermanentBonuses();
        this.permanentDamageBonus = permBonuses.damage;
        this.permanentHealthBonus = permBonuses.health;
        this.permanentXpGainBonus = permBonuses.xpGain;
        this.permanentCooldownBonus = permBonuses.attackSpeed;

        // Stats de base
        this.speed = 3;
        this.speedMultiplier = 1.0;
        this.baseMaxHp = 100;
        this.maxHp = this.baseMaxHp * (1 + this.permanentHealthBonus);
        this.hp = this.maxHp;
        this.level = 1;
        this.xp = 0;
        this.xpToNextLevel = 10;
        this.wallet = 0;
        this.levelDamageBonus = 1.0; 
        this.soldierOrbitAngle = 0; // Pour la formation des soldats
        this.skillPoints = 0; // Pour le mode Army Attack
        this.killCount = 0;
        this.pentagramCharge = 0;
        
        // Armes et améliorations
        this.weapons = [];
        this.upgradesToPick = 0;
        this.acquiredPassives = [];
        this.extraUpgradeCharges = 0;
        
        // Multiplicateurs globaux
        this.globalDamageMultiplier = 1.0;
        this.globalCooldownMultiplier = 1.0;
        this.projectileLifespanBonus = 1.0;
        this.projectilePierceCount = 0;
        this.xpGainBonus = 1.0; 
        this.projectileCountBonus = 0;
        this.pickupRadius = 50;
        this.doubleXpChance = 0;
        
        // Multiplicateurs pour le super pouvoir
        this.specialDamageMultiplier = 1.0;
        this.specialCooldownMultiplier = 1.0;
        this.specialAreaMultiplier = 1.0;

        // État
        this.specialCooldown = 0;
        this.isInvincible = false;
        this.isBonusLevelUp = false; 
        this.lastBossSpawnLevel = 0;
        
        // Propriétés du personnage
        this.color = getComputedStyle(document.documentElement).getPropertyValue(charData.colorVar);
        this.symbol = charData.symbol;
        this.specialMaxCooldown = charData.cooldown;
    }

    update(dt) {
        // --- Lecture des entrées en mode tolérant ---
        const im   = window.inputManager || {};
        const keys = im.keys || {};
        const joy  = im.joystick ? im.joystick : { inputX: 0, inputY: 0 };

        // clavier (WASD / flèches)
        const moveX = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
        const moveY = (keys.up   ? -1 : 0) + (keys.down  ? 1 : 0);
        const keyboardMove  = new Vector(moveX, moveY).normalize();

        // joystick virtuel (mobile)
        const joystickMove  = new Vector(joy.inputX || 0, joy.inputY || 0);

        // priorité au joystick s'il bouge, sinon clavier
        const utiliseJoystick = Math.abs(joystickMove.x) + Math.abs(joystickMove.y) > 0.01;
        const finalMove = utiliseJoystick ? joystickMove : keyboardMove;

        this.x += finalMove.x * this.speed * this.speedMultiplier;
        this.y += finalMove.y * this.speed * this.speedMultiplier;

        // Limites du monde
        const bounds = getQuadrantBoundaries(this.playerId);
        this.x = Math.max(bounds.minX + this.radius, Math.min(bounds.maxX - this.radius, this.x));
        this.y = Math.max(bounds.minY + this.radius, Math.min(bounds.maxY - this.radius, this.y));
        
        // Mise à jour des armes et du cooldown
        this.weapons.forEach(weapon => weapon.update(dt));
        if (this.specialCooldown > 0) {
            this.specialCooldown -= dt;
            dom.buttons.specialAbility.classList.add('on-cooldown');
        } else {
            dom.buttons.specialAbility.classList.remove('on-cooldown');
        }
    }

    draw() {
        // Zone de collecte
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.pickupRadius, 0, Math.PI * 2);
        ctx.fill();

        // Invincibilité
        if(this.isInvincible) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Joueur
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Symbole
        ctx.fillStyle = 'black';
        ctx.font = 'bold 20px "Roboto Mono"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.charType === 'MVX') {
            ctx.rotate(Math.PI / 2); // Rotation de 90 degrés
        }
        ctx.fillText(this.symbol, 0, 2);
        ctx.restore();
    }
    
    takeDamage(amount) {
        if (this.isInvincible) return;
        audioManager.play('playerHit');
        this.hp -= amount;
        if (this.playerId === 1) { // Seulement pour le joueur humain
            createFloatingText('FUD!', this.x, this.y, 'red');
        }
        if (this.hp <= 0) { 
            this.hp = 0; 
        }
    }

    gainXp(amount) {
        const totalXpBonus = this.xpGainBonus * (1 + this.permanentXpGainBonus);
        this.xp += amount * totalXpBonus;
        if (activeMiniBoss) return; 

        while (this.xp >= this.xpToNextLevel) {
            this.levelUp();
        }
    }

    levelUp() {
        audioManager.play('levelUp');
        this.xp -= this.xpToNextLevel;
        this.level++;
        this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);
        
        this.maxHp += 10;
        this.hp = this.maxHp; 
        
        if (this.level % 5 === 0) {
            this.levelDamageBonus += 0.05;
            if (this.playerId === 1) createFloatingText('+5% Dégâts!', this.x, this.y, 'orange');
        }
        
        if (this.playerId === 1) createFloatingText('LEVEL UP!', this.x, this.y, 'var(--xp-color)');
        
        const explosionRadius = 300;
        const explosionDamage = 100 * 10;
        entities.particles.push(new Particle(this.x, this.y, 'var(--primary-color)', explosionRadius, 500));
        audioManager.play('explosion');
        
        entities.enemies.forEach(e => {
            if (Math.hypot(this.x - e.x, this.y - e.y) < explosionRadius) {
                if (e instanceof MiniBoss) {
                    e.takeDamage(explosionDamage);
                } else {
                    e.hp = 0;
                }
            }
        });

        if (gameMode === 'armyAttack') {
            this.skillPoints = (this.skillPoints || 0) + 1;
            if (this.playerId === 1) {
                updateMultiplayerUpgradeUI();
                createFloatingText('+1 Point!', this.x, this.y, 'gold');
            }
            return;
        }

        spawnBonusUpgrade();
        gameState = 'levelUp';
        this.upgradesToPick = 1; 
        displayLevelUpOptions();
    }

    useSpecial() {
        if (this.specialCooldown <= 0 && players[0]) {
            this.specialCooldown = this.specialMaxCooldown * this.specialCooldownMultiplier;
            characterData[this.charType].special(this);
        }
    }
}

class BotPlayer extends Player {
    constructor(charType, playerId) {
        super(charType, playerId);
        this.optimalRange = 200;
        this.purchaseTimer = 5000 + Math.random() * 5000;
    }

    update(dt) {
        if (this.hp <= 0) return;

        // --- AI Decision Making & Movement ---
        const enemiesInQuadrant = entities.enemies.filter(e => e.quadrant === this.playerId && e.hp > 0);
        let finalMove = new Vector(0, 0);

        if (enemiesInQuadrant.length > 0) {
            let repulsion = new Vector(0, 0);
            let attraction = new Vector(0, 0);
            const DANGER_RADIUS = 120;
            const WALL_AVOID_RADIUS = 60;

            // 1. Repulsion from all nearby enemies
            enemiesInQuadrant.forEach(enemy => {
                const dist = Math.hypot(this.x - enemy.x, this.y - enemy.y);
                if (dist < DANGER_RADIUS) {
                    let fleeVector = new Vector(this.x - enemy.x, this.y - enemy.y);
                    fleeVector.normalize();
                    // La force de répulsion est inversement proportionnelle à la distance
                    fleeVector.x /= (dist + 0.1); 
                    fleeVector.y /= (dist + 0.1);
                    repulsion.x += fleeVector.x;
                    repulsion.y += fleeVector.y;
                }
            });

            // 2. Attraction/Repulsion to the closest enemy to maintain optimal range
            const closestEnemy = enemiesInQuadrant.reduce((closest, enemy) => {
                const dist = Math.hypot(this.x - enemy.x, this.y - enemy.y);
                return dist < closest.dist ? { dist, enemy } : closest;
            }, { dist: Infinity }).enemy;

            if (closestEnemy) {
                const distToClosest = Math.hypot(this.x - closestEnemy.x, this.y - closestEnemy.y);
                if (distToClosest > this.optimalRange) { // Trop loin, on s'approche
                    attraction.x = closestEnemy.x - this.x;
                    attraction.y = closestEnemy.y - this.y;
                } else { // Trop près, on recule
                    attraction.x = this.x - closestEnemy.x;
                    attraction.y = this.y - closestEnemy.y;
                }
            }
            
            // 3. Wall Avoidance
            const bounds = getQuadrantBoundaries(this.playerId);
            if (this.x < bounds.minX + WALL_AVOID_RADIUS) repulsion.x += 1;
            if (this.x > bounds.maxX - WALL_AVOID_RADIUS) repulsion.x -= 1;
            if (this.y < bounds.minY + WALL_AVOID_RADIUS) repulsion.y += 1;
            if (this.y > bounds.maxY - WALL_AVOID_RADIUS) repulsion.y -= 1;

            // 4. Combine forces (giving much more weight to repulsion)
            repulsion.normalize();
            attraction.normalize();
            finalMove.x = (repulsion.x * 2.0) + (attraction.x * 0.8);
            finalMove.y = (repulsion.y * 2.0) + (attraction.y * 0.8);

        } 
        
        finalMove.normalize();
        this.x += finalMove.x * this.speed * 0.7;
        this.y += finalMove.y * this.speed * 0.7;

        // --- AI Purchasing ---
        this.purchaseTimer -= dt;
        if (this.purchaseTimer <= 0) {
            const soldiersOwned = entities.soldiers.filter(s => s.owner === this).length;
            if (soldiersOwned < 10) { // Max 10 soldiers
                 const unitTypes = Object.keys(armyUnitData);
                 const randomUnitType = unitTypes[Math.floor(Math.random() * unitTypes.length)];
                 const cost = armyUnitData[randomUnitType].cost;
                 if (this.wallet >= cost) {
                     this.wallet -= cost;
                     const spawnX = this.x + (Math.random() - 0.5) * 40;
                     const spawnY = this.y + (Math.random() - 0.5) * 40;
                     entities.soldiers.push(new Soldier(spawnX, spawnY, this, randomUnitType));
                 }
            }
            this.purchaseTimer = 10000 + Math.random() * 5000; // Reset timer
        }

        // Limites du monde (clamp position to be safe)
        const bounds = getQuadrantBoundaries(this.playerId);
        this.x = Math.max(bounds.minX + this.radius, Math.min(bounds.maxX - this.radius, this.x));
        this.y = Math.max(bounds.minY + this.radius, Math.min(bounds.maxY - this.radius, this.y));

        // Mise à jour des armes
        this.weapons.forEach(weapon => weapon.update(dt));
    }

    draw() {
        super.draw(); // Dessine le joueur normalement
        // Ajoute une indication "BOT"
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px "Roboto Mono"';
        ctx.textAlign = 'center';
        ctx.fillText(`BOT ${this.playerId}`, this.x, this.y - this.radius - 5);
    }
}

class Enemy extends Entity {
    constructor(tier = 0, x, y, quadrant) {
        super(x, y, 12);
        this.quadrant = quadrant;
        this.bounds = getQuadrantBoundaries(this.quadrant);
        
        const tierData = bossProgression[tier];
        this.tier = tier;
        this.speed = 1 + Math.random() * 0.5 + tier * 0.3;
        this.hp = 20 * Math.pow(11, tier);
        this.damage = 5 * Math.pow(1.5, tier);
        this.walletValue = 1 * (tier + 1);
        this.xpValue = 1 * Math.pow(6, tier);
        this.color = getComputedStyle(document.documentElement).getPropertyValue(tierData.colorVar);
        this.symbol = tierData.symbol;
        this.hitTimer = 0;
        this.targetPlayer = players.find(p => p.playerId === this.quadrant);
    }

    update(dt) {
        if (this.hitTimer > 0) {
            this.hitTimer -= dt;
        }
        
        if (!this.targetPlayer || this.targetPlayer.hp <= 0) {
            return; // Arrête de bouger si la cible est morte
        }

        const angle = Math.atan2(this.targetPlayer.y - this.y, this.targetPlayer.x - this.x);
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;

        // Respecter les murs du quadrant
        this.x = Math.max(this.bounds.minX + this.radius, Math.min(this.bounds.maxX - this.radius, this.x));
        this.y = Math.max(this.bounds.minY + this.radius, Math.min(this.bounds.maxY - this.radius, this.y));
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        if (this.hitTimer > 0) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px "Roboto Mono"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, this.x, this.y);
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.hitTimer = 100;
        if (this.hp <= 0) {
            const killer = players.find(p => p.playerId === this.quadrant);
            if (killer) {
               killer.wallet += this.walletValue;
               killer.killCount++;
               if (killer.playerId === 1) { // Only human player gets XP
                    audioManager.play('enemyDefeat');
                    const isDouble = Math.random() < killer.doubleXpChance;
                    entities.xpOrbs.push(new XpOrb(this.x, this.y, this.xpValue, isDouble));
               }
            }
        }
    }
}

class TankEnemy extends Enemy {
    constructor(tier = 0, x, y, quadrant) {
        super(tier, x, y, quadrant); 
        this.radius = 18;
        this.hp = 500 * Math.pow(11, tier);
        this.xpValue *= 4;
    }
}

class MiniBoss extends Enemy {
    constructor(tier, x, y, quadrant, isDemiBoss = false) {
        super(tier, x, y, quadrant); 
        this.isDemiBoss = isDemiBoss;
        const tierData = bossProgression[tier];
        this.name = tierData.name;
        this.radius = isDemiBoss ? 25 : 40;
        this.hp = (isDemiBoss ? 1000 : 3000) * Math.pow(11, tier);
        this.maxHp = this.hp;
        this.xpValue = (isDemiBoss ? 15 : 50) * Math.pow(6, tier);
        this.walletValue = (isDemiBoss ? 25 : 100) * (tier + 1);
        this.speed *= 1.25;
        
        this.spikeRotation1 = 0;
        this.spikeRotation2 = 0;
        this.spikeAnimationTimer = 0;
    }

    update(dt) {
        // La logique de ciblage du parent est globale, ce qui est ok pour un boss
        const humanPlayer = players[0];
        if (!humanPlayer) return;
        this.targetPlayer = humanPlayer;
        super.update(dt);
        this.spikeRotation1 += 0.02; 
        this.spikeRotation2 -= 0.03;
        this.spikeAnimationTimer += dt;
    }

    draw() {
        // Dessin de base de l'ennemi
        super.draw();

        // Pointes décoratives qui tournent
        ctx.save();
        ctx.translate(this.x, this.y);
        
        const spikeCount = 8;
        const spikeLength = this.radius + 10 + Math.sin(this.spikeAnimationTimer / 200) * 5; // Longueur animée
        const spikeBase = this.radius + 2;

        // Premier set de pointes
        ctx.rotate(this.spikeRotation1);
        for (let i = 0; i < spikeCount; i++) {
            const angle = (i / spikeCount) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * spikeBase, Math.sin(angle) * spikeBase);
            ctx.lineTo(Math.cos(angle + 0.1) * (spikeLength - 5), Math.sin(angle + 0.1) * (spikeLength - 5));
            ctx.lineTo(Math.cos(angle) * spikeLength, Math.sin(angle) * spikeLength);
            ctx.lineTo(Math.cos(angle - 0.1) * (spikeLength - 5), Math.sin(angle - 0.1) * (spikeLength - 5));
            ctx.closePath();
            ctx.fillStyle = this.color;
            ctx.fill();
        }

        // Deuxième set de pointes
        ctx.rotate(this.spikeRotation2);
        for (let i = 0; i < spikeCount; i++) {
            const angle = (i / spikeCount) * Math.PI * 2 + Math.PI / spikeCount;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * (spikeBase - 2), Math.sin(angle) * (spikeBase - 2));
            ctx.lineTo(Math.cos(angle) * (spikeLength - 8), Math.sin(angle) * (spikeLength - 8));
            ctx.closePath();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.hitTimer = 100;
        if (this.hp <= 0) {
            const humanPlayer = players[0];
            audioManager.play('enemyDefeat');
            audioManager.playMusic('game');
            if (!this.isDemiBoss && !unlockedCharacters.includes(this.name)) {
                unlockedCharacters.push(this.name);
                saveGameState();
                createFloatingText(`${this.name} débloqué!`, humanPlayer.x, humanPlayer.y, 'gold');
            }
            humanPlayer.isBonusLevelUp = true;
            entities.xpOrbs.push(new XpOrb(this.x, this.y, this.xpValue, true));
            humanPlayer.wallet += this.walletValue;
            activeMiniBoss = null;

            while (humanPlayer.xp >= humanPlayer.xpToNextLevel) {
                humanPlayer.levelUp();
            }
        }
    }
}

class Projectile extends Entity {
    constructor(x, y, radius, { angle, speed, damage, lifespan, color = 'white', pierce = 0 }) {
        super(x, y, radius);
        Object.assign(this, { angle, speed, damage, lifespan, color, pierce });
    }
    update(dt) {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.lifespan -= dt;
    }
    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Rocket extends Projectile {
    constructor(x, y, owner) {
        const options = { angle: 0, speed: 4, damage: 0, lifespan: 5000 };
        super(x, y, 12, options);
        this.owner = owner;
        this.findNewTarget();
    }

    findNewTarget() {
        this.target = entities.enemies.length > 0 ? entities.enemies.reduce((closest, enemy) => {
            if (enemy.hp <= 0) return closest;
            const dist = Math.hypot(this.x - enemy.x, this.y - enemy.y);
            return dist < closest.dist ? { dist, enemy } : closest;
        }, { dist: Infinity }).enemy : null;
    }

    update(dt) {
        if (!this.target || this.target.hp <= 0 || !entities.enemies.includes(this.target)) {
            this.findNewTarget();
        }

        if (this.target) {
            this.angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        }
        
        super.update(dt);
        if (this.lifespan <= 0) this.explode();
    }

    onHit() { this.explode(); }

    explode() {
        if (this.lifespan <= 0) return;
        audioManager.play('explosion');
        this.lifespan = 0; 
        const explosionRadius = 80 * this.owner.specialAreaMultiplier;
        entities.particles.push(new Particle(this.x, this.y, 'cyan', explosionRadius, 400));
        entities.enemies.forEach(enemy => {
            if (Math.hypot(this.x - enemy.x, this.y - enemy.y) < explosionRadius) {
                enemy.takeDamage(100 * this.owner.globalDamageMultiplier * (1 + this.owner.permanentDamageBonus) * this.owner.levelDamageBonus * this.owner.specialDamageMultiplier);
            }
        });
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + Math.PI / 2);
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚀', 0, 0);
        ctx.restore();
    }
}

class XpOrb extends Entity {
     constructor(x, y, value, isDouble = false) {
        super(x, y, isDouble ? 7 : 5);
        this.value = isDouble ? value * 2 : value;
        this.color = isDouble ? 'var(--double-xp-color)' : 'var(--xp-color)';
        this.isAttracted = false;
    }
    update(dt) {
        const humanPlayer = players[0];
        if (!humanPlayer) return;
        if (this.isAttracted || Math.hypot(humanPlayer.x - this.x, humanPlayer.y - this.y) < humanPlayer.pickupRadius) {
            this.isAttracted = true;
            const angle = Math.atan2(humanPlayer.y - this.y, humanPlayer.x - this.x);
            this.x += Math.cos(angle) * 8;
            this.y += Math.sin(angle) * 8;
        }
    }
    draw() {
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(this.color.replace(/var\(|\)/g, ''));
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

class HealthPickup extends Entity {
    constructor(x, y) {
        super(x, y, 12);
        this.lifespan = 30000; // 30s
        this.isAttracted = false;
    }

    update(dt) {
        this.lifespan -= dt;
        const humanPlayer = players[0];
        if (!humanPlayer) return;
        if (this.isAttracted || Math.hypot(humanPlayer.x - this.x, humanPlayer.y - this.y) < humanPlayer.pickupRadius) {
            this.isAttracted = true;
            const angle = Math.atan2(humanPlayer.y - this.y, humanPlayer.x - this.x);
            this.x += Math.cos(angle) * 8;
            this.y += Math.sin(angle) * 8;
        }
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.lifespan < 5000 ? Math.max(0, this.lifespan / 5000) : 1;
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', this.x, this.y);
        ctx.restore();
    }
}

class Particle extends Entity {
    constructor(x, y, color, size, lifespan, type = 'expand') {
        super(x, y, size);
        this.color = color;
        this.lifespan = lifespan;
        this.initialLifespan = lifespan;
        this.type = type;
    }

    update(dt) {
        this.lifespan -= dt;
    }

    draw() {
        const life = this.lifespan / this.initialLifespan;
        ctx.save();
        ctx.globalAlpha = life;
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(this.color.replace(/var\(|\)/g, ''));
        ctx.beginPath();
        if (this.type === 'contract') {
            ctx.arc(this.x, this.y, this.radius * (1 - life), 0, Math.PI * 2);
        } else { // expand
            ctx.arc(this.x, this.y, this.radius * life, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();
    }
}

class FloatingText extends Entity {
    constructor(text, x, y, color = 'white', { size = 16, duration = 1000, style = 'bold' } = {}) {
        super(x, y, 0);
        this.text = text;
        this.color = color;
        this.duration = duration;
        this.initialDuration = duration;
        this.opacity = 1;
        this.size = size;
        this.style = style;
    }

    update(dt) {
        this.y -= 0.5; // Vitesse de montée
        this.duration -= dt;
        this.opacity = this.duration / this.initialDuration;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.opacity);
        let finalColor = this.color;
        if (this.color.startsWith('var(')) {
            finalColor = getComputedStyle(document.documentElement).getPropertyValue(this.color.replace(/var\(|\)/g, ''));
        }
        ctx.fillStyle = finalColor;
        ctx.font = `${this.style} ${this.size}px Poppins`;
        ctx.textAlign = 'center';
        ctx.shadowColor = "black";
        ctx.shadowBlur = 4;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

class Magnet extends Entity {
    constructor(x, y) {
        super(x, y, 12);
        this.lifespan = 30000; // 30s
        this.isAttracted = false;
    }

    update(dt) {
        this.lifespan -= dt;
        const humanPlayer = players[0];
        if (!humanPlayer) return;
        if (this.isAttracted || Math.hypot(humanPlayer.x - this.x, humanPlayer.y - this.y) < humanPlayer.pickupRadius) {
            this.isAttracted = true;
            const angle = Math.atan2(humanPlayer.y - this.y, humanPlayer.x - this.x);
            this.x += Math.cos(angle) * 8;
            this.y += Math.sin(angle) * 8;
        }
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.lifespan < 5000 ? Math.max(0, this.lifespan / 5000) : 1;
        ctx.fillStyle = 'blue';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('M', this.x, this.y);
        ctx.restore();
    }
}

class BonusUpgrade extends Entity {
    constructor(x, y) {
        super(x, y, 15);
        this.color = 'purple';
        this.collected = false;
        this.isAttracted = false;
    }

    update(dt) {
        const humanPlayer = players[0];
        if (!humanPlayer) return;
        if (this.isAttracted || Math.hypot(humanPlayer.x - this.x, humanPlayer.y - this.y) < humanPlayer.pickupRadius) {
            this.isAttracted = true;
            const angle = Math.atan2(humanPlayer.y - this.y, humanPlayer.x - this.x);
            this.x += Math.cos(angle) * 8;
            this.y += Math.sin(angle) * 8;
        }
    }

    draw() {
        if (this.collected) return;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', this.x, this.y);
    }
}

class Soldier extends Entity {
    constructor(x, y, owner, unitType) {
        super(x, y, 10);
        this.owner = owner; // Le joueur (humain ou bot) qui possède ce soldat
        this.unitType = unitType;
        const unitData = armyUnitData[this.unitType];
        const upgrades = multiplayerUpgrades[this.owner.playerId - 1];
        
        this.hp = unitData.hp * (1 + upgrades.health.level * 0.1);
        this.maxHp = this.hp;
        this.damage = unitData.damage * (1 + upgrades.damage.level * 0.1);
        this.range = unitData.range * (1 + upgrades.range.level * 0.1);
        this.cooldown = unitData.cooldown * (1 - upgrades.attackSpeed.level * 0.05);
        this.speed = unitData.speed;
        this.symbol = unitData.symbol;
        this.color = owner.color;
        
        this.attackTimer = 0;
        this.target = null;
    }

    update(dt) {
        if (this.hp <= 0) return;

        // Trouver une cible si on n'en a pas ou si elle est morte/invalide
        if (!this.target || this.target.hp <= 0 || !entities.enemies.includes(this.target)) {
            this.findTarget();
        }

        if (this.target) {
            const dist = Math.hypot(this.x - this.target.x, this.y - this.target.y);
            
            // Si la cible est à portée, on attaque
            if (dist <= this.range) {
                this.attackTimer -= dt;
                if (this.attackTimer <= 0) {
                    this.attack();
                    this.attackTimer = this.cooldown;
                }
            } else { // Sinon, on se déplace vers elle
                const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
                this.x += Math.cos(angle) * this.speed;
                this.y += Math.sin(angle) * this.speed;
            }
        } else { // Pas de cible, on orbite autour du propriétaire
            const soldierIndex = this.owner.weapons.indexOf(this);
            const orbitRadius = 40 + (soldierIndex % 2 === 0 ? 0 : 20); // 2 cercles d'orbite
            const orbitSpeed = 0.02;
            this.owner.soldierOrbitAngle += orbitSpeed * dt / 16; // Normaliser la vitesse
            const angleOffset = (Math.PI * 2 / (this.owner.weapons.length || 1)) * soldierIndex;
            
            const targetX = this.owner.x + Math.cos(this.owner.soldierOrbitAngle + angleOffset) * orbitRadius;
            const targetY = this.owner.y + Math.sin(this.owner.soldierOrbitAngle + angleOffset) * orbitRadius;
            
            const angleToTarget = Math.atan2(targetY - this.y, targetX - this.x);
            this.x += Math.cos(angleToTarget) * this.speed * 0.5;
            this.y += Math.sin(angleToTarget) * this.speed * 0.5;
        }
    }

    findTarget() {
        this.target = entities.enemies
            .filter(e => e.quadrant === this.owner.playerId && e.hp > 0)
            .reduce((closest, enemy) => {
                const dist = Math.hypot(this.x - enemy.x, this.y - enemy.y);
                return dist < closest.dist ? { dist, enemy } : closest;
            }, { dist: Infinity, enemy: null }).enemy;
    }

    attack() {
        if (!this.target) return;
        this.target.takeDamage(this.damage);
        // Effet visuel de l'attaque
        entities.particles.push(new Particle(this.target.x, this.target.y, 'red', 10, 100, 'contract'));
    }

    takeDamage(amount) {
        this.hp -= amount;
    }

    draw() {
        // Barre de vie
        if (this.hp < this.maxHp) {
            ctx.fillStyle = 'red';
            ctx.fillRect(this.x - this.radius, this.y - this.radius - 8, this.radius * 2, 4);
            ctx.fillStyle = 'green';
            ctx.fillRect(this.x - this.radius, this.y - this.radius - 8, (this.radius * 2) * (this.hp / this.maxHp), 4);
        }

        // Corps du soldat
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Symbole
        ctx.fillStyle = 'black';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, this.x, this.y);
    }
}

class Missile extends Projectile {
    constructor(x, y, owner, target) {
        const damage = 500 * owner.globalDamageMultiplier * (1 + owner.permanentDamageBonus) * owner.levelDamageBonus;
        const options = { angle: 0, speed: 6, damage: damage, lifespan: 5000, color: 'orange' };
        super(x, y, 8, options);
        this.owner = owner;
        this.target = target;
        this.turnSpeed = 0.05; // Rad/frame
    }

    update(dt) {
        if (!this.target || this.target.hp <= 0 || !entities.enemies.includes(this.target)) {
            this.lifespan = 0; // Le missile se perd
            return;
        }

        const targetAngle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        let angleDiff = targetAngle - this.angle;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        this.angle += Math.max(-this.turnSpeed, Math.min(this.turnSpeed, angleDiff));
        
        super.update(dt);
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.radius, -this.radius / 2, this.radius * 2, this.radius);
        ctx.fillStyle = 'red';
        ctx.fillRect(this.radius, -this.radius / 2, 5, this.radius); // Pointe
        ctx.restore();
    }
}

class Pentagram {
    constructor(player) {
        this.player = player;
        this.radius = 0;
        this.maxRadius = canvas.width; // Couvre tout l'écran
        this.duration = 1000; // 1s pour l'expansion
        this.lifespan = this.duration;
        this.active = true;
        audioManager.play('pentagram');
    }

    update(dt) {
        this.lifespan -= dt;
        if (this.lifespan <= 0) {
            this.active = false;
            return;
        }

        const progress = 1 - (this.lifespan / this.duration);
        this.radius = this.maxRadius * progress;

        // Tuer les ennemis dans le rayon
        entities.enemies.forEach(enemy => {
            if (!(enemy instanceof MiniBoss) && Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y) < this.radius) {
                enemy.hp = 0; // Tue instantanément
                // Pas d'XP ni d'argent pour le pentagramme
            }
        });
    }

    draw() {
        if (!this.active) return;
        const progress = 1 - (this.lifespan / this.duration);
        const opacity = 1 - progress;

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.strokeStyle = 'purple';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(this.player.x, this.player.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}

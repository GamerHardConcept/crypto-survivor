// WS: Fichier pour toutes les classes d'entités du jeu

class Entity {
    constructor(x, y, radius, color) {
        this.pos = new Vector(x, y);
        this.vel = new Vector();
        this.radius = radius;
        this.color = color;
        this.shouldBeRemoved = false;
    }

    update(dt) {
        this.pos = this.pos.add(this.vel.multiply(dt));
    }

    draw(ctx, camera) {
        const screenPos = worldToScreen(this.pos, camera);
        const screenRadius = this.radius * camera.zoom;

        // Optimisation: ne pas dessiner ce qui est hors de l'écran
        if (screenPos.x + screenRadius < 0 || screenPos.x - screenRadius > canvas.width ||
            screenPos.y + screenRadius < 0 || screenPos.y - screenRadius > canvas.height) {
            return;
        }

        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
    }
}

class Player extends Entity {
    constructor(x, y, charId) {
        super(x, y, 15, 'cyan');
        this.isPlayer = true;
        this.charId = charId;
        this.input = new Vector();
        this.level = 1;
        this.xp = 0;
        this.xpToNextLevel = 100;
        this.pickupRadius = 50;
        this.magnetRadius = 150;
        this.weapons = [];
        this.passiveUpgrades = {};
        this.specialAbility = null;

        this.initCharacter();
    }

    initCharacter() {
        const charData = characters[this.charId];
        this.health = charData.hp;
        this.maxHealth = charData.hp;
        this.speed = charData.speed;
        this.damage = charData.damage; // Multiplicateur de dégâts
        this.color = charData.color;
        
        // Ajouter l'arme de base
        const baseWeapon = allUpgrades.find(u => u.constructor.name === charData.baseWeapon);
        if (baseWeapon) {
            this.addWeapon(Object.create(baseWeapon));
        }

        // Ajouter la capacité spéciale
        if (charData.special) {
            this.specialAbility = { ...charData.special, timer: 0 };
        }
    }

    addWeapon(weapon) {
        const existing = this.weapons.find(w => w.constructor.name === weapon.constructor.name);
        if (existing) {
            existing.levelUp();
        } else {
            weapon.owner = this;
            this.weapons.push(weapon);
        }
        updateWeaponDisplay();
    }

    addPassive(upgrade) {
        if (this.passiveUpgrades[upgrade.id]) {
            this.passiveUpgrades[upgrade.id].level++;
        } else {
            this.passiveUpgrades[upgrade.id] = { ...upgrade, level: 1 };
        }
        upgrade.apply(this);
        updatePassiveDisplay();
    }

    update(dt) {
        if (this.input.magnitude() > 0) {
            this.vel = this.input.normalize().multiply(this.speed);
        } else {
            this.vel = new Vector();
        }
        super.update(dt);

        // Contraintes pour rester dans le monde
        this.pos.x = Math.max(this.radius, Math.min(GAME_WIDTH - this.radius, this.pos.x));
        this.pos.y = Math.max(this.radius, Math.min(GAME_HEIGHT - this.radius, this.pos.y));

        this.weapons.forEach(weapon => weapon.update(dt));
        
        if (this.specialAbility && this.specialAbility.timer > 0) {
            this.specialAbility.timer -= dt;
            updateSpecialAbilityButton();
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        createFloatingText(Math.round(amount), this.pos, 'red');
        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }
    }

    die() {
        this.shouldBeRemoved = true;
        gameState.isGameOver = true;
        gameState.isGameRunning = false;
        document.getElementById('final-score').textContent = gameState.killCount;
        document.getElementById('final-time').textContent = `${Math.floor(gameState.gameTime / 60)}:${(Math.floor(gameState.gameTime) % 60).toString().padStart(2, '0')}`;
        const earnedMoney = Math.floor(gameState.killCount / 2 + gameState.gameTime / 5);
        document.getElementById('earned-money').innerHTML = `${earnedMoney} <span class="mvx-logo-inline">X</span>`;
        saveData.money += earnedMoney;
        saveGameData();
        showScreen('game-over');
        audioManager.playEffect('gameOver', 'C2', '1n');
        audioManager.stopMusic();
    }

    gainXP(amount) {
        this.xp += amount;
        if (this.xp >= this.xpToNextLevel) {
            this.levelUp();
        }
    }

    levelUp() {
        audioManager.playEffect('levelUp', 'C4', '0.5');
        this.xp -= this.xpToNextLevel;
        this.level++;
        this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);
        this.health = this.maxHealth; // Soin complet au level up
        gameState.isPaused = true;
        showLevelUpOptions();
        showScreen('level-up');
    }

    activateSpecial() {
        if (this.specialAbility && this.specialAbility.timer <= 0) {
            this.specialAbility.activate(this);
            this.specialAbility.timer = this.specialAbility.cooldown;
        }
    }

    draw(ctx, camera) {
        super.draw(ctx, camera);
        // Dessiner les armes qui ont une méthode draw
        this.weapons.forEach(w => {
            if (w.draw) {
                w.draw(ctx, camera);
            }
        });

        // Barre de vie du joueur (au-dessus)
        const screenPos = worldToScreen(this.pos, camera);
        const barWidth = 60 * camera.zoom;
        const barHeight = 8 * camera.zoom;
        const barX = screenPos.x - barWidth / 2;
        const barY = screenPos.y - (this.radius * camera.zoom) - 15;
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = 'green';
        ctx.fillRect(barX, barY, barWidth * (this.health / this.maxHealth), barHeight);
    }
}

class BotPlayer extends Player {
    constructor(x, y, charId) {
        super(x, y, charId);
        this.isBot = true;
        this.color = 'gray';
        this.target = null;
    }

    update(dt) {
        this.findTarget();
        if (this.target) {
            const direction = this.target.pos.subtract(this.pos).normalize();
            this.input = direction;
        } else {
            this.input = new Vector();
        }
        super.update(dt);
    }

    findTarget() {
        let closestEnemy = null;
        let minDistance = Infinity;
        gameState.enemies.forEach(enemy => {
            const distance = Vector.distance(this.pos, enemy.pos);
            if (distance < minDistance) {
                minDistance = distance;
                closestEnemy = enemy;
            }
        });
        this.target = closestEnemy;
    }
}

class Enemy extends Entity {
    constructor(x, y, radius, color, health, speed, damage, xpValue) {
        super(x, y, radius, color);
        this.isEnemy = true;
        this.health = health;
        this.maxHealth = health;
        this.speed = speed;
        this.damage = damage;
        this.xpValue = xpValue;
    }

    update(dt) {
        if (gameState.player && !gameState.player.shouldBeRemoved) {
            const direction = gameState.player.pos.subtract(this.pos).normalize();
            this.vel = direction.multiply(this.speed);
        } else {
            this.vel = new Vector();
        }
        super.update(dt);
    }

    takeDamage(amount) {
        this.health -= amount;
        createFloatingText(Math.round(amount), this.pos, 'white', 1, 0.5);
        if (this.health <= 0) {
            this.die();
        }
    }

    die() {
        this.shouldBeRemoved = true;
        gameState.killCount++;
        // Chance de laisser tomber un orbe d'XP
        if (Math.random() < 0.8) {
            const orb = new XpOrb(this.pos.x, this.pos.y, this.xpValue);
            gameState.xpOrbs.push(orb);
            gameState.entities.push(orb);
        }
        // Chance de laisser tomber un pickup de vie
        if (Math.random() < 0.05) { // 5% de chance
            const pickup = new HealthPickup(this.pos.x, this.pos.y);
            gameState.pickups.push(pickup);
            gameState.entities.push(pickup);
        }
    }
}

class TankEnemy extends Enemy {
    constructor(x, y) {
        super(x, y, 20, 'darkred', 300, 60, 20, 50);
    }
}

class MiniBoss extends Enemy {
    constructor(x, y) {
        super(x, y, 40, 'purple', 1000, 80, 40, 200);
        this.lastShot = 0;
    }

    update(dt) {
        super.update(dt);
        this.lastShot += dt;
        if (this.lastShot > 3) { // Tire toutes les 3 secondes
            this.shoot();
            this.lastShot = 0;
        }
    }

    shoot() {
        if (!gameState.player) return;
        const direction = gameState.player.pos.subtract(this.pos).normalize();
        const velocity = direction.multiply(200);
        const p = new Projectile(this.pos.x, this.pos.y, 10, 'magenta', velocity, this.damage, 5);
        // Ce projectile n'est PAS allié
        gameState.projectiles.push(p);
        gameState.entities.push(p);
    }
}

class Projectile extends Entity {
    constructor(x, y, radius, color, velocity, damage, lifetime = 3) {
        super(x, y, radius, color);
        this.vel = velocity;
        this.damage = damage;
        this.lifetime = lifetime;
        this.spawnTime = gameState.gameTime;
    }

    update(dt) {
        super.update(dt);
        if (gameState.gameTime - this.spawnTime > this.lifetime) {
            this.shouldBeRemoved = true;
        }
    }
}

class Rocket extends Projectile {
    constructor(x, y, damage, target) {
        super(x, y, 8, 'orange', new Vector(), damage, 8);
        this.target = target;
        this.speed = 250;
        this.turnRate = Math.PI / 2; // 90 degrés par seconde
    }

    update(dt) {
        if (this.target && !this.target.shouldBeRemoved) {
            const directionToTarget = this.target.pos.subtract(this.pos).normalize();
            const desiredVelocity = directionToTarget.multiply(this.speed);
            const steer = desiredVelocity.subtract(this.vel);
            this.vel = this.vel.add(steer.multiply(this.turnRate * dt));
            this.vel = this.vel.normalize().multiply(this.speed);
        } else {
            // Si la cible est perdue, continue tout droit
            this.vel = this.vel.magnitude() > 0 ? this.vel : new Vector(0, -this.speed);
        }
        super.update(dt);
    }
}

class XpOrb extends Entity {
    constructor(x, y, value) {
        super(x, y, 5, 'lime');
        this.value = value;
    }

    update(dt) {
        if (gameState.player) {
            const distanceToPlayer = Vector.distance(this.pos, gameState.player.pos);
            if (distanceToPlayer < gameState.player.magnetRadius) {
                const direction = gameState.player.pos.subtract(this.pos).normalize();
                this.vel = direction.multiply(300); // Vitesse d'attraction
            }
             else {
                this.vel = new Vector();
            }
        }
        super.update(dt);
    }
}

class HealthPickup extends Entity {
    constructor(x, y) {
        super(x, y, 8, 'pink');
        this.healAmount = 25;
    }
}

class FloatingText {
    constructor(text, pos, color = 'white', size = 1, duration = 1) {
        this.text = text;
        this.pos = new Vector(pos.x, pos.y);
        this.color = color;
        this.size = size;
        this.duration = duration;
        this.opacity = 1;
        this.shouldBeRemoved = false;
        this.spawnTime = gameState.gameTime;
    }

    update(dt) {
        this.pos.y -= 20 * dt;
        this.opacity -= (1 / this.duration) * dt;
        if (this.opacity <= 0) {
            this.shouldBeRemoved = true;
        }
    }

    draw(ctx, camera) {
        const screenPos = worldToScreen(this.pos, camera);
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.font = `bold ${this.size * 20 * camera.zoom}px 'Press Start 2P', cursive`;
        ctx.textAlign = 'center';
        ctx.fillText(this.text, screenPos.x, screenPos.y);
        ctx.restore();
    }
}

class Particle extends Entity {
    constructor(x, y, color, size, lifetime) {
        super(x, y, size, color);
        const angle = Math.random() * 2 * Math.PI;
        const speed = Math.random() * 100 + 50;
        this.vel = new Vector(Math.cos(angle) * speed, Math.sin(angle) * speed);
        this.lifetime = lifetime;
        this.opacity = 1;
    }

    update(dt) {
        super.update(dt);
        this.vel = this.vel.multiply(0.95); // Friction
        this.opacity -= (1 / this.lifetime) * dt;
        if (this.opacity <= 0) {
            this.shouldBeRemoved = true;
        }
    }

    draw(ctx, camera) {
        ctx.save();
        ctx.globalAlpha = this.opacity;
        super.draw(ctx, camera);
        ctx.restore();
    }
}

class Magnet extends Entity {
    constructor(x, y) {
        super(x, y, 10, 'purple');
        this.isBonus = true;
        this.bonusType = 'magnet';
        this.duration = 10; // 10 secondes
    }
}

class BonusUpgrade {
     constructor(id, name, description, apply, unapply, maxLevel = 5) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.apply = apply; // (player) => {}
        this.unapply = unapply; // (player) => {}
        this.maxLevel = maxLevel;
    }
}

// --- Unités pour le mode Army Attack ---

class Soldier extends Entity {
    constructor(x, y, config) {
        super(x, y, 12, 'lightblue');
        this.isAlly = true;
        this.config = config;
        this.health = config.hp;
        this.maxHealth = config.hp;
        this.damage = config.damage;
        this.range = config.range;
        this.fireRate = config.fireRate;
        this.speed = config.speed;
        this.fireCooldown = 0;
        this.target = null;
    }

    update(dt) {
        this.fireCooldown -= dt;

        // Trouver une cible si on n'en a pas ou si la cible est morte
        if (!this.target || this.target.shouldBeRemoved) {
            this.findNearestTarget();
        }

        if (this.target) {
            const distanceToTarget = Vector.distance(this.pos, this.target.pos);
            // Si la cible est à portée, on tire
            if (distanceToTarget <= this.range) {
                this.vel = new Vector(); // Arrêter de bouger pour tirer
                if (this.fireCooldown <= 0) {
                    this.shoot();
                    this.fireCooldown = 1 / this.fireRate;
                }
            } else {
                // Sinon, on se déplace vers la cible
                const direction = this.target.pos.subtract(this.pos).normalize();
                this.vel = direction.multiply(this.speed);
            }
        } else {
            // Pas de cible, mouvement de patrouille ou vers le joueur
            if (gameState.player) {
                const direction = gameState.player.pos.subtract(this.pos).normalize();
                this.vel = direction.multiply(this.speed * 0.5); // Plus lent en patrouille
            }
        }

        super.update(dt);
    }

    findNearestTarget() {
        let closestEnemy = null;
        let minDistance = this.range * 2; // Cherche un peu plus loin que la portée
        for (const enemy of gameState.enemies) {
            if (enemy.shouldBeRemoved) continue;
            const distance = Vector.distance(this.pos, enemy.pos);
            if (distance < minDistance) {
                minDistance = distance;
                closestEnemy = enemy;
            }
        }
        this.target = closestEnemy;
    }

    shoot() {
        if (!this.target) return;
        const projectileSpeed = 500;
        const direction = this.target.pos.subtract(this.pos).normalize();
        const velocity = direction.multiply(projectileSpeed);
        const p = new Projectile(this.pos.x, this.pos.y, 4, 'cyan', velocity, this.damage, 2);
        p.isAllyProjectile = true;
        gameState.projectiles.push(p);
        gameState.entities.push(p);
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.shouldBeRemoved = true;
        }
    }

    draw(ctx, camera) {
        // Dessin de base + barre de vie verte
        super.draw(ctx, camera);
        const screenPos = worldToScreen(this.pos, camera);
        const screenRadius = this.radius * camera.zoom;
        const barWidth = 40 * camera.zoom;
        const barHeight = 5 * camera.zoom;
        const barX = screenPos.x - barWidth / 2;
        const barY = screenPos.y - screenRadius - 10 * camera.zoom;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = 'green';
        ctx.fillRect(barX, barY, barWidth * (this.health / this.maxHealth), barHeight);
    }
}

class Missile extends Projectile {
    constructor(x, y, damage, target) {
        super(x, y, 6, 'orangered', new Vector(), damage, 10);
        this.target = target;
        this.speed = 300;
        this.turnRate = Math.PI; // Tourne plus vite qu'une fusée
    }

    update(dt) {
        if (this.target && !this.target.shouldBeRemoved) {
             const directionToTarget = this.target.pos.subtract(this.pos).normalize();
            let currentAngle = Math.atan2(this.vel.y, this.vel.x);
            const angleToTarget = Math.atan2(directionToTarget.y, directionToTarget.x);
            let angleDifference = angleToTarget - currentAngle;
            while (angleDifference > Math.PI) angleDifference -= Math.PI * 2;
            while (angleDifference < -Math.PI) angleDifference += Math.PI * 2;

            const turnAmount = this.turnRate * dt;
            currentAngle += Math.min(turnAmount, Math.max(-turnAmount, angleDifference));

            this.vel = new Vector(Math.cos(currentAngle), Math.sin(currentAngle)).multiply(this.speed);
        } else {
            // Si la cible est perdue, continue tout droit
            this.vel = this.vel.magnitude() > 0 ? this.vel : new Vector(0, -this.speed);
        }
        super.update(dt);
    }
}

class Pentagram {
    constructor(player) {
        this.player = player;
        this.active = false;
        this.radius = 0;
        this.maxRadius = 1500;
        this.expandSpeed = 3000;
        this.color = `hsla(300, 100%, 50%, 0.5)`;
    }

    activate() {
        if (gameState.pentagramCharge >= gameState.pentagramMaxCharge) {
            this.active = true;
            this.radius = 0;
            gameState.pentagramCharge = 0;
            audioManager.playEffect('gameOver', 'A1', '1n');
        }
    }

    update(dt) {
        if (this.active) {
            this.radius += this.expandSpeed * dt;
            if (this.radius >= this.maxRadius) {
                this.active = false;
                // Appliquer les dégâts à la fin
                this.dealDamage();
            } else {
                // Mettre à jour la couleur pour un effet pulsant
                const hue = (gameState.gameTime * 100) % 360;
                this.color = `hsla(${hue}, 100%, 70%, 0.5)`;
            }
        }
    }

    dealDamage() {
        gameState.enemies.forEach(enemy => {
            // Tue tous les ennemis à l'écran, sauf les boss
            if (!(enemy instanceof MiniBoss)) {
                enemy.takeDamage(99999);
            }
        });
    }

    draw(ctx, camera) {
        if (this.active) {
            const screenPos = worldToScreen(this.player.pos, camera);
            const screenRadius = this.radius * camera.zoom;
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        }
    }
}

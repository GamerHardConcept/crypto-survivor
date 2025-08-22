// WS: Fichier pour les armes et les améliorations

class Weapon {
    constructor(owner) {
        this.owner = owner;
        this.level = 1;
        this.lastFireTime = 0;
        this.fireRate = 1; // tirs par seconde
        this.damage = 10;
        this.projectileSpeed = 400;
        this.range = 500;
        this.name = "Arme de base";
        this.description = "Description de base";
        this.icon = '🔫';
    }

    update(dt) {
        this.lastFireTime += dt;
        if (this.lastFireTime >= 1 / this.fireRate) {
            this.fire();
            this.lastFireTime = 0;
        }
    }

    fire() { /* A implémenter dans les sous-classes */ }

    levelUp() {
        this.level++;
        // Améliorations génériques
        this.damage *= 1.2;
        this.fireRate *= 1.1;
    }
    
    getUpgradeInfo() {
        return `Niv. ${this.level + 1}: Améliore les dégâts et la cadence.`
    }
}

class FomoGun extends Weapon {
    constructor(owner) {
        super(owner);
        this.name = "FOMO Gun";
        this.description = "Tire sur l'ennemi le plus proche.";
        this.fireRate = 2;
        this.damage = 15;
        this.icon = '🔥';
    }

    fire() {
        let closestEnemy = null;
        let minDistance = this.range;

        gameState.enemies.forEach(enemy => {
            if (enemy.shouldBeRemoved) return;
            const distance = Vector.distance(this.owner.pos, enemy.pos);
            if (distance < minDistance) {
                minDistance = distance;
                closestEnemy = enemy;
            }
        });

        if (closestEnemy) {
            audioManager.playEffect('laser', 'C5', '16n');
            const direction = closestEnemy.pos.subtract(this.owner.pos).normalize();
            const velocity = direction.multiply(this.projectileSpeed);
            const p = new Projectile(this.owner.pos.x, this.owner.pos.y, 5, 'yellow', velocity, this.damage * this.owner.damage);
            gameState.projectiles.push(p);
            gameState.entities.push(p);
        }
    }
    
    levelUp() {
        super.levelUp();
        if (this.level === 3) this.fireRate *= 1.5;
        if (this.level === 5) this.damage *= 2;
    }
}

class SpiralGun extends Weapon {
    constructor(owner) {
        super(owner);
        this.name = "Spiral Ether";
        this.description = "Lance des projectiles en spirale.";
        this.fireRate = 10;
        this.damage = 8;
        this.angle = 0;
        this.projectilesPerShot = 1;
        this.icon = '🌀';
    }

    fire() {
         for (let i = 0; i < this.projectilesPerShot; i++) {
            const currentAngle = this.angle + (i * (Math.PI * 2 / this.projectilesPerShot));
            const direction = new Vector(Math.cos(currentAngle), Math.sin(currentAngle));
            const velocity = direction.multiply(this.projectileSpeed);
            const p = new Projectile(this.owner.pos.x, this.owner.pos.y, 4, 'violet', velocity, this.damage * this.owner.damage);
            gameState.projectiles.push(p);
            gameState.entities.push(p);
        }
        this.angle += 0.5; // Radian
    }
    
    levelUp() {
        super.levelUp();
        if (this.level === 3) this.projectilesPerShot = 2;
        if (this.level === 5) this.projectilesPerShot = 3;
    }
}

class LaserGun extends Weapon {
    constructor(owner) {
        super(owner);
        this.name = "Rayon Solana";
        this.description = "Tire un laser persistant dans une direction.";
        this.fireRate = 0; // Pas de tirs discrets
        this.damage = 5; // Dégâts par seconde
        this.laserAngle = 0;
        this.laserDuration = 0;
        this.laserLength = 400;
        this.rotationSpeed = Math.PI / 2; // 90 degrés par seconde
        this.icon = '⚡';
    }

    update(dt) {
        this.laserAngle += this.rotationSpeed * dt;
        // Inflige des dégâts aux ennemis touchés par le laser
        const dir = new Vector(Math.cos(this.laserAngle), Math.sin(this.laserAngle));
        const endPoint = this.owner.pos.add(dir.multiply(this.laserLength));

        gameState.enemies.forEach(enemy => {
            // Simple collision check (point-segment)
            const dist = Vector.distance(enemy.pos, this.owner.pos);
            if (dist < this.laserLength) {
                const enemyDir = enemy.pos.subtract(this.owner.pos).normalize();
                const dot = dir.x * enemyDir.x + dir.y * enemyDir.y;
                if (dot > 0.98) { // Cône de collision étroit
                    enemy.takeDamage(this.damage * this.owner.damage * dt);
                }
            }
        });
    }

    fire() { /* Pas utilisé */ }
    
    levelUp(){
        super.levelUp();
        this.damage *= 1.5;
        if(this.level === 3) this.laserLength *= 1.5;
        if(this.level === 5) this.rotationSpeed *= 1.5;
    }

    draw(ctx, camera) {
        const screenPos = worldToScreen(this.owner.pos, camera);
        const dir = new Vector(Math.cos(this.laserAngle), Math.sin(this.laserAngle));
        const endPoint = this.owner.pos.add(dir.multiply(this.laserLength));
        const screenEndPoint = worldToScreen(endPoint, camera);

        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y);
        ctx.lineTo(screenEndPoint.x, screenEndPoint.y);
        ctx.strokeStyle = 'cyan';
        ctx.lineWidth = 3 * camera.zoom;
        ctx.stroke();
    }
}

class MineLayer extends Weapon {
    constructor(owner) {
        super(owner);
        this.name = "Mine de Satoshi";
        this.description = "Pose des mines qui explosent au contact.";
        this.fireRate = 0.5;
        this.damage = 50;
        this.icon = '💣';
    }

    fire() {
        const mine = new Mine(this.owner.pos.x, this.owner.pos.y, this.damage * this.owner.damage);
        gameState.projectiles.push(mine);
        gameState.entities.push(mine);
    }
    
    levelUp() {
         super.levelUp();
         if(this.level === 3) this.fireRate *= 1.5;
         if(this.level === 5) this.damage *= 2;
    }
}

class Mine extends Projectile {
    constructor(x, y, damage) {
        super(x, y, 8, 'darkorange', new Vector(), damage, 60); // Longue durée de vie
        this.explosionRadius = 100;
    }

    update(dt) {
        // La mine est stationnaire, donc pas de super.update()
        // Vérifier la collision
        gameState.enemies.forEach(enemy => {
            if (Vector.distance(this.pos, enemy.pos) < this.radius + enemy.radius) {
                this.explode();
            }
        });
        
        if (gameState.gameTime - this.spawnTime > this.lifetime) {
            this.shouldBeRemoved = true;
        }
    }

    explode() {
        this.shouldBeRemoved = true;
        // Créer un effet visuel d'explosion
        for (let i = 0; i < 30; i++) {
            const p = new Particle(this.pos.x, this.pos.y, 'orange', Math.random() * 3 + 1, 0.5);
            gameState.particles.push(p);
            gameState.entities.push(p);
        }
        // Infliger des dégâts de zone
        gameState.enemies.forEach(enemy => {
            if (Vector.distance(this.pos, enemy.pos) < this.explosionRadius) {
                enemy.takeDamage(this.damage);
            }
        });
    }
}

class MagnetismAura extends Weapon {
    constructor(owner) {
        super(owner);
        this.name = "Aura Magnétique";
        this.description = "Augmente la portée d'attraction des orbes d'XP.";
        this.fireRate = 0;
        this.icon = '🧲';
    }
    update(dt) {}
    fire() {}
    levelUp(){
        super.levelUp();
        this.owner.magnetRadius *= 1.25;
    }
    getUpgradeInfo() {
        return `Niv. ${this.level + 1}: Augmente la portée d'attraction de 25%.`
    }
}

class LiquidationWave extends Weapon {
    constructor(owner) {
        super(owner);
        this.name = "Vague de Liquidation";
        this.description = "Annihile les ennemis faibles autour du joueur.";
        this.fireRate = 1 / 10; // Toutes les 10 secondes
        this.damage = 20;
        this.radius = 200;
        this.icon = '🌊';
    }
    
    fire() {
        createFloatingText('LIQUIDATION!', this.owner.pos, 'red', 2, 1.5);
        // Effet visuel
        const waveEffect = new Entity(this.owner.pos.x, this.owner.pos.y, 10, 'rgba(255, 0, 0, 0.5)');
        waveEffect.isEffect = true;
        waveEffect.update = function(dt) {
            this.radius += 500 * dt;
            this.color = `rgba(255, 0, 0, ${1 - (this.radius / 500)})`;
            if (this.radius > 500) this.shouldBeRemoved = true;
        }
        gameState.entities.push(waveEffect);

        gameState.enemies.forEach(enemy => {
            if (Vector.distance(this.owner.pos, enemy.pos) < this.radius) {
                if (enemy.health < this.damage * this.owner.damage) {
                    enemy.takeDamage(99999);
                }
            }
        });
    }

    levelUp() {
        super.levelUp();
        this.damage *= 1.5;
        this.radius *= 1.1;
        if (this.level % 2 === 0) this.fireRate *= 1.2;
    }
}

class Supertrader extends Weapon {
    constructor(owner) {
        super(owner);
        this.name = "Supertrader";
        this.description = "Active une capacité spéciale dévastatrice.";
        this.fireRate = 0; // Activé manuellement
        this.icon = '🚀';
    }
    update(dt) {}
    fire() {}
    levelUp() {
        super.levelUp();
        this.owner.specialAbility.cooldown *= 0.9; // Réduit le cooldown
    }
    getUpgradeInfo() {
        return `Niv. ${this.level + 1}: Réduit le temps de recharge de 10%.`
    }
}

const allUpgrades = [
    new FomoGun(),
    new SpiralGun(),
    new LaserGun(),
    new MineLayer(),
    new MagnetismAura(),
    new LiquidationWave(),
    new Supertrader(),
    new BonusUpgrade('hp_boost', 'Vitalité', 'Augmente la vie maximale de 20%.', p => p.maxHealth *= 1.2, p => {}, 5),
    new BonusUpgrade('speed_boost', 'Agilité', 'Augmente la vitesse de 10%.', p => p.speed *= 1.1, p => {}, 5),
    new BonusUpgrade('damage_boost', 'Puissance', 'Augmente les dégâts de 15%.', p => p.damage *= 1.15, p => {}, 5),
];

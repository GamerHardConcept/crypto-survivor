// WS: Fichier contenant les données de jeu (personnages, vagues, améliorations)

const characters = {
    'MVX': {
        id: 'MVX',
        name: 'MVX',
        subName: 'Roquette HODL',
        iconHTML: '<span class="char-icon-letter" style="color:#00f5d4;">X</span>',
        description: 'Un trader équilibré avec un pistolet FOMO.',
        hp: 100, speed: 200, damage: 1, baseWeapon: 'FomoGun',
        unlockCost: 0,
    },
    'AVAX': {
        id: 'AVAX',
        name: 'AVAX',
        subName: 'Avalanche',
        iconHTML: '<span class="char-icon-letter" style="color:#e84142;">A</span>',
        description: 'Lance des projectiles en cône.',
        hp: 90, speed: 210, damage: 0.9, baseWeapon: 'ConeGun',
        unlockCost: 1000,
    },
    'ETH': {
        id: 'ETH',
        name: 'ETH',
        subName: 'Gas Burn',
        iconHTML: '<span class="char-icon-letter" style="color:#627eea;">♦</span>',
        description: 'Lance des projectiles en spirale.',
        hp: 80, speed: 220, damage: 0.8, baseWeapon: 'SpiralGun',
        unlockCost: 1000,
    },
    'SOL': {
        id: 'SOL',
        name: 'SOL',
        subName: 'Network Haste',
        iconHTML: '<span class="char-icon-letter" style="color:#9945FF;">S</span>',
        description: 'Rapide et mortel, utilise un rayon laser continu.',
        hp: 70, speed: 250, damage: 1.2, baseWeapon: 'LaserGun',
        unlockCost: 2000,
    },
    'AAVE': {
        id: 'AAVE',
        name: 'AAVE',
        subName: 'Flash Loan',
        iconHTML: '<img src="./assets/images/ghost.png" style="width:32px;height:32px;">',
        description: 'Vole la vie des ennemis.',
        hp: 120, speed: 180, damage: 0.7, baseWeapon: 'LifeStealAura',
        unlockCost: 1500,
    },
    'BTC': {
        id: 'BTC',
        name: 'BTC',
        subName: 'Digital Gold',
        iconHTML: '<span class="char-icon-letter" style="color:#f7931a;">B</span>',
        description: 'Solide et puissant, mais lent.',
        hp: 150, speed: 170, damage: 1.3, baseWeapon: 'FomoGun',
        unlockCost: 5000,
    },
    'GRT': {
        id: 'GRT',
        name: 'GRT',
        subName: 'Indexing',
        iconHTML: '<span class="char-icon-letter" style="color:#6747ed;">G</span>',
        description: 'Lance des projectiles à tête chercheuse.',
        hp: 85, speed: 210, damage: 1, baseWeapon: 'HomingMissileLauncher',
        unlockCost: 2500,
    },
    'DOGE': {
        id: 'DOGE',
        name: 'DOGE',
        subName: 'Much Wow',
        iconHTML: '<span class="char-icon-letter" style="color:#c3a634;">D</span>',
        description: 'Tire dans tous les sens.',
        hp: 60, speed: 230, damage: 0.6, baseWeapon: 'WildShotgun',
        unlockCost: 500,
    },
    'CRO': {
        id: 'CRO',
        name: 'CRO',
        subName: 'Cronos Chain',
        iconHTML: '<span class="char-icon-letter" style="color:#0e1a35;">C</span>',
        description: 'Gagne en puissance avec le temps.',
        hp: 90, speed: 200, damage: 0.8, baseWeapon: 'ScalingGun',
        unlockCost: 1200,
    },
    'ZIL': {
        id: 'ZIL',
        name: 'ZIL',
        subName: 'Sharding',
        iconHTML: '<span class="char-icon-letter" style="color:#49c6ad;">Z</span>',
        description: 'Tire plusieurs projectiles à la fois.',
        hp: 75, speed: 220, damage: 0.7, baseWeapon: 'MultiShotgun',
        unlockCost: 1800,
    },
    'BNB': {
        id: 'BNB',
        name: 'BNB',
        subName: 'Smart Chain',
        iconHTML: '<span class="char-icon-letter" style="color:#f0b90b;">N</span>',
        description: 'Crée des explosions en chaîne.',
        hp: 95, speed: 205, damage: 1.1, baseWeapon: 'ChainReactionGun',
        unlockCost: 3000,
    },
    'HTM': {
        id: 'HTM',
        name: 'HTM',
        subName: 'Liquid Stake',
        iconHTML: '<span class="char-icon-letter" style="color:#ff5722;">H</span>',
        description: 'Lance des flaques qui ralentissent et blessent.',
        hp: 110, speed: 190, damage: 0.9, baseWeapon: 'AcidPoolLauncher',
        unlockCost: 2200,
    }
};

const permanentUpgrades = [
    {
        id: 'perm_hp',
        name: 'HP Max',
        description: 'Augmente les points de vie maximum de tous les personnages.',
        maxLevel: 10,
        bonus: 0.1, // +10% par niveau
        cost: (level) => 100 * (level + 1),
        apply: (player, level) => { player.maxHealth *= (1 + level * 0.1); player.health = player.maxHealth; }
    },
    {
        id: 'perm_speed',
        name: 'Vitesse',
        description: 'Augmente la vitesse de déplacement de tous les personnages.',
        maxLevel: 5,
        bonus: 0.05, // +5% par niveau
        cost: (level) => 150 * (level + 1),
        apply: (player, level) => { player.speed *= (1 + level * 0.05); }
    },
    {
        id: 'perm_damage',
        name: 'Dégâts',
        description: 'Augmente les dégâts de base de tous les personnages.',
        maxLevel: 10,
        bonus: 0.08, // +8% par niveau
        cost: (level) => 200 * (level + 1),
        apply: (player, level) => { player.damage *= (1 + level * 0.08); }
    },
    {
        id: 'perm_luck',
        name: 'Chance',
        description: 'Augmente les chances de trouver des objets rares.',
        maxLevel: 5,
        bonus: 0.05, // +5% par niveau
        cost: (level) => 300 * (level + 1),
        apply: (player, level) => { /* Logique de chance à implémenter */ }
    }
];

const waves = [
    { interval: 3, count: 5, types: ['normal'] }, // 0-30s
    { interval: 2.5, count: 8, types: ['normal'] }, // 30-60s
    { interval: 2.5, count: 10, types: ['normal', 'normal', 'tank'] }, // 1-1:30m
    { interval: 2, count: 15, types: ['normal', 'tank'] }, // 1:30-2m
    { interval: 2, count: 15, types: ['normal', 'tank', 'miniboss'] }, // 2-2:30m
    { interval: 1.5, count: 20, types: ['normal', 'tank'] }, // 2:30-3m
    { interval: 1, count: 30, types: ['normal', 'tank', 'miniboss'] }, // 3m+
];

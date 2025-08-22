// WS: Fichier contenant les données de jeu (personnages, vagues, améliorations)

const characters = {
    'MVX': {
        name: 'MVX Chad',
        description: 'Un trader équilibré avec un pistolet FOMO.',
        color: '#00f5d4',
        hp: 100,
        speed: 200,
        damage: 1, // 100% base damage
        baseWeapon: 'FomoGun',
        special: {
            name: 'Pump it!',
            cooldown: 30,
            activate: (player) => {
                // Augmente temporairement la cadence de tir et la vitesse
                createFloatingText('PUMP IT!', player.pos, 'gold', 2, 3);
            }
        }
    },
    'ETH': {
        name: 'Ethereum Sage',
        description: 'Lance des projectiles en spirale.',
        color: '#627eea',
        hp: 80,
        speed: 220,
        damage: 0.8,
        baseWeapon: 'SpiralGun',
        special: {
            name: 'Merge',
            cooldown: 45,
            activate: (player) => {
                // Crée une onde de choc qui repousse les ennemis
                 createFloatingText('MERGE!', player.pos, 'white', 2, 3);
            }
        }
    },
     'SOL': {
        name: 'Solana Striker',
        description: 'Rapide et mortel, utilise un rayon laser continu.',
        color: '#9945FF',
        hp: 70,
        speed: 250,
        damage: 1.2,
        baseWeapon: 'LaserGun',
        special: {
            name: 'Network-wide',
            cooldown: 40,
            activate: (player) => {
                // Devient invincible pour une courte durée
                createFloatingText('INVINCIBLE!', player.pos, 'cyan', 2, 3);
            }
        }
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

// --- CONSTANTES & CONFIGURATION ---
const WORLD_WIDTH = 5000;
const WORLD_HEIGHT = 5000;
const ENEMY_BASE_SPAWN_RATE = 2000; // ms
const MAGNET_SPAWN_RATE = 25000; // 25 secondes
const HEALTH_SPAWN_RATE = 20000; // 20 secondes
const TOWER_WAVE_INTERVAL = 8000; // intervalle entre vagues (ms)

// --- ÉTAT DU JEU ---
let gameState = 'mainMenu';
let gameMode = 'survivor'; // 'survivor' ou 'armyAttack'
let players = []; // Gère tous les joueurs (humain + bots)
let animationFrameId;
let camera = { x: 0, y: 0 };
let zoomFactor = 1.0; // Facteur de zoom pour le mobile
let entities = {
    enemies: [], projectiles: [], xpOrbs: [], particles: [],
    floatingTexts: [], healthPickups: [], magnets: [], bonusUpgrades: [],
    soldiers: [], pentagrams: []
};
let timers = { game: 0, enemySpawn: 0, healthSpawn: 0, magnetSpawn: 0 };
let armyAttackTimers = { wave: 0, waveCount: 0 };
let lastTime = performance.now();
let activeMiniBoss = null;
let selectedUpgrades = [];
let selectedMap = null;

// --- Données persistantes ---
let globalWallet = 0;
let unlockedCharacters = ['MVX'];
let permanentUpgrades = {
    damage: 0, // Niveau actuel
    health: 0,
    xpGain: 0,
    attackSpeed: 0,
};

// --- SÉLECTEURS D'ÉLÉMENTS DU DOM ---
const dom = {
    screens: {
        mainMenu: document.getElementById('main-menu-screen'),
        characterSelection: document.getElementById('character-selection-screen'),
        mapSelection: document.getElementById('map-selection-screen'),
        levelUp: document.getElementById('level-up-screen'),
        gameOver: document.getElementById('game-over-screen'),
        shop: document.getElementById('shop-screen'),
        pause: document.getElementById('pause-screen'),
        confirmQuit: document.getElementById('confirm-quit-screen'),
        multiplayerLobby: document.getElementById('multiplayer-lobby-screen'),
        waitingRoom: document.getElementById('waiting-room-screen'),
        multiplayerMode: document.getElementById('multiplayer-mode-screen'),
    },
    gameHud: document.getElementById('game-hud'),
    armyPanel: document.getElementById('army-purchase-panel'),
    upgradePanel: document.getElementById('upgrade-panel'),
    buttons: {
        startGame: document.getElementById('start-game-button'),
        multiplayer: document.getElementById('multiplayer-button'),
        shop: document.getElementById('shop-button'),
        backToMenu: document.getElementById('back-to-menu-button'),
        backFromCharSelect: document.getElementById('back-to-menu-from-char-select-button'),
        restart: document.getElementById('restart-button'),
        specialAbility: document.getElementById('special-ability-button'),
        mute: document.getElementById('mute-button'),
        pause: document.getElementById('pause-button'),
        resume: document.getElementById('resume-button'),
        restartFromPause: document.getElementById('restart-from-pause-button'),
        mainMenuFromPause: document.getElementById('main-menu-from-pause-button'),
        confirmQuitYes: document.getElementById('confirm-quit-yes-button'),
        confirmQuitNo: document.getElementById('confirm-quit-no-button'),
        confirmUpgrade: document.getElementById('confirm-upgrade-button'),
        createGame: document.getElementById('create-game-button'),
        joinGame: document.getElementById('join-game-button'),
        backToMenuFromLobby: document.getElementById('back-to-menu-from-lobby-button'),
        backToLobbyFromWaiting: document.getElementById('back-to-lobby-from-waiting-button'),
        startVsAi: document.getElementById('start-vs-ai-button'),
        nextFromMapSelect: document.getElementById('next-from-map-select-button'),
        backToMenuFromMapSelect: document.getElementById('back-to-menu-from-map-select-button'),
        armyAttack: document.getElementById('army-attack-button'),
        backToMenuFromModeSelect: document.getElementById('back-to-menu-from-mode-select-button'),
        armyPanelToggle: document.getElementById('army-panel-toggle'),
        upgradePanelToggle: document.getElementById('upgrade-panel-toggle'),
    },
    displays: {
        charChoicesContainer: document.getElementById('character-choices-container'),
        passiveUpgrades: document.getElementById('passive-upgrades-display'),
        weaponUI: document.getElementById('weapon-display-ui'),
        levelUpOptions: document.getElementById('level-up-options'),
        levelUpTitle: document.getElementById('level-up-title'),
        levelUpSubtitle: document.getElementById('level-up-subtitle'),
        topHealthBarFill: document.getElementById('top-health-bar-fill'),
        topHealthBarText: document.getElementById('top-health-bar-text'),
        playerLevel: document.getElementById('player-level'),
        playerWallet: document.getElementById('player-wallet'),
        gameTimer: document.getElementById('game-timer'),
        xpBar: document.getElementById('xp-bar'),
        xpBarText: document.getElementById('xp-bar-text'),
        finalTime: document.getElementById('final-time'),
        finalLevel: document.getElementById('final-level'),
        finalGain: document.getElementById('final-gain'),
        shopWallet: document.getElementById('shop-wallet-display'),
        shopItemsContainer: document.getElementById('shop-items-container'),
        minimapCanvas: document.getElementById('minimap-canvas'),
        bonusTimer: document.getElementById('bonus-timer'),
        gameIdDisplay: document.getElementById('game-id-display'),
        skillPoints: document.getElementById('skill-points-display'),
        multiplayerUpgradesContainer: document.getElementById('multiplayer-upgrades-container'),
        fusionTitle: document.getElementById('fusion-title'),
        fusionOptionsContainer: document.getElementById('fusion-options-container'),
        pentagramChargeContainer: document.getElementById('pentagram-charge-container'),
        pentagramChargeBar: document.getElementById('pentagram-charge-bar'),
    }
};

// --- Configuration de la boutique ---
const shopData = {
    damage: {
        name: "Bonus de Dégâts",
        icon: "❤️", // Sera rouge
        levels: [
            { bonus: 0.10, cost: 10000 },
            { bonus: 0.20, cost: 30000 },
            { bonus: 0.30, cost: 60000 },
            { bonus: 0.50, cost: 180000 },
            { bonus: 0.75, cost: 540000 },
        ]
    },
    health: {
        name: "Bonus de Vie",
        icon: "💚",
        levels: [
            { bonus: 0.10, cost: 10000 },
            { bonus: 0.20, cost: 30000 },
            { bonus: 0.30, cost: 60000 },
            { bonus: 0.50, cost: 180000 },
            { bonus: 0.75, cost: 540000 },
        ]
    },
    xpGain: {
        name: "Bonus de Gain d'XP",
        icon: "💙",
        levels: [
            { bonus: 0.10, cost: 10000 },
            { bonus: 0.20, cost: 30000 },
            { bonus: 0.30, cost: 60000 },
            { bonus: 0.50, cost: 180000 },
            { bonus: 0.75, cost: 540000 },
        ]
    },
    attackSpeed: {
        name: "Bonus de Vitesse d'Attaque",
        icon: "💛",
        levels: [
            { bonus: 0.10, cost: 10000 }, // bonus = réduction du cooldown
            { bonus: 0.20, cost: 30000 },
            { bonus: 0.30, cost: 60000 },
            { bonus: 0.50, cost: 180000 },
            { bonus: 0.75, cost: 540000 },
        ]
    }
};

const armyUnitData = {
    triangle: {
        cost: 50,
        shape: '▲',
        damage: 10,
        fireRate: 1000, // ms
        projectileSpeed: 4,
        color: 'mvx'
    },
    square: {
        cost: 100,
        shape: '■',
        damage: 25,
        fireRate: 1500,
        projectileSpeed: 3,
        color: 'sol'
    },
    rectangle: {
        cost: 150,
        shape: '▬',
        damage: 40,
        fireRate: 2000,
        projectileSpeed: 5,
        color: 'eth'
    }
};

// --- Configuration des améliorations multijoueur ---
let multiplayerUpgrades = {
    soldierDamage: {
        name: "Dégâts Soldats",
        icon: "💥",
        level: 0,
        maxLevel: 10,
        cost: 1,
        bonus: 0.15 // +15% par niveau
    },
    soldierFireRate: {
        name: "Cadence Soldats",
        icon: "⏱️",
        level: 0,
        maxLevel: 10,
        cost: 1,
        bonus: 0.10 // -10% cooldown par niveau
    }
};

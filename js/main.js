document.addEventListener('DOMContentLoaded', () => {
    // --- GESTIONNAIRE AUDIO ---
    const audioManager = {
        isInitialized: false,
        isMuted: false,
        currentMusicType: null,
        synths: {},
        music: {
            menu: null,
            game: null,
            miniBoss: null,
            mainBoss: null,
            gameOver: null
        },

        async initialize() {
            if (this.isInitialized) return;
            await Tone.start();
            console.log("Audio context started.");

            // --- EFFETS SONORES ---
            this.synths.shoot = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: 'triangle' },
                envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.1 },
                volume: -15
            }).toDestination();
            this.synths.playerHit = new Tone.Synth({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.1 } }).toDestination();
            this.synths.levelUp = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'fmsine' }, envelope: { attack: 0.05, decay: 0.3, sustain: 0.1, release: 0.5 } }).toDestination();
            this.synths.enemyDefeat = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 10, oscillator: { type: 'sine' }, envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4, attackCurve: 'exponential' }, volume: -10 }).toDestination();
            this.synths.collect = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 }, volume: -10 }).toDestination();
            this.synths.healthPickup = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.05, decay: 0.3, sustain: 0.1, release: 0.5 }, volume: -8 }).toDestination();
            this.synths.explosion = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.005, decay: 0.2, sustain: 0 }, volume: -5 }).toDestination();
            this.synths.purchase = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.2 }, volume: -5 }).toDestination();


            // --- MUSIQUE DE MENU ---
            const menuSynth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "fatsawtooth", count: 3, spread: 30 }, envelope: { attack: 0.8, decay: 0.5, sustain: 0.8, release: 2 }, volume: -25 }).toDestination();
            const menuMelodySynth = new Tone.FMSynth({
                harmonicity: 3,
                modulationIndex: 10,
                oscillator: { type: "sine" },
                envelope: { attack: 0.2, decay: 0.3, sustain: 0.1, release: 1 },
                volume: -15
            }).toDestination();

            const menuChords = [
                { time: '0:0', notes: ['C3', 'D#3', 'G3'], duration: '1m' },
                { time: '1:0', notes: ['G#2', 'C3', 'D#3'], duration: '1m' },
                { time: '2:0', notes: ['D#3', 'G3', 'A#3'], duration: '1m' },
                { time: '3:0', notes: ['A#2', 'D3', 'F3'], duration: '1m' },
            ];
            const menuChordPart = new Tone.Part((time, value) => { menuSynth.triggerAttackRelease(value.notes, value.duration, time); }, menuChords).start(0);
            menuChordPart.loop = true;
            menuChordPart.loopEnd = '4m';

            const menuMelody = new Tone.Sequence((time, note) => {
                if (note) menuMelodySynth.triggerAttackRelease(note, "8n", time);
            }, [
                'G4', 'A#4', 'C5', null, 'G4', null, 'D#4', null,
                'G4', 'A#4', 'C5', null, 'G4', null, 'D#4', null,
                'F4', 'G4', 'G#4', null, 'F4', null, 'D4', null,
                'F4', 'G4', 'G#4', null, 'F4', null, 'D#4', null
            ], "8n").start(0);
            menuMelody.loop = true;
            menuMelody.loopEnd = '4m';

            // --- Éléments rythmiques pour la phase 2 ---
            const kick = new Tone.MembraneSynth({ volume: -8 }).toDestination();
            const snare = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.001, decay: 0.2, sustain: 0 }, volume: -12 }).toDestination();
            const hihat = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.05, sustain: 0 }, volume: -20 }).toDestination();
            const epicBass = new Tone.MonoSynth({ oscillator: { type: 'fmsquare' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.4 }, volume: -14 }).toDestination();

            // Boucles rythmiques qui démarrent après la première passe
            const kickLoop = new Tone.Loop(time => { kick.triggerAttackRelease('C1', '8n', time); }, '4n').start('4m');
            const snareLoop = new Tone.Loop(time => { snare.triggerAttackRelease('8n', time); }, '2n').start('4m+4n');
            const hihatLoop = new Tone.Loop(time => { hihat.triggerAttackRelease('16n', time); }, '8n').start('4m');

            const epicBassPart = new Tone.Sequence((time, note) => {
                epicBass.triggerAttackRelease(note, '4n', time);
            }, ['C2', 'C2', 'C2', 'C2', 'G#1', 'G#1', 'G#1', 'G#1', 'D#2', 'D#2', 'D#2', 'D#2', 'A#1', 'A#1', 'A#1', 'A#1'], '4n').start('4m');
            
            epicBassPart.loop = true;
            epicBassPart.loopEnd = '4m';


            // Build-up rythmique avant la phase 2
            const buildupPart = new Tone.Part((time, value) => {
                hihat.triggerAttackRelease(value.duration, time);
            }, [
                { time: "3:2:0", duration: "16n" },
                { time: "3:2:2", duration: "16n" },
                { time: "3:3:0", duration: "8n" },
                { time: "3:3:2", duration: "8n" },
            ]).start(0);
            buildupPart.loop = false; // Ne se joue qu'une fois

            this.music.menu = [menuChordPart, menuMelody, kickLoop, snareLoop, hihatLoop, epicBassPart, buildupPart];


            // --- MUSIQUE DE GAME OVER ---
            const gameOverMelodySynth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'fatsawtooth' }, envelope: { attack: 0.1, decay: 0.5, sustain: 0.2, release: 1 }, volume: -12 }).toDestination();
            this.music.gameOver = new Tone.Sequence((time, note) => { gameOverMelodySynth.triggerAttackRelease(note, '4n', time); }, ['G3', 'D#3', 'C3', 'G2'], '4n');
            this.music.gameOver.loop = false;

            // --- MUSIQUES DE JEU ET BOSS ---
            const createMusicLoop = (bpm, bassNotes, arpNotes, leadNotes = null) => {
                const parts = [];
                const kick = new Tone.MembraneSynth({ volume: -6 }).toDestination();
                const snare = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.001, decay: 0.2, sustain: 0 }, volume: -12 }).toDestination();
                const hihat = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.05, sustain: 0 }, volume: -20 }).toDestination();
                const bass = new Tone.MonoSynth({ oscillator: { type: 'fmsquare' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.4 }, volume: -10 }).toDestination();
                const arpSynth = new Tone.FMSynth({ harmonicity: 1.5, modulationIndex: 5, envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2 }, volume: -20 }).toDestination();
                
                parts.push(new Tone.Loop(time => { kick.triggerAttackRelease('C1', '8n', time); }, '4n'));
                parts.push(new Tone.Loop(time => { hihat.triggerAttackRelease('16n', time); }, '8n'));
                if (leadNotes) { // Ajout de la caisse claire pour les boss
                     parts.push(new Tone.Loop(time => { snare.triggerAttackRelease('16n', time); }, '2n').start('4n'));
                }
                parts.push(new Tone.Sequence((time, note) => { bass.triggerAttackRelease(note, '2n', time); }, bassNotes, '1m'));
                parts.push(new Tone.Sequence((time, note) => { arpSynth.triggerAttackRelease(note, '16n', time); }, arpNotes, '16n'));
                
                if(leadNotes) {
                         const leadSynth = new Tone.DuoSynth({vibratoAmount: 0.1, harmonicity: 1, voice0: {oscillator: {type: 'sawtooth'}}, voice1: {oscillator: {type: 'sine'}}, volume: -15}).toDestination();
                         parts.push(new Tone.Sequence((time, note) => { leadSynth.triggerAttackRelease(note, '8n', time); }, leadNotes, '8n'));
                }
                return parts;
            };
            
            this.music.game = createMusicLoop(130, ['C2', 'G#1', 'D#2', 'A#1'], ['C3', 'D#3', 'G3', 'D#3']);
            this.music.miniBoss = createMusicLoop(140, ['C2', 'C2', 'G#1', 'G#1', 'D#2', 'D#2', 'A#1', 'A#1'], ['C4', 'D#4', 'G4', 'D#4'], ['C5', null, 'D#5', null]);
            this.music.mainBoss = createMusicLoop(150, ['C2', 'C2', 'C2', 'G#1', 'D#2', 'D#2', 'D#2', 'A#1'], ['C4', 'D#4', 'G4', 'A#4'], ['C5', 'D#5', 'G5', 'A#5', 'C6', 'A#5', 'G5', 'D#5']);

            this.isInitialized = true;
        },

        play(sound) {
            if (!this.isInitialized || this.isMuted) return;
            try {
                if (this.synths[sound]) {
                    if (sound === 'levelUp') this.synths.levelUp.triggerAttackRelease(['C4', 'E4', 'G4', 'C5'], '4n');
                    else if (sound === 'healthPickup') this.synths.healthPickup.triggerAttackRelease('A4', '8n');
                    else if (sound === 'explosion') this.synths.explosion.triggerAttackRelease('4n');
                    else if (sound === 'playerHit') this.synths.playerHit.triggerAttackRelease('G2', '8n');
                    else if (sound === 'enemyDefeat') this.synths.enemyDefeat.triggerAttackRelease("C1", "8n");
                    else if (sound === 'collect') this.synths.collect.triggerAttackRelease('C6', '16n');
                    else if (sound === 'shoot') this.synths.shoot.triggerAttackRelease('C5', '8n', Tone.now());
                    else if (sound === 'purchase') this.synths.purchase.triggerAttackRelease('C5', '8n');
                }
            } catch (e) { console.error(`Error playing sound ${sound}:`, e); }
        },

        playMusic(type) {
            if (!this.isInitialized || this.isMuted) return;
            this.stopAllMusic();
            this.currentMusicType = type;
            
            const musicToPlay = this.music[type];
            if (musicToPlay) {
                if (Array.isArray(musicToPlay)) {
                    musicToPlay.forEach(part => part.start(0));
                } else {
                    musicToPlay.start(0);
                }
            }
            
            if (Tone.Transport.state !== 'started') {
                Tone.Transport.start();
            }
        },

        stopAllMusic() {
            if (!this.isInitialized) return;
            Object.values(this.music).forEach(musicPart => {
                if (musicPart) {
                    if (Array.isArray(musicPart)) {
                        musicPart.forEach(part => part.stop(0));
                    } else {
                        musicPart.stop(0);
                    }
                }
            });
            if (Tone.Transport.state === 'started') {
                Tone.Transport.stop();
                Tone.Transport.cancel(0);
                Tone.Transport.position = 0;
            }
        },

        toggleMute() {
            this.isMuted = !this.isMuted;
            Tone.Destination.mute = this.isMuted;
            document.getElementById('mute-button').textContent = this.isMuted ? '🔇' : '🎵';
            
            if (this.isMuted) {
                this.stopAllMusic();
            } else {
                // Relance la musique appropriée en fonction de l'état du jeu
                const activeScreen = document.querySelector('.screen.active');
                if (activeScreen && activeScreen.id.includes('main-menu')) {
                    this.playMusic('menu');
                } else if (gameState === 'running') {
                     if (activeMiniBoss) {
                         this.playMusic(activeMiniBoss.isDemiBoss ? 'miniBoss' : 'mainBoss');
                    } else {
                         this.playMusic('game');
                    }
                }
            }
        }
    };

    // --- CONSTANTES & CONFIGURATION ---
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
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
    
    // --- CLASSES DU JEU ---

    class Vector {
        constructor(x = 0, y = 0) { this.x = x; this.y = y; }
        magnitude() { return Math.sqrt(this.x * this.x + this.y * this.y); }
        normalize() {
            const mag = this.magnitude();
            if (mag > 0) { this.x /= mag; this.y /= mag; }
            return this;
        }
    }
    
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
            const charData = characterData[this.charType];
            if (charData) {
                this.color = getComputedStyle(document.documentElement).getPropertyValue(charData.colorVar);
                this.symbol = charData.symbol;
                this.specialMaxCooldown = charData.cooldown;
            }
        }

        update(dt) {
            // Mouvement du joueur humain
            const moveX = (inputManager.keys.left ? -1 : 0) + (inputManager.keys.right ? 1 : 0);
            const moveY = (inputManager.keys.up ? -1 : 0) + (inputManager.keys.down ? 1 : 0);
            const keyboardMove = new Vector(moveX, moveY).normalize();
            const joystickMove = new Vector(inputManager.joystick.inputX, inputManager.joystick.inputY);
            
            let finalMove = (joystickMove.magnitude() > 0) ? joystickMove : keyboardMove;

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
                    // ... (le dessin du boss reste le même)
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
                    this.lifespan = 30000;
                    this.healAmount = 25;
                    this.isAttracted = false;
                }
                update(dt) {                    this.lifespan -= dt;
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
                    ctx.fillStyle = 'white';
                    ctx.strokeStyle = 'red';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(this.x - 5, this.y);
                    ctx.lineTo(this.x + 5, this.y);
                    ctx.moveTo(this.x, this.y - 5);
                    ctx.lineTo(this.x, this.y + 5);
                    ctx.stroke();
                    ctx.restore();
                }
            }
            
            class Soldier extends Entity {
                constructor(x, y, owner, unitType) {
                    const data = armyUnitData[unitType];
                    super(x, y, data.radius || 10);
                    this.owner = owner;
                    this.unitType = unitType;
                    this.hp = data.hp;
                    this.maxHp = data.hp;
                    this.damage = data.damage;
                    this.speed = data.speed;
                    this.attackRange = data.range;
                    this.attackCooldown = data.cooldown;
                    this.cooldownTimer = 0;
                    this.target = null;
                    this.state = 'seeking'; // seeking, moving, attacking
                    this.color = owner.color;
                    this.symbol = data.symbol;
                }

                findTarget() {
                    let potentialTargets = entities.enemies.filter(e => e.quadrant === this.owner.playerId && e.hp > 0);
                    if (potentialTargets.length === 0) {
                        potentialTargets = entities.soldiers.filter(s => s.owner !== this.owner && s.hp > 0);
                    }
                    if (potentialTargets.length === 0 && this.owner.playerId !== 1) {
                        potentialTargets = [players[0]]; // Target human player if no other enemies
                    }

                    if (potentialTargets.length === 0) {
                        this.target = null;
                        return;
                    }

                    this.target = potentialTargets.reduce((closest, target) => {
                        const dist = Math.hypot(this.x - target.x, this.y - target.y);
                        return dist < closest.dist ? { dist, target } : closest;
                    }, { dist: Infinity }).target;
                }

                update(dt) {
                    if (this.hp <= 0) return;
                    if (this.cooldownTimer > 0) this.cooldownTimer -= dt;

                    if (!this.target || this.target.hp <= 0) {
                        this.findTarget();
                        this.state = this.target ? 'moving' : 'seeking';
                    }

                    if (this.target) {
                        const distToTarget = Math.hypot(this.x - this.target.x, this.y - this.target.y);

                        if (distToTarget <= this.attackRange) {
                            this.state = 'attacking';
                            if (this.cooldownTimer <= 0) {
                                this.attack();
                            }
                        } else {
                            this.state = 'moving';
                            const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
                            this.x += Math.cos(angle) * this.speed;
                            this.y += Math.sin(angle) * this.speed;
                        }
                    } else { // No target, move towards player owner
                         const distToOwner = Math.hypot(this.x - this.owner.x, this.y - this.owner.y);
                         if (distToOwner > 50) {
                             const angle = Math.atan2(this.owner.y - this.y, this.owner.x - this.x);
                             this.x += Math.cos(angle) * this.speed * 0.5;
                             this.y += Math.sin(angle) * this.speed * 0.5;
                         }
                    }
                    
                    const bounds = getQuadrantBoundaries(this.owner.playerId);
                    this.x = Math.max(bounds.minX + this.radius, Math.min(bounds.maxX - this.radius, this.x));
                    this.y = Math.max(bounds.minY + this.radius, Math.min(bounds.maxY - this.radius, this.y));
                }

                attack() {
                    audioManager.play('laser');
                    this.cooldownTimer = this.attackCooldown;
                    if (this.target) {
                        this.target.takeDamage(this.damage);
                        entities.particles.push(new Particle(this.target.x, this.target.y, 'red', 10, 100, this.x, this.y));
                    }
                }

                draw() {
                    // Draw soldier
                    ctx.fillStyle = this.color;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Draw symbol
                    ctx.fillStyle = 'black';
                    ctx.font = 'bold 12px "Roboto Mono"';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(this.symbol, this.x, this.y);

                    // Draw HP bar
                    if (this.hp < this.maxHp) {
                        const barWidth = this.radius * 2;
                        const barHeight = 4;
                        const barX = this.x - this.radius;
                        const barY = this.y + this.radius + 2;
                        ctx.fillStyle = '#333';
                        ctx.fillRect(barX, barY, barWidth, barHeight);
                        ctx.fillStyle = 'green';
                        ctx.fillRect(barX, barY, barWidth * (this.hp / this.maxHp), barHeight);
                    }
                }
                
                takeDamage(amount) {
                    this.hp -= amount;
                }
            }

            class Particle extends Entity {
                constructor(x, y, color, size, lifespan, startX = null, startY = null) {
                    super(x, y, size);
                    this.color = color;
                    this.lifespan = lifespan;
                    this.maxLifespan = lifespan;
                    this.isLine = startX !== null && startY !== null;
                    if (this.isLine) {
                        this.startX = startX;
                        this.startY = startY;
                    }
                }
                update(dt) {
                    this.lifespan -= dt;
                }
                draw() {
                    const opacity = this.lifespan / this.maxLifespan;
                    if (this.isLine) {
                        ctx.strokeStyle = `rgba(${this.color === 'red' ? '255,0,0' : '255,255,255'}, ${opacity})`;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(this.startX, this.startY);
                        ctx.lineTo(this.x, this.y);
                        ctx.stroke();
                    } else {
                        ctx.fillStyle = this.color;
                        ctx.globalAlpha = opacity;
                        ctx.beginPath();
                        ctx.arc(this.x, this.y, this.radius * (1 - opacity), 0, Math.PI * 2);
                        ctx.fill();
                        ctx.globalAlpha = 1;
                    }
                }
            }
            
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

            // Initialisation
            loadGameState();
            initInput();
            initUI();
            showMainMenu();
            audioManager.playMusic('menu');
        });
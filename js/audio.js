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

// Initialisation au premier geste de l'utilisateur
document.body.addEventListener('click', () => audioManager.initialize(), { once: true });
document.body.addEventListener('keydown', () => audioManager.initialize(), { once: true });

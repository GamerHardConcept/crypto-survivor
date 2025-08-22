// --- GESTION DE L'AUDIO avec Tone.js ---
const audioManager = {
    isInitialized: false,
    isMusicOn: true,
    isSoundOn: true,
    currentMusic: null,
    synths: {},
    sequences: {},
    sounds: {},

    async init() {
        if (this.isInitialized) return;
        try {
            await Tone.start();
            console.log("Audio context started by user interaction.");
            this.setupSynths();
            this.setupSounds();
            this.isInitialized = true;
            if (this.isMusicOn && !this.currentMusic) {
                this.playMusic('menu');
            }
        } catch (e) {
            console.error("Could not start audio context: ", e);
        }
    },

    setupSynths() {
        this.synths.bass = new Tone.MonoSynth({
            oscillator: { type: "fatsawtooth" },
            envelope: { attack: 0.01, decay: 0.4, sustain: 0.1, release: 0.8 },
            filterEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.8, baseFrequency: 100, octaves: 4 }
        }).toDestination();

        this.synths.melody = new Tone.FMSynth({
            harmonicity: 3.01,
            modulationIndex: 14,
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2 },
            modulationEnvelope: { attack: 0.02, decay: 0.3, sustain: 0, release: 0.2 }
        }).toDestination();
        
        this.synths.pad = new Tone.PolySynth(Tone.Synth, {
             oscillator: { type: "sine" },
             envelope: { attack: 0.5, decay: 1.0, sustain: 0.3, release: 0.8 }
        }).toDestination();
    },

    setupSounds() {
        this.sounds.laser = new Tone.Synth({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.1 } }).toDestination();
        this.sounds.rocket = new Tone.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 } }).toDestination();
        this.sounds.explosion = new Tone.NoiseSynth({ noise: { type: 'brown' }, envelope: { attack: 0.05, decay: 0.5, sustain: 0, release: 0.4 } }).toDestination();
        this.sounds.collect = new Tone.Synth({ oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 } }).toDestination();
        this.sounds.levelUp = new Tone.Synth({ oscillator: { type: 'fatsquare' }, envelope: { attack: 0.1, decay: 0.8, sustain: 0.2, release: 0.5 } }).toDestination();
        this.sounds.healthPickup = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.2 } }).toDestination();
        this.sounds.purchase = new Tone.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 } }).toDestination();
        this.sounds.denied = new Tone.Synth({ oscillator: { type: 'sawtooth' }, envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 } }).toDestination();
    },

    play(soundId, note = null, duration = '8n') {
        if (!this.isInitialized || !this.isSoundOn) return;
        if (this.sounds[soundId]) {
            const sound = this.sounds[soundId];
            if (note) {
                 sound.triggerAttackRelease(note, duration);
            } else {
                 sound.triggerAttackRelease("C4", duration);
            }
        }
    },

    playMusic(track) {
        if (!this.isInitialized || !this.isMusicOn) return;
        if (this.currentMusic === track) return;

        this.stopMusic();
        this.currentMusic = track;

        if (track === 'menu') {
            this.sequences.bass = new Tone.Sequence((time, note) => {
                this.synths.bass.triggerAttackRelease(note, "8n", time);
            }, ["C2", ["E2", "G2"], "A#1", ["C2", "D#2"]], "2n").start(0);

            this.sequences.pad = new Tone.Sequence((time, note) => {
                this.synths.pad.triggerAttackRelease(note, "1n", time);
            }, [["C4", "E4", "G4"], ["A#3", "D4", "F4"]], "1m").start(0);
        } else if (track === 'game') {
            this.sequences.bass = new Tone.Sequence((time, note) => {
                this.synths.bass.triggerAttackRelease(note, "16n", time);
            }, ["C2", "C2", "D#2", "D2", "C2", "C2", "A#1", "G#1"], "8n").start(0);

            this.sequences.melody = new Tone.Pattern((time, note) => {
                this.synths.melody.triggerAttackRelease(note, "16n", time);
            }, ["C5", "D#5", "G5", "A#5", "G5", "D#5"], "randomWalk").start(0);
        } else if (track === 'gameOver') {
             this.sequences.bass = new Tone.Sequence((time, note) => {
                this.synths.bass.triggerAttackRelease(note, "2n", time);
            }, ["C1", "D#1", "F1", "C1"], "1n").start(0);
        }

        Tone.Transport.start();
    },

    stopMusic() {
        if (!this.isInitialized) return;
        Object.values(this.sequences).forEach(seq => {
            if (seq) {
                seq.stop(0).dispose();
            }
        });
        this.sequences = {};
        this.currentMusic = null;
        if (Tone.Transport.state === 'started') {
            Tone.Transport.stop();
            Tone.Transport.cancel();
        }
    },

    toggleMusic() {
        this.isMusicOn = !this.isMusicOn;
        if (this.isMusicOn) {
            const currentScreen = gameState;
            if (currentScreen === 'gameOver') this.playMusic('gameOver');
            else if (currentScreen === 'running' || currentScreen === 'paused') this.playMusic('game');
            else this.playMusic('menu');
        } else {
            this.stopMusic();
        }
        document.getElementById('toggle-music-button').textContent = this.isMusicOn ? '🎵 ON' : '🎵 OFF';
    },

    toggleSound() {
        this.isSoundOn = !this.isSoundOn;
        document.getElementById('toggle-sound-button').textContent = this.isSoundOn ? '🔊 ON' : '🔊 OFF';
    }
};

// Initialisation au premier geste de l'utilisateur
document.body.addEventListener('click', () => audioManager.init(), { once: true });
document.body.addEventListener('keydown', () => audioManager.init(), { once: true });

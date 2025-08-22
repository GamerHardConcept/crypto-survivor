// WS: Fichier pour la gestion de l'audio

let audioInitialized = false;

async function initializeAudio() {
    if (audioInitialized) return;
    try {
        await Tone.start();
        audioInitialized = true;
        if (gameState.isMusicOn) {
            audioManager.playMusic('menu');
        }
    } catch (e) {
        console.error("Could not start audio context: ", e);
    }
}

const audioManager = {
    synths: {
        laser: new Tone.Synth({
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.1 }
        }).toDestination(),
        xp: new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.1 }
        }).toDestination(),
        levelUp: new Tone.Synth({
            oscillator: { type: 'fatsquare' },
            envelope: { attack: 0.01, decay: 0.4, sustain: 0, release: 0.4 }
        }).toDestination(),
        gameOver: new Tone.MembraneSynth().toDestination(),
    },
    sequences: {
        menu: null,
        game: null,
    },
    playEffect: (effect, note, duration = '8n') => {
        if (!gameState.isSoundOn || !audioInitialized) return;
        if (audioManager.synths[effect]) {
            audioManager.synths[effect].triggerAttackRelease(note, duration);
        }
    },
    playMusic: (track) => {
        if (!gameState.isMusicOn || !audioInitialized) return;
        audioManager.stopMusic();
        if (track === 'menu') {
            const notes = ["C2", ["E2", "G2"], "A#1", ["C2", "D#2"]];
            audioManager.sequences.menu = new Tone.Sequence((time, note) => {
                audioManager.synths.gameOver.triggerAttackRelease(note, "4n", time);
            }, notes, "2n").start(0);
        } else if (track === 'game') {
            const notes = ["C3", "D#3", "G3", "A#3"];
            audioManager.sequences.game = new Tone.Sequence((time, note) => {
                audioManager.synths.laser.triggerAttackRelease(note, "8n", time);
            }, notes, "4n").start(0);
        }
        Tone.Transport.start();
    },
    stopMusic: () => {
        if (audioManager.sequences.menu) audioManager.sequences.menu.stop(0).dispose();
        if (audioManager.sequences.game) audioManager.sequences.game.stop(0).dispose();
        audioManager.sequences.menu = null;
        audioManager.sequences.game = null;
        if(Tone.Transport.state === 'started') Tone.Transport.stop();
    },
    toggleMusic: () => {
        gameState.isMusicOn = !gameState.isMusicOn;
        if (gameState.isMusicOn) {
            const currentTrack = (gameState.currentScreen === 'main-menu') ? 'menu' : 'game';
            audioManager.playMusic(currentTrack);
        } else {
            audioManager.stopMusic();
        }
    },
    toggleSound: () => {
        gameState.isSoundOn = !gameState.isSoundOn;
    }
};

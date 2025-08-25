// audio.js — gestion audio/Tone.js robuste (pas de double start)

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
      gameOver: null,
    },
  
    // petit util pour mémoriser l’offset de start sans démarrer tout de suite
    _markStart(part, when = 0) {
      part._startAt = when; // mémo
      return part;
    },
  
    async initialize() {
      if (this.isInitialized) return;
  
      // Démarre le contexte audio (obligatoire après un geste utilisateur)
      await Tone.start();
      console.log("Audio context started.");
  
      // -----------------------------------------------------------
      // --------------------- EFFETS SONORES ----------------------
      // -----------------------------------------------------------
      this.synths.shoot = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.1 },
        volume: -15,
      }).toDestination();
  
      this.synths.playerHit = new Tone.Synth({
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.1 },
      }).toDestination();
  
      this.synths.levelUp = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "fmsine" },
        envelope: { attack: 0.05, decay: 0.3, sustain: 0.1, release: 0.5 },
      }).toDestination();
  
      this.synths.enemyDefeat = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 10,
        oscillator: { type: "sine" },
        envelope: {
          attack: 0.001,
          decay: 0.4,
          sustain: 0.01,
          release: 1.4,
          attackCurve: "exponential",
        },
        volume: -10,
      }).toDestination();
  
      this.synths.collect = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 },
        volume: -10,
      }).toDestination();
  
      this.synths.healthPickup = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.05, decay: 0.3, sustain: 0.1, release: 0.5 },
        volume: -8,
      }).toDestination();
  
      this.synths.explosion = new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: { attack: 0.005, decay: 0.2, sustain: 0 },
        volume: -5,
      }).toDestination();
  
      this.synths.purchase = new Tone.Synth({
        oscillator: { type: "sine" },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.2 },
        volume: -5,
      }).toDestination();
  
      // -----------------------------------------------------------
      // ---------------------- MUSIQUE MENU -----------------------
      // -----------------------------------------------------------
      const menuSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "fatsawtooth", count: 3, spread: 30 },
        envelope: { attack: 0.8, decay: 0.5, sustain: 0.8, release: 2 },
        volume: -25,
      }).toDestination();
  
      const menuMelodySynth = new Tone.FMSynth({
        harmonicity: 3,
        modulationIndex: 10,
        oscillator: { type: "sine" },
        envelope: { attack: 0.2, decay: 0.3, sustain: 0.1, release: 1 },
        volume: -15,
      }).toDestination();
  
      const menuChords = [
        { time: "0:0", notes: ["C3", "D#3", "G3"], duration: "1m" },
        { time: "1:0", notes: ["G#2", "C3", "D#3"], duration: "1m" },
        { time: "2:0", notes: ["D#3", "G3", "A#3"], duration: "1m" },
        { time: "3:0", notes: ["A#2", "D3", "F3"], duration: "1m" },
      ];
  
      const menuChordPart = this._markStart(
        new Tone.Part((time, value) => {
          menuSynth.triggerAttackRelease(value.notes, value.duration, time);
        }, menuChords),
        0
      );
      menuChordPart.loop = true;
      menuChordPart.loopEnd = "4m";
  
      const menuMelody = this._markStart(
        new Tone.Sequence(
          (time, note) => {
            if (note) menuMelodySynth.triggerAttackRelease(note, "8n", time);
          },
          [
            "G4",
            "A#4",
            "C5",
            null,
            "G4",
            null,
            "D#4",
            null,
            "G4",
            "A#4",
            "C5",
            null,
            "G4",
            null,
            "D#4",
            null,
            "F4",
            "G4",
            "G#4",
            null,
            "F4",
            null,
            "D4",
            null,
            "F4",
            "G4",
            "G#4",
            null,
            "F4",
            null,
            "D#4",
            null,
          ],
          "8n"
        ),
        0
      );
      menuMelody.loop = true;
      menuMelody.loopEnd = "4m";
  
      // Rythmiques phase 2
      const kick = new Tone.MembraneSynth({ volume: -8 }).toDestination();
      const snare = new Tone.NoiseSynth({
        noise: { type: "pink" },
        envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
        volume: -12,
      }).toDestination();
      const hihat = new Tone.NoiseSynth({
        noise: { type: "white" },
        envelope: { attack: 0.001, decay: 0.05, sustain: 0 },
        volume: -20,
      }).toDestination();
      const epicBass = new Tone.MonoSynth({
        oscillator: { type: "fmsquare" },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.4 },
        volume: -14,
      }).toDestination();
  
      const kickLoop = this._markStart(
        new Tone.Loop((time) => kick.triggerAttackRelease("C1", "8n", time), "4n"),
        "4m"
      );
      const snareLoop = this._markStart(
        new Tone.Loop((time) => snare.triggerAttackRelease("8n", time), "2n"),
        "4m+4n"
      );
      const hihatLoop = this._markStart(
        new Tone.Loop((time) => hihat.triggerAttackRelease("16n", time), "8n"),
        "4m"
      );
      const epicBassPart = this._markStart(
        new Tone.Sequence(
          (time, note) => epicBass.triggerAttackRelease(note, "4n", time),
          [
            "C2",
            "C2",
            "C2",
            "C2",
            "G#1",
            "G#1",
            "G#1",
            "G#1",
            "D#2",
            "D#2",
            "D#2",
            "D#2",
            "A#1",
            "A#1",
            "A#1",
            "A#1",
          ],
          "4n"
        ),
        "4m"
      );
      epicBassPart.loop = true;
      epicBassPart.loopEnd = "4m";
  
      const buildupPart = this._markStart(
        new Tone.Part((time, value) => {
          hihat.triggerAttackRelease(value.duration, time);
        }, [
          { time: "3:2:0", duration: "16n" },
          { time: "3:2:2", duration: "16n" },
          { time: "3:3:0", duration: "8n" },
          { time: "3:3:2", duration: "8n" },
        ]),
        0
      );
      buildupPart.loop = false;
  
      this.music.menu = [
        menuChordPart,
        menuMelody,
        kickLoop,
        snareLoop,
        hihatLoop,
        epicBassPart,
        buildupPart,
      ];
  
      // -----------------------------------------------------------
      // --------------------- GAME OVER MUSIC ---------------------
      // -----------------------------------------------------------
      const gameOverMelodySynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "fatsawtooth" },
        envelope: { attack: 0.1, decay: 0.5, sustain: 0.2, release: 1 },
        volume: -12,
      }).toDestination();
  
      const gameOverSeq = new Tone.Sequence(
        (time, note) => gameOverMelodySynth.triggerAttackRelease(note, "4n", time),
        ["G3", "D#3", "C3", "G2"],
        "4n"
      );
      gameOverSeq.loop = false;
      this.music.gameOver = this._markStart(gameOverSeq, 0);
  
      // -----------------------------------------------------------
      // --------------- MUSIQUES DE JEU / BOSS --------------------
      // -----------------------------------------------------------
      const createMusicLoop = (bpm, bassNotes, arpNotes, leadNotes = null) => {
        const parts = [];
  
        const kick = new Tone.MembraneSynth({ volume: -6 }).toDestination();
        const snare = new Tone.NoiseSynth({
          noise: { type: "pink" },
          envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
          volume: -12,
        }).toDestination();
        const hihat = new Tone.NoiseSynth({
          noise: { type: "white" },
          envelope: { attack: 0.001, decay: 0.05, sustain: 0 },
          volume: -20,
        }).toDestination();
        const bass = new Tone.MonoSynth({
          oscillator: { type: "fmsquare" },
          envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.4 },
          volume: -10,
        }).toDestination();
        const arpSynth = new Tone.FMSynth({
          harmonicity: 1.5,
          modulationIndex: 5,
          envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2 },
          volume: -20,
        }).toDestination();
  
        parts.push(this._markStart(new Tone.Loop((t) => kick.triggerAttackRelease("C1", "8n", t), "4n"), 0));
        parts.push(this._markStart(new Tone.Loop((t) => hihat.triggerAttackRelease("16n", t), "8n"), 0));
        if (leadNotes) {
          // caisse claire active pour boss
          parts.push(this._markStart(new Tone.Loop((t) => snare.triggerAttackRelease("16n", t), "2n"), "4n"));
        }
        parts.push(
          this._markStart(new Tone.Sequence((t, n) => bass.triggerAttackRelease(n, "2n", t), bassNotes, "1m"), 0)
        );
        parts.push(
          this._markStart(new Tone.Sequence((t, n) => arpSynth.triggerAttackRelease(n, "16n", t), arpNotes, "16n"), 0)
        );
  
        if (leadNotes) {
          const leadSynth = new Tone.DuoSynth({
            vibratoAmount: 0.1,
            harmonicity: 1,
            voice0: { oscillator: { type: "sawtooth" } },
            voice1: { oscillator: { type: "sine" } },
            volume: -15,
          }).toDestination();
  
          parts.push(
            this._markStart(new Tone.Sequence((t, n) => leadSynth.triggerAttackRelease(n, "8n", t), leadNotes, "8n"), 0)
          );
        }
        return parts;
      };
  
      this.music.game = createMusicLoop(
        130,
        ["C2", "G#1", "D#2", "A#1"],
        ["C3", "D#3", "G3", "D#3"]
      );
      this.music.miniBoss = createMusicLoop(
        140,
        ["C2", "C2", "G#1", "G#1", "D#2", "D#2", "A#1", "A#1"],
        ["C4", "D#4", "G4", "D#4"],
        ["C5", null, "D#5", null]
      );
      this.music.mainBoss = createMusicLoop(
        150,
        ["C2", "C2", "C2", "G#1", "D#2", "D#2", "D#2", "A#1"],
        ["C4", "D#4", "G4", "A#4"],
        ["C5", "D#5", "G5", "A#5", "C6", "A#5", "G5", "D#5"]
      );
  
      this.isInitialized = true;
    },
  
    play(sound) {
      if (!this.isInitialized || this.isMuted) return;
      try {
        if (this.synths[sound]) {
          if (sound === "levelUp")
            this.synths.levelUp.triggerAttackRelease(["C4", "E4", "G4", "C5"], "4n");
          else if (sound === "healthPickup") this.synths.healthPickup.triggerAttackRelease("A4", "8n");
          else if (sound === "explosion") this.synths.explosion.triggerAttackRelease("4n");
          else if (sound === "playerHit") this.synths.playerHit.triggerAttackRelease("G2", "8n");
          else if (sound === "enemyDefeat") this.synths.enemyDefeat.triggerAttackRelease("C1", "8n");
          else if (sound === "collect") this.synths.collect.triggerAttackRelease("C6", "16n");
          else if (sound === "shoot") this.synths.shoot.triggerAttackRelease("C5", "8n", Tone.now());
          else if (sound === "purchase") this.synths.purchase.triggerAttackRelease("C5", "8n");
        }
      } catch (e) {
        console.error(`Error playing sound ${sound}:`, e);
      }
    },
  
    playMusic(type) {
      if (!this.isInitialized || this.isMuted) return;
  
      // Tout remettre à zéro avant de (re)démarrer
      this.stopAllMusic();
  
      this.currentMusicType = type;
      const musicToPlay = this.music[type];
      if (!musicToPlay) return;
  
      if (Array.isArray(musicToPlay)) {
        // (re)planifie proprement chaque part/loop avec son offset mémorisé
        musicToPlay.forEach((part) => {
          try {
            if (typeof part.stop === "function") part.stop(0);
            if (typeof part.cancel === "function") part.cancel(0);
            part.start(part._startAt || 0);
          } catch (e) {
            console.warn("Part start error:", e);
          }
        });
      } else {
        try {
          if (typeof musicToPlay.stop === "function") musicToPlay.stop(0);
          if (typeof musicToPlay.cancel === "function") musicToPlay.cancel(0);
          musicToPlay.start(musicToPlay._startAt || 0);
        } catch (e) {
          console.warn("Music start error:", e);
        }
      }
  
      if (Tone.Transport.state !== "started") {
        // redémarre transport depuis 0 pour garantir la monotonie des temps
        Tone.Transport.position = 0;
        Tone.Transport.start();
      }
    },
  
    stopAllMusic() {
      if (!this.isInitialized) return;
  
      Object.values(this.music).forEach((musicPart) => {
        if (!musicPart) return;
  
        const stopOne = (p) => {
          try {
            if (typeof p.stop === "function") p.stop(0);
            if (typeof p.cancel === "function") p.cancel(0);
          } catch (e) {
            /* noop */
          }
        };
  
        if (Array.isArray(musicPart)) {
          musicPart.forEach(stopOne);
        } else {
          stopOne(musicPart);
        }
      });
  
      if (Tone.Transport.state === "started") {
        Tone.Transport.stop();
      }
      Tone.Transport.cancel(0);
      Tone.Transport.position = 0;
    },
  
    toggleMute() {
      this.isMuted = !this.isMuted;
      Tone.Destination.mute = this.isMuted;
      const btn = document.getElementById("mute-button");
      if (btn) btn.textContent = this.isMuted ? "🔇" : "🎵";
  
      if (this.isMuted) {
        this.stopAllMusic();
      } else {
        // Relance la musique pertinente
        const activeScreen = document.querySelector(".screen.active");
        if (activeScreen && activeScreen.id.includes("main-menu")) {
          this.playMusic("menu");
        } else if (window.gameState === "running") {
          if (window.activeMiniBoss) {
            this.playMusic(window.activeMiniBoss.isDemiBoss ? "miniBoss" : "mainBoss");
          } else {
            this.playMusic("game");
          }
        }
      }
    },
  };
  
  // Initialise au premier geste utilisateur
  document.body.addEventListener("click", () => audioManager.initialize(), { once: true });
  document.body.addEventListener("keydown", () => audioManager.initialize(), { once: true });
  
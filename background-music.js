// Background Music System for Penguin Glider
// Uses Web Audio API to create energetic synth-style music

class BackgroundMusic {
	constructor() {
		this.audioContext = null;
		this.isPlaying = false;
		this.masterGain = null;
		this.oscillators = [];
		this.scheduledNotes = [];
		this.startTime = 0;
		this.volume = 0.2; // Slightly louder for energetic music

		// Music parameters - Fast and playful
		this.tempo = 150; // BPM - fast and energetic
		this.key = "C"; // C major - happy and bright
		this.scale = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25]; // C major scale (C4-C5)
		this.pentatonicScale = [261.63, 293.66, 329.63, 392.0, 440.0]; // C pentatonic for catchy melodies

		this.initAudio();
	}

	async initAudio() {
		try {
			this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

			// Create master gain node for volume control
			this.masterGain = this.audioContext.createGain();
			this.masterGain.connect(this.audioContext.destination);
			this.masterGain.gain.setValueAtTime(this.volume, this.audioContext.currentTime);

			console.log("Background music system initialized");
		} catch (error) {
			console.warn("Web Audio API not supported:", error);
		}
	}

	// Resume audio context if suspended (required by browsers)
	async resumeAudioContext() {
		if (this.audioContext && this.audioContext.state === "suspended") {
			await this.audioContext.resume();
		}
	}

	// Create an energetic, synth-style melody
	playMelody() {
		if (!this.audioContext || !this.masterGain) return;

		const now = this.audioContext.currentTime;
		const noteLength = 60 / this.tempo; // Duration of one beat in seconds
		const sixteenthNote = noteLength / 4; // Fast 16th note patterns

		// Energetic, playful melody pattern with synth arpeggios
		const melodyPattern = [
			// Fast ascending arpeggio run
			{ note: 0, duration: 0.5, delay: 0 }, // C
			{ note: 2, duration: 0.5, delay: 0.5 }, // E
			{ note: 4, duration: 0.5, delay: 1 }, // G
			{ note: 7, duration: 0.5, delay: 1.5 }, // C (octave)
			{ note: 4, duration: 0.5, delay: 2 }, // G
			{ note: 2, duration: 0.5, delay: 2.5 }, // E
			{ note: 0, duration: 1, delay: 3 }, // C

			// Playful bounce pattern
			{ note: 1, duration: 0.5, delay: 4 }, // D
			{ note: 3, duration: 0.5, delay: 4.5 }, // F
			{ note: 1, duration: 0.5, delay: 5 }, // D
			{ note: 5, duration: 1, delay: 5.5 }, // A
			{ note: 3, duration: 0.5, delay: 6.5 }, // F
			{ note: 1, duration: 0.5, delay: 7 }, // D

			// Fast descending run
			{ note: 7, duration: 0.25, delay: 8 }, // C
			{ note: 6, duration: 0.25, delay: 8.25 }, // B
			{ note: 5, duration: 0.25, delay: 8.5 }, // A
			{ note: 4, duration: 0.25, delay: 8.75 }, // G
			{ note: 3, duration: 0.25, delay: 9 }, // F
			{ note: 2, duration: 0.25, delay: 9.25 }, // E
			{ note: 1, duration: 0.25, delay: 9.5 }, // D
			{ note: 0, duration: 1.5, delay: 9.75 }, // C

			// Catchy hook
			{ note: 4, duration: 0.75, delay: 12 }, // G
			{ note: 4, duration: 0.25, delay: 12.75 }, // G
			{ note: 5, duration: 0.5, delay: 13 }, // A
			{ note: 4, duration: 0.5, delay: 13.5 }, // G
			{ note: 2, duration: 1, delay: 14 }, // E
			{ note: 0, duration: 2, delay: 15 }, // C (longer)
		];

		melodyPattern.forEach((noteInfo, index) => {
			const frequency = this.scale[noteInfo.note];
			const startTime = now + noteInfo.delay * noteLength;
			const duration = noteInfo.duration * noteLength;

			this.playNote(frequency, startTime, duration, "melody");
		});

		// Add harmony/counter-melody
		this.playCounterMelody(now, noteLength);

		// Schedule the next melody to loop
		const totalDuration = 16 * noteLength; // Total pattern duration
		setTimeout(() => {
			if (this.isPlaying) {
				this.playMelody();
			}
		}, totalDuration * 1000);
	}

	// Add a counter-melody for richness
	playCounterMelody(startTime, noteLength) {
		const counterPattern = [
			{ note: 0, duration: 2, delay: 0 }, // C (low)
			{ note: 2, duration: 2, delay: 2 }, // E (low)
			{ note: 1, duration: 2, delay: 4 }, // D (low)
			{ note: 3, duration: 2, delay: 6 }, // F (low)
			{ note: 4, duration: 4, delay: 8 }, // G (low)
			{ note: 2, duration: 2, delay: 12 }, // E (low)
			{ note: 0, duration: 2, delay: 14 }, // C (low)
		];

		counterPattern.forEach((noteInfo) => {
			const frequency = this.scale[noteInfo.note] * 0.5; // Lower octave
			const noteStartTime = startTime + noteInfo.delay * noteLength;
			const duration = noteInfo.duration * noteLength;

			this.playNote(frequency, noteStartTime, duration, "counter");
		});
	}

	// Create energetic bass and rhythm
	playHarmony() {
		if (!this.audioContext || !this.masterGain) return;

		const now = this.audioContext.currentTime;
		const noteLength = 60 / this.tempo;
		const patternDuration = 4; // 4 beats per pattern

		// Driving bass pattern
		const bassPattern = [
			{ note: 0, duration: 1, delay: 0 }, // C
			{ note: 0, duration: 0.5, delay: 1 }, // C
			{ note: 4, duration: 0.5, delay: 1.5 }, // G
			{ note: 0, duration: 1, delay: 2 }, // C
			{ note: 3, duration: 1, delay: 3 }, // F
		];

		// Play bass pattern multiple times with variation
		for (let cycle = 0; cycle < 4; cycle++) {
			bassPattern.forEach((noteInfo) => {
				const frequency = this.scale[noteInfo.note] * 0.25; // Very low bass
				const startTime = now + (cycle * patternDuration + noteInfo.delay) * noteLength;
				const duration = noteInfo.duration * noteLength;

				this.playNote(frequency, startTime, duration, "bass");
			});
		}

		// Add rhythmic chord stabs
		this.playChordStabs(now, noteLength);

		// Schedule the next bass line
		const totalDuration = 16 * noteLength;
		setTimeout(() => {
			if (this.isPlaying) {
				this.playHarmony();
			}
		}, totalDuration * 1000);
	}

	// Add percussive chord stabs for rhythm
	playChordStabs(startTime, noteLength) {
		const stabPattern = [
			{ chord: [2, 4, 6], delay: 2 }, // E-G-B
			{ chord: [2, 4, 6], delay: 2.5 }, // E-G-B
			{ chord: [1, 3, 5], delay: 6 }, // D-F-A
			{ chord: [1, 3, 5], delay: 6.5 }, // D-F-A
			{ chord: [0, 2, 4], delay: 10 }, // C-E-G
			{ chord: [0, 2, 4], delay: 10.5 }, // C-E-G
			{ chord: [4, 6, 1], delay: 14 }, // G-B-D
			{ chord: [4, 6, 1], delay: 14.5 }, // G-B-D
		];

		stabPattern.forEach((stabInfo) => {
			stabInfo.chord.forEach((noteIndex, chordIndex) => {
				const frequency = this.scale[noteIndex] * 0.75; // Mid-range
				const noteStartTime = startTime + stabInfo.delay * noteLength + chordIndex * 0.01; // Slight spread
				const duration = 0.3 * noteLength; // Short, punchy

				this.playNote(frequency, noteStartTime, duration, "stab");
			});
		});
	}

	// Play a single note with synth-style parameters
	playNote(frequency, startTime, duration, type = "melody") {
		if (!this.audioContext || !this.masterGain) return;

		// Create oscillator
		const oscillator = this.audioContext.createOscillator();
		const gainNode = this.audioContext.createGain();
		const filterNode = this.audioContext.createBiquadFilter();

		// Connect nodes
		oscillator.connect(filterNode);
		filterNode.connect(gainNode);
		gainNode.connect(this.masterGain);

		// Configure synth-style oscillator and filter based on type
		if (type === "melody") {
			oscillator.type = "square"; // Classic synth lead sound
			filterNode.type = "lowpass";
			filterNode.frequency.setValueAtTime(3000, startTime);
			filterNode.Q.setValueAtTime(2, startTime); // Resonant filter
		} else if (type === "counter") {
			oscillator.type = "sawtooth"; // Rich harmonic content
			filterNode.type = "lowpass";
			filterNode.frequency.setValueAtTime(1500, startTime);
			filterNode.Q.setValueAtTime(1.5, startTime);
		} else if (type === "bass") {
			oscillator.type = "triangle"; // Clean bass sound
			filterNode.type = "lowpass";
			filterNode.frequency.setValueAtTime(400, startTime);
			filterNode.Q.setValueAtTime(0.5, startTime);
		} else if (type === "stab") {
			oscillator.type = "square"; // Punchy chord stabs
			filterNode.type = "bandpass";
			filterNode.frequency.setValueAtTime(800, startTime);
			filterNode.Q.setValueAtTime(3, startTime); // Very resonant
		} else if (type === "arpeggio") {
			oscillator.type = "sawtooth"; // Bright arpeggio sound
			filterNode.type = "lowpass";
			filterNode.frequency.setValueAtTime(4000, startTime);
			filterNode.Q.setValueAtTime(2.5, startTime); // Bright and resonant
		}

		oscillator.frequency.setValueAtTime(frequency, startTime);

		// Synth-style envelope (ADSR) - faster attack/release for electronic feel
		const attackTime = type === "stab" ? 0.01 : type === "arpeggio" ? 0.02 : 0.05; // Very fast attack for stabs and arpeggios
		const decayTime = type === "bass" ? 0.1 : 0.08;
		const sustainLevel = type === "melody" ? 0.4 : type === "bass" ? 0.6 : type === "stab" ? 0.5 : type === "arpeggio" ? 0.3 : 0.25;
		const releaseTime = type === "stab" ? 0.1 : type === "arpeggio" ? 0.05 : 0.2; // Quick release for punchy sounds

		const peakLevel = type === "melody" ? 0.5 : type === "bass" ? 0.7 : type === "stab" ? 0.6 : type === "arpeggio" ? 0.4 : 0.3;

		// Attack
		gainNode.gain.setValueAtTime(0, startTime);
		gainNode.gain.linearRampToValueAtTime(peakLevel, startTime + attackTime);

		// Decay
		gainNode.gain.linearRampToValueAtTime(sustainLevel, startTime + attackTime + decayTime);

		// Release
		const releaseStartTime = startTime + duration - releaseTime;
		gainNode.gain.setValueAtTime(sustainLevel, releaseStartTime);
		gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

		// Add filter modulation for movement
		if (type === "melody" || type === "counter" || type === "arpeggio") {
			const modDepth = type === "arpeggio" ? 800 : 500;
			const modRate = type === "arpeggio" ? 8 : 4; // Hz - faster for arpeggios
			const modStartTime = startTime + attackTime;
			const modDuration = duration - attackTime - releaseTime;

			for (let t = 0; t < modDuration; t += 0.1) {
				const time = modStartTime + t;
				const modValue = Math.sin(2 * Math.PI * modRate * t) * modDepth;
				const baseFreq = type === "melody" ? 3000 : type === "arpeggio" ? 4000 : 1500;
				filterNode.frequency.setValueAtTime(baseFreq + modValue, time);
			}
		}

		// Start and stop
		oscillator.start(startTime);
		oscillator.stop(startTime + duration);

		// Clean up
		oscillator.onended = () => {
			try {
				oscillator.disconnect();
				gainNode.disconnect();
				filterNode.disconnect();
			} catch (e) {
				// Ignore cleanup errors
			}
		};

		this.oscillators.push({ oscillator, gainNode, filterNode });
	}

	// Add energetic arpeggios and sequences
	playAmbientSounds() {
		if (!this.audioContext || !this.masterGain) return;

		this.playArpeggio();
		this.playPercussion();
	}

	// Add fast arpeggios for energy
	playArpeggio() {
		const now = this.audioContext.currentTime;
		const noteLength = 60 / this.tempo;
		const sixteenthNote = noteLength / 4;

		// Fast arpeggio pattern
		const arpeggioPattern = [
			0, 2, 4, 7, 4, 2, 0, 2, // C-E-G-C-G-E-C-E
			1, 3, 5, 7, 5, 3, 1, 3, // D-F-A-C-A-F-D-F
		];

		arpeggioPattern.forEach((noteIndex, i) => {
			const frequency = this.scale[noteIndex] * 2; // Higher octave
			const startTime = now + i * sixteenthNote * 2; // Every 8th note
			const duration = sixteenthNote * 1.5;

			this.playNote(frequency, startTime, duration, "arpeggio");
		});

		// Schedule next arpeggio
		setTimeout(() => {
			if (this.isPlaying) {
				this.playArpeggio();
			}
		}, (arpeggioPattern.length * sixteenthNote * 2) * 1000);
	}

	// Add subtle percussion-like sounds
	playPercussion() {
		const now = this.audioContext.currentTime;
		const noteLength = 60 / this.tempo;

		// Create kick-like low frequency pulse
		const kickTimes = [0, 2, 4, 6, 8, 10, 12, 14]; // Every 2 beats
		const snareTimes = [2, 6, 10, 14]; // Backbeat

		kickTimes.forEach((time) => {
			this.playPercussiveHit(60, now + time * noteLength, 0.1, "kick");
		});

		snareTimes.forEach((time) => {
			this.playPercussiveHit(200, now + time * noteLength, 0.05, "snare");
		});

		// Schedule next percussion
		setTimeout(() => {
			if (this.isPlaying) {
				this.playPercussion();
			}
		}, 16 * noteLength * 1000);
	}

	// Create percussive hits
	playPercussiveHit(frequency, startTime, duration, type) {
		const oscillator = this.audioContext.createOscillator();
		const gainNode = this.audioContext.createGain();
		const filterNode = this.audioContext.createBiquadFilter();

		oscillator.connect(filterNode);
		filterNode.connect(gainNode);
		gainNode.connect(this.masterGain);

		if (type === "kick") {
			oscillator.type = "sine";
			filterNode.type = "lowpass";
			filterNode.frequency.setValueAtTime(100, startTime);
		} else if (type === "snare") {
			oscillator.type = "square";
			filterNode.type = "highpass";
			filterNode.frequency.setValueAtTime(300, startTime);
		}

		oscillator.frequency.setValueAtTime(frequency, startTime);

		// Very short, punchy envelope
		gainNode.gain.setValueAtTime(0, startTime);
		gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
		gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

		oscillator.start(startTime);
		oscillator.stop(startTime + duration);

		oscillator.onended = () => {
			try {
				oscillator.disconnect();
				gainNode.disconnect();
				filterNode.disconnect();
			} catch (e) {
				// Ignore cleanup errors
			}
		};
	}

	// Check if audio context is healthy
	isAudioContextHealthy() {
		return (
			this.audioContext &&
			this.audioContext.state !== "closed" &&
			this.masterGain &&
			this.masterGain.context === this.audioContext
		);
	}

	// Reinitialize audio system if needed
	async reinitializeIfNeeded() {
		if (!this.isAudioContextHealthy()) {
			console.log("Audio context unhealthy, reinitializing...");
			await this.initAudio();
		}
	}

	// Start playing background music
	async start() {
		console.log("BackgroundMusic.start() called, isPlaying:", this.isPlaying);

		if (this.isPlaying) {
			console.log("Background music already playing, skipping start");
			return;
		}

		// Force stop any previous instance first
		this.stop();

		await this.resumeAudioContext();

		if (!this.audioContext || !this.masterGain) {
			console.warn("Audio context not available, reinitializing...");
			await this.initAudio();

			if (!this.audioContext || !this.masterGain) {
				console.error("Failed to initialize audio context");
				return;
			}
		}

		// Small delay to ensure previous cleanup is complete
		await new Promise((resolve) => setTimeout(resolve, 100));

		this.isPlaying = true;
		this.startTime = this.audioContext.currentTime;

		console.log("Starting background music with context state:", this.audioContext.state);

		// Start all music layers
		try {
			this.playMelody();
			this.playHarmony();
			this.playAmbientSounds();
			console.log("All music layers started successfully");
		} catch (error) {
			console.error("Error starting music layers:", error);
			this.isPlaying = false;
		}
	}

	// Stop playing background music
	stop() {
		console.log("Stopping background music, isPlaying:", this.isPlaying);

		this.isPlaying = false;

		// Stop all oscillators with improved cleanup
		this.oscillators.forEach(({ oscillator, gainNode, filterNode }) => {
			try {
				if (oscillator.playbackState !== oscillator.FINISHED_STATE) {
					oscillator.stop();
				}
				oscillator.disconnect();
				gainNode.disconnect();
				filterNode.disconnect();
			} catch (e) {
				// Ignore cleanup errors
				console.log("Cleanup error (expected):", e.message);
			}
		});
		this.oscillators = [];

		// Stop ambient sounds with improved cleanup
		if (this.ambientSource) {
			try {
				this.ambientSource.stop();
				this.ambientSource.disconnect();
				this.ambientGain.disconnect();
				this.ambientFilter.disconnect();
			} catch (e) {
				// Ignore cleanup errors
				console.log("Ambient cleanup error (expected):", e.message);
			}
			this.ambientSource = null;
			this.ambientGain = null;
			this.ambientFilter = null;
		}

		// Clear any scheduled notes
		this.scheduledNotes = [];
	}

	// Set volume (0.0 to 1.0)
	setVolume(volume) {
		this.volume = Math.max(0, Math.min(1, volume));
		if (this.masterGain) {
			this.masterGain.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
		}
	}

	// Fade in music
	fadeIn(duration = 2) {
		if (!this.masterGain) return;

		const now = this.audioContext.currentTime;
		this.masterGain.gain.setValueAtTime(0, now);
		this.masterGain.gain.linearRampToValueAtTime(this.volume, now + duration);
	}

	// Fade out music
	fadeOut(duration = 2) {
		if (!this.masterGain) return;

		const now = this.audioContext.currentTime;
		this.masterGain.gain.setValueAtTime(this.volume, now);
		this.masterGain.gain.linearRampToValueAtTime(0, now + duration);

		setTimeout(() => {
			this.stop();
		}, duration * 1000 + 100);
	}

	// Check if music is currently playing
	get playing() {
		return this.isPlaying;
	}
}

// Export for use in other files
window.BackgroundMusic = BackgroundMusic;

// Background Music System for Penguin Glider
// Uses Web Audio API to create ambient Arctic-themed music

class BackgroundMusic {
	constructor() {
		this.audioContext = null;
		this.isPlaying = false;
		this.masterGain = null;
		this.oscillators = [];
		this.scheduledNotes = [];
		this.startTime = 0;
		this.volume = 0.15; // Quiet background music

		// Music parameters
		this.tempo = 80; // BPM - slow and peaceful
		this.key = "C"; // C major - happy and bright
		this.scale = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25]; // C major scale (C4-C5)

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

	// Create a gentle, ambient melody
	playMelody() {
		if (!this.audioContext || !this.masterGain) return;

		const now = this.audioContext.currentTime;
		const noteLength = 60 / this.tempo; // Duration of one beat in seconds

		// Simple, peaceful melody pattern - inspired by gentle Arctic winds
		const melodyPattern = [
			{ note: 0, duration: 2, delay: 0 }, // C
			{ note: 2, duration: 2, delay: 2 }, // E
			{ note: 4, duration: 2, delay: 4 }, // G
			{ note: 2, duration: 2, delay: 6 }, // E
			{ note: 0, duration: 4, delay: 8 }, // C (longer)

			{ note: 1, duration: 2, delay: 12 }, // D
			{ note: 3, duration: 2, delay: 14 }, // F
			{ note: 5, duration: 2, delay: 16 }, // A
			{ note: 3, duration: 2, delay: 18 }, // F
			{ note: 1, duration: 4, delay: 20 }, // D (longer)

			{ note: 4, duration: 2, delay: 24 }, // G
			{ note: 2, duration: 2, delay: 26 }, // E
			{ note: 0, duration: 2, delay: 28 }, // C
			{ note: 2, duration: 2, delay: 30 }, // E
			{ note: 4, duration: 8, delay: 32 }, // G (very long, peaceful ending)
		];

		melodyPattern.forEach((noteInfo, index) => {
			const frequency = this.scale[noteInfo.note];
			const startTime = now + noteInfo.delay * noteLength;
			const duration = noteInfo.duration * noteLength;

			this.playNote(frequency, startTime, duration, "melody");
		});

		// Schedule the next melody to loop
		const totalDuration = 40 * noteLength; // Total pattern duration
		setTimeout(() => {
			if (this.isPlaying) {
				this.playMelody();
			}
		}, totalDuration * 1000);
	}

	// Create ambient harmony/pad sounds
	playHarmony() {
		if (!this.audioContext || !this.masterGain) return;

		const now = this.audioContext.currentTime;
		const chordDuration = 8; // 8 seconds per chord

		// Simple chord progression: C - Am - F - G
		const chords = [
			[261.63, 329.63, 392.0], // C major (C-E-G)
			[220.0, 261.63, 329.63], // A minor (A-C-E)
			[174.61, 220.0, 261.63], // F major (F-A-C)
			[196.0, 246.94, 293.66], // G major (G-B-D)
		];

		chords.forEach((chord, chordIndex) => {
			const chordStartTime = now + chordIndex * chordDuration;

			chord.forEach((frequency, noteIndex) => {
				// Stagger the chord notes slightly for a more natural sound
				const noteStartTime = chordStartTime + noteIndex * 0.1;
				this.playNote(frequency * 0.5, noteStartTime, chordDuration, "harmony"); // Lower octave
			});
		});

		// Schedule the next chord progression
		const totalDuration = chords.length * chordDuration;
		setTimeout(() => {
			if (this.isPlaying) {
				this.playHarmony();
			}
		}, totalDuration * 1000);
	}

	// Play a single note with specified parameters
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

		// Configure oscillator
		if (type === "melody") {
			oscillator.type = "sine"; // Pure, gentle tone for melody
			filterNode.type = "lowpass";
			filterNode.frequency.setValueAtTime(2000, startTime); // Soft filter
		} else if (type === "harmony") {
			oscillator.type = "triangle"; // Warmer tone for harmony
			filterNode.type = "lowpass";
			filterNode.frequency.setValueAtTime(800, startTime); // More filtered for background
		}

		oscillator.frequency.setValueAtTime(frequency, startTime);

		// Configure envelope (ADSR)
		const attackTime = 0.1;
		const decayTime = 0.2;
		const sustainLevel = type === "melody" ? 0.3 : 0.15; // Melody louder than harmony
		const releaseTime = 0.5;

		const peakLevel = type === "melody" ? 0.4 : 0.2;

		// Attack
		gainNode.gain.setValueAtTime(0, startTime);
		gainNode.gain.linearRampToValueAtTime(peakLevel, startTime + attackTime);

		// Decay
		gainNode.gain.linearRampToValueAtTime(sustainLevel, startTime + attackTime + decayTime);

		// Release
		const releaseStartTime = startTime + duration - releaseTime;
		gainNode.gain.setValueAtTime(sustainLevel, releaseStartTime);
		gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

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

	// Add some subtle ambient sounds (wind-like effects)
	playAmbientSounds() {
		if (!this.audioContext || !this.masterGain) return;

		const now = this.audioContext.currentTime;

		// Create subtle wind-like noise
		const bufferSize = this.audioContext.sampleRate * 4; // 4 seconds of audio
		const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
		const data = buffer.getChannelData(0);

		// Generate filtered noise
		for (let i = 0; i < bufferSize; i++) {
			data[i] = (Math.random() * 2 - 1) * 0.1; // Very quiet noise
		}

		const source = this.audioContext.createBufferSource();
		const gainNode = this.audioContext.createGain();
		const filterNode = this.audioContext.createBiquadFilter();

		source.buffer = buffer;
		source.loop = true;

		// Heavy filtering to make it sound like distant wind
		filterNode.type = "lowpass";
		filterNode.frequency.setValueAtTime(200, now);
		filterNode.Q.setValueAtTime(1, now);

		source.connect(filterNode);
		filterNode.connect(gainNode);
		gainNode.connect(this.masterGain);

		// Very quiet ambient volume
		gainNode.gain.setValueAtTime(0.05, now);

		source.start(now);

		// Store reference for cleanup
		this.ambientSource = source;
		this.ambientGain = gainNode;
		this.ambientFilter = filterNode;
	}

	// Start playing background music
	async start() {
		if (this.isPlaying) return;

		await this.resumeAudioContext();

		if (!this.audioContext || !this.masterGain) {
			console.warn("Audio context not available");
			return;
		}

		this.isPlaying = true;
		this.startTime = this.audioContext.currentTime;

		console.log("Starting background music");

		// Start all music layers
		this.playMelody();
		this.playHarmony();
		this.playAmbientSounds();
	}

	// Stop playing background music
	stop() {
		if (!this.isPlaying) return;

		this.isPlaying = false;
		console.log("Stopping background music");

		// Stop all oscillators
		this.oscillators.forEach(({ oscillator, gainNode, filterNode }) => {
			try {
				oscillator.stop();
				oscillator.disconnect();
				gainNode.disconnect();
				filterNode.disconnect();
			} catch (e) {
				// Ignore cleanup errors
			}
		});
		this.oscillators = [];

		// Stop ambient sounds
		if (this.ambientSource) {
			try {
				this.ambientSource.stop();
				this.ambientSource.disconnect();
				this.ambientGain.disconnect();
				this.ambientFilter.disconnect();
			} catch (e) {
				// Ignore cleanup errors
			}
		}
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

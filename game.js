// Penguin Glider Game
class PenguinGlider {
	constructor() {
		this.canvas = document.getElementById("gameCanvas");
		this.ctx = this.canvas.getContext("2d");
		this.scoreElement = document.getElementById("score");
		this.gameOverElement = document.getElementById("gameOver");
		this.finalScoreElement = document.getElementById("finalScore");

		this.gameState = "playing"; // 'playing' or 'gameOver'
		this.score = 0;
		this.keys = {};

		// Penguin properties
		this.penguin = {
			x: 100,
			y: 300,
			width: 40,
			height: 40,
			velocityX: 0,
			velocityY: 0,
			onIceberg: false,
			gliding: false,
		};

		// Physics constants
		this.gravity = 0.5;
		this.jumpPower = -12;
		this.moveSpeed = 5;
		this.glideSpeed = 3;
		this.friction = 0.95; // Much less friction for slippery ice
		this.iceSlipperiness = 0.98; // Additional slipperiness factor

		// Icebergs
		this.icebergs = [];
		this.icebergSpeed = 2;
		this.nextIcebergDistance = 200;

		// Fish for collecting points
		this.fish = [];
		this.fishSpawnTimer = 0;
		this.fishSpawnRate = 120; // spawn every 2 seconds at 60fps

		// Water level
		this.waterLevel = this.canvas.height - 50;

		// Particles for effects
		this.particles = [];
		this.snowflakes = [];

		// Camera system for scrolling environment
		this.camera = {
			x: 0,
			y: 0,
			targetX: 0,
			targetY: 0,
			smoothing: 0.1,
		};

		// Audio context for sound effects
		this.audioContext = null;
		this.sounds = {};
		this.glideTimer = 0;
		this.initAudio();
		this.init();
	}

	initAudio() {
		try {
			this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
		} catch (e) {
			console.log("Web Audio API not supported");
		}
	}

	playSound(type) {
		if (!this.audioContext) return;

		// Resume audio context if suspended (required by some browsers)
		if (this.audioContext.state === "suspended") {
			this.audioContext.resume();
		}

		const oscillator = this.audioContext.createOscillator();
		const gainNode = this.audioContext.createGain();

		oscillator.connect(gainNode);
		gainNode.connect(this.audioContext.destination);

		switch (type) {
			case "jump":
				// Jumping sound - quick whoosh
				oscillator.type = "sawtooth";
				oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
				oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1);
				gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
				gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
				oscillator.start();
				oscillator.stop(this.audioContext.currentTime + 0.1);
				break;

			case "collect":
				// Fish collection - pleasant chime
				oscillator.type = "sine";
				oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime); // C5
				oscillator.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.1); // E5
				oscillator.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.2); // G5
				gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
				gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
				oscillator.start();
				oscillator.stop(this.audioContext.currentTime + 0.3);
				break;

			case "land":
				// Landing on iceberg - soft thump
				oscillator.type = "triangle";
				oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
				oscillator.frequency.exponentialRampToValueAtTime(80, this.audioContext.currentTime + 0.1);
				gainNode.gain.setValueAtTime(0.08, this.audioContext.currentTime);
				gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
				oscillator.start();
				oscillator.stop(this.audioContext.currentTime + 0.1);
				break;

			case "gameOver":
				// Game over - descending tone
				oscillator.type = "square";
				oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
				oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 1);
				gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
				gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1);
				oscillator.start();
				oscillator.stop(this.audioContext.currentTime + 1);
				break;

			case "glide":
				// Gliding - soft wind sound
				oscillator.type = "sawtooth";
				oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime);
				oscillator.frequency.setValueAtTime(180, this.audioContext.currentTime + 0.1);
				gainNode.gain.setValueAtTime(0.03, this.audioContext.currentTime);
				gainNode.gain.setValueAtTime(0.06, this.audioContext.currentTime + 0.05);
				gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
				oscillator.start();
				oscillator.stop(this.audioContext.currentTime + 0.2);
				break;
		}
	}

	init() {
		this.setupEventListeners();
		this.setupResponsiveCanvas();
		this.generateInitialIcebergs();
		this.generateSnowflakes();
		this.gameLoop();
	}

	setupResponsiveCanvas() {
		// Set up canvas for mobile responsiveness
		const canvas = this.canvas;
		const container = canvas.parentElement;

		// Set initial canvas size
		const baseWidth = 800;
		const baseHeight = 600;
		canvas.width = baseWidth;
		canvas.height = baseHeight;

		// Add resize handler for responsive design
		window.addEventListener("resize", () => {
			this.handleResize();
		});

		// Initial resize
		this.handleResize();
	}

	handleResize() {
		const canvas = this.canvas;
		const container = canvas.parentElement;

		// Get container dimensions
		const containerWidth = container.clientWidth - 20; // Account for padding
		const containerHeight = window.innerHeight * 0.7; // Max 70% of viewport height

		// Calculate scale to fit
		const scaleX = containerWidth / 800;
		const scaleY = containerHeight / 600;
		const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond original size

		// Apply scaling via CSS
		canvas.style.width = 800 * scale + "px";
		canvas.style.height = 600 * scale + "px";
	}

	setupEventListeners() {
		// Keyboard controls
		document.addEventListener("keydown", (e) => {
			this.keys[e.code] = true;
			e.preventDefault();
		});

		document.addEventListener("keyup", (e) => {
			this.keys[e.code] = false;
			e.preventDefault();
		});

		// Mobile touch controls
		this.setupMobileControls();
	}

	setupMobileControls() {
		const leftBtn = document.getElementById("leftBtn");
		const rightBtn = document.getElementById("rightBtn");
		const jumpBtn = document.getElementById("jumpBtn");

		if (!leftBtn || !rightBtn || !jumpBtn) return;

		// Left button
		leftBtn.addEventListener("touchstart", (e) => {
			e.preventDefault();
			this.keys["ArrowLeft"] = true;
		});
		leftBtn.addEventListener("touchend", (e) => {
			e.preventDefault();
			this.keys["ArrowLeft"] = false;
		});
		leftBtn.addEventListener("touchcancel", (e) => {
			e.preventDefault();
			this.keys["ArrowLeft"] = false;
		});

		// Right button
		rightBtn.addEventListener("touchstart", (e) => {
			e.preventDefault();
			this.keys["ArrowRight"] = true;
		});
		rightBtn.addEventListener("touchend", (e) => {
			e.preventDefault();
			this.keys["ArrowRight"] = false;
		});
		rightBtn.addEventListener("touchcancel", (e) => {
			e.preventDefault();
			this.keys["ArrowRight"] = false;
		});

		// Jump/Glide button
		jumpBtn.addEventListener("touchstart", (e) => {
			e.preventDefault();
			this.keys["ArrowUp"] = true;
		});
		jumpBtn.addEventListener("touchend", (e) => {
			e.preventDefault();
			this.keys["ArrowUp"] = false;
		});
		jumpBtn.addEventListener("touchcancel", (e) => {
			e.preventDefault();
			this.keys["ArrowUp"] = false;
		});

		// Also add mouse events for desktop testing
		this.addMouseEvents(leftBtn, "ArrowLeft");
		this.addMouseEvents(rightBtn, "ArrowRight");
		this.addMouseEvents(jumpBtn, "ArrowUp");
	}

	addMouseEvents(button, keyCode) {
		button.addEventListener("mousedown", (e) => {
			e.preventDefault();
			this.keys[keyCode] = true;
		});
		button.addEventListener("mouseup", (e) => {
			e.preventDefault();
			this.keys[keyCode] = false;
		});
		button.addEventListener("mouseleave", (e) => {
			e.preventDefault();
			this.keys[keyCode] = false;
		});
	}

	generateInitialIcebergs() {
		// Starting iceberg
		this.icebergs.push({
			x: 50,
			y: this.waterLevel - 60,
			width: 120,
			height: 60,
		});

		// Generate more icebergs
		for (let i = 1; i < 5; i++) {
			this.generateIceberg(250 * i);
		}
	}

	generateIceberg(startX) {
		const iceberg = {
			x: startX + Math.random() * 100,
			y: this.waterLevel - 40 - Math.random() * 80,
			width: 80 + Math.random() * 60,
			height: 40 + Math.random() * 40,
		};
		this.icebergs.push(iceberg);
	}

	generateSnowflakes() {
		for (let i = 0; i < 50; i++) {
			// More snowflakes for larger world
			this.snowflakes.push({
				x: Math.random() * this.canvas.width * 3, // Spread across larger area
				y: Math.random() * this.canvas.height,
				size: Math.random() * 3 + 1,
				speed: Math.random() * 2 + 1,
			});
		}
	}

	update() {
		if (this.gameState !== "playing") return;

		this.handleInput();
		this.updatePenguin();
		this.updateIcebergs();
		this.updateFish();
		this.updateParticles();
		this.updateSnowflakes();
		this.checkCollisions();
		this.checkFishCollection();
	}

	handleInput() {
		// Movement controls - less responsive on ice!
		const acceleration = this.penguin.onIceberg ? 0.2 : 0.5; // Reduced control on ice
		const maxSpeed = this.penguin.onIceberg ? this.moveSpeed * 1.2 : this.moveSpeed; // Can go faster on ice but less control

		if (this.keys["ArrowLeft"] || this.keys["KeyA"]) {
			this.penguin.velocityX = Math.max(this.penguin.velocityX - acceleration, -maxSpeed);
		}
		if (this.keys["ArrowRight"] || this.keys["KeyD"]) {
			this.penguin.velocityX = Math.min(this.penguin.velocityX + acceleration, maxSpeed);
		}

		// Jump/Glide
		if ((this.keys["ArrowUp"] || this.keys["KeyW"]) && this.penguin.onIceberg) {
			this.penguin.velocityY = this.jumpPower;
			this.penguin.onIceberg = false;
			this.penguin.gliding = true;
			this.createJumpParticles();
			this.playSound("jump");
		}

		// Gliding control
		if ((this.keys["ArrowUp"] || this.keys["KeyW"]) && !this.penguin.onIceberg && this.penguin.velocityY > 0) {
			this.penguin.velocityY += this.gravity * 0.3; // Slower fall when gliding
			this.penguin.gliding = true;

			// Play gliding sound occasionally
			this.glideTimer++;
			if (this.glideTimer > 30) {
				// Every half second at 60fps
				this.playSound("glide");
				this.glideTimer = 0;
			}
		} else {
			this.penguin.gliding = false;
			this.glideTimer = 0;
		}
	}

	updatePenguin() {
		// Apply gravity
		if (!this.penguin.onIceberg) {
			this.penguin.velocityY += this.gravity;
		}

		// Apply friction when on iceberg (very slippery!)
		if (this.penguin.onIceberg) {
			// Apply minimal friction for slippery ice
			this.penguin.velocityX *= this.iceSlipperiness;

			// Add slight momentum based on iceberg slope (simulate sliding)
			// Find the iceberg the penguin is on
			for (let iceberg of this.icebergs) {
				if (
					this.penguin.x + this.penguin.width > iceberg.x &&
					this.penguin.x < iceberg.x + iceberg.width &&
					this.penguin.y + this.penguin.height >= iceberg.y - 5 &&
					this.penguin.y + this.penguin.height <= iceberg.y + 25
				) {
					// Calculate penguin position on iceberg (0 = left edge, 1 = right edge)
					const posOnIceberg = (this.penguin.x - iceberg.x) / iceberg.width;

					// Add slight sliding effect based on position and existing velocity
					if (Math.abs(this.penguin.velocityX) > 0.5) {
						// If moving fast, add small sliding force in the same direction
						const slideForce = Math.sign(this.penguin.velocityX) * 0.1;
						this.penguin.velocityX += slideForce;

						// Create slip particles when sliding fast
						if (Math.abs(this.penguin.velocityX) > 2 && Math.random() < 0.3) {
							this.createSlipParticles();
						}
					}

					// Add random micro-slips occasionally for realism
					if (Math.random() < 0.02) {
						// 2% chance per frame
						this.penguin.velocityX += (Math.random() - 0.5) * 0.3;
						// Create small slip particles for micro-slips
						if (Math.random() < 0.5) {
							this.createSlipParticles();
						}
					}
					break;
				}
			}
		}

		// Update position
		this.penguin.x += this.penguin.velocityX;
		this.penguin.y += this.penguin.velocityY;

		// Update camera to follow penguin
		this.updateCamera();

		// Keep penguin within reasonable bounds (but allow more freedom)
		const leftBound = this.camera.x - this.canvas.width * 0.2;
		const rightBound = this.camera.x + this.canvas.width * 1.2;

		if (this.penguin.x < leftBound) {
			this.penguin.x = leftBound;
			this.penguin.velocityX = 0;
		}
		if (this.penguin.x > rightBound) {
			this.penguin.x = rightBound;
			this.penguin.velocityX = 0;
		}

		// Check if penguin fell into water
		if (this.penguin.y > this.waterLevel) {
			this.gameOver();
		}
	}

	updateCamera() {
		// Set camera target to follow penguin, keeping it slightly left of center
		this.camera.targetX = this.penguin.x - this.canvas.width * 0.3;
		this.camera.targetY = this.penguin.y - this.canvas.height * 0.4;

		// Smooth camera movement
		this.camera.x += (this.camera.targetX - this.camera.x) * this.camera.smoothing;
		this.camera.y += (this.camera.targetY - this.camera.y) * this.camera.smoothing;

		// Prevent camera from going too high (keep some sky visible)
		this.camera.y = Math.max(this.camera.y, -100);

		// Prevent camera from going below water level
		this.camera.y = Math.min(this.camera.y, this.waterLevel - this.canvas.height + 100);
	}

	updateIcebergs() {
		// Remove icebergs that are off camera view (left side)
		this.icebergs = this.icebergs.filter((iceberg) => iceberg.x + iceberg.width > this.camera.x - 200);

		// Generate new icebergs ahead of camera
		if (this.icebergs.length < 8) {
			// More icebergs for seamless experience
			const lastIceberg = this.icebergs[this.icebergs.length - 1];
			this.generateIceberg(lastIceberg.x + this.nextIcebergDistance + Math.random() * 100);
		}
	}

	updateFish() {
		// Spawn new fish
		this.fishSpawnTimer++;
		if (this.fishSpawnTimer >= this.fishSpawnRate) {
			this.spawnFish();
			this.fishSpawnTimer = 0;
		}

		// Animate fish (no need to move them left since camera follows penguin)
		for (let fish of this.fish) {
			fish.animationTimer += 0.1;

			// Add slight bobbing motion
			fish.y += Math.sin(fish.animationTimer) * 0.5;
		}

		// Remove fish that are off camera view (left side)
		this.fish = this.fish.filter((fish) => fish.x + fish.width > this.camera.x - 200);
	}

	spawnFish() {
		// Calculate reachable height range based on penguin physics
		// Penguin can jump ~144px high with jump power -12 and gravity 0.5
		const maxJumpHeight = (this.jumpPower * this.jumpPower) / (2 * this.gravity);

		// Get the average iceberg height
		const avgIcebergY = this.waterLevel - 80; // Average of iceberg spawn range

		// 70% chance to spawn fish at easily reachable heights
		// 30% chance to spawn fish that require good timing/gliding
		const easyReach = Math.random() < 0.7;

		let fishY;
		if (easyReach) {
			// Spawn fish at heights easily reachable from icebergs
			const minY = avgIcebergY - maxJumpHeight * 0.6; // 60% of max jump
			const maxY = avgIcebergY - 30; // Just above icebergs
			fishY = minY + Math.random() * (maxY - minY);
		} else {
			// Spawn fish that require more skill to reach
			const minY = Math.max(50, avgIcebergY - maxJumpHeight * 0.9); // 90% of max jump
			const maxY = avgIcebergY - maxJumpHeight * 0.6; // 60% of max jump
			fishY = minY + Math.random() * (maxY - minY);
		}

		// Ensure fish is always above water and below top of screen
		fishY = Math.max(50, Math.min(fishY, this.waterLevel - 100));

		const fish = {
			x: this.camera.x + this.canvas.width + 50, // Spawn ahead of camera view
			y: fishY,
			width: 25,
			height: 15,
			animationTimer: 0,
			collected: false,
		};
		this.fish.push(fish);
	}

	updateParticles() {
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const particle = this.particles[i];
			particle.x += particle.velocityX;
			particle.y += particle.velocityY;
			particle.velocityY += 0.1; // gravity
			particle.life--;

			if (particle.life <= 0) {
				this.particles.splice(i, 1);
			}
		}
	}

	updateSnowflakes() {
		for (let snowflake of this.snowflakes) {
			snowflake.y += snowflake.speed;
			snowflake.x += Math.sin(snowflake.y * 0.01) * 0.5;

			// Reset snowflake when it goes below camera view
			if (snowflake.y > this.camera.y + this.canvas.height + 50) {
				snowflake.y = this.camera.y - 50;
				snowflake.x = this.camera.x + Math.random() * this.canvas.width;
			}

			// Add new snowflakes on the right side as camera moves
			if (snowflake.x < this.camera.x - 50) {
				snowflake.x = this.camera.x + this.canvas.width + Math.random() * 100;
				snowflake.y = this.camera.y + Math.random() * this.canvas.height;
			}
		}
	}

	checkCollisions() {
		const wasOnIceberg = this.penguin.onIceberg;
		this.penguin.onIceberg = false;

		for (let iceberg of this.icebergs) {
			// Check if penguin is on top of iceberg
			if (
				this.penguin.x + this.penguin.width > iceberg.x &&
				this.penguin.x < iceberg.x + iceberg.width &&
				this.penguin.y + this.penguin.height >= iceberg.y &&
				this.penguin.y + this.penguin.height <= iceberg.y + 20 &&
				this.penguin.velocityY >= 0
			) {
				this.penguin.y = iceberg.y - this.penguin.height;
				this.penguin.velocityY = 0;
				this.penguin.onIceberg = true;
				this.penguin.gliding = false;

				// Play landing sound only if penguin was airborne
				if (!wasOnIceberg) {
					this.playSound("land");
				}
				break;
			}
		}
	}

	checkFishCollection() {
		for (let i = this.fish.length - 1; i >= 0; i--) {
			const fish = this.fish[i];

			// Check if penguin collides with fish
			if (
				this.penguin.x < fish.x + fish.width &&
				this.penguin.x + this.penguin.width > fish.x &&
				this.penguin.y < fish.y + fish.height &&
				this.penguin.y + this.penguin.height > fish.y &&
				!fish.collected
			) {
				// Fish collected!
				fish.collected = true;
				this.score += 10;
				this.scoreElement.textContent = this.score;

				// Create collection particles
				this.createFishCollectionParticles(fish.x + fish.width / 2, fish.y + fish.height / 2);

				// Play collection sound
				this.playSound("collect");

				// Remove the fish
				this.fish.splice(i, 1);
			}
		}
	}

	createFishCollectionParticles(x, y) {
		for (let i = 0; i < 12; i++) {
			this.particles.push({
				x: x,
				y: y,
				velocityX: (Math.random() - 0.5) * 8,
				velocityY: (Math.random() - 0.5) * 8,
				life: 40,
				color: `hsl(${Math.random() * 60 + 180}, 70%, ${Math.random() * 30 + 50}%)`,
			});
		}
	}

	createJumpParticles() {
		for (let i = 0; i < 8; i++) {
			this.particles.push({
				x: this.penguin.x + this.penguin.width / 2,
				y: this.penguin.y + this.penguin.height,
				velocityX: (Math.random() - 0.5) * 6,
				velocityY: Math.random() * -3,
				life: 30,
				color: `rgba(255, 255, 255, ${Math.random() * 0.8 + 0.2})`,
			});
		}
	}

	createSlipParticles() {
		// Create ice particles when sliding
		for (let i = 0; i < 3; i++) {
			this.particles.push({
				x: this.penguin.x + this.penguin.width / 2 + (Math.random() - 0.5) * this.penguin.width,
				y: this.penguin.y + this.penguin.height - 5,
				velocityX: -this.penguin.velocityX * 0.5 + (Math.random() - 0.5) * 2,
				velocityY: Math.random() * -1 - 0.5,
				life: 20,
				color: `rgba(173, 216, 230, ${Math.random() * 0.6 + 0.4})`, // Light blue ice particles
			});
		}
	}

	gameOver() {
		this.gameState = "gameOver";
		this.finalScoreElement.textContent = this.score;
		this.gameOverElement.style.display = "block";
		this.playSound("gameOver");
	}

	restart() {
		this.gameState = "playing";
		this.score = 0;
		this.penguin.x = 100;
		this.penguin.y = 300;
		this.penguin.velocityX = 0;
		this.penguin.velocityY = 0;
		this.penguin.onIceberg = false;
		this.penguin.gliding = false;
		this.icebergs = [];
		this.fish = [];
		this.fishSpawnTimer = 0;
		this.glideTimer = 0;
		this.particles = [];

		// Reset camera
		this.camera.x = 0;
		this.camera.y = 0;
		this.camera.targetX = 0;
		this.camera.targetY = 0;

		this.generateInitialIcebergs();
		this.generateSnowflakes(); // Regenerate snowflakes for new camera position
		this.gameOverElement.style.display = "none";
		this.scoreElement.textContent = this.score;
	}

	render() {
		// Clear canvas
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		// Save context for camera transformations
		this.ctx.save();

		// Apply camera transformation
		this.ctx.translate(-this.camera.x, -this.camera.y);

		// Draw sky gradient (extended for camera movement)
		const gradient = this.ctx.createLinearGradient(
			this.camera.x,
			this.camera.y,
			this.camera.x,
			this.camera.y + this.canvas.height
		);
		gradient.addColorStop(0, "#87CEEB");
		gradient.addColorStop(0.7, "#4682B4");
		gradient.addColorStop(1, "#1E3A8A");
		this.ctx.fillStyle = gradient;
		this.ctx.fillRect(
			this.camera.x - this.canvas.width,
			this.camera.y - this.canvas.height,
			this.canvas.width * 3,
			this.canvas.height * 3
		);

		// Draw snowflakes
		this.ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
		for (let snowflake of this.snowflakes) {
			// Only draw snowflakes that are visible in camera view
			if (
				snowflake.x > this.camera.x - 50 &&
				snowflake.x < this.camera.x + this.canvas.width + 50 &&
				snowflake.y > this.camera.y - 50 &&
				snowflake.y < this.camera.y + this.canvas.height + 50
			) {
				this.ctx.beginPath();
				this.ctx.arc(snowflake.x, snowflake.y, snowflake.size, 0, Math.PI * 2);
				this.ctx.fill();
			}
		}

		// Draw water (extended for camera movement)
		this.ctx.fillStyle = "#1E3A8A";
		this.ctx.fillRect(this.camera.x - this.canvas.width, this.waterLevel, this.canvas.width * 3, this.canvas.height);

		// Draw water waves (extended for camera)
		this.ctx.strokeStyle = "#4682B4";
		this.ctx.lineWidth = 2;
		this.ctx.beginPath();
		const waveStart = this.camera.x - 100;
		const waveEnd = this.camera.x + this.canvas.width + 100;
		for (let x = waveStart; x < waveEnd; x += 20) {
			const y = this.waterLevel + Math.sin(x + Date.now() * 0.005) * 3;
			if (x === waveStart) {
				this.ctx.moveTo(x, y);
			} else {
				this.ctx.lineTo(x, y);
			}
		}
		this.ctx.stroke();

		// Draw icebergs
		for (let iceberg of this.icebergs) {
			// Main iceberg body
			this.ctx.fillStyle = "#E6F3FF";
			this.ctx.fillRect(iceberg.x, iceberg.y, iceberg.width, iceberg.height);

			// Iceberg highlight
			this.ctx.fillStyle = "#F0F8FF";
			this.ctx.fillRect(iceberg.x, iceberg.y, iceberg.width * 0.3, iceberg.height * 0.4);

			// Iceberg shadow
			this.ctx.fillStyle = "#B0D4F1";
			this.ctx.fillRect(
				iceberg.x + iceberg.width * 0.7,
				iceberg.y + iceberg.height * 0.6,
				iceberg.width * 0.3,
				iceberg.height * 0.4
			);
		}

		// Draw fish
		for (let fish of this.fish) {
			this.drawFish(fish);
		}

		// Draw particles
		for (let particle of this.particles) {
			this.ctx.fillStyle = particle.color;
			this.ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
		}

		// Draw penguin
		this.drawPenguin();

		// Restore context (end camera transformation)
		this.ctx.restore();
	}

	drawPenguin() {
		const x = this.penguin.x;
		const y = this.penguin.y;
		const w = this.penguin.width;
		const h = this.penguin.height;

		// Penguin body (black)
		this.ctx.fillStyle = "#2C2C2C";
		this.ctx.fillRect(x + w * 0.1, y + h * 0.2, w * 0.8, h * 0.7);

		// Penguin belly (white)
		this.ctx.fillStyle = "#FFFFFF";
		this.ctx.fillRect(x + w * 0.25, y + h * 0.3, w * 0.5, h * 0.5);

		// Penguin head (black)
		this.ctx.fillStyle = "#2C2C2C";
		this.ctx.beginPath();
		this.ctx.arc(x + w / 2, y + h * 0.25, w * 0.35, 0, Math.PI * 2);
		this.ctx.fill();

		// Penguin beak (orange)
		this.ctx.fillStyle = "#FF8C00";
		this.ctx.beginPath();
		this.ctx.moveTo(x + w * 0.45, y + h * 0.25);
		this.ctx.lineTo(x + w * 0.3, y + h * 0.3);
		this.ctx.lineTo(x + w * 0.45, y + h * 0.35);
		this.ctx.fill();

		// Penguin eyes (white)
		this.ctx.fillStyle = "#FFFFFF";
		this.ctx.beginPath();
		this.ctx.arc(x + w * 0.4, y + h * 0.2, w * 0.08, 0, Math.PI * 2);
		this.ctx.fill();
		this.ctx.beginPath();
		this.ctx.arc(x + w * 0.6, y + h * 0.2, w * 0.08, 0, Math.PI * 2);
		this.ctx.fill();

		// Penguin pupils (black)
		this.ctx.fillStyle = "#000000";
		this.ctx.beginPath();
		this.ctx.arc(x + w * 0.42, y + h * 0.2, w * 0.04, 0, Math.PI * 2);
		this.ctx.fill();
		this.ctx.beginPath();
		this.ctx.arc(x + w * 0.58, y + h * 0.2, w * 0.04, 0, Math.PI * 2);
		this.ctx.fill();

		// Penguin flippers (black)
		this.ctx.fillStyle = "#2C2C2C";

		// Left flipper
		this.ctx.save();
		this.ctx.translate(x + w * 0.1, y + h * 0.4);
		if (this.penguin.gliding) {
			this.ctx.rotate(-0.3);
		}
		this.ctx.fillRect(-w * 0.15, -h * 0.1, w * 0.3, h * 0.1);
		this.ctx.restore();

		// Right flipper
		this.ctx.save();
		this.ctx.translate(x + w * 0.9, y + h * 0.4);
		if (this.penguin.gliding) {
			this.ctx.rotate(0.3);
		}
		this.ctx.fillRect(-w * 0.15, -h * 0.1, w * 0.3, h * 0.1);
		this.ctx.restore();

		// Penguin feet (orange)
		this.ctx.fillStyle = "#FF8C00";
		this.ctx.fillRect(x + w * 0.2, y + h * 0.85, w * 0.25, h * 0.15);
		this.ctx.fillRect(x + w * 0.55, y + h * 0.85, w * 0.25, h * 0.15);
	}

	drawFish(fish) {
		const x = fish.x;
		const y = fish.y;
		const w = fish.width;
		const h = fish.height;

		// Fish body (main color)
		this.ctx.fillStyle = "#FF6B6B";
		this.ctx.beginPath();
		this.ctx.ellipse(x + w * 0.4, y + h * 0.5, w * 0.4, h * 0.4, 0, 0, Math.PI * 2);
		this.ctx.fill();

		// Fish tail
		this.ctx.fillStyle = "#FF4757";
		this.ctx.beginPath();
		this.ctx.moveTo(x, y + h * 0.5);
		this.ctx.lineTo(x + w * 0.3, y + h * 0.2);
		this.ctx.lineTo(x + w * 0.3, y + h * 0.8);
		this.ctx.closePath();
		this.ctx.fill();

		// Fish eye (white)
		this.ctx.fillStyle = "#FFFFFF";
		this.ctx.beginPath();
		this.ctx.arc(x + w * 0.6, y + h * 0.4, w * 0.08, 0, Math.PI * 2);
		this.ctx.fill();

		// Fish pupil (black)
		this.ctx.fillStyle = "#000000";
		this.ctx.beginPath();
		this.ctx.arc(x + w * 0.62, y + h * 0.4, w * 0.04, 0, Math.PI * 2);
		this.ctx.fill();

		// Fish fins
		this.ctx.fillStyle = "#FF4757";
		this.ctx.beginPath();
		this.ctx.ellipse(x + w * 0.5, y + h * 0.8, w * 0.15, h * 0.2, 0.3, 0, Math.PI * 2);
		this.ctx.fill();

		// Sparkle effect around fish
		const sparkleTime = Date.now() * 0.01 + fish.animationTimer;
		for (let i = 0; i < 3; i++) {
			const sparkleX = x + w * 0.5 + Math.cos(sparkleTime + i * 2) * w * 0.8;
			const sparkleY = y + h * 0.5 + Math.sin(sparkleTime + i * 2) * h * 0.8;
			this.ctx.fillStyle = `rgba(255, 255, 0, ${0.3 + Math.sin(sparkleTime + i) * 0.3})`;
			this.ctx.beginPath();
			this.ctx.arc(sparkleX, sparkleY, 2, 0, Math.PI * 2);
			this.ctx.fill();
		}
	}

	gameLoop() {
		this.update();
		this.render();
		requestAnimationFrame(() => this.gameLoop());
	}
}

// Initialize game
let game;

function startGame() {
	game = new PenguinGlider();
}

function restartGame() {
	if (game) {
		game.restart();
	} else {
		startGame();
	}
}

// Start the game when page loads
window.addEventListener("load", startGame);

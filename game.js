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

		// Penguin properties (will be positioned on first iceberg after initialization)
		this.penguin = {
			x: 100,
			y: 150,
			width: 60,
			height: 60,
			velocityX: 0,
			velocityY: 0,
			onIceberg: false,
			gliding: false,
		};

		// Physics constants
		this.gravity = 0.5;
		this.jumpPower = -15;
		this.moveSpeed = 7;
		this.glideSpeed = 4;
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

		// Water level (at middle of screen)
		this.waterLevel = this.canvas.height / 2;

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

		// Delta time for frame rate independence
		this.lastTime = 0;
		this.deltaTime = 0;
		this.targetFPS = 60; // Target 60 FPS
		this.fixedDeltaTime = 1000 / this.targetFPS; // 16.67ms for 60 FPS

		// Audio context for sound effects
		this.audioContext = null;
		this.sounds = {};
		this.glideTimer = 0;

		// Image loading system
		this.images = {};
		this.imagesLoaded = 0;
		this.totalImages = 0;
		this.imagesReady = false;

		this.initAudio();
		this.loadImages();
	}

	initAudio() {
		try {
			this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
		} catch (e) {
			console.log("Web Audio API not supported");
		}
	}

	loadImages() {
		const imageList = [
			"penguin.png",
			"iceberg1.png",
			"iceberg2.png",
			"iceberg3.png",
			"iceberg4.png",
			"fish1.png",
			"fish2.png",
			"fish3.png",
			"fish4.png",
			"water.png",
			"waves.png",
			"moutain.png",
			"bubble.png",
			"bottle.png",
			"plastic-bag.png",
		];

		this.totalImages = imageList.length;
		this.imagesLoaded = 0;

		imageList.forEach((imageName) => {
			const img = new Image();
			img.onload = () => {
				this.imagesLoaded++;
				if (this.imagesLoaded === this.totalImages) {
					this.imagesReady = true;
					this.init(); // Start the game once all images are loaded
				}
			};
			img.onerror = () => {
				console.warn(`Failed to load image: ${imageName}`);
				this.imagesLoaded++;
				if (this.imagesLoaded === this.totalImages) {
					this.imagesReady = true;
					this.init(); // Start the game even if some images failed
				}
			};
			img.src = `img/${imageName}`;
			this.images[imageName.replace(".png", "")] = img;
		});
	}

	// Helper function to draw image with preserved aspect ratio
	drawImagePreserveAspect(image, x, y, maxWidth, maxHeight, alignment = "center") {
		const imageAspect = image.naturalWidth / image.naturalHeight;
		const targetAspect = maxWidth / maxHeight;

		let renderWidth, renderHeight;

		if (imageAspect > targetAspect) {
			// Image is wider - fit to width
			renderWidth = maxWidth;
			renderHeight = maxWidth / imageAspect;
		} else {
			// Image is taller - fit to height
			renderHeight = maxHeight;
			renderWidth = maxHeight * imageAspect;
		}

		// Calculate position based on alignment
		let renderX = x;
		let renderY = y;

		if (alignment === "center") {
			renderX = x + (maxWidth - renderWidth) / 2;
			renderY = y + (maxHeight - renderHeight) / 2;
		} else if (alignment === "bottom") {
			renderX = x + (maxWidth - renderWidth) / 2;
			renderY = y + (maxHeight - renderHeight);
		}

		this.ctx.drawImage(image, renderX, renderY, renderWidth, renderHeight);

		return { x: renderX, y: renderY, width: renderWidth, height: renderHeight };
	}

	// Helper function to draw image filling the entire area while preserving aspect ratio (may crop)
	drawImageFillArea(image, x, y, width, height) {
		const imageAspect = image.naturalWidth / image.naturalHeight;
		const targetAspect = width / height;

		let sourceX = 0,
			sourceY = 0,
			sourceWidth = image.naturalWidth,
			sourceHeight = image.naturalHeight;

		if (imageAspect > targetAspect) {
			// Image is wider - crop horizontally
			sourceWidth = image.naturalHeight * targetAspect;
			sourceX = (image.naturalWidth - sourceWidth) / 2;
		} else {
			// Image is taller - crop vertically
			sourceHeight = image.naturalWidth / targetAspect;
			sourceY = (image.naturalHeight - sourceHeight) / 2;
		}

		this.ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
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
		this.positionPenguinOnFirstIceberg();
		this.generateSnowflakes();
		this.gameLoop();
	}

	setupResponsiveCanvas() {
		// Set up canvas for full screen
		const canvas = this.canvas;

		// Add resize handler for responsive design
		window.addEventListener("resize", () => {
			this.handleResize();
		});

		// Initial resize
		this.handleResize();
	}

	handleResize() {
		const canvas = this.canvas;

		// Set canvas size to full viewport
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		// Update canvas style to match
		canvas.style.width = window.innerWidth + "px";
		canvas.style.height = window.innerHeight + "px";

		// Update water level based on new height (at middle of screen)
		this.waterLevel = canvas.height / 2;
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
		// Starting iceberg - use image dimensions if available (tripled size)
		let startWidth = 540,
			startHeight = 270;
		if (this.imagesReady && this.images.iceberg1) {
			const image = this.images.iceberg1;
			const imageAspect = image.naturalWidth / image.naturalHeight;
			startHeight = 360; // Even larger starting platform (tripled)
			startWidth = startHeight * imageAspect;
		}

		this.icebergs.push({
			x: 100 - startWidth / 2, // Center iceberg with penguin x position
			y: this.waterLevel - startHeight - 20, // Position slightly above water level
			width: startWidth,
			height: startHeight,
			imageType: 1, // Use iceberg1 for starting platform
		});

		// Generate more icebergs with guaranteed reachability and more spacing
		for (let i = 1; i < 5; i++) {
			// Increased spacing for larger icebergs
			this.generateIceberg(50 + 250 * i); // 250 pixel spacing for more breathing room
		}
	}

	positionPenguinOnFirstIceberg() {
		// Position penguin on top of the first iceberg
		if (this.icebergs.length > 0) {
			const firstIceberg = this.icebergs[0];
			this.penguin.x = firstIceberg.x + firstIceberg.width / 2 - this.penguin.width / 2; // Center on iceberg
			this.penguin.y = firstIceberg.y - this.penguin.height; // On top of iceberg
			this.penguin.onIceberg = true; // Start on iceberg
		}
	}

	generateIceberg(startX) {
		// Calculate penguin's maximum jump capabilities
		// Jump power: -15, gravity: 0.5 (updated for current physics)
		// Time to reach peak: 15/0.5 = 30 frames, total air time: 60 frames
		// Maximum horizontal distance with movement: 60 * 7 = 420 pixels
		// Maximum horizontal distance with gliding: 60 * 4 = 240 pixels
		// Safe maximum distance: 300 pixels to account for different jump trajectories

		const maxHorizontalReach = 300; // Increased for larger spacing
		const maxVerticalReach = 150; // Increased for larger icebergs

		// Ensure iceberg is within reachable distance with more variation
		const horizontalDistance = Math.random() * (maxHorizontalReach * 0.8) + maxHorizontalReach * 0.2; // 20-100% of max reach

		// Calculate vertical position based on reachability
		// Find the last iceberg to calculate relative positioning
		const lastIceberg = this.icebergs[this.icebergs.length - 1];
		const lastIcebergTop = lastIceberg ? lastIceberg.y : this.waterLevel - 60;

		// Keep icebergs much higher above water level with good variation
		const minY = Math.max(this.waterLevel - 400, lastIcebergTop - maxVerticalReach);
		const maxY = Math.min(this.waterLevel - 200, lastIcebergTop + 60);

		// Generate iceberg with image-based dimensions if available
		const imageType = Math.floor(Math.random() * 4) + 1;
		let width, height;

		if (this.imagesReady && this.images[`iceberg${imageType}`]) {
			// Use image natural dimensions scaled to appropriate game size (tripled)
			const image = this.images[`iceberg${imageType}`];
			const imageAspect = image.naturalWidth / image.naturalHeight;
			const baseHeight = 270 + Math.random() * 180; // 270-450px height range (tripled)

			height = baseHeight;
			width = height * imageAspect;
		} else {
			// Fallback dimensions for when images aren't loaded (tripled)
			width = 360 + Math.random() * 270;
			height = 180 + Math.random() * 180;
		}

		const iceberg = {
			x: startX + horizontalDistance,
			y: minY + Math.random() * (maxY - minY),
			width: width,
			height: height,
			imageType: imageType,
		};

		this.icebergs.push(iceberg);
	}

	generateSnowflakes() {
		for (let i = 0; i < 50; i++) {
			// More snowflakes for larger world
			this.snowflakes.push({
				x: Math.random() * this.canvas.width * 3, // Spread across larger area
				y: Math.random() * this.canvas.height,
				size: Math.random() * 5 + 2,
				speed: Math.random() * 2 + 1,
			});
		}
	}

	update(deltaMultiplier = 1) {
		if (this.gameState !== "playing") return;

		this.handleInput(deltaMultiplier);
		this.updatePenguin(deltaMultiplier);
		this.updateIcebergs(deltaMultiplier);
		this.updateFish(deltaMultiplier);
		this.updateParticles(deltaMultiplier);
		this.updateSnowflakes(deltaMultiplier);
		this.checkCollisions();
		this.checkFishCollection();
	}

	handleInput(deltaMultiplier = 1) {
		// Movement controls - less responsive on ice!
		const baseAcceleration = this.penguin.onIceberg ? 0.2 : 0.5; // Reduced control on ice
		const acceleration = baseAcceleration * deltaMultiplier;
		const maxSpeed = this.penguin.onIceberg ? this.moveSpeed * 1.2 : this.moveSpeed; // Can go faster on ice but less control

		if (this.keys["ArrowLeft"] || this.keys["KeyA"]) {
			this.penguin.velocityX = Math.max(this.penguin.velocityX - acceleration, -maxSpeed);
		}
		if (this.keys["ArrowRight"] || this.keys["KeyD"]) {
			this.penguin.velocityX = Math.min(this.penguin.velocityX + acceleration, maxSpeed);
		} // Jump/Glide
		if ((this.keys["ArrowUp"] || this.keys["KeyW"]) && this.penguin.onIceberg) {
			this.penguin.velocityY = this.jumpPower;
			this.penguin.onIceberg = false;
			this.penguin.gliding = true;
			this.createJumpParticles();
			this.playSound("jump");
		}

		// Gliding control
		if ((this.keys["ArrowUp"] || this.keys["KeyW"]) && !this.penguin.onIceberg && this.penguin.velocityY > 0) {
			this.penguin.velocityY += this.gravity * 0.3 * deltaMultiplier; // Slower fall when gliding
			this.penguin.gliding = true;

			// Play gliding sound occasionally
			this.glideTimer += deltaMultiplier;
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

	updatePenguin(deltaMultiplier = 1) {
		// Store previous position for collision detection
		const prevX = this.penguin.x;
		const prevY = this.penguin.y;

		// Apply gravity
		if (!this.penguin.onIceberg) {
			this.penguin.velocityY += this.gravity * deltaMultiplier;
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
					this.penguin.y + this.penguin.height >= iceberg.y - 3 &&
					this.penguin.y + this.penguin.height <= iceberg.y + 15
				) {
					// Calculate penguin position on iceberg (0 = left edge, 1 = right edge)
					const posOnIceberg = (this.penguin.x - iceberg.x) / iceberg.width;

					// Add slight sliding effect based on position and existing velocity
					if (Math.abs(this.penguin.velocityX) > 0.5) {
						// If moving fast, add small sliding force in the same direction
						const slideForce = Math.sign(this.penguin.velocityX) * 0.1 * deltaMultiplier;
						this.penguin.velocityX += slideForce;

						// Create slip particles when sliding fast
						if (Math.abs(this.penguin.velocityX) > 2 && Math.random() < 0.3 * deltaMultiplier) {
							this.createSlipParticles();
						}
					}

					// Add random micro-slips occasionally for realism
					if (Math.random() < 0.02 * deltaMultiplier) {
						// 2% chance per frame adjusted for delta time
						this.penguin.velocityX += (Math.random() - 0.5) * 0.3 * deltaMultiplier;
						// Create small slip particles for micro-slips
						if (Math.random() < 0.5) {
							this.createSlipParticles();
						}
					}
					break;
				}
			}
		}

		// Calculate new position
		const newX = this.penguin.x + this.penguin.velocityX * deltaMultiplier;
		const newY = this.penguin.y + this.penguin.velocityY * deltaMultiplier;

		// Check for solid collisions before updating position
		const collision = this.checkSolidCollisions(prevX, prevY, newX, newY);

		if (collision) {
			// Handle collision response
			if (collision.type === "horizontal") {
				this.penguin.velocityX = 0;
				this.penguin.x = collision.correctedX;
				this.penguin.y = newY; // Allow vertical movement
			} else if (collision.type === "vertical") {
				this.penguin.velocityY = 0;
				this.penguin.x = newX; // Allow horizontal movement
				this.penguin.y = collision.correctedY;
			} else if (collision.type === "corner") {
				// Hit a corner, stop all movement
				this.penguin.velocityX = 0;
				this.penguin.velocityY = 0;
				this.penguin.x = collision.correctedX;
				this.penguin.y = collision.correctedY;
			}
		} else {
			// No collision, update position normally
			this.penguin.x = newX;
			this.penguin.y = newY;
		}

		// Update camera to follow penguin
		this.updateCamera(deltaMultiplier);

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

	updateCamera(deltaMultiplier = 1) {
		// Set camera target to follow penguin, keeping it slightly left of center
		this.camera.targetX = this.penguin.x - this.canvas.width * 0.3;
		this.camera.targetY = this.penguin.y - this.canvas.height * 0.4;

		// Smooth camera movement
		const smoothing = this.camera.smoothing * deltaMultiplier;
		this.camera.x += (this.camera.targetX - this.camera.x) * smoothing;
		this.camera.y += (this.camera.targetY - this.camera.y) * smoothing;

		// Prevent camera from going too high (keep some sky visible)
		this.camera.y = Math.max(this.camera.y, -100);

		// Prevent camera from going below water level
		this.camera.y = Math.min(this.camera.y, this.waterLevel - this.canvas.height + 100);
	}

	updateIcebergs(deltaMultiplier = 1) {
		// Remove icebergs that are off camera view (left side)
		this.icebergs = this.icebergs.filter((iceberg) => iceberg.x + iceberg.width > this.camera.x - 200);

		// Generate new icebergs ahead of camera
		if (this.icebergs.length < 8) {
			// More icebergs for seamless experience with increased spacing
			const lastIceberg = this.icebergs[this.icebergs.length - 1];
			// Increased base distance for more spacing between larger icebergs
			const baseDistance = 200; // Increased spacing for larger icebergs
			this.generateIceberg(lastIceberg.x + baseDistance);
		}
	}

	updateFish(deltaMultiplier = 1) {
		// Spawn new fish
		this.fishSpawnTimer += deltaMultiplier;
		if (this.fishSpawnTimer >= this.fishSpawnRate) {
			this.spawnFish();
			this.fishSpawnTimer = 0;
		}

		// Animate fish (no need to move them left since camera follows penguin)
		for (let fish of this.fish) {
			fish.animationTimer += 0.1 * deltaMultiplier;

			// Add slight bobbing motion
			fish.y += Math.sin(fish.animationTimer) * 0.5 * deltaMultiplier;
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
			width: 40,
			height: 24,
			animationTimer: 0,
			collected: false,
			imageType: Math.floor(Math.random() * 4) + 1, // Random fish type 1-4
		};
		this.fish.push(fish);
	}

	updateParticles(deltaMultiplier = 1) {
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const particle = this.particles[i];
			particle.x += particle.velocityX * deltaMultiplier;
			particle.y += particle.velocityY * deltaMultiplier;
			particle.velocityY += 0.1 * deltaMultiplier; // gravity
			particle.life -= deltaMultiplier;

			if (particle.life <= 0) {
				this.particles.splice(i, 1);
			}
		}
	}

	updateSnowflakes(deltaMultiplier = 1) {
		for (let snowflake of this.snowflakes) {
			snowflake.y += snowflake.speed * deltaMultiplier;
			snowflake.x += Math.sin(snowflake.y * 0.01) * 0.5 * deltaMultiplier;

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

	checkSolidCollisions(prevX, prevY, newX, newY) {
		const penguinWidth = this.penguin.width;
		const penguinHeight = this.penguin.height;

		for (let iceberg of this.icebergs) {
			// Check if the penguin's new position would overlap with the iceberg
			const wouldOverlap =
				newX < iceberg.x + iceberg.width &&
				newX + penguinWidth > iceberg.x &&
				newY < iceberg.y + iceberg.height &&
				newY + penguinHeight > iceberg.y - 3; // Consistent with landing detection

			if (wouldOverlap) {
				// Check if penguin was previously overlapping (already inside)
				const wasOverlapping =
					prevX < iceberg.x + iceberg.width &&
					prevX + penguinWidth > iceberg.x &&
					prevY < iceberg.y + iceberg.height &&
					prevY + penguinHeight > iceberg.y - 3; // Consistent with landing detection

				// If already overlapping, don't stop movement (let penguin escape)
				if (wasOverlapping) {
					continue;
				}

				// Determine collision direction and response
				const moveX = newX - prevX;
				const moveY = newY - prevY;

				// Calculate overlap amounts for each direction
				const overlapLeft = prevX + penguinWidth - iceberg.x;
				const overlapRight = iceberg.x + iceberg.width - prevX;
				const overlapTop = prevY + penguinHeight - iceberg.y;
				const overlapBottom = iceberg.y + iceberg.height - prevY;

				// Find the smallest overlap (most likely collision direction)
				const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

				if (minOverlap === overlapTop && moveY > 0) {
					// Colliding with top of iceberg from above
					return {
						type: "vertical",
						correctedX: newX,
						correctedY: iceberg.y - penguinHeight,
					};
				} else if (minOverlap === overlapBottom && moveY < 0) {
					// Colliding with bottom of iceberg from below
					return {
						type: "vertical",
						correctedX: newX,
						correctedY: iceberg.y + iceberg.height,
					};
				} else if (minOverlap === overlapLeft && moveX > 0) {
					// Colliding with left side of iceberg from left
					return {
						type: "horizontal",
						correctedX: iceberg.x - penguinWidth,
						correctedY: newY,
					};
				} else if (minOverlap === overlapRight && moveX < 0) {
					// Colliding with right side of iceberg from right
					return {
						type: "horizontal",
						correctedX: iceberg.x + iceberg.width,
						correctedY: newY,
					};
				} else {
					// Corner collision or complex case
					return {
						type: "corner",
						correctedX: prevX,
						correctedY: prevY,
					};
				}
			}
		}

		return null; // No collision
	}

	checkCollisions() {
		const wasOnIceberg = this.penguin.onIceberg;
		this.penguin.onIceberg = false;

		for (let iceberg of this.icebergs) {
			// Check if penguin is on top of iceberg (more precise landing detection)
			if (
				this.penguin.x + this.penguin.width > iceberg.x + 5 && // Small margin from edges
				this.penguin.x < iceberg.x + iceberg.width - 5 &&
				this.penguin.y + this.penguin.height >= iceberg.y - 3 &&
				this.penguin.y + this.penguin.height <= iceberg.y + 12 &&
				this.penguin.velocityY >= -1 // Allow slight upward velocity for landing
			) {
				// Snap penguin to slightly into the iceberg surface for more realistic look
				this.penguin.y = iceberg.y - this.penguin.height + 3;
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
		// Match the visual offset of the penguin
		const visualOffset = this.imagesReady && this.images.penguin ? 30 : 8;

		for (let i = 0; i < 8; i++) {
			this.particles.push({
				x: this.penguin.x + this.penguin.width / 2,
				y: this.penguin.y + this.penguin.height + visualOffset, // Apply visual offset
				velocityX: (Math.random() - 0.5) * 6,
				velocityY: Math.random() * -3,
				life: 30,
				color: `rgba(255, 255, 255, ${Math.random() * 0.8 + 0.2})`,
			});
		}
	}

	createSlipParticles() {
		// Match the visual offset of the penguin
		const visualOffset = this.imagesReady && this.images.penguin ? 30 : 8;

		// Create ice particles when sliding
		for (let i = 0; i < 3; i++) {
			this.particles.push({
				x: this.penguin.x + this.penguin.width / 2 + (Math.random() - 0.5) * this.penguin.width,
				y: this.penguin.y + this.penguin.height + visualOffset - 5, // Apply visual offset
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
		this.snowflakes = []; // Clear existing snowflakes

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

		// Show loading screen if images aren't ready
		if (!this.imagesReady) {
			this.ctx.fillStyle = "#87CEEB";
			this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

			this.ctx.fillStyle = "#FFFFFF";
			this.ctx.font = "32px Arial";
			this.ctx.textAlign = "center";
			this.ctx.fillText("Loading Penguin Glider...", this.canvas.width / 2, this.canvas.height / 2 - 20);

			this.ctx.font = "24px Arial";
			this.ctx.fillText(
				`Loading images: ${this.imagesLoaded}/${this.totalImages}`,
				this.canvas.width / 2,
				this.canvas.height / 2 + 30
			);

			// Loading bar
			const barWidth = 450;
			const barHeight = 12;
			const barX = this.canvas.width / 2 - barWidth / 2;
			const barY = this.canvas.height / 2 + 60;

			this.ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
			this.ctx.fillRect(barX, barY, barWidth, barHeight);

			this.ctx.fillStyle = "#4a90e2";
			const progress = this.imagesLoaded / this.totalImages;
			this.ctx.fillRect(barX, barY, barWidth * progress, barHeight);

			return;
		}

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

		// Draw background mountains if image is loaded
		if (this.imagesReady && this.images.moutain) {
			// Draw repeating mountain background with parallax effect
			const mountainY = this.waterLevel - 300;
			const mountainHeight = 225;
			const parallaxSpeed = 0.3; // Mountains move slower than camera
			const parallaxX = this.camera.x * parallaxSpeed;

			// Calculate mountain width based on aspect ratio
			const mountainAspect = this.images.moutain.naturalWidth / this.images.moutain.naturalHeight;
			const mountainWidth = mountainHeight * mountainAspect;

			for (let x = parallaxX - this.canvas.width; x < parallaxX + this.canvas.width * 2; x += mountainWidth) {
				this.drawImagePreserveAspect(this.images.moutain, x, mountainY, mountainWidth, mountainHeight, "bottom");
			}
		}

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

		// Draw icebergs
		for (let iceberg of this.icebergs) {
			// Use iceberg image if loaded, otherwise fall back to drawn iceberg
			if (this.imagesReady && this.images[`iceberg${iceberg.imageType}`]) {
				// Draw image at iceberg's stored dimensions (no cropping)
				this.ctx.drawImage(
					this.images[`iceberg${iceberg.imageType}`],
					iceberg.x,
					iceberg.y,
					iceberg.width,
					iceberg.height
				);
			} else {
				// Fallback: Main iceberg body
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
		}

		// Draw fish
		for (let fish of this.fish) {
			this.drawFish(fish);
		}

		// Draw particles
		for (let particle of this.particles) {
			// Use bubble image for blue particles (water/collection effects), otherwise simple rectangles
			if (this.imagesReady && this.images.bubble && particle.color.includes("180")) {
				// Use bubble image for blue-ish particles (fish collection)
				this.ctx.globalAlpha = 0.7;
				this.drawImagePreserveAspect(this.images.bubble, particle.x - 6, particle.y - 6, 12, 12, "center");
				this.ctx.globalAlpha = 1;
			} else {
				// Fallback: simple colored rectangles
				this.ctx.fillStyle = particle.color;
				this.ctx.fillRect(particle.x - 3, particle.y - 3, 6, 6);
			}
		}

		// Draw penguin
		this.drawPenguin();

		// Draw water in foreground (premier plan) - extended for camera movement
		if (this.imagesReady && this.images.water) {
			// Draw repeating water texture using natural image dimensions with reduced opacity
			this.ctx.globalAlpha = 0.7; // Reduce opacity to 70%
			const waterImage = this.images.water;
			const waterWidth = waterImage.naturalWidth;
			const waterHeight = waterImage.naturalHeight;

			// Calculate how many tiles we need to cover the visible area
			const startX = this.camera.x - this.canvas.width;
			const endX = this.camera.x + this.canvas.width * 2;
			const startY = this.waterLevel;
			const endY = this.waterLevel + this.canvas.height;

			// Tile the water image to fill the area
			for (let x = startX - (startX % waterWidth); x < endX; x += waterWidth) {
				for (let y = startY - (startY % waterHeight); y < endY; y += waterHeight) {
					this.ctx.drawImage(waterImage, x, y, waterWidth, waterHeight);
				}
			}
			this.ctx.globalAlpha = 1; // Reset opacity
		} else {
			// Fallback: solid color water with reduced opacity
			this.ctx.globalAlpha = 0.7;
			this.ctx.fillStyle = "#1E3A8A";
			this.ctx.fillRect(
				this.camera.x - this.canvas.width,
				this.waterLevel,
				this.canvas.width * 3,
				this.canvas.height
			);
			this.ctx.globalAlpha = 1; // Reset opacity
		}

		// Draw water waves in foreground (extended for camera)
		if (this.imagesReady && this.images.waves) {
			// Draw wave overlay on top of water with preserved aspect ratio
			const waveHeight = 30;
			const waveAspect = this.images.waves.naturalWidth / this.images.waves.naturalHeight;
			const waveWidth = waveHeight * waveAspect;

			for (let x = this.camera.x - this.canvas.width; x < this.camera.x + this.canvas.width * 2; x += waveWidth) {
				const waveY = this.waterLevel + Math.sin((x + Date.now() * 0.001) * 0.01) * 5;
				this.drawImagePreserveAspect(this.images.waves, x, waveY, waveWidth, waveHeight, "center");
			}
		} else {
			// Fallback: drawn waves
			this.ctx.strokeStyle = "#4682B4";
			this.ctx.lineWidth = 3;
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
		}

		// Restore context (end camera transformation)
		this.ctx.restore();
	}

	drawPenguin() {
		const x = this.penguin.x;
		const y = this.penguin.y;
		const w = this.penguin.width;
		const h = this.penguin.height;

		// Use penguin image if loaded, otherwise fall back to drawn penguin
		if (this.imagesReady && this.images.penguin) {
			// Draw penguin lower to appear more embedded in iceberg surface
			const visualOffset = 30; // Pixels lower than collision position
			this.drawImagePreserveAspect(this.images.penguin, x, y + visualOffset, w, h, "bottom");
		} else {
			// Fallback: Penguin body (black) - also offset for consistency
			const visualOffset = 8;
			this.ctx.fillStyle = "#2C2C2C";
			this.ctx.fillRect(x + w * 0.1, y + visualOffset + h * 0.2, w * 0.8, h * 0.7);

			// Penguin belly (white)
			this.ctx.fillStyle = "#FFFFFF";
			this.ctx.fillRect(x + w * 0.25, y + visualOffset + h * 0.3, w * 0.5, h * 0.5);

			// Penguin head (black)
			this.ctx.fillStyle = "#2C2C2C";
			this.ctx.beginPath();
			this.ctx.arc(x + w / 2, y + visualOffset + h * 0.25, w * 0.35, 0, Math.PI * 2);
			this.ctx.fill();

			// Penguin beak (orange)
			this.ctx.fillStyle = "#FF8C00";
			this.ctx.beginPath();
			this.ctx.moveTo(x + w * 0.45, y + visualOffset + h * 0.25);
			this.ctx.lineTo(x + w * 0.3, y + visualOffset + h * 0.3);
			this.ctx.lineTo(x + w * 0.45, y + visualOffset + h * 0.35);
			this.ctx.fill();

			// Penguin eyes (white)
			this.ctx.fillStyle = "#FFFFFF";
			this.ctx.beginPath();
			this.ctx.arc(x + w * 0.4, y + visualOffset + h * 0.2, w * 0.08, 0, Math.PI * 2);
			this.ctx.fill();
			this.ctx.beginPath();
			this.ctx.arc(x + w * 0.6, y + visualOffset + h * 0.2, w * 0.08, 0, Math.PI * 2);
			this.ctx.fill();

			// Penguin pupils (black)
			this.ctx.fillStyle = "#000000";
			this.ctx.beginPath();
			this.ctx.arc(x + w * 0.42, y + visualOffset + h * 0.2, w * 0.04, 0, Math.PI * 2);
			this.ctx.fill();
			this.ctx.beginPath();
			this.ctx.arc(x + w * 0.58, y + visualOffset + h * 0.2, w * 0.04, 0, Math.PI * 2);
			this.ctx.fill();

			// Penguin flippers (black)
			this.ctx.fillStyle = "#2C2C2C";

			// Left flipper
			this.ctx.save();
			this.ctx.translate(x + w * 0.1, y + visualOffset + h * 0.4);
			if (this.penguin.gliding) {
				this.ctx.rotate(-0.3);
			}
			this.ctx.fillRect(-w * 0.15, -h * 0.1, w * 0.3, h * 0.1);
			this.ctx.restore();

			// Right flipper
			this.ctx.save();
			this.ctx.translate(x + w * 0.9, y + visualOffset + h * 0.4);
			if (this.penguin.gliding) {
				this.ctx.rotate(0.3);
			}
			this.ctx.fillRect(-w * 0.15, -h * 0.1, w * 0.3, h * 0.1);
			this.ctx.restore();

			// Penguin feet (orange)
			this.ctx.fillStyle = "#FF8C00";
			this.ctx.fillRect(x + w * 0.2, y + visualOffset + h * 0.85, w * 0.25, h * 0.15);
			this.ctx.fillRect(x + w * 0.55, y + visualOffset + h * 0.85, w * 0.25, h * 0.15);
		}
	}

	drawFish(fish) {
		const x = fish.x;
		const y = fish.y;
		const w = fish.width;
		const h = fish.height;

		// Use fish image if loaded, otherwise fall back to drawn fish
		if (this.imagesReady && this.images[`fish${fish.imageType}`]) {
			this.drawImagePreserveAspect(this.images[`fish${fish.imageType}`], x, y, w, h, "center");
		} else {
			// Fallback: Fish body (main color)
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
		}

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

	gameLoop(currentTime = 0) {
		// Calculate delta time
		if (this.lastTime === 0) {
			this.lastTime = currentTime;
		}

		this.deltaTime = currentTime - this.lastTime;
		this.lastTime = currentTime;

		// Cap delta time to prevent large jumps (e.g., when tab becomes inactive)
		this.deltaTime = Math.min(this.deltaTime, this.fixedDeltaTime * 3);

		// Normalize delta time to 60 FPS equivalent
		const deltaMultiplier = this.deltaTime / this.fixedDeltaTime;

		this.update(deltaMultiplier);
		this.render();
		requestAnimationFrame((time) => this.gameLoop(time));
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

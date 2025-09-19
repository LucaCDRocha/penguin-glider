// Penguin Glider Game
class PenguinGlider {
	constructor(autoStart = true) {
		// Debug settings
		this.showHitboxes = false; // Set to true to show collision hitboxes
		this.timer = new GameTimer();
		this.fromRestart = false;
		this.autoStart = autoStart; // Control whether to auto-start timer when images load

		this.canvas = document.getElementById("gameCanvas");
		this.ctx = this.canvas.getContext("2d");
		this.gameOverElement = document.getElementById("gameOver");
		this.winScreenElement = document.getElementById("winScreen");
		this.finalScoreElement = document.getElementById("finalScore");
		this.winScoreElement = document.getElementById("winScore");
		this.winTimeElement = document.getElementById("winTime");

		// Calculate mobile scale factor based on screen size
		this.isMobile = window.innerWidth < 768 || window.innerHeight < 500;
		this.mobileScaleFactor = this.isMobile ? 0.7 : 1.0; // Scale down 30% on mobile

		this.gameState = "playing"; // 'playing' or 'gameOver'
		this.score = 0;
		this.keys = {};

		// Penguin properties (will be positioned on first iceberg after initialization)
		this.penguin = {
			x: 100,
			y: 0, // Will be set relative to water level when icebergs are generated
			width: 80,
			height: 80,
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

		// Bears for obstacles
		this.bears = [];

		// Bottles for reducing fish count
		this.bottles = [];

		// Water level (will be calculated properly after canvas setup)
		this.waterLevel = 400; // Default value, will be recalculated

		// Particles for effects
		this.particles = [];
		this.snowflakes = [];

		// Moving water waves for visual effect
		this.waves = [];

		// Camera system for scrolling environment
		this.camera = {
			x: 0,
			y: 0,
			targetX: 0,
			targetY: 0,
			smoothing: 0.1,
		};

		// Level progression system
		this.levelLength = 10000; // Total distance to complete the level (in pixels)
		this.startPosition = 0; // Starting camera position
		this.distanceTraveled = 0; // How far the player has progressed
		this.levelProgress = 0; // Percentage of level completed (0-1)
		this.levelCompleted = false; // Whether the level has been completed
		this.minFishRequired = 10; // Minimum fish needed to win
		this.progressBarElement = null; // UI element for progress bar

		// Final level iceberg
		this.finalIcebergGenerated = false; // Track if final iceberg has been created
		this.finalIcebergPosition = this.levelLength - 200; // Position final iceberg near the end
		this.preFinalIcebergGenerated = false; // Track if the iceberg before final has been created

		// Fish distribution tracking
		this.fishSpawned = 0; // Total fish spawned so far
		this.guaranteedFishRegions = []; // Track regions that must have fish
		this.lastGuaranteedFishX = 0; // Last position where guaranteed fish was placed

		// Create UI elements after properties are defined
		this.createScoreDisplay();
		this.createProgressBar();

		// Delta time for frame rate independence
		this.lastTime = 0;
		this.deltaTime = 0;
		this.targetFPS = 60; // Target 60 FPS
		this.fixedDeltaTime = 1000 / this.targetFPS; // 16.67ms for 60 FPS

		// Audio context for sound effects
		this.audioContext = null;
		this.sounds = {};
		this.glideTimer = 0;

		// Background music system - using MP3 file
		this.backgroundMusic = null;
		this.musicKeyPressed = false; // Track M key press state

		// Create HTML5 Audio element for music.mp3
		try {
			this.backgroundMusic = new Audio("music.mp3");
			this.backgroundMusic.loop = true; // Loop the music
			this.backgroundMusic.volume = 0.2; // Set volume (0.0 to 1.0) - Lower volume
			this.backgroundMusic.preload = "auto"; // Preload the audio
			console.log("MP3 background music loaded successfully");
		} catch (error) {
			console.warn("Failed to load background music:", error);
		}

		// Image loading system
		this.images = {};
		this.imagesLoaded = 0;
		this.totalImages = 0;
		this.imagesReady = false;

		this.waterImageYOffset = null; // Will be set after first iceberg is created
		this.mountainImageYOffset = null; // Will be set after first iceberg is created
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
			"penguin-baby.png",
			"flag.png",
			"end-level.png",
			"iceberg1.png",
			"iceberg2.png",
			"iceberg3.png",
			"iceberg4.png",
			"fish1.png",
			"fish2.png",
			"fish3.png",
			"fish4.png",
			"bear.png",
			"water.png",
			"waves.png",
			"moutain.png",
			"bubble.png",
			"bottle.png",
			"plastic-bag.png",
			"cloud1.png",
			"cloud2.png",
			"cloud3.png",
			"cloud4.png",
			"cloud5.png",
			"snow1.png",
			"try-again.png",
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
					// Set up timer to end game when time runs out
					this.timer.setTimeUpCallback(() => this.gameOver());
					// Initial timer start - only if autoStart is enabled and not from restart
					if (this.autoStart && !this.fromRestart) {
						this.timer.start();
						this.startBackgroundMusic();
					}
				}
			};
			img.onerror = () => {
				console.warn(`Failed to load image: ${imageName}`);
				this.imagesLoaded++;
				if (this.imagesLoaded === this.totalImages) {
					this.imagesReady = true;
					this.init(); // Start the game even if some images failed
					// Set up timer but don't auto-start if autoStart is disabled
					this.timer.setTimeUpCallback(() => this.gameOver());
					if (this.autoStart && !this.fromRestart) {
						this.timer.start();
						this.startBackgroundMusic();
					}
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

	// Helper method to draw infinite cloud layers with parallax
	drawInfiniteCloudLayer(parallaxSpeed, yOffset, scale, cloudTypes) {
		// Calculate parallax offset - clouds move slower than camera for depth
		const parallaxX = this.camera.x * parallaxSpeed;
		const cloudY = this.waterLevel + yOffset;

		// Calculate render bounds in world coordinates (accounting for camera position)
		const renderBuffer = this.canvas.width;
		const leftBound = this.camera.x - renderBuffer;
		const rightBound = this.camera.x + this.canvas.width + renderBuffer;

		// Base cloud size
		const baseCloudWidth = 200 * scale;
		const baseCloudHeight = 100 * scale;

		// Much wider spacing for fewer clouds
		const baseCloudSpacing = baseCloudWidth * 3.0;

		// Calculate tile positions based on parallax offset
		const startTile = Math.floor((leftBound - parallaxX) / baseCloudSpacing) - 2;
		const endTile = Math.ceil((rightBound - parallaxX) / baseCloudSpacing) + 2;

		// Set cloud opacity for atmospheric effect
		this.ctx.globalAlpha = 0.6;

		// Helper function for consistent random values based on tile position
		const getRandomValue = (tile, seed) => {
			// Use tile position and seed to generate consistent pseudo-random values
			const hash = Math.sin((tile + seed) * 12.9898) * 43758.5453;
			return hash - Math.floor(hash);
		};

		// Draw clouds infinitely with random placement
		for (let tile = startTile; tile <= endTile; tile++) {
			// Use consistent spacing with random offset for each tile
			const spacingRandom = getRandomValue(tile, 1.0);
			const randomOffset = (spacingRandom - 0.5) * baseCloudSpacing * 0.5; // Random offset up to 50% of spacing

			// World position accounting for parallax - simple and smooth
			const x = parallaxX + tile * baseCloudSpacing + randomOffset;

			// Skip if cloud would be completely outside render bounds
			if (x > rightBound + baseCloudWidth || x < leftBound - baseCloudWidth) continue;

			// Use tile index to deterministically select cloud type
			const cloudIndex = Math.abs(tile) % cloudTypes.length;
			const cloudType = cloudTypes[cloudIndex];

			// Random vertical variation (much more dramatic)
			const verticalRandom = getRandomValue(tile, 2.0);
			const verticalRange = this.canvas.height * 0.3; // 30% of screen height variation
			const verticalVariation = (verticalRandom - 0.5) * verticalRange;
			const finalY = cloudY + verticalVariation;

			// Random size variation (50% to 200% of base size)
			const sizeRandom = getRandomValue(tile, 3.0);
			const sizeVariation = 0.5 + sizeRandom * 1.5;
			const cloudWidth = baseCloudWidth * sizeVariation;
			const cloudHeight = baseCloudHeight * sizeVariation;

			// Random opacity variation for more atmospheric depth
			const opacityRandom = getRandomValue(tile, 4.0);
			const cloudOpacity = 0.3 + opacityRandom * 0.4; // 0.3 to 0.7 opacity
			this.ctx.globalAlpha = cloudOpacity;

			// Random horizontal offset for more natural placement
			const horizontalRandom = getRandomValue(tile, 5.0);
			const horizontalOffset = (horizontalRandom - 0.5) * baseCloudWidth * 0.3;
			const finalX = x + horizontalOffset;

			if (this.images[cloudType]) {
				this.drawImagePreserveAspect(this.images[cloudType], finalX, finalY, cloudWidth, cloudHeight, "center");
			}
		}

		// Reset opacity
		this.ctx.globalAlpha = 1;
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

			case "win":
				// Victory sound - ascending triumphant melody
				oscillator.type = "sine";
				oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime); // C5
				oscillator.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.15); // E5
				oscillator.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.3); // G5
				oscillator.frequency.setValueAtTime(1047, this.audioContext.currentTime + 0.45); // C6
				gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
				gainNode.gain.setValueAtTime(0.25, this.audioContext.currentTime + 0.45);
				gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.8);
				oscillator.start();
				oscillator.stop(this.audioContext.currentTime + 0.8);
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

		// Add orientation change handler for mobile devices
		window.addEventListener("orientationchange", () => {
			// Small delay to ensure the new orientation dimensions are available
			setTimeout(() => {
				this.handleResize();
			}, 100);
		});

		// Initial resize
		this.handleResize();
	}

	handleResize() {
		const canvas = this.canvas;

		// Get actual viewport dimensions
		const vw = window.innerWidth;
		const vh = window.innerHeight;

		// Set canvas size to full viewport
		canvas.width = vw;
		canvas.height = vh;

		// Update canvas style to match exactly
		canvas.style.width = vw + "px";
		canvas.style.height = vh + "px";

		// Calculate responsive water level based on screen size and orientation
		const aspectRatio = vw / vh;
		let waterLevelRatio;

		if (aspectRatio > 1.5) {
			// Wide screens (landscape) - water level around middle
			waterLevelRatio = 0.5;
		} else if (aspectRatio > 1.2) {
			// Slightly wide screens - water level slightly lower
			waterLevelRatio = 0.55;
		} else if (aspectRatio > 0.8) {
			// Square-ish screens - water level lower
			waterLevelRatio = 0.6;
		} else {
			// Tall screens (mobile portrait) - water level much lower to give more gameplay space
			waterLevelRatio = 0.65;
		}

		// Apply additional adjustment for very tall mobile screens
		if (vh > vw * 1.8) {
			waterLevelRatio = Math.min(0.7, waterLevelRatio + 0.05);
		}

		this.waterLevel = canvas.height * waterLevelRatio;

		// Force a redraw
		if (this.imagesReady) {
			this.render();
		}
	}

	setupEventListeners() {
		// Keyboard controls

		document.addEventListener("keydown", (e) => {
			this.keys[e.code] = true;
			// If game over screen is visible and Enter is pressed, restart
			if (
				this.gameState === "gameOver" &&
				(e.code === "Enter" || e.key === "Enter") &&
				this.gameOverElement &&
				(this.gameOverElement.style.display === "block" || this.gameOverElement.style.display === "flex")
			) {
				if (typeof restartGame === "function") {
					restartGame();
				}
			}
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

	// Helper: Get the allowed Y range for icebergs
	getIcebergYRange(lastIcebergY) {
		const baseMinOffset = 380 * this.mobileScaleFactor;
		const baseMaxOffset = 340 * this.mobileScaleFactor;
		const mobileHeightAdjustment = this.isMobile ? 50 : 0;
		const minY = Math.max(
			this.waterLevel - baseMinOffset - mobileHeightAdjustment,
			lastIcebergY - 150 // maxVerticalReach
		);
		const maxY = Math.min(this.waterLevel - baseMaxOffset - mobileHeightAdjustment, lastIcebergY + 60);
		return { minY, maxY };
	}

	generateInitialIcebergs() {
		// Starting iceberg - use image dimensions if available (tripled size, with mobile scaling)
		let startWidth = 540 * this.mobileScaleFactor,
			startHeight = 270 * this.mobileScaleFactor;
		if (this.imagesReady && this.images.iceberg1) {
			const image = this.images.iceberg1;
			const imageAspect = image.naturalWidth / image.naturalHeight;
			startHeight = 360 * this.mobileScaleFactor; // Apply mobile scale
			startWidth = startHeight * imageAspect;
		}
		const mobileHeightAdjustment = this.isMobile ? 50 : 0;
		const startY = this.waterLevel - startHeight - 20 - mobileHeightAdjustment;
		this.icebergs.push({
			x: 100 - startWidth / 2,
			y: startY,
			width: startWidth,
			height: startHeight,
			imageType: 1,
		});
		// Generate more icebergs with guaranteed reachability and more spacing
		let lastY = startY;
		for (let i = 1; i < 5; i++) {
			lastY = this.generateIceberg(50 + 250 * i, lastY); // Pass lastY for consistent placement
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

	generateIceberg(startX, lastIcebergY) {
		// Calculate penguin's maximum jump capabilities
		// Jump power: -15, gravity: 0.5 (updated for current physics)
		// Time to reach peak: 15/0.5 = 30 frames, total air time: 60 frames
		// Maximum horizontal distance with movement: 60 * 7 = 420 pixels
		// Maximum horizontal distance with gliding: 60 * 4 = 240 pixels
		// Safe maximum distance: 300 pixels to account for different jump trajectories

		const maxHorizontalReach = 300;
		const horizontalDistance = Math.random() * (maxHorizontalReach * 0.8) + maxHorizontalReach * 0.2;
		// Use lastIcebergY if provided, else fallback to previous iceberg or waterLevel
		let prevY =
			typeof lastIcebergY === "number"
				? lastIcebergY
				: this.icebergs.length > 0
				? this.icebergs[this.icebergs.length - 1].y
				: this.waterLevel - 60;
		const { minY, maxY } = this.getIcebergYRange(prevY);

		// Generate iceberg with image-based dimensions if available
		const imageType = Math.floor(Math.random() * 4) + 1;
		let width, height;

		if (this.imagesReady && this.images[`iceberg${imageType}`]) {
			// Use image natural dimensions scaled to appropriate game size (tripled, with mobile scaling)
			const image = this.images[`iceberg${imageType}`];
			const imageAspect = image.naturalWidth / image.naturalHeight;
			const baseHeight = (270 + Math.random() * 180) * this.mobileScaleFactor; // Apply mobile scale

			height = baseHeight;
			width = height * imageAspect;
		} else {
			// Fallback dimensions for when images aren't loaded (tripled, with mobile scaling)
			width = (360 + Math.random() * 270) * this.mobileScaleFactor;
			height = (180 + Math.random() * 180) * this.mobileScaleFactor;
		}

		const newIcebergX = startX + horizontalDistance;
		let newIcebergY = minY + Math.random() * (maxY - minY);

		// Check for overlapping icebergs and align tops if they overlap
		const overlappingIcebergs = [];
		for (let existingIceberg of this.icebergs) {
			// Check if icebergs will overlap horizontally
			const horizontalOverlap = !(
				newIcebergX + width < existingIceberg.x || existingIceberg.x + existingIceberg.width < newIcebergX
			);

			if (horizontalOverlap) {
				// Calculate how much they overlap
				const overlapStart = Math.max(newIcebergX, existingIceberg.x);
				const overlapEnd = Math.min(newIcebergX + width, existingIceberg.x + existingIceberg.width);
				const overlapWidth = overlapEnd - overlapStart;
				const overlapPercentage = overlapWidth / Math.min(width, existingIceberg.width);

				// If significant overlap (more than 20%), add to overlapping list
				if (overlapPercentage > 0.2) {
					overlappingIcebergs.push(existingIceberg);
				}
			}
		}

		// If there are overlapping icebergs, align all tops to the highest one
		if (overlappingIcebergs.length > 0) {
			// Find the highest iceberg (lowest Y value) among overlapping ones
			const highestY = Math.min(...overlappingIcebergs.map((iceberg) => iceberg.y));
			newIcebergY = highestY; // Align to the highest top

			// Also align all other overlapping icebergs to this height
			overlappingIcebergs.forEach((iceberg) => {
				iceberg.y = highestY;
			});
		}

		const iceberg = {
			x: newIcebergX,
			y: newIcebergY,
			width: width,
			height: height,
			imageType: imageType,
		};

		this.icebergs.push(iceberg);

		// Intelligent fish spawning to ensure minimum availability
		this.smartFishSpawning(iceberg);

		// Bear spawning on some icebergs (making it challenging but not too common)
		this.smartBearSpawning(iceberg);

		// Bottle spawning (less frequent than fish, reduces fish count)
		this.smartBottleSpawning(iceberg);

		return newIcebergY;
	}

	generateFinalIceberg() {
		// Create the special final iceberg with end-level image
		if (this.imagesReady && this.images["end-level"]) {
			const endLevelImage = this.images["end-level"];

			// Make the final iceberg smaller than normal icebergs
			const scaleFactor = 0.4;
			const width = endLevelImage.naturalWidth * scaleFactor;
			const height = endLevelImage.naturalHeight * scaleFactor;

			// Position the final iceberg so its left edge aligns with the end of the level
			const finalIcebergX = this.levelLength;
			const finalIcebergY = this.waterLevel - height - 150; // 20px above water level

			// Create smaller collision box (only bottom part of the iceberg)
			const colliderHeight = height * 0.6; // Collision box is 60% of image height
			const colliderY = finalIcebergY + (height - colliderHeight); // Position at bottom of image

			const finalIceberg = {
				x: finalIcebergX,
				y: finalIcebergY,
				width: width,
				height: height,
				// Collision box properties (smaller than visual image)
				colliderX: finalIcebergX,
				colliderY: colliderY,
				colliderWidth: width,
				colliderHeight: colliderHeight,
				imageType: "end-level", // Special type for the final iceberg
				isFinalIceberg: true, // Flag to identify this as the special ending
			};

			this.icebergs.push(finalIceberg);
			this.finalIcebergGenerated = true;
		}
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
		this.updateBears(deltaMultiplier);
		this.updateBottles(deltaMultiplier);
		this.updateParticles(deltaMultiplier);
		this.updateSnowflakes(deltaMultiplier);
		this.updateWaves(deltaMultiplier);
		this.checkCollisions();
		this.checkFishCollection();
		this.checkBottleCollection();
		this.checkBearCollisions();
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
		if ((this.keys["ArrowUp"] || this.keys["KeyW"] || this.keys["Space"]) && this.penguin.onIceberg) {
			this.penguin.velocityY = this.jumpPower;
			this.penguin.onIceberg = false;
			this.penguin.gliding = true;
			this.createJumpParticles();
			this.playSound("jump");
		}

		// Gliding control
		if (
			(this.keys["ArrowUp"] || this.keys["KeyW"] || this.keys["Space"]) &&
			!this.penguin.onIceberg &&
			this.penguin.velocityY > 0
		) {
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

		// Music toggle (M key) - only trigger once per key press
		if (this.keys["KeyM"] && !this.musicKeyPressed) {
			this.toggleBackgroundMusic();
			this.musicKeyPressed = true;
		} else if (!this.keys["KeyM"]) {
			this.musicKeyPressed = false;
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

		// SAFETY CHECK: Only validate when penguin is moving significantly or falling
		const isMovingSignificantly = Math.abs(this.penguin.velocityX) > 1 || Math.abs(this.penguin.velocityY) > 3;
		if (isMovingSignificantly) {
			this.validatePenguinPosition();
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

		// Calculate responsive camera bounds based on screen size
		const skyVisibleHeight = Math.min(400, this.canvas.height * 0.4);
		const waterBufferHeight = Math.max(100, this.canvas.height * 0.1);

		// Prevent camera from going too high (keep some sky visible above mountains)
		this.camera.y = Math.max(this.camera.y, this.waterLevel - skyVisibleHeight);

		// Prevent camera from going below water level
		this.camera.y = Math.min(this.camera.y, this.waterLevel - this.canvas.height + waterBufferHeight);

		// Update level progression
		this.updateLevelProgress();
	}

	updateLevelProgress() {
		// Calculate distance traveled based on camera position from start
		this.distanceTraveled = Math.max(0, this.camera.x - this.startPosition);

		// Calculate progress percentage (0-1)
		const actualProgress = Math.min(1, this.distanceTraveled / this.levelLength);

		// Show progress bar slightly ahead of actual position (add 5% boost, but don't exceed 100%)
		this.levelProgress = Math.min(1, actualProgress * 1.05);

		// Update progress bar display
		this.updateProgressBar();

		// Check if level is completed - but only if penguin is actually on the final iceberg
		if (!this.levelCompleted && this.levelProgress >= 1) {
			this.checkLevelCompletion();
		}
	}

	updateIcebergs(deltaMultiplier = 1) {
		// Remove icebergs that are off camera view (left side)
		this.icebergs = this.icebergs.filter((iceberg) => iceberg.x + iceberg.width > this.camera.x - 200);

		// Generate final iceberg when approaching the end
		if (!this.finalIcebergGenerated && this.camera.x > this.finalIcebergPosition - 1000) {
			this.generateFinalIceberg();
		}

		// Generate pre-final iceberg to ensure there's always one iceberg before the final one
		if (!this.preFinalIcebergGenerated && this.camera.x > this.finalIcebergPosition - 1500) {
			const preFinalIcebergX = this.finalIcebergPosition - 400; // 400 pixels before final iceberg
			this.generateIceberg(preFinalIcebergX);
			this.preFinalIcebergGenerated = true;
		}

		// Check if we need to guarantee more fish before the final iceberg
		const fishDeficit = this.minFishRequired - this.fishSpawned;
		const distanceToFinalIceberg = this.finalIcebergPosition - this.camera.x;
		const isApproachingEnd = distanceToFinalIceberg < 2000; // Within 2000 pixels of final iceberg

		// Generate new icebergs ahead of camera (but not beyond the final iceberg)
		if (this.icebergs.length < 8) {
			const lastIceberg = this.icebergs[this.icebergs.length - 1];
			const baseDistance = 200; // Increased spacing for larger icebergs
			const nextIcebergX = lastIceberg.x + baseDistance;

			// Normal iceberg generation boundary
			let shouldGenerate = nextIcebergX < this.finalIcebergPosition - 300;

			// Force generation if we need more fish and are approaching the end
			if (isApproachingEnd && fishDeficit > 0 && nextIcebergX < this.finalIcebergPosition - 100) {
				shouldGenerate = true;
			}

			if (shouldGenerate) {
				this.generateIceberg(nextIcebergX);
			}
		}

		// Emergency fish spawning: if we're very close to final iceberg and still need fish
		if (isApproachingEnd && fishDeficit > 0 && distanceToFinalIceberg < 800) {
			// Find the nearest iceberg ahead of the camera that doesn't have fish
			for (let iceberg of this.icebergs) {
				if (iceberg.x > this.camera.x && !iceberg.isFinalIceberg) {
					// Check if this iceberg already has fish
					const hasExistingFish = this.fish.some(
						(fish) =>
							fish.x >= iceberg.x &&
							fish.x <= iceberg.x + iceberg.width &&
							fish.y >= iceberg.y - 30 &&
							fish.y <= iceberg.y + 10
					);

					if (!hasExistingFish) {
						this.spawnFishOnIceberg(iceberg);
						break; // Only spawn one fish per frame to avoid spam
					}
				}
			}
		}
	}

	updateFish(deltaMultiplier = 1) {
		// Animate fish (no need to move them left since camera follows penguin)
		for (let fish of this.fish) {
			fish.animationTimer += 0.1 * deltaMultiplier;

			// Add slight bobbing motion
			fish.y += Math.sin(fish.animationTimer) * 0.5 * deltaMultiplier;
		}

		// Remove fish that are off camera view (left side)
		this.fish = this.fish.filter((fish) => fish.x + fish.width > this.camera.x - 200);
	}

	updateBears(deltaMultiplier = 1) {
		// Animate bears (slight movement and breathing animation)
		for (let bear of this.bears) {
			bear.animationTimer += 0.05 * deltaMultiplier; // Slower animation than fish

			// Add slight breathing/idle animation
			bear.y += Math.sin(bear.animationTimer) * 0.3 * deltaMultiplier;
		}

		// Remove bears that are off camera view (left side)
		this.bears = this.bears.filter((bear) => bear.x + bear.width > this.camera.x - 200);
	}

	updateBottles(deltaMultiplier = 1) {
		// Animate bottles (similar to fish but different motion)
		for (let bottle of this.bottles) {
			bottle.animationTimer += 0.08 * deltaMultiplier; // Similar to fish animation

			// Add slight bobbing motion (like floating)
			bottle.y += Math.sin(bottle.animationTimer) * 0.4 * deltaMultiplier;
		}

		// Remove bottles that are off camera view (left side)
		this.bottles = this.bottles.filter((bottle) => bottle.x + bottle.width > this.camera.x - 200);
	}

	spawnFishOnIceberg(iceberg) {
		// Spawn a fish directly on top of the iceberg
		const fishMargin = 20; // Small margin from iceberg edges
		const fishX = iceberg.x + fishMargin + Math.random() * (iceberg.width - 2 * fishMargin - 40); // 40 is fish width
		const fishY = iceberg.y - 24; // 24 is fish height, position just above iceberg top

		const fish = {
			x: fishX,
			y: fishY,
			width: 40,
			height: 24,
			animationTimer: Math.random() * Math.PI * 2, // Random starting animation phase
			collected: false,
			imageType: Math.floor(Math.random() * 4) + 1,
		};
		this.fish.push(fish);
		this.fishSpawned++;
	}

	spawnBearOnIceberg(iceberg) {
		// Spawn a bear lying on the iceberg (bigger and lower than fish)
		const bearMargin = 40; // Larger margin for bigger bears
		const bearWidth = 80; // Bigger bear size
		const bearHeight = 40; // Wider/flatter for lying position
		const bearX = iceberg.x + bearMargin + Math.random() * (iceberg.width - 2 * bearMargin - bearWidth);
		const bearY = iceberg.y - bearHeight + 15; // Position lower on iceberg surface (partially embedded)

		const bear = {
			x: bearX,
			y: bearY,
			width: bearWidth,
			height: bearHeight,
			animationTimer: Math.random() * Math.PI * 2, // Random starting animation phase
		};
		this.bears.push(bear);
	}

	spawnBottleOnIceberg(iceberg) {
		// Spawn a bottle on top of the iceberg (20% bigger than fish)
		const bottleMargin = 20; // Same margin as fish
		const bottleX = iceberg.x + bottleMargin + Math.random() * (iceberg.width - 2 * bottleMargin - 48); // 48 is bottle width (20% bigger)
		const bottleY = iceberg.y - 29; // 29 is bottle height (20% bigger), positioned above iceberg top

		const bottle = {
			x: bottleX,
			y: bottleY,
			width: 48, // 20% bigger than fish (40 * 1.2 = 48)
			height: 29, // 20% bigger than fish (24 * 1.2 = 29)
			animationTimer: Math.random() * Math.PI * 2, // Random starting animation phase
		};
		this.bottles.push(bottle);
	}

	smartFishSpawning(iceberg) {
		// Don't spawn fish on the final iceberg
		if (iceberg.isFinalIceberg) {
			return;
		}

		// Calculate how many fish we should have spawned by this point
		const distanceFromStart = iceberg.x - this.startPosition;
		const progressThroughLevel = Math.min(distanceFromStart / this.levelLength, 1);
		const expectedFishByNow = Math.floor(progressThroughLevel * (this.minFishRequired + 5)); // +5 buffer for safety

		// Check if we need guaranteed fish
		const regionSize = this.levelLength / (this.minFishRequired + 3); // Divide level into regions
		const currentRegion = Math.floor(distanceFromStart / regionSize);
		const shouldGuaranteeFish =
			this.fishSpawned < expectedFishByNow || distanceFromStart - this.lastGuaranteedFishX > regionSize * 1.5;

		// Special handling for approaching final iceberg (last 20% of level)
		const isApproachingEnd = progressThroughLevel > 0.8;
		const fishNeededToComplete = this.minFishRequired - this.fishSpawned;

		// Spawn fish with intelligent probability
		let spawnChance = 0.3; // Base 30% chance

		if (shouldGuaranteeFish) {
			spawnChance = 0.8; // 80% chance when we need more fish
		} else if (this.fishSpawned >= this.minFishRequired + 8) {
			spawnChance = 0.15; // Reduce spawn rate if we have plenty
		}

		// Aggressive spawning when approaching the end and still need fish
		if (isApproachingEnd && fishNeededToComplete > 0) {
			spawnChance = 1.0; // Guarantee spawn when approaching final iceberg and still need fish
		}

		// Force spawn if we're critically behind
		if (this.fishSpawned < Math.floor(progressThroughLevel * this.minFishRequired * 0.7)) {
			spawnChance = 1.0; // Guarantee spawn
		}

		if (Math.random() < spawnChance) {
			this.spawnFishOnIceberg(iceberg);
			if (shouldGuaranteeFish) {
				this.lastGuaranteedFishX = iceberg.x;
			}
		}
	}

	// Helper function to check if an iceberg is overlapping with other icebergs
	isIcebergOverlapping(targetIceberg) {
		for (let existingIceberg of this.icebergs) {
			// Skip checking against itself
			if (existingIceberg === targetIceberg) {
				continue;
			}

			// Check if icebergs overlap horizontally
			const horizontalOverlap = !(
				targetIceberg.x + targetIceberg.width < existingIceberg.x ||
				existingIceberg.x + existingIceberg.width < targetIceberg.x
			);

			if (horizontalOverlap) {
				// Calculate how much they overlap
				const overlapStart = Math.max(targetIceberg.x, existingIceberg.x);
				const overlapEnd = Math.min(
					targetIceberg.x + targetIceberg.width,
					existingIceberg.x + existingIceberg.width
				);
				const overlapWidth = overlapEnd - overlapStart;
				const overlapPercentage = overlapWidth / Math.min(targetIceberg.width, existingIceberg.width);

				// If significant overlap (more than 20%), return true
				if (overlapPercentage > 0.2) {
					return true;
				}
			}
		}
		return false;
	}

	smartBearSpawning(iceberg) {
		// Don't spawn bears on the final iceberg
		if (iceberg.isFinalIceberg) {
			return;
		}

		// Bears can ONLY spawn on overlapping icebergs
		if (!this.isIcebergOverlapping(iceberg)) {
			return;
		}

		// Don't spawn bears on the first few icebergs to give player time to get started
		const distanceFromStart = iceberg.x - this.startPosition;
		if (distanceFromStart < 600) {
			// Wait until player has progressed a bit
			return;
		}

		// Check if this iceberg already has a fish - avoid spawning bear on same iceberg as fish
		const hasExistingFish = this.fish.some(
			(fish) =>
				fish.x >= iceberg.x &&
				fish.x <= iceberg.x + iceberg.width &&
				fish.y >= iceberg.y - 30 &&
				fish.y <= iceberg.y + 10
		);

		// Increased spawn rates since bears can only spawn on overlapping icebergs
		let spawnChance = hasExistingFish ? 0.2 : 0.45; // Increased from 25% to 45% base chance, 20% if fish present

		// Reduce spawn rate as we get closer to the end to avoid making it too hard
		const progressThroughLevel = Math.min(distanceFromStart / this.levelLength, 1);
		if (progressThroughLevel > 0.7) {
			spawnChance *= 0.6; // Less reduction - 60% instead of 50% in final 30% of level
		}

		if (Math.random() < spawnChance) {
			this.spawnBearOnIceberg(iceberg);
		}
	}

	smartBottleSpawning(iceberg) {
		// Don't spawn bottles on the final iceberg
		if (iceberg.isFinalIceberg) {
			return;
		}

		// Don't spawn bottles on the first few icebergs
		const distanceFromStart = iceberg.x - this.startPosition;
		if (distanceFromStart < 400) {
			return;
		}

		// Check if this iceberg already has fish or bears - avoid overcrowding
		const hasExistingFish = this.fish.some(
			(fish) =>
				fish.x >= iceberg.x &&
				fish.x <= iceberg.x + iceberg.width &&
				fish.y >= iceberg.y - 30 &&
				fish.y <= iceberg.y + 10
		);

		const hasExistingBear = this.bears.some(
			(bear) =>
				bear.x >= iceberg.x &&
				bear.x <= iceberg.x + iceberg.width &&
				bear.y >= iceberg.y - 60 &&
				bear.y <= iceberg.y + 20
		);

		// Lower spawn rate than fish - bottles are much less common
		let spawnChance = 0.35; // 15% base chance (much lower than fish)

		// Lower chance if there's already fish or bears on this iceberg
		if (hasExistingFish || hasExistingBear) {
			spawnChance = 0.15; // 5% chance if crowded
		}

		if (Math.random() < spawnChance) {
			this.spawnBottleOnIceberg(iceberg);
		}
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

	updateWaves(deltaMultiplier = 1) {
		// More frequent wave spawning in the lower half of visible screen only
		if (Math.random() < 0.05) {
			// Increased frequency from 0.02 to 0.05
			// Calculate lower half of visible screen in world coordinates
			const lowerHalfStart = this.camera.y + this.canvas.height / 2;

			this.waves.push({
				x: this.camera.x + Math.random() * this.canvas.width, // Spawn only in visible screen width
				y: lowerHalfStart + Math.random() * (this.canvas.height / 2),
				speedX: (Math.random() - 0.5) * 0.4, // Gentle horizontal drift
				speedY: (Math.random() - 0.5) * 1.2, // More active up/down movement
				alpha: 0.4 + Math.random() * 0.4,
				life: 1.0,
				scale: 0.3 + Math.random() * 0.4, // Keep smaller size
				wobbleSpeed: Math.random() * 0.3 + 0.15, // Faster wobbling (3x faster)
				wobbleAmount: Math.random() * 1.2 + 0.4, // More intense wobble
			});
		}

		// Update existing waves with faster on-the-spot movement
		for (let i = this.waves.length - 1; i >= 0; i--) {
			const wave = this.waves[i];

			// Basic movement
			wave.x += wave.speedX * deltaMultiplier;
			wave.y += wave.speedY * deltaMultiplier;

			// Add faster wobbling motion on the spot
			const time = Date.now() * 0.005; // Faster time multiplier
			wave.x += Math.sin(time * wave.wobbleSpeed) * wave.wobbleAmount * deltaMultiplier;
			wave.y += Math.cos(time * wave.wobbleSpeed * 1.3) * wave.wobbleAmount * deltaMultiplier;

			wave.life -= 0.002 * deltaMultiplier;

			// Remove waves that are too old or have moved too far from visible area
			if (wave.life <= 0 || Math.abs(wave.x - this.camera.x) > this.canvas.width * 1.5) {
				this.waves.splice(i, 1);
			}
		}
	}

	validatePenguinPosition() {
		// Safety function to ensure penguin is never stuck inside an iceberg
		// Use larger margins to be less sensitive and reduce shakiness
		for (let iceberg of this.icebergs) {
			// Use collider properties if they exist (for final iceberg), otherwise use full dimensions
			const icebergX = iceberg.colliderX !== undefined ? iceberg.colliderX : iceberg.x;
			const icebergY = iceberg.colliderY !== undefined ? iceberg.colliderY : iceberg.y;
			const icebergWidth = iceberg.colliderWidth !== undefined ? iceberg.colliderWidth : iceberg.width;
			const icebergHeight = iceberg.colliderHeight !== undefined ? iceberg.colliderHeight : iceberg.height;

			// Check if penguin is deeply inside this iceberg (not just touching edges)
			const isInsideHorizontally =
				this.penguin.x + this.penguin.width > icebergX + 15 && this.penguin.x < icebergX + icebergWidth - 15;

			const isInsideVertically =
				this.penguin.y + this.penguin.height > icebergY + 15 && this.penguin.y < icebergY + icebergHeight - 15;

			if (isInsideHorizontally && isInsideVertically) {
				// Penguin is deeply stuck inside iceberg! Apply gentle correction

				// Calculate distances to each edge
				const distanceToTop = Math.abs(this.penguin.y + this.penguin.height - icebergY);
				const distanceToBottom = Math.abs(this.penguin.y - (icebergY + icebergHeight));
				const distanceToLeft = Math.abs(this.penguin.x + this.penguin.width - icebergX);
				const distanceToRight = Math.abs(this.penguin.x - (icebergX + icebergWidth));

				// Find the closest edge and gently push penguin out that way
				const minDistance = Math.min(distanceToTop, distanceToBottom, distanceToLeft, distanceToRight);

				// Use smoother positioning with interpolation to reduce shakiness
				const smoothingFactor = 0.3; // Blend between current and target position

				if (minDistance === distanceToTop) {
					// Gently move penguin to top of iceberg
					const targetY = icebergY - this.penguin.height;
					this.penguin.y = this.penguin.y * (1 - smoothingFactor) + targetY * smoothingFactor;
					this.penguin.velocityY = Math.min(this.penguin.velocityY, -1); // Gentle upward correction
					this.penguin.onIceberg = true;
				} else if (minDistance === distanceToBottom) {
					// Gently move penguin below iceberg
					const targetY = icebergY + icebergHeight;
					this.penguin.y = this.penguin.y * (1 - smoothingFactor) + targetY * smoothingFactor;
					this.penguin.velocityY = Math.max(this.penguin.velocityY, 1); // Gentle downward correction
					this.penguin.onIceberg = false;
				} else if (minDistance === distanceToLeft) {
					// Gently move penguin to left of iceberg
					const targetX = icebergX - this.penguin.width;
					this.penguin.x = this.penguin.x * (1 - smoothingFactor) + targetX * smoothingFactor;
					this.penguin.velocityX = Math.min(this.penguin.velocityX, -1); // Gentle leftward correction
				} else {
					// Gently move penguin to right of iceberg
					const targetX = icebergX + icebergWidth;
					this.penguin.x = this.penguin.x * (1 - smoothingFactor) + targetX * smoothingFactor;
					this.penguin.velocityX = Math.max(this.penguin.velocityX, 1); // Gentle rightward correction
				}

				// Stop here - only fix one iceberg collision per frame to avoid conflicts
				break;
			}
		}
	}

	checkSolidCollisions(prevX, prevY, newX, newY) {
		const penguinWidth = this.penguin.width;
		const penguinHeight = this.penguin.height;

		for (let iceberg of this.icebergs) {
			// Use collider properties if available (for final iceberg), otherwise use regular dimensions
			const icebergX = iceberg.colliderX !== undefined ? iceberg.colliderX : iceberg.x;
			const icebergY = iceberg.colliderY !== undefined ? iceberg.colliderY : iceberg.y;
			const icebergWidth = iceberg.colliderWidth !== undefined ? iceberg.colliderWidth : iceberg.width;
			const icebergHeight = iceberg.colliderHeight !== undefined ? iceberg.colliderHeight : iceberg.height;

			// Check if the penguin's new position would overlap with the iceberg
			// Use moderate bounds to prevent clipping while avoiding shakiness
			const wouldOverlap =
				newX < icebergX + icebergWidth - 1 &&
				newX + penguinWidth > icebergX + 1 &&
				newY < icebergY + icebergHeight - 1 &&
				newY + penguinHeight > icebergY - 3; // Consistent with landing detection

			if (wouldOverlap) {
				// Check if penguin was previously overlapping (already inside)
				const wasOverlapping =
					prevX < icebergX + icebergWidth - 1 &&
					prevX + penguinWidth > icebergX + 1 &&
					prevY < icebergY + icebergHeight - 1 &&
					prevY + penguinHeight > icebergY - 3;

				// If already overlapping, don't stop movement (let penguin escape)
				if (wasOverlapping) {
					continue;
				}

				// Special case: Allow horizontal movement when penguin is standing on top of iceberg
				// Check if penguin is just standing on the surface (not deeply embedded)
				const standingOnSurface =
					prevY + penguinHeight >= icebergY - 5 && // Close to top surface
					prevY + penguinHeight <= icebergY + 15 && // Not too deep inside
					this.penguin.onIceberg; // Confirmed to be on an iceberg

				const moveX = newX - prevX;
				const moveY = newY - prevY;

				// If standing on surface and only moving horizontally, allow movement
				if (standingOnSurface && Math.abs(moveY) <= 2) {
					// Check if this is primarily horizontal movement
					if (Math.abs(moveX) > Math.abs(moveY)) {
						// Allow horizontal gliding across aligned icebergs
						continue;
					}
				}

				// Calculate overlap amounts for each direction
				const overlapLeft = prevX + penguinWidth - icebergX;
				const overlapRight = icebergX + icebergWidth - prevX;
				const overlapTop = prevY + penguinHeight - icebergY;
				const overlapBottom = icebergY + icebergHeight - prevY;

				// Find the smallest overlap (most likely collision direction)
				const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

				if (minOverlap === overlapTop && moveY > 0) {
					// Colliding with top of iceberg from above
					return {
						type: "vertical",
						correctedX: newX,
						correctedY: icebergY - penguinHeight,
					};
				} else if (minOverlap === overlapBottom && moveY < 0) {
					// Colliding with bottom of iceberg from below
					return {
						type: "vertical",
						correctedX: newX,
						correctedY: icebergY + icebergHeight,
					};
				} else if (minOverlap === overlapLeft && moveX > 0) {
					// Colliding with left side of iceberg from left
					return {
						type: "horizontal",
						correctedX: icebergX - penguinWidth,
						correctedY: newY,
					};
				} else if (minOverlap === overlapRight && moveX < 0) {
					// Colliding with right side of iceberg from right
					return {
						type: "horizontal",
						correctedX: icebergX + icebergWidth,
						correctedY: newY,
					};
				} else {
					// Corner collision or complex case - push to safe previous position
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
			// Use collider properties if they exist (for final iceberg), otherwise use full dimensions
			const colliderX = iceberg.colliderX !== undefined ? iceberg.colliderX : iceberg.x;
			const colliderY = iceberg.colliderY !== undefined ? iceberg.colliderY : iceberg.y;
			const colliderWidth = iceberg.colliderWidth !== undefined ? iceberg.colliderWidth : iceberg.width;
			const colliderHeight = iceberg.colliderHeight !== undefined ? iceberg.colliderHeight : iceberg.height;

			// Check for any collision with the final iceberg to complete the game
			if (iceberg.isFinalIceberg) {
				const penguinCollidesFinalIceberg =
					this.penguin.x < colliderX + colliderWidth &&
					this.penguin.x + this.penguin.width > colliderX &&
					this.penguin.y < colliderY + colliderHeight &&
					this.penguin.y + this.penguin.height > colliderY;

				if (penguinCollidesFinalIceberg && !this.levelCompleted) {
					// Penguin touched the final iceberg! Complete the level immediately
					this.levelCompleted = true;

					// Check win conditions: enough fish and time remaining
					const hasEnoughFish = this.score >= this.minFishRequired;
					const hasTimeLeft = this.timer.remainingTime > 0;

					if (hasEnoughFish && hasTimeLeft) {
						this.levelWin();
					} else {
						this.gameOver(); // Failed to meet win conditions
					}
					return; // Exit early since game is over
				}
			}

			// Check if penguin is on top of iceberg (more precise landing detection)
			if (
				this.penguin.x + this.penguin.width > colliderX + 5 && // Small margin from edges
				this.penguin.x < colliderX + colliderWidth - 5 &&
				this.penguin.y + this.penguin.height >= colliderY - 3 &&
				this.penguin.y + this.penguin.height <= colliderY + 12 &&
				this.penguin.velocityY >= -1 // Allow slight upward velocity for landing
			) {
				// Snap penguin to slightly into the iceberg surface for more realistic look
				this.penguin.y = colliderY - this.penguin.height + 3;
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
				this.score += 1;
				this.updateScoreDisplay();

				// Create collection particles
				this.createFishCollectionParticles(fish.x + fish.width / 2, fish.y + fish.height / 2);

				// Play collection sound
				this.playSound("collect");

				// Remove the fish
				this.fish.splice(i, 1);
			}
		}
	}

	checkBottleCollection() {
		for (let i = this.bottles.length - 1; i >= 0; i--) {
			const bottle = this.bottles[i];

			// Check if penguin collides with bottle
			if (
				this.penguin.x < bottle.x + bottle.width &&
				this.penguin.x + this.penguin.width > bottle.x &&
				this.penguin.y < bottle.y + bottle.height &&
				this.penguin.y + this.penguin.height > bottle.y
			) {
				// Bottle collected! Reduce fish count by 1
				this.score = Math.max(0, this.score - 1); // Don't go below 0
				this.updateScoreDisplay();

				// Show bottle collision message
				if (this.bottleMessageElement) {
					this.bottleMessageElement.textContent = "OOOPS, watch out for the plastic waste! You loose a fish.";
					this.bottleMessageElement.style.display = "block";

					// Hide message after 3 seconds
					setTimeout(() => {
						if (this.bottleMessageElement) {
							this.bottleMessageElement.style.display = "none";
						}
					}, 3000);
				}

				// Create negative particles (different color)
				this.createBottleCollectionParticles(bottle.x + bottle.width / 2, bottle.y + bottle.height / 2);

				// Play a different sound (we can reuse the collect sound but could be different)
				this.playSound("collect");

				// Remove the bottle
				this.bottles.splice(i, 1);
			}
		}
	}

	checkBearCollisions() {
		for (let i = this.bears.length - 1; i >= 0; i--) {
			const bear = this.bears[i];

			// Check if penguin collides with bear
			if (
				this.penguin.x < bear.x + bear.width &&
				this.penguin.x + this.penguin.width > bear.x &&
				this.penguin.y < bear.y + bear.height &&
				this.penguin.y + this.penguin.height > bear.y
			) {
				// Bear collision - game over!
				this.bearCollision = true; // Flag to show special message
				this.gameOver();
				return;
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

	createBottleCollectionParticles(x, y) {
		for (let i = 0; i < 10; i++) {
			this.particles.push({
				x: x,
				y: y,
				velocityX: (Math.random() - 0.5) * 6,
				velocityY: (Math.random() - 0.5) * 6,
				life: 35,
				color: `hsl(${Math.random() * 30}, 50%, ${Math.random() * 20 + 30}%)`, // Brown/gray particles for negative effect
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
		this.stopBackgroundMusicWithFade();
		this.gameOverElement.style.display = "flex";

		// Create and position the try again button image
		const tryAgainBtn = document.createElement("img");
		tryAgainBtn.src = "img/try-again.png";
		tryAgainBtn.style.cursor = "pointer";

		// Bigger and responsive
		tryAgainBtn.style.width = "clamp(250px, 35vw, 400px)";
		tryAgainBtn.style.height = "auto";

		// Smooth hover effect
		tryAgainBtn.style.transition = "transform 0.2s ease";

		// Hover reaction: slightly enlarge
		tryAgainBtn.addEventListener("mouseenter", () => {
			tryAgainBtn.style.transform = "scale(1.1)";
		});
		tryAgainBtn.addEventListener("mouseleave", () => {
			tryAgainBtn.style.transform = "scale(1)";
		});

		tryAgainBtn.onclick = restartGame;

		// Create loss reason text with timer font style
		const lossReason = document.createElement("p");
		lossReason.style.fontFamily = "'Share Tech Mono', monospace";
		lossReason.style.fontSize = "clamp(14px, 3.5vw, 22px)";
		lossReason.style.marginTop = "20px";

		// Determine loss reason
		let message;
		if (this.bearCollision) {
			message = "OOOOPS, watch out for the polar bears!";
		} else if (this.penguin.y > this.waterLevel) {
			message = "OOOOPS you fell in the icy water!";
		} else {
			message = "TIME'S UP!";
		}
		lossReason.textContent = message;

		// Clear any existing content
		this.gameOverElement.innerHTML = "";

		// Add the new elements (flexbox will center them)
		this.gameOverElement.appendChild(tryAgainBtn);
		this.gameOverElement.appendChild(lossReason);

		this.playSound("gameOver");
		this.timer.stop();
		this.timer.hide();
		this.scoreContainer.style.display = "none";
	}

	createScoreDisplay() {
		// Create container for score display
		this.scoreContainer = document.createElement("div");
		this.scoreContainer.id = "gameScore"; // Add ID for easier CSS targeting
		this.scoreContainer.style.position = "fixed";
		this.scoreContainer.style.top = "max(20px, env(safe-area-inset-top, 20px))";
		this.scoreContainer.style.right = "20px";
		this.scoreContainer.style.fontFamily = "'Digital-7', 'LCD', monospace";
		this.scoreContainer.style.zIndex = "10";

		// Create score display with fish icon
		this.scoreElement = document.createElement("div");
		this.scoreElement.style.display = "flex";
		this.scoreElement.style.alignItems = "center";
		this.scoreElement.style.justifyContent = "flex-end";
		this.scoreElement.style.color = "#000000";
		this.scoreElement.style.fontSize = "clamp(36px, 6vw, 48px)";
		this.scoreElement.style.fontWeight = "400";
		this.scoreElement.style.letterSpacing = "2px";

		// Create fish icon
		this.fishIcon = document.createElement("img");
		this.fishIcon.src = "img/fish4.png";
		this.fishIcon.className = "fish-icon"; // Add class for CSS targeting
		this.fishIcon.style.height = "clamp(24px, 4vw, 32px)";
		this.fishIcon.style.marginRight = "8px";

		// Create score text
		this.scoreText = document.createElement("span");
		this.scoreText.textContent = "x 0";

		// Create message below
		this.scoreMessage = document.createElement("div");
		this.scoreMessage.className = "score-message"; // Add class for CSS targeting
		this.scoreMessage.textContent = `collect at least ${this.minFishRequired}!`;
		this.scoreMessage.style.color = "#000000";
		this.scoreMessage.style.fontSize = "clamp(16px, 3vw, 24px)";
		this.scoreMessage.style.fontWeight = "400";
		this.scoreMessage.style.textAlign = "right";
		this.scoreMessage.style.marginTop = "4px";

		// Assemble the elements
		this.scoreElement.appendChild(this.fishIcon);
		this.scoreElement.appendChild(this.scoreText);
		this.scoreContainer.appendChild(this.scoreElement);
		this.scoreContainer.appendChild(this.scoreMessage);
		document.body.appendChild(this.scoreContainer);
	}

	updateScoreDisplay() {
		this.scoreText.textContent = `x ${this.score}`;
		this.scoreMessage.style.color = this.score >= this.minFishRequired ? "#00ff00" : "#bc0000ff";
	}

	updateFishRequirement() {
		// Update the fish requirement message to reflect current minFishRequired
		if (this.scoreMessage) {
			this.scoreMessage.textContent = `collect at least ${this.minFishRequired}`;
		}
		// Also update the score display color
		this.updateScoreDisplay();
	}

	createProgressBar() {
		// Create container for progress bar
		this.progressBarContainer = document.createElement("div");
		this.progressBarContainer.className = "progress-bar-container"; // Add class for CSS targeting
		this.progressBarContainer.style.position = "fixed";
		this.progressBarContainer.style.top = "max(20px, env(safe-area-inset-top, 20px))";
		this.progressBarContainer.style.left = "50%";
		this.progressBarContainer.style.transform = "translateX(-50%)";
		this.progressBarContainer.style.width = "480px";
		this.progressBarContainer.style.maxWidth = "85vw";
		this.progressBarContainer.style.zIndex = "10";
		this.progressBarContainer.style.display = "flex";
		this.progressBarContainer.style.alignItems = "center";
		this.progressBarContainer.style.gap = "15px";

		// Create progress bar track container (takes most of the space)
		this.progressBarTrack = document.createElement("div");
		this.progressBarTrack.className = "progress-bar-track"; // Add class for CSS targeting
		this.progressBarTrack.style.position = "relative";
		this.progressBarTrack.style.width = "100%";
		this.progressBarTrack.style.height = "28px";
		this.progressBarTrack.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
		this.progressBarTrack.style.borderRadius = "14px";
		this.progressBarTrack.style.border = "3px solid #000000";
		this.progressBarTrack.style.overflow = "visible";

		// Create progress bar fill
		this.progressBarFill = document.createElement("div");
		this.progressBarFill.style.width = "0%";
		this.progressBarFill.style.height = "100%";
		this.progressBarFill.style.backgroundColor = "#4a90e2";
		this.progressBarFill.style.borderRadius = "11px";
		this.progressBarFill.style.transition = "width 0.3s ease";

		// Create moving penguin indicator
		this.progressPenguin = document.createElement("img");
		this.progressPenguin.src = "img/penguin.png";
		this.progressPenguin.className = "progress-penguin"; // Add class for CSS targeting
		this.progressPenguin.style.position = "absolute";
		this.progressPenguin.style.width = "36px";
		this.progressPenguin.style.height = "36px";
		this.progressPenguin.style.top = "-20px"; // Center on track
		this.progressPenguin.style.left = "0%";
		this.progressPenguin.style.transition = "left 0.3s ease";
		this.progressPenguin.style.transform = "translateX(-50%)";
		this.progressPenguin.style.zIndex = "2";
		this.progressPenguin.style.objectFit = "contain";

		// Create end container for baby penguin and flag
		this.progressEndContainer = document.createElement("div");
		this.progressEndContainer.style.display = "flex";
		this.progressEndContainer.style.alignItems = "center";
		this.progressEndContainer.style.gap = "0px";
		this.progressEndContainer.style.flexShrink = "0";

		// Create penguin-baby icon (positioned at end)
		this.progressBabyIcon = document.createElement("img");
		this.progressBabyIcon.src = "img/penguin-baby.png";

		this.progressBabyIcon.className = "progress-baby-penguin"; // Add class for CSS targeting
		this.progressBabyIcon.style.width = "60px";
		this.progressBabyIcon.style.height = "60px";

		this.progressBabyIcon.style.objectFit = "contain";
		this.progressBabyIcon.style.flexShrink = "0";

		// Create progress text
		this.progressText = document.createElement("div");
		this.progressText.style.textAlign = "center";
		this.progressText.style.fontSize = "clamp(12px, 2.5vw, 16px)";
		this.progressText.style.fontWeight = "bold";
		this.progressText.style.color = "#000000";
		this.progressText.style.marginTop = "6px";
		this.progressText.style.width = "100%";
		this.progressText.textContent = "Level Progress: 0%";

		// Create bottle message element - positioned at center top of screen
		this.bottleMessageElement = document.createElement("div");
		this.bottleMessageElement.style.position = "fixed";
		this.bottleMessageElement.style.top = "15%";
		this.bottleMessageElement.style.left = "50%";
		this.bottleMessageElement.style.transform = "translateX(-50%)";
		this.bottleMessageElement.style.fontFamily = "'Share Tech Mono', monospace";
		this.bottleMessageElement.style.textAlign = "center";
		this.bottleMessageElement.style.fontSize = "clamp(12px, 2.5vw, 18px)"; // Smaller than game over messages
		this.bottleMessageElement.style.color = "#c50000ff"; // Red color
		this.bottleMessageElement.style.zIndex = "100"; // Above everything else
		this.bottleMessageElement.style.display = "none"; // Initially hidden
		this.bottleMessageElement.style.padding = "10px 20px";
		this.bottleMessageElement.style.maxWidth = "80vw";
		document.body.appendChild(this.bottleMessageElement);

		// Assemble the track elements
		this.progressBarTrack.appendChild(this.progressBarFill);
		this.progressBarTrack.appendChild(this.progressPenguin);

		// Assemble the end container
		this.progressEndContainer.appendChild(this.progressBabyIcon);

		// Assemble the main elements
		this.progressBarContainer.appendChild(this.progressBarTrack);
		this.progressBarContainer.appendChild(this.progressEndContainer);

		// Create container for the whole progress system
		this.progressSystemContainer = document.createElement("div");
		this.progressSystemContainer.appendChild(this.progressBarContainer);
		this.progressSystemContainer.appendChild(this.progressText);

		document.body.appendChild(this.progressSystemContainer);
	}

	updateProgressBar() {
		if (this.progressBarFill && this.progressText && this.progressPenguin) {
			const progressPercent = Math.round(this.levelProgress * 100);
			this.progressBarFill.style.width = `${progressPercent}%`;
			this.progressText.textContent = `Level Progress: ${progressPercent}%`;

			// Move the penguin indicator
			this.progressPenguin.style.left = `${progressPercent}%`;

			// Change color as we get closer to the end
			if (progressPercent >= 90) {
				this.progressBarFill.style.backgroundColor = "#00ff00"; // Green when almost done
			} else if (progressPercent >= 70) {
				this.progressBarFill.style.backgroundColor = "#ffaa00"; // Orange when getting close
			} else {
				this.progressBarFill.style.backgroundColor = "#4a90e2"; // Blue for most of the journey
			}
		}
	}

	checkLevelCompletion() {
		// Level completion is now handled directly in checkCollisions() when penguin touches final iceberg
		// This function is kept for compatibility and distance-based progress tracking

		// Only update level progress if level hasn't been completed yet
		if (!this.levelCompleted && this.levelProgress >= 1) {
			// If penguin reached the end distance but hasn't touched final iceberg yet,
			// don't auto-complete - wait for actual iceberg collision
		}
	}

	levelWin() {
		this.gameState = "won";
		this.stopBackgroundMusicWithFade();
		this.timer.stop();
		this.timer.hide();
		this.scoreContainer.style.display = "none";
		this.progressSystemContainer.style.display = "none";
		this.showWinScreen();
		this.playSound("win");
	}

	showWinScreen() {
		if (this.winScreenElement && this.winScoreElement && this.winTimeElement) {
			this.winScoreElement.textContent = this.score;
			this.winTimeElement.textContent = this.timer.formatTime(Math.ceil(this.timer.remainingTime));

			// Create and add the bravo image
			const bravoImg = document.createElement("img");
			bravoImg.src = "img/brrravoo.png";
			bravoImg.style.width = "clamp(250px, 35vw, 400px)";
			bravoImg.style.height = "auto";
			bravoImg.style.marginBottom = "20px";

			// Override CSS hover effects - make it non-interactive
			bravoImg.style.cursor = "default";
			bravoImg.style.transition = "none";
			bravoImg.style.transform = "none";

			// Add event listeners to prevent any hover scaling
			bravoImg.addEventListener("mouseenter", (e) => {
				e.target.style.transform = "none";
			});
			bravoImg.addEventListener("mouseleave", (e) => {
				e.target.style.transform = "none";
			});

			// Clear existing content and add bravo image at the top
			this.winScreenElement.innerHTML = "";
			this.winScreenElement.appendChild(bravoImg);

			// Add the existing win screen content
			const winContent = document.createElement("div");
			winContent.innerHTML = `
				<h2>🎉 Level Complete! 🎉</h2>
				<p>You successfully reached the end with enough fish! 🐟</p>
				<p>Final Score: <span id="winScore">${this.score}</span> fish</p>
				<p>Time Remaining: <span id="winTime">${this.timer.formatTime(Math.ceil(this.timer.remainingTime))}</span></p>
			`;

			// Create styled Play Again button
			const playAgainBtn = document.createElement("button");
			playAgainBtn.textContent = "Play Again";
			playAgainBtn.onclick = restartGame;

			// Style the button
			playAgainBtn.style.background = "#4a90e2";
			playAgainBtn.style.color = "white";
			playAgainBtn.style.border = "none";
			playAgainBtn.style.padding = "clamp(12px, 3vw, 15px) clamp(24px, 6vw, 30px)";
			playAgainBtn.style.borderRadius = "10px";
			playAgainBtn.style.cursor = "pointer";
			playAgainBtn.style.fontSize = "clamp(16px, 4vw, 20px)";
			playAgainBtn.style.fontWeight = "bold";
			playAgainBtn.style.transition = "all 0.3s ease";
			playAgainBtn.style.marginTop = "20px";
			playAgainBtn.style.boxShadow = "0 4px 15px rgba(74, 144, 226, 0.4)";
			playAgainBtn.style.fontFamily = "Arial, sans-serif";

			// Hover effects
			playAgainBtn.addEventListener("mouseenter", () => {
				playAgainBtn.style.background = "#357abd";
				playAgainBtn.style.transform = "scale(1.05)";
				playAgainBtn.style.boxShadow = "0 6px 20px rgba(74, 144, 226, 0.6)";
			});

			playAgainBtn.addEventListener("mouseleave", () => {
				playAgainBtn.style.background = "#4a90e2";
				playAgainBtn.style.transform = "scale(1)";
				playAgainBtn.style.boxShadow = "0 4px 15px rgba(74, 144, 226, 0.4)";
			});

			// Active state
			playAgainBtn.addEventListener("mousedown", () => {
				playAgainBtn.style.transform = "scale(0.95)";
			});

			playAgainBtn.addEventListener("mouseup", () => {
				playAgainBtn.style.transform = "scale(1.05)";
			});

			winContent.appendChild(playAgainBtn);
			this.winScreenElement.appendChild(winContent);
			this.winScreenElement.style.display = "flex";
		}
	}

	restart() {
		// Stop and clean up any existing background music completely
		console.log("Restart: Stopping background music");
		this.stopBackgroundMusic();

		// Clear any fade intervals
		if (this.fadeInterval) {
			clearInterval(this.fadeInterval);
			this.fadeInterval = null;
		}

		// Wait a moment for audio to properly stop, then completely recreate
		setTimeout(() => {
			// Completely destroy and recreate the music instance to avoid any state issues
			if (this.backgroundMusic) {
				this.backgroundMusic.src = ""; // Clear source
				this.backgroundMusic.load(); // Reset the element
			}
			this.backgroundMusic = null;

			// Recreate MP3 background music instance fresh
			try {
				this.backgroundMusic = new Audio("music.mp3");
				this.backgroundMusic.loop = true;
				this.backgroundMusic.volume = 0.2; // Lower volume
				this.backgroundMusic.preload = "auto";
				console.log("MP3 background music recreated for restart");

				// Start background music after a brief delay
				setTimeout(async () => {
					try {
						await this.startBackgroundMusic();
					} catch (error) {
						console.warn("Failed to start background music after restart:", error);
					}
				}, 100);
			} catch (error) {
				console.warn("Failed to recreate background music:", error);
			}
		}, 100);

		// Clean up existing UI elements to prevent duplicates
		if (this.scoreContainer && this.scoreContainer.parentNode) {
			this.scoreContainer.parentNode.removeChild(this.scoreContainer);
		}
		if (this.progressSystemContainer && this.progressSystemContainer.parentNode) {
			this.progressSystemContainer.parentNode.removeChild(this.progressSystemContainer);
		}

		this.gameState = "playing";
		this.score = 0;
		this.fromRestart = true;
		this.bearCollision = false; // Reset bear collision flag
		this.timer.reset();
		this.timer.show();
		this.timer.start();

		// Reset penguin position
		this.penguin.x = 100;
		this.penguin.y = 300;
		this.penguin.velocityX = 0;
		this.penguin.velocityY = 0;
		this.penguin.onIceberg = false;
		this.penguin.gliding = false;

		// Clear game objects
		this.icebergs = [];
		this.fish = [];
		this.bears = []; // Clear bears
		this.bottles = []; // Clear bottles
		this.glideTimer = 0;
		this.particles = [];
		this.snowflakes = []; // Clear existing snowflakes

		// Reset bottle message
		if (this.bottleMessageElement) {
			this.bottleMessageElement.style.display = "none";
		}

		// Reset camera
		this.camera.x = 0;
		this.camera.y = 0;
		this.camera.targetX = 0;
		this.camera.targetY = 0;

		// Reset level progression
		this.startPosition = 0;
		this.distanceTraveled = 0;
		this.levelProgress = 0;
		this.levelCompleted = false;

		// Reset fish tracking
		this.fishSpawned = 0;
		this.guaranteedFishRegions = [];
		this.lastGuaranteedFishX = 0;

		// Reset final iceberg
		this.finalIcebergGenerated = false;
		this.finalIcebergPosition = this.levelLength - 200;
		this.preFinalIcebergGenerated = false;

		// Recreate UI elements
		this.createScoreDisplay();
		this.createProgressBar();
		this.updateProgressBar();

		// Reset game world
		this.generateInitialIcebergs();
		this.positionPenguinOnFirstIceberg(); // Position penguin on first iceberg after restart
		this.generateSnowflakes(); // Regenerate snowflakes for new camera position

		// Hide game over/win screens
		this.gameOverElement.style.display = "none";
		this.winScreenElement.style.display = "none";

		// Update displays
		this.updateScoreDisplay();
		this.scoreContainer.style.display = "block";
		this.progressSystemContainer.style.display = "block";
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

		// Draw infinite sky gradient
		const gradient = this.ctx.createLinearGradient(
			0, // Use world coordinates for consistent gradient
			this.camera.y,
			0,
			this.camera.y + this.canvas.height
		);
		gradient.addColorStop(0, "#6BA6CD"); // Darker sky blue
		gradient.addColorStop(0.7, "#36648B"); // Darker steel blue
		gradient.addColorStop(1, "#0F1F4A"); // Much darker blue
		this.ctx.fillStyle = gradient;

		// Calculate the area we need to fill (with generous buffer for infinite feel)
		const renderBuffer = this.canvas.width * 2; // Large buffer for smooth infinite scrolling
		const leftBound = this.camera.x - renderBuffer;
		const rightBound = this.camera.x + this.canvas.width + renderBuffer;
		const topBound = this.camera.y - renderBuffer;
		const bottomBound = this.camera.y + this.canvas.height + renderBuffer;

		this.ctx.fillRect(leftBound, topBound, rightBound - leftBound, bottomBound - topBound);

		// Draw infinite cloud layers for depth and atmosphere
		if (this.imagesReady) {
			// Layer 1: Far background clouds (very slow parallax, large size)
			this.drawInfiniteCloudLayer(0.05, -this.canvas.height * 0.7, 0.4, ["cloud1", "cloud2", "cloud3"]);

			// Layer 2: Mid background clouds (slow parallax, medium-large size)
			this.drawInfiniteCloudLayer(0.1, -this.canvas.height * 0.5, 0.3, ["cloud4", "cloud5"]);
		}

		// Draw infinite background mountains if image is loaded
		if (this.imagesReady && this.images.moutain) {
			// Draw repeating mountain background with parallax effect
			const mountainDistance = Math.min(500, this.canvas.height * 0.6);
			const mountainHeight = Math.min(225, this.canvas.height * 0.8);
			const parallaxSpeed = 0.3; // Mountains move slower than camera for depth effect
			const parallaxX = this.camera.x * parallaxSpeed;

			// Calculate mountain width based on aspect ratio
			const mountainAspect = this.images.moutain.naturalWidth / this.images.moutain.naturalHeight;
			const mountainWidth = mountainHeight * mountainAspect;

			// Calculate render bounds in world coordinates (accounting for camera position)
			const renderBuffer = this.canvas.width;
			const leftBound = this.camera.x - renderBuffer;
			const rightBound = this.camera.x + this.canvas.width + renderBuffer;

			// Store the mountain Y position only once, when the first iceberg exists
			if (this.mountainImageYOffset === null && this.icebergs && this.icebergs.length > 0) {
				const firstIceberg = this.icebergs[0];
				// Store the Y position where the mountain should be drawn (its top-left corner)
				// We want the bottom of the mountain at firstIceberg.y, so top-left is at firstIceberg.y - mountainHeight
				this.mountainImageYOffset = firstIceberg.y - mountainHeight + 100;
			}

			// Calculate the starting tile position based on parallax offset
			const startTile = Math.floor((leftBound - parallaxX) / mountainWidth);
			const endTile = Math.ceil((rightBound - parallaxX) / mountainWidth);

			// Draw mountain tiles for infinite repetition
			for (let tile = startTile; tile <= endTile; tile++) {
				// World position accounting for parallax
				const x = parallaxX + tile * mountainWidth;
				// Use the stored Y position if available, otherwise use default calculation
				const mountainY =
					this.mountainImageYOffset !== null ? this.mountainImageYOffset : this.waterLevel - mountainDistance;

				// Draw the mountain image first
				this.drawImagePreserveAspect(this.images.moutain, x, mountainY, mountainWidth, mountainHeight, "top");

				// Add fade overlay at the base of the mountain to blend with background gradient
				const fadeHeight = mountainHeight * 0.3; // Fade the bottom 30% of the mountain
				const fadeStartY = mountainY + mountainHeight - fadeHeight;

				// Create fade gradient that matches the background gradient colors
				const fadeGradient = this.ctx.createLinearGradient(0, fadeStartY, 0, mountainY + mountainHeight);
				fadeGradient.addColorStop(0, "rgba(15, 31, 74, 0)"); // Transparent at top of fade
				fadeGradient.addColorStop(0.5, "rgba(15, 31, 74, 0.3)"); // Semi-transparent middle
				fadeGradient.addColorStop(1, "rgba(15, 31, 74, 0.7)"); // More opaque at bottom matching background

				// Apply the fade overlay
				this.ctx.fillStyle = fadeGradient;
				this.ctx.fillRect(x, fadeStartY, mountainWidth, fadeHeight);
			}
		}

		// Draw snowflakes
		for (let snowflake of this.snowflakes) {
			// Only draw snowflakes that are visible in camera view
			if (
				snowflake.x > this.camera.x - 50 &&
				snowflake.x < this.camera.x + this.canvas.width + 50 &&
				snowflake.y > this.camera.y - 50 &&
				snowflake.y < this.camera.y + this.canvas.height + 50
			) {
				// Draw snow image
				// Draw snow image
				const img = this.images["snow1"]; // only snow1
				if (this.imagesReady && img) {
					const size = 60;
					const offset = size / 2;
					this.ctx.drawImage(img, snowflake.x - offset, snowflake.y - offset, size, size);
				}
			}
		}

		// Add full-screen atmospheric gradient overlay (dark at bottom, light at top)
		// This creates depth and makes icebergs stand out while staying behind them
		const fullScreenGradient = this.ctx.createLinearGradient(
			0,
			this.camera.y, // Top of screen
			0,
			this.camera.y + this.canvas.height // Bottom of screen
		);
		fullScreenGradient.addColorStop(0, "rgba(200, 220, 240, 0.08)"); // Light at top
		fullScreenGradient.addColorStop(0.3, "rgba(150, 180, 210, 0.15)"); // Medium light
		fullScreenGradient.addColorStop(0.7, "rgba(100, 130, 160, 0.25)"); // Medium dark
		fullScreenGradient.addColorStop(1, "rgba(60, 80, 110, 0.35)"); // Dark at bottom

		this.ctx.fillStyle = fullScreenGradient;

		// Apply gradient overlay to entire visible screen area
		const gradientRenderBuffer = this.canvas.width * 2;
		this.ctx.fillRect(
			this.camera.x - gradientRenderBuffer,
			this.camera.y,
			this.canvas.width + gradientRenderBuffer * 2,
			this.canvas.height
		);

		// Draw icebergs (regular icebergs first)
		for (let iceberg of this.icebergs) {
			// Skip final iceberg for now - we'll draw it later in foreground
			if (iceberg.isFinalIceberg) continue;

			// Use regular iceberg image if loaded, otherwise fall back to drawn iceberg
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

		// Draw bears
		for (let bear of this.bears) {
			this.drawBear(bear);
		}

		// Draw bottles
		for (let bottle of this.bottles) {
			this.drawBottle(bottle);
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

		// Draw infinite water in foreground, tiled from waterLevel down to bottom of canvas
		if (this.imagesReady && this.images.water) {
			this.ctx.globalAlpha = 0.4;
			const waterImage = this.images.water;
			const waterWidth = waterImage.naturalWidth;
			const waterHeight = waterImage.naturalHeight;
			const renderBuffer = this.canvas.width;
			const leftBound = this.camera.x - this.canvas.width - renderBuffer;
			const rightBound = this.camera.x + this.canvas.width + renderBuffer;
			const startTileX = Math.floor(leftBound / waterWidth);
			const endTileX = Math.ceil(rightBound / waterWidth);
			// Store the y-offset only once, when the first iceberg exists and offset is not set
			if (this.waterImageYOffset === null && this.icebergs && this.icebergs.length > 0) {
				const firstIceberg = this.icebergs[0];
				this.waterImageYOffset = firstIceberg.y + 50 - this.waterLevel;
			}
			let yOffset = this.waterImageYOffset !== null ? this.waterImageYOffset : 0;
			for (let tileX = startTileX; tileX <= endTileX; tileX++) {
				const x = tileX * waterWidth;
				for (
					let y = this.waterLevel + yOffset;
					y < this.camera.y + this.canvas.height + renderBuffer;
					y += waterHeight
				) {
					this.ctx.drawImage(waterImage, x, y, waterWidth, waterHeight);
				}
			}
			this.ctx.globalAlpha = 1;
		} else {
			this.ctx.globalAlpha = 0.4;
			this.ctx.fillStyle = "#0F1F4A";
			const renderBuffer = this.canvas.width * 2;
			this.ctx.fillRect(
				this.camera.x - this.canvas.width - renderBuffer,
				this.waterLevel,
				this.canvas.width + renderBuffer * 2,
				this.canvas.height + renderBuffer
			);
			this.ctx.globalAlpha = 1;
		}

		// Draw moving waves on water surface
		if (this.imagesReady && this.images.waves) {
			const waveImage = this.images.waves;
			const baseSize = Math.min(waveImage.naturalWidth, waveImage.naturalHeight) * 0.6;
			for (const wave of this.waves) {
				this.ctx.globalAlpha = wave.alpha * wave.life;
				const waveSize = baseSize * (wave.scale || 1.0);
				this.ctx.drawImage(
					waveImage,
					wave.x - this.camera.x - waveSize / 2,
					wave.y - this.camera.y - waveSize / 2,
					waveSize,
					waveSize
				);
			}
			this.ctx.globalAlpha = 1;
		}
		// Draw final iceberg in foreground (on top of everything else including water)
		for (let iceberg of this.icebergs) {
			if (iceberg.isFinalIceberg && this.imagesReady && this.images["end-level"]) {
				// Draw the special end-level image in foreground
				this.ctx.drawImage(this.images["end-level"], iceberg.x, iceberg.y, iceberg.width, iceberg.height);
			}
		}

		// Draw all hitboxes for debugging (if enabled)
		if (this.showHitboxes) {
			this.drawAllHitboxes();
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

	drawBear(bear) {
		const x = bear.x;
		const y = bear.y;
		const w = bear.width;
		const h = bear.height;

		// Use bear image if loaded, otherwise fall back to drawn bear
		if (this.imagesReady && this.images.bear) {
			this.drawImagePreserveAspect(this.images.bear, x, y, w, h, "center");
		} else {
			// Fallback: simple brown bear shape
			this.ctx.fillStyle = "#8B4513";
			this.ctx.fillRect(x + w * 0.1, y + h * 0.3, w * 0.8, h * 0.6);

			// Bear head
			this.ctx.beginPath();
			this.ctx.arc(x + w / 2, y + h * 0.2, w * 0.3, 0, Math.PI * 2);
			this.ctx.fill();

			// Bear ears
			this.ctx.beginPath();
			this.ctx.arc(x + w * 0.3, y + h * 0.1, w * 0.1, 0, Math.PI * 2);
			this.ctx.fill();
			this.ctx.beginPath();
			this.ctx.arc(x + w * 0.7, y + h * 0.1, w * 0.1, 0, Math.PI * 2);
			this.ctx.fill();
		}
	}

	drawBottle(bottle) {
		const x = bottle.x;
		const y = bottle.y;
		const w = bottle.width;
		const h = bottle.height;

		// Use bottle image if loaded, otherwise fall back to drawn bottle
		if (this.imagesReady && this.images.bottle) {
			// Apply simple red shadow glow like textShadow
			this.ctx.save();
			this.ctx.shadowColor = "rgba(255, 0, 0, 0.8)";
			this.ctx.shadowBlur = 30; // Bigger glow effect
			this.ctx.shadowOffsetX = 0;
			this.ctx.shadowOffsetY = 0;
			this.drawImagePreserveAspect(this.images.bottle, x, y, w, h, "center");
			this.ctx.restore();
		} else {
			// Fallback: simple bottle shape
			this.ctx.fillStyle = "#654321"; // Brown bottle color
			this.ctx.fillRect(x + w * 0.3, y + h * 0.1, w * 0.4, h * 0.8); // Main bottle body

			// Bottle neck
			this.ctx.fillRect(x + w * 0.4, y, w * 0.2, h * 0.3);

			// Bottle cap
			this.ctx.fillStyle = "#333333";
			this.ctx.fillRect(x + w * 0.35, y, w * 0.3, h * 0.15);
		}
	}

	// Add hitbox visualization method
	drawHitbox(x, y, width, height, color = "red", label = "") {
		this.ctx.save();
		this.ctx.strokeStyle = color;
		this.ctx.lineWidth = 2;
		this.ctx.strokeRect(x, y, width, height);

		if (label) {
			this.ctx.fillStyle = color;
			this.ctx.font = "12px Arial";
			this.ctx.fillText(label, x, y - 5);
		}
		this.ctx.restore();
	}

	drawAllHitboxes() {
		// Draw penguin hitbox
		this.drawHitbox(this.penguin.x, this.penguin.y, this.penguin.width, this.penguin.height, "lime", "Penguin");

		// Draw iceberg hitboxes
		for (let i = 0; i < this.icebergs.length; i++) {
			const iceberg = this.icebergs[i];

			// Use collider properties if they exist (for final iceberg), otherwise use full dimensions
			const hitboxX = iceberg.colliderX !== undefined ? iceberg.colliderX : iceberg.x;
			const hitboxY = iceberg.colliderY !== undefined ? iceberg.colliderY : iceberg.y;
			const hitboxWidth = iceberg.colliderWidth !== undefined ? iceberg.colliderWidth : iceberg.width;
			const hitboxHeight = iceberg.colliderHeight !== undefined ? iceberg.colliderHeight : iceberg.height;

			this.drawHitbox(hitboxX, hitboxY, hitboxWidth, hitboxHeight, "cyan", `Iceberg ${i + 1}`);
		}

		// Draw fish hitboxes
		for (let i = 0; i < this.fish.length; i++) {
			const fish = this.fish[i];
			this.drawHitbox(fish.x, fish.y, fish.width, fish.height, "yellow", `Fish ${i + 1}`);
		}

		// Draw bear hitboxes
		for (let i = 0; i < this.bears.length; i++) {
			const bear = this.bears[i];
			this.drawHitbox(bear.x, bear.y, bear.width, bear.height, "red", `Bear ${i + 1}`);
		}

		// Draw water level line
		this.ctx.save();
		this.ctx.strokeStyle = "blue";
		this.ctx.lineWidth = 3;
		this.ctx.beginPath();
		this.ctx.moveTo(this.camera.x - this.canvas.width, this.waterLevel);
		this.ctx.lineTo(this.camera.x + this.canvas.width * 2, this.waterLevel);
		this.ctx.stroke();
		this.ctx.fillStyle = "blue";
		this.ctx.font = "16px Arial";
		this.ctx.fillText("Water Level", this.camera.x + 10, this.waterLevel - 10);
		this.ctx.restore();

		// Draw fish distribution debug info
		this.ctx.save();
		this.ctx.fillStyle = "white";
		this.ctx.strokeStyle = "black";
		this.ctx.lineWidth = 1;
		this.ctx.font = "14px Arial";

		const debugX = this.camera.x + 10;
		const debugY = this.camera.y + 50;
		const lineHeight = 20;
		let lineIndex = 0;

		// Background for text
		this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
		this.ctx.fillRect(debugX - 5, debugY - 5, 300, lineHeight * 5 + 10);

		this.ctx.fillStyle = "white";
		this.ctx.fillText(`Fish Spawned: ${this.fishSpawned}`, debugX, debugY + lineHeight * lineIndex++);
		this.ctx.fillText(`Fish Required: ${this.minFishRequired}`, debugX, debugY + lineHeight * lineIndex++);
		this.ctx.fillText(`Fish Available: ${this.fish.length}`, debugX, debugY + lineHeight * lineIndex++);

		const progressPercent = Math.round(this.levelProgress * 100);
		const expectedFish = Math.floor(this.levelProgress * (this.minFishRequired + 5));
		this.ctx.fillText(`Level Progress: ${progressPercent}%`, debugX, debugY + lineHeight * lineIndex++);
		this.ctx.fillText(`Expected Fish: ${expectedFish}`, debugX, debugY + lineHeight * lineIndex++);

		this.ctx.restore();
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

	// Background music control methods
	async startBackgroundMusic() {
		console.log("startBackgroundMusic called, backgroundMusic exists:", !!this.backgroundMusic);

		if (!this.backgroundMusic) {
			console.log("No background music instance available");
			return;
		}

		try {
			console.log("Starting MP3 background music, current paused state:", this.backgroundMusic.paused);

			// Reset to beginning if ended or at end
			if (this.backgroundMusic.ended || this.backgroundMusic.currentTime >= this.backgroundMusic.duration) {
				this.backgroundMusic.currentTime = 0;
			}

			// Ensure volume is set correctly
			this.backgroundMusic.volume = 0.2; // Lower volume

			// Clear any fade intervals that might be running
			if (this.musicFadeInterval) {
				clearInterval(this.musicFadeInterval);
				this.musicFadeInterval = null;
			}

			await this.backgroundMusic.play();
			console.log("MP3 background music started successfully");
		} catch (error) {
			console.error("Failed to start background music:", error);
			// Handle autoplay policy restrictions
			if (error.name === "NotAllowedError") {
				console.log("Autoplay blocked by browser - music will start on user interaction");
			}
			// Try to recreate the audio element if it's corrupted
			if (error.name === "AbortError" || error.name === "InvalidStateError") {
				console.log("Audio element corrupted, attempting to recreate...");
				this.initBackgroundMusic();
			}
		}
	}

	stopBackgroundMusic() {
		console.log("stopBackgroundMusic called, backgroundMusic exists:", !!this.backgroundMusic);

		if (this.backgroundMusic) {
			try {
				console.log("Stopping MP3 background music");
				this.backgroundMusic.pause();
				this.backgroundMusic.currentTime = 0; // Reset to beginning

				// Clear any existing event listeners to prevent memory leaks
				this.backgroundMusic.onended = null;
				this.backgroundMusic.onerror = null;
				this.backgroundMusic.onloadstart = null;
				this.backgroundMusic.oncanplay = null;

				console.log("MP3 background music stopped successfully");
			} catch (error) {
				console.warn("Error stopping background music:", error);
			}
		}
	}

	stopBackgroundMusicWithFade() {
		if (this.backgroundMusic && !this.backgroundMusic.paused) {
			console.log("Stopping MP3 background music with fade");

			// Store original volume to restore later
			const originalVolume = this.backgroundMusic.volume;

			// Create fade out effect
			const fadeDuration = 1000; // 1 second
			const fadeSteps = 20;
			const stepTime = fadeDuration / fadeSteps;
			const volumeStep = this.backgroundMusic.volume / fadeSteps;

			// Clear any existing fade interval
			if (this.fadeInterval) {
				clearInterval(this.fadeInterval);
			}

			this.fadeInterval = setInterval(() => {
				if (this.backgroundMusic && this.backgroundMusic.volume > volumeStep) {
					this.backgroundMusic.volume = Math.max(0, this.backgroundMusic.volume - volumeStep);
				} else {
					if (this.backgroundMusic) {
						this.backgroundMusic.pause();
						this.backgroundMusic.currentTime = 0;
						this.backgroundMusic.volume = originalVolume; // Restore original volume
					}
					clearInterval(this.fadeInterval);
					this.fadeInterval = null;
				}
			}, stepTime);
		}
	}

	// Toggle background music on/off
	toggleBackgroundMusic() {
		if (this.backgroundMusic) {
			if (!this.backgroundMusic.paused) {
				this.stopBackgroundMusic();
			} else {
				this.startBackgroundMusic();
			}
		}
	}
}

// Initialize game
let game;

function restartGame() {
	if (game) {
		game.restart();
	}
}

// Game will be initialized when start button is clicked
// No auto-start - wait for user interaction

// Penguin Glider Game
class PenguinGlider {
	constructor() {
		// Debug settings
		this.showHitboxes = false; // Set to true to show collision hitboxes
		this.timer = new GameTimer();
		this.fromRestart = false;

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

		// Water level (will be calculated properly after canvas setup)
		this.waterLevel = 400; // Default value, will be recalculated

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
		this.preFinalIcebergGenerated = true; // Track if the iceberg before final has been created

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
					// Initial timer start
					if (!this.fromRestart) {
						this.timer.start();
					}
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
				this.gameOverElement.style.display === "block"
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
		this.gameOverElement.style.display = "block";

		// Create and position the try again button image
		const tryAgainBtn = document.createElement("img");
		tryAgainBtn.src = "img/try-again.png";
		tryAgainBtn.style.position = "absolute";
		tryAgainBtn.style.left = "50%";
		tryAgainBtn.style.top = "50%";
		tryAgainBtn.style.transform = "translate(-50%, -50%)";
		tryAgainBtn.style.cursor = "pointer";

		// Bigger and responsive
		tryAgainBtn.style.width = "clamp(250px, 35vw, 400px)";
		tryAgainBtn.style.height = "auto";

		// Smooth hover effect
		tryAgainBtn.style.transition = "transform 0.2s ease";

		// Hover reaction: slightly enlarge
		tryAgainBtn.addEventListener("mouseenter", () => {
			tryAgainBtn.style.transform = "translate(-50%, -50%) scale(1.1)";
		});
		tryAgainBtn.addEventListener("mouseleave", () => {
			tryAgainBtn.style.transform = "translate(-50%, -50%) scale(1)";
		});

		tryAgainBtn.onclick = restartGame;

		// Create loss reason text with timer font style
		const lossReason = document.createElement("p");
		lossReason.style.fontFamily = "'Share Tech Mono', monospace";
		lossReason.style.position = "absolute";
		lossReason.style.left = "50%";
		lossReason.style.top = "calc(50% + 80px)";
		lossReason.style.whiteSpace = "nowrap";
		lossReason.style.transform = "translate(-50%, -50%)";
		lossReason.style.fontSize = "clamp(14px, 3.5vw, 22px)";
		lossReason.textContent = this.penguin.y > this.waterLevel ? "OOOOPS you fell in the icy water!" : "TIME'S UP!";

		// Clear any existing content
		this.gameOverElement.innerHTML = "";

		// Add the new elements
		this.gameOverElement.appendChild(lossReason);
		this.gameOverElement.appendChild(tryAgainBtn);

		this.playSound("gameOver");
		this.timer.stop();
		this.timer.hide();
		this.scoreContainer.style.display = "none";
	}

	createScoreDisplay() {
		// Create container for score display
		this.scoreContainer = document.createElement("div");
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
		this.fishIcon.style.height = "clamp(24px, 4vw, 32px)";
		this.fishIcon.style.marginRight = "8px";

		// Create score text
		this.scoreText = document.createElement("span");
		this.scoreText.textContent = "x 0";

		// Create message below
		this.scoreMessage = document.createElement("div");
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
			this.scoreMessage.textContent = `collect at least ${this.minFishRequired}!`;
		}
		// Also update the score display color
		this.updateScoreDisplay();
	}

	createProgressBar() {
		// Create container for progress bar
		this.progressBarContainer = document.createElement("div");
		this.progressBarContainer.style.position = "fixed";
		this.progressBarContainer.style.top = "max(20px, env(safe-area-inset-top, 20px))";
		this.progressBarContainer.style.left = "50%";
		this.progressBarContainer.style.transform = "translateX(-50%)";
		this.progressBarContainer.style.width = "380px";
		this.progressBarContainer.style.maxWidth = "75vw";
		this.progressBarContainer.style.zIndex = "10";
		this.progressBarContainer.style.display = "flex";
		this.progressBarContainer.style.alignItems = "center";
		this.progressBarContainer.style.gap = "10px";

		// Create progress bar track container (takes most of the space)
		this.progressBarTrack = document.createElement("div");
		this.progressBarTrack.style.position = "relative";
		this.progressBarTrack.style.width = "100%";
		this.progressBarTrack.style.height = "20px";
		this.progressBarTrack.style.backgroundColor = "rgba(255, 255, 255, 0.3)";
		this.progressBarTrack.style.borderRadius = "10px";
		this.progressBarTrack.style.border = "2px solid #000000";
		this.progressBarTrack.style.overflow = "visible";

		// Create progress bar fill
		this.progressBarFill = document.createElement("div");
		this.progressBarFill.style.width = "0%";
		this.progressBarFill.style.height = "100%";
		this.progressBarFill.style.backgroundColor = "#4a90e2";
		this.progressBarFill.style.borderRadius = "8px";
		this.progressBarFill.style.transition = "width 0.3s ease";

		// Create moving penguin indicator
		this.progressPenguin = document.createElement("img");
		this.progressPenguin.src = "img/penguin.png";
		this.progressPenguin.style.position = "absolute";
		this.progressPenguin.style.width = "28px";
		this.progressPenguin.style.height = "28px";
		this.progressPenguin.style.top = "-16px"; // Center on track
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
		this.progressBabyIcon.style.width = "35px";
		this.progressBabyIcon.style.height = "35px";
		this.progressBabyIcon.style.objectFit = "contain";
		this.progressBabyIcon.style.flexShrink = "0";

		// Create progress text
		this.progressText = document.createElement("div");
		this.progressText.style.textAlign = "center";
		this.progressText.style.fontSize = "clamp(10px, 2vw, 14px)";
		this.progressText.style.fontWeight = "bold";
		this.progressText.style.color = "#000000";
		this.progressText.style.marginTop = "4px";
		this.progressText.style.width = "100%";
		this.progressText.textContent = "Level Progress: 0%";

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
			this.winScreenElement.style.display = "block";
		}
	}

	restart() {
		this.gameState = "playing";
		this.score = 0;
		this.fromRestart = true;
		this.timer.reset();
		this.timer.show();
		this.timer.start();
		this.penguin.x = 100;
		this.penguin.y = 300;
		this.penguin.velocityX = 0;
		this.penguin.velocityY = 0;
		this.penguin.onIceberg = false;
		this.penguin.gliding = false;
		this.icebergs = [];
		this.fish = [];
		this.glideTimer = 0;
		this.particles = [];
		this.snowflakes = []; // Clear existing snowflakes

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
		this.updateProgressBar();

		// Reset fish tracking
		this.fishSpawned = 0;
		this.guaranteedFishRegions = [];
		this.lastGuaranteedFishX = 0;

		// Reset final iceberg
		this.finalIcebergGenerated = false;
		this.finalIcebergPosition = this.levelLength - 200;
		this.preFinalIcebergGenerated = false;

		this.generateInitialIcebergs();
		this.positionPenguinOnFirstIceberg(); // Position penguin on first iceberg after restart
		this.generateSnowflakes(); // Regenerate snowflakes for new camera position
		this.gameOverElement.style.display = "none";
		this.winScreenElement.style.display = "none";
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
			const mountainHeight = Math.min(225, this.canvas.height * 0.25);
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
				this.drawImagePreserveAspect(this.images.moutain, x, mountainY, mountainWidth, mountainHeight, "top");
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

		// Draw infinite water waves in foreground, always aligned to waterLevel
		if (this.imagesReady && this.images.waves) {
			const waveHeight = 30;
			const waveAspect = this.images.waves.naturalWidth / this.images.waves.naturalHeight;
			const waveWidth = waveHeight * waveAspect;
			const renderBuffer = this.canvas.width;
			const leftBound = this.camera.x - renderBuffer;
			const rightBound = this.camera.x + this.canvas.width + renderBuffer;
			const startTile = Math.floor(leftBound / waveWidth);
			const endTile = Math.ceil(rightBound / waveWidth);
			for (let tile = startTile; tile <= endTile; tile++) {
				const x = tile * waveWidth;
				const waveY = this.waterLevel + Math.sin((x + Date.now() * 0.001) * 0.01) * 5;
				this.drawImagePreserveAspect(this.images.waves, x, waveY, waveWidth, waveHeight, "center");
			}
		} else {
			this.ctx.strokeStyle = "#36648B";
			this.ctx.lineWidth = 3;
			this.ctx.beginPath();
			const renderBuffer = this.canvas.width * 2;
			const waveStart = this.camera.x - renderBuffer;
			const waveEnd = this.camera.x + this.canvas.width + renderBuffer;
			let firstPoint = true;
			for (let x = waveStart; x < waveEnd; x += 20) {
				const y = this.waterLevel + Math.sin(x + Date.now() * 0.005) * 3;
				if (firstPoint) {
					this.ctx.moveTo(x, y);
					firstPoint = false;
				} else {
					this.ctx.lineTo(x, y);
				}
			}
			this.ctx.stroke();
		}

		// Draw infinite water waves in foreground
		if (this.imagesReady && this.images.waves) {
			// Draw wave overlay on top of water with preserved aspect ratio
			const waveHeight = 30;
			const waveAspect = this.images.waves.naturalWidth / this.images.waves.naturalHeight;
			const waveWidth = waveHeight * waveAspect;

			// Calculate render bounds in world coordinates (accounting for camera position)
			const renderBuffer = this.canvas.width;
			const leftBound = this.camera.x - renderBuffer;
			const rightBound = this.camera.x + this.canvas.width + renderBuffer;

			// Calculate tile positions for seamless wave repetition
			const startTile = Math.floor(leftBound / waveWidth);
			const endTile = Math.ceil(rightBound / waveWidth);

			// Draw wave tiles infinitely
			for (let tile = startTile; tile <= endTile; tile++) {
				const x = tile * waveWidth;
				const waveY = this.waterLevel + Math.sin((x + Date.now() * 0.001) * 0.01) * 5;
				this.drawImagePreserveAspect(this.images.waves, x, waveY, waveWidth, waveHeight, "center");
			}
		} else {
			// Fallback: infinite drawn waves
			this.ctx.strokeStyle = "#36648B"; // Darker wave color to match sky
			this.ctx.lineWidth = 3;
			this.ctx.beginPath();

			const renderBuffer = this.canvas.width * 2;
			const waveStart = this.camera.x - renderBuffer;
			const waveEnd = this.camera.x + this.canvas.width + renderBuffer;

			let firstPoint = true;
			for (let x = waveStart; x < waveEnd; x += 20) {
				const y = this.waterLevel + Math.sin(x + Date.now() * 0.005) * 3;
				if (firstPoint) {
					this.ctx.moveTo(x, y);
					firstPoint = false;
				} else {
					this.ctx.lineTo(x, y);
				}
			}
			this.ctx.stroke();
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

// game.js - Penguin Glider Game
class PenguinGlider {
	constructor(autoStart = true) {
		// Debug settings
		this.showHitboxes = false; // Set to true to show collision hitboxes
		this.timer = new GameTimer();
		this.fromRestart = false;
		this.autoStart = autoStart; 

		this.canvas = document.getElementById("gameCanvas");
		this.ctx = this.canvas.getContext("2d");
		this.gameOverElement = document.getElementById("gameOver");
		this.winScreenElement = document.getElementById("winScreen");

		// Initialize logical dimensions (will be recalculated in handleResize)
		this.logicalWidth = 640;
		this.logicalHeight = 800;
		this.scale = 1.0;
		this.isMobile = false; 
		this.mobileScaleFactor = 1.0; // All elements use standard logical sizing (scaled via ctx.scale)

		this.gameState = autoStart ? "playing" : "intro"; // Set state correctly based on autoStart
		this.score = 0;
		this.keys = {};

		// Penguin properties (positioned relative to water level when icebergs generate)
		this.penguin = {
			x: 100,
			y: 0, 
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
		this.friction = 0.95; 
		this.iceSlipperiness = 0.98; // Damping factor

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

		// Water level (will be calculated in handleResize)
		this.waterLevel = 400; 

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
		this.levelLength = 10000; 
		this.startPosition = 0; 
		this.distanceTraveled = 0; 
		this.levelProgress = 0; 
		this.levelCompleted = false; 
		this.minFishRequired = 10; 

		// Final level iceberg
		this.finalIcebergGenerated = false; 
		this.finalIcebergPosition = this.levelLength - 200; 
		this.preFinalIcebergGenerated = false; 

		// Fish distribution tracking
		this.fishSpawned = 0; 
		this.guaranteedFishRegions = []; 
		this.lastGuaranteedFishX = 0; 

		// Create/grab UI element references
		this.createScoreDisplay();
		this.createProgressBar();

		// Delta time for frame rate independence
		this.lastTime = 0;
		this.deltaTime = 0;
		this.targetFPS = 60; 
		this.fixedDeltaTime = 1000 / this.targetFPS; 

		// Audio context for sound effects
		this.audioContext = null;
		this.sounds = {};
		this.glideTimer = 0;

		// Background music system - single MP3 element reused
		this.backgroundMusic = null;
		this.musicKeyPressed = false; 

		try {
			this.backgroundMusic = new Audio("music.mp3");
			this.backgroundMusic.loop = true; 
			this.backgroundMusic.volume = 0.2; 
			this.backgroundMusic.preload = "auto"; 
			console.log("MP3 background music loaded successfully");
		} catch (error) {
			console.warn("Failed to load background music:", error);
		}

		// Image loading system
		this.images = {};
		this.imagesLoaded = 0;
		this.totalImages = 0;
		this.imagesReady = false;

		this.waterImageYOffset = null; 
		this.mountainImageYOffset = null; 
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
					this.init(); 
					this.timer.setTimeUpCallback(() => this.gameOver());
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
					this.init(); 
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

	drawImagePreserveAspect(image, x, y, maxWidth, maxHeight, alignment = "center") {
		const imageAspect = image.naturalWidth / image.naturalHeight;
		const targetAspect = maxWidth / maxHeight;

		let renderWidth, renderHeight;

		if (imageAspect > targetAspect) {
			renderWidth = maxWidth;
			renderHeight = maxWidth / imageAspect;
		} else {
			renderHeight = maxHeight;
			renderWidth = maxHeight * imageAspect;
		}

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

	drawInfiniteCloudLayer(parallaxSpeed, yOffset, scale, cloudTypes) {
		const parallaxX = this.camera.x * parallaxSpeed;
		const cloudY = this.waterLevel + yOffset;

		const renderBuffer = this.logicalWidth;
		const leftBound = this.camera.x - renderBuffer;
		const rightBound = this.camera.x + this.logicalWidth + renderBuffer;

		const baseCloudWidth = 200 * scale;
		const baseCloudHeight = 100 * scale;
		const baseCloudSpacing = baseCloudWidth * 3.0;

		const startTile = Math.floor((leftBound - parallaxX) / baseCloudSpacing) - 2;
		const endTile = Math.ceil((rightBound - parallaxX) / baseCloudSpacing) + 2;

		this.ctx.globalAlpha = 0.6;

		const getRandomValue = (tile, seed) => {
			const hash = Math.sin((tile + seed) * 12.9898) * 43758.5453;
			return hash - Math.floor(hash);
		};

		for (let tile = startTile; tile <= endTile; tile++) {
			const spacingRandom = getRandomValue(tile, 1.0);
			const randomOffset = (spacingRandom - 0.5) * baseCloudSpacing * 0.5;

			const x = parallaxX + tile * baseCloudSpacing + randomOffset;

			if (x > rightBound + baseCloudWidth || x < leftBound - baseCloudWidth) continue;

			const cloudIndex = Math.abs(tile) % cloudTypes.length;
			const cloudType = cloudTypes[cloudIndex];

			const verticalRandom = getRandomValue(tile, 2.0);
			const verticalRange = this.logicalHeight * 0.3; 
			const verticalVariation = (verticalRandom - 0.5) * verticalRange;
			const finalY = cloudY + verticalVariation;

			const sizeRandom = getRandomValue(tile, 3.0);
			const sizeVariation = 0.5 + sizeRandom * 1.5;
			const cloudWidth = baseCloudWidth * sizeVariation;
			const cloudHeight = baseCloudHeight * sizeVariation;

			const opacityRandom = getRandomValue(tile, 4.0);
			const cloudOpacity = 0.3 + opacityRandom * 0.4; 
			this.ctx.globalAlpha = cloudOpacity;

			const horizontalRandom = getRandomValue(tile, 5.0);
			const horizontalOffset = (horizontalRandom - 0.5) * baseCloudWidth * 0.3;
			const finalX = x + horizontalOffset;

			if (this.images[cloudType]) {
				this.drawImagePreserveAspect(this.images[cloudType], finalX, finalY, cloudWidth, cloudHeight, "center");
			}
		}

		this.ctx.globalAlpha = 1;
	}

	drawImageFillArea(image, x, y, width, height) {
		const imageAspect = image.naturalWidth / image.naturalHeight;
		const targetAspect = width / height;

		let sourceX = 0,
			sourceY = 0,
			sourceWidth = image.naturalWidth,
			sourceHeight = image.naturalHeight;

		if (imageAspect > targetAspect) {
			sourceWidth = image.naturalHeight * targetAspect;
			sourceX = (image.naturalWidth - sourceWidth) / 2;
		} else {
			sourceHeight = image.naturalWidth / targetAspect;
			sourceY = (image.naturalHeight - sourceHeight) / 2;
		}

		this.ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
	}

	playSound(type) {
		if (!this.audioContext) return;

		if (this.audioContext.state === "suspended") {
			this.audioContext.resume();
		}

		const oscillator = this.audioContext.createOscillator();
		const gainNode = this.audioContext.createGain();

		oscillator.connect(gainNode);
		gainNode.connect(this.audioContext.destination);

		switch (type) {
			case "jump":
				oscillator.type = "sawtooth";
				oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
				oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1);
				gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
				gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
				oscillator.start();
				oscillator.stop(this.audioContext.currentTime + 0.1);
				break;

			case "collect":
				oscillator.type = "sine";
				oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime); 
				oscillator.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.1); 
				oscillator.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.2); 
				gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
				gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
				oscillator.start();
				oscillator.stop(this.audioContext.currentTime + 0.3);
				break;

			case "land":
				oscillator.type = "triangle";
				oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
				oscillator.frequency.exponentialRampToValueAtTime(80, this.audioContext.currentTime + 0.1);
				gainNode.gain.setValueAtTime(0.08, this.audioContext.currentTime);
				gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
				oscillator.start();
				oscillator.stop(this.audioContext.currentTime + 0.1);
				break;

			case "gameOver":
				oscillator.type = "square";
				oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
				oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 1);
				gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
				gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 1);
				oscillator.start();
				oscillator.stop(this.audioContext.currentTime + 1);
				break;

			case "glide":
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
				oscillator.type = "sine";
				oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime); 
				oscillator.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.15); 
				oscillator.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.3); 
				oscillator.frequency.setValueAtTime(1047, this.audioContext.currentTime + 0.45); 
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
		window.addEventListener("resize", () => {
			this.handleResize();
		});

		window.addEventListener("orientationchange", () => {
			setTimeout(() => {
				this.handleResize();
			}, 100);
		});

		this.handleResize();
	}

	handleResize() {
		const canvas = this.canvas;
		const vw = window.innerWidth;
		const vh = window.innerHeight;

		canvas.width = vw;
		canvas.height = vh;

		canvas.style.width = vw + "px";
		canvas.style.height = vh + "px";

		// Calculate logical viewport dimensions and scale factor based on the smaller screen dimension
		// Target a comfortable virtual size of 800 units in landscape height or 640 in portrait width
		if (vw >= vh) {
			this.scale = vh / 800;
			this.logicalHeight = 800;
			this.logicalWidth = vw / this.scale;
		} else {
			this.scale = vw / 640;
			this.logicalWidth = 640;
			this.logicalHeight = vh / this.scale;
		}

		// Fixed water level in logical units (50% of screen height, like the original)
		this.waterLevel = this.logicalHeight * 0.5; 

		if (this.imagesReady) {
			this.render();
		}
	}

	setupEventListeners() {
		document.addEventListener("keydown", (e) => {
			this.keys[e.code] = true;
			
			// Enter or Space key to restart on Win/Loss overlays
			if ((this.gameState === "gameOver" || this.gameState === "won") && 
				(e.code === "Enter" || e.key === "Enter" || e.code === "Space" || e.key === " ")) {
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

		this.setupMobileControls();
	}

	setupMobileControls() {
		const leftBtn = document.getElementById("leftBtn");
		const rightBtn = document.getElementById("rightBtn");
		const jumpBtn = document.getElementById("jumpBtn");

		if (!leftBtn || !rightBtn || !jumpBtn) return;

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

	getIcebergYRange(lastIcebergY) {
		const baseMinOffset = 380;
		const baseMaxOffset = 340;
		const minY = Math.max(
			this.waterLevel - baseMinOffset,
			lastIcebergY - 150 
		);
		const maxY = Math.min(this.waterLevel - baseMaxOffset, lastIcebergY + 60);
		return { minY, maxY };
	}

	generateInitialIcebergs() {
		let startWidth = 864,
			startHeight = 480;
		if (this.imagesReady && this.images.iceberg1) {
			const image = this.images.iceberg1;
			const imageAspect = image.naturalWidth / image.naturalHeight;
			startHeight = 480; 
			startWidth = startHeight * imageAspect;
		}
		const startY = this.waterLevel - 380; // Align top at Y = 20 (for 800 height)
		this.icebergs.push({
			x: 100 - startWidth / 2,
			y: startY,
			width: startWidth,
			height: startHeight,
			imageType: 1,
		});
		let lastY = startY;
		for (let i = 1; i < 5; i++) {
			lastY = this.generateIceberg(50 + 250 * i, lastY); 
		}
	}

	positionPenguinOnFirstIceberg() {
		if (this.icebergs.length > 0) {
			const firstIceberg = this.icebergs[0];
			this.penguin.x = firstIceberg.x + firstIceberg.width / 2 - this.penguin.width / 2; 
			this.penguin.y = firstIceberg.y - this.penguin.height; 
			this.penguin.onIceberg = true; 
		}
	}

	generateIceberg(startX, lastIcebergY) {
		const maxHorizontalReach = 300;
		const horizontalDistance = Math.random() * (maxHorizontalReach * 0.8) + maxHorizontalReach * 0.2;
		let prevY =
			typeof lastIcebergY === "number"
				? lastIcebergY
				: this.icebergs.length > 0
				? this.icebergs[this.icebergs.length - 1].y
				: this.waterLevel - 60;
		const { minY, maxY } = this.getIcebergYRange(prevY);

		const imageType = Math.floor(Math.random() * 4) + 1;
		let width, height;

		if (this.imagesReady && this.images[`iceberg${imageType}`]) {
			const image = this.images[`iceberg${imageType}`];
			const imageAspect = image.naturalWidth / image.naturalHeight;
			const baseHeight = 400 + Math.random() * 100; 

			height = baseHeight;
			width = height * imageAspect;
		} else {
			width = 600 + Math.random() * 200;
			height = 400 + Math.random() * 100;
		}

		const newIcebergX = startX + horizontalDistance;
		let newIcebergY = minY + Math.random() * (maxY - minY);

		const overlappingIcebergs = [];
		for (let existingIceberg of this.icebergs) {
			const horizontalOverlap = !(
				newIcebergX + width < existingIceberg.x || existingIceberg.x + existingIceberg.width < newIcebergX
			);

			if (horizontalOverlap) {
				const overlapStart = Math.max(newIcebergX, existingIceberg.x);
				const overlapEnd = Math.min(newIcebergX + width, existingIceberg.x + existingIceberg.width);
				const overlapWidth = overlapEnd - overlapStart;
				const overlapPercentage = overlapWidth / Math.min(width, existingIceberg.width);

				if (overlapPercentage > 0.2) {
					overlappingIcebergs.push(existingIceberg);
				}
			}
		}

		if (overlappingIcebergs.length > 0) {
			const highestY = Math.min(...overlappingIcebergs.map((iceberg) => iceberg.y));
			newIcebergY = highestY; 

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

		this.smartFishSpawning(iceberg);
		this.smartBearSpawning(iceberg);
		this.smartBottleSpawning(iceberg);

		return newIcebergY;
	}

	generateFinalIceberg() {
		if (this.imagesReady && this.images["end-level"]) {
			const endLevelImage = this.images["end-level"];

			const scaleFactor = 0.45;
			const width = endLevelImage.naturalWidth * scaleFactor;
			const height = endLevelImage.naturalHeight * scaleFactor;

			const finalIcebergX = this.levelLength;
			const finalIcebergY = this.waterLevel - (height+20); 

			const colliderHeight = height * 0.6; 
			const colliderY = finalIcebergY + (height - colliderHeight); 

			const finalIceberg = {
				x: finalIcebergX,
				y: finalIcebergY,
				width: width,
				height: height,
				colliderX: finalIcebergX,
				colliderY: colliderY,
				colliderWidth: width,
				colliderHeight: colliderHeight,
				imageType: "end-level", 
				isFinalIceberg: true, 
			};

			this.icebergs.push(finalIceberg);
			this.finalIcebergGenerated = true;
		}
	}

	generateSnowflakes() {
		for (let i = 0; i < 50; i++) {
			this.snowflakes.push({
				x: Math.random() * this.logicalWidth * 3, 
				y: Math.random() * this.logicalHeight,
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
		const baseAcceleration = this.penguin.onIceberg ? 0.2 : 0.5; 
		const acceleration = baseAcceleration * deltaMultiplier;
		const maxSpeed = this.penguin.onIceberg ? this.moveSpeed * 1.2 : this.moveSpeed; 

		if (this.keys["ArrowLeft"] || this.keys["KeyA"]) {
			this.penguin.velocityX = Math.max(this.penguin.velocityX - acceleration, -maxSpeed);
		}
		if (this.keys["ArrowRight"] || this.keys["KeyD"]) {
			this.penguin.velocityX = Math.min(this.penguin.velocityX + acceleration, maxSpeed);
		} 
		if ((this.keys["ArrowUp"] || this.keys["KeyW"] || this.keys["Space"]) && this.penguin.onIceberg) {
			this.penguin.velocityY = this.jumpPower;
			this.penguin.onIceberg = false;
			this.penguin.gliding = true;
			this.createJumpParticles();
			this.playSound("jump");
		}

		if (
			(this.keys["ArrowUp"] || this.keys["KeyW"] || this.keys["Space"]) &&
			!this.penguin.onIceberg &&
			this.penguin.velocityY > 0
		) {
			this.penguin.velocityY += this.gravity * 0.3 * deltaMultiplier; 
			this.penguin.gliding = true;

			this.glideTimer += deltaMultiplier;
			if (this.glideTimer > 30) {
				this.playSound("glide");
				this.glideTimer = 0;
			}
		} else {
			this.penguin.gliding = false;
			this.glideTimer = 0;
		}

		if (this.keys["KeyM"] && !this.musicKeyPressed) {
			this.toggleBackgroundMusic();
			this.musicKeyPressed = true;
		} else if (!this.keys["KeyM"]) {
			this.musicKeyPressed = false;
		}
	}

	updatePenguin(deltaMultiplier = 1) {
		const prevX = this.penguin.x;
		const prevY = this.penguin.y;

		if (!this.penguin.onIceberg) {
			this.penguin.velocityY += this.gravity * deltaMultiplier;
		}

		if (this.penguin.onIceberg) {
			// Frame-rate independent friction damping
			this.penguin.velocityX *= Math.pow(this.iceSlipperiness, deltaMultiplier);

			for (let iceberg of this.icebergs) {
				if (
					this.penguin.x + this.penguin.width > iceberg.x &&
					this.penguin.x < iceberg.x + iceberg.width &&
					this.penguin.y + this.penguin.height >= iceberg.y - 3 &&
					this.penguin.y + this.penguin.height <= iceberg.y + 15
				) {
					if (Math.abs(this.penguin.velocityX) > 0.5) {
						const slideForce = Math.sign(this.penguin.velocityX) * 0.1 * deltaMultiplier;
						this.penguin.velocityX += slideForce;

						if (Math.abs(this.penguin.velocityX) > 2 && Math.random() < 0.3 * deltaMultiplier) {
							this.createSlipParticles();
						}
					}

					if (Math.random() < 0.02 * deltaMultiplier) {
						this.penguin.velocityX += (Math.random() - 0.5) * 0.3 * deltaMultiplier;
						if (Math.random() < 0.5) {
							this.createSlipParticles();
						}
					}
					break;
				}
			}
		}

		const newX = this.penguin.x + this.penguin.velocityX * deltaMultiplier;
		const newY = this.penguin.y + this.penguin.velocityY * deltaMultiplier;

		const collision = this.checkSolidCollisions(prevX, prevY, newX, newY);

		if (collision) {
			if (collision.type === "horizontal") {
				this.penguin.velocityX = 0;
				this.penguin.x = collision.correctedX;
				this.penguin.y = newY; 
			} else if (collision.type === "vertical") {
				this.penguin.velocityY = 0;
				this.penguin.x = newX; 
				this.penguin.y = collision.correctedY;
			} else if (collision.type === "corner") {
				this.penguin.velocityX = 0;
				this.penguin.velocityY = 0;
				this.penguin.x = collision.correctedX;
				this.penguin.y = collision.correctedY;
			}
		} else {
			this.penguin.x = newX;
			this.penguin.y = newY;
		}

		const isMovingSignificantly = Math.abs(this.penguin.velocityX) > 1 || Math.abs(this.penguin.velocityY) > 3;
		if (isMovingSignificantly) {
			this.validatePenguinPosition();
		}

		this.updateCamera(deltaMultiplier);

		// Boundaries based on logicalWidth
		const leftBound = this.camera.x - this.logicalWidth * 0.2;
		const rightBound = this.camera.x + this.logicalWidth * 1.2;

		if (this.penguin.x < leftBound) {
			this.penguin.x = leftBound;
			this.penguin.velocityX = 0;
		}
		if (this.penguin.x > rightBound) {
			this.penguin.x = rightBound;
			this.penguin.velocityX = 0;
		}

		if (this.penguin.y > this.waterLevel) {
			this.gameOver();
		}
	}

	updateCamera(deltaMultiplier = 1) {
		// Target X follows the penguin, keeping it 30% from the left edge of the screen
		// In portrait mode, we center the penguin slightly more (e.g. 22%) to show more upcoming area
		const targetXPercent = this.logicalWidth < this.logicalHeight ? 0.22 : 0.3;
		this.camera.targetX = this.penguin.x - this.logicalWidth * targetXPercent;

		// Smooth camera X movements
		const smoothing = this.camera.smoothing * deltaMultiplier;
		this.camera.x += (this.camera.targetX - this.camera.x) * smoothing;
		
		// Lock Y camera coordinate statically relative to water level and screen height (keeping water at 82%)
		// This removes vertical camera movement completely when jumping
		this.camera.y = this.waterLevel - this.logicalHeight * 0.82;

		this.updateLevelProgress();
	}

	updateLevelProgress() {
		this.distanceTraveled = Math.max(0, this.camera.x - this.startPosition);
		const actualProgress = Math.min(1, this.distanceTraveled / this.levelLength);
		this.levelProgress = Math.min(1, actualProgress * 1.05);

		this.updateProgressBar();

		if (!this.levelCompleted && this.levelProgress >= 1) {
			this.checkLevelCompletion();
		}
	}

	updateIcebergs(deltaMultiplier = 1) {
		this.icebergs = this.icebergs.filter((iceberg) => iceberg.x + iceberg.width > this.camera.x - 200);

		if (!this.finalIcebergGenerated && this.camera.x > this.finalIcebergPosition - 1000) {
			this.generateFinalIceberg();
		}

		if (!this.preFinalIcebergGenerated && this.camera.x > this.finalIcebergPosition - 1500) {
			const preFinalIcebergX = this.finalIcebergPosition - 400; 
			this.generateIceberg(preFinalIcebergX);
			this.preFinalIcebergGenerated = true;
		}

		const fishDeficit = this.minFishRequired - this.fishSpawned;
		const distanceToFinalIceberg = this.finalIcebergPosition - this.camera.x;
		const isApproachingEnd = distanceToFinalIceberg < 2000; 

		if (this.icebergs.length < 8) {
			const lastIceberg = this.icebergs[this.icebergs.length - 1];
			const baseDistance = 200; 
			const nextIcebergX = lastIceberg.x + baseDistance;

			let shouldGenerate = nextIcebergX < this.finalIcebergPosition - 300;

			if (isApproachingEnd && fishDeficit > 0 && nextIcebergX < this.finalIcebergPosition - 100) {
				shouldGenerate = true;
			}

			if (shouldGenerate) {
				this.generateIceberg(nextIcebergX);
			}
		}

		if (isApproachingEnd && fishDeficit > 0 && distanceToFinalIceberg < 800) {
			for (let iceberg of this.icebergs) {
				if (iceberg.x > this.camera.x && !iceberg.isFinalIceberg) {
					const hasExistingFish = this.fish.some(
						(fish) =>
							fish.x >= iceberg.x &&
							fish.x <= iceberg.x + iceberg.width &&
							fish.y >= iceberg.y - 30 &&
							fish.y <= iceberg.y + 10
					);

					if (!hasExistingFish) {
						this.spawnFishOnIceberg(iceberg);
						break; 
					}
				}
			}
		}
	}

	updateFish(deltaMultiplier = 1) {
		for (let fish of this.fish) {
			fish.animationTimer += 0.1 * deltaMultiplier;
			fish.y += Math.sin(fish.animationTimer) * 0.5 * deltaMultiplier;
		}

		this.fish = this.fish.filter((fish) => fish.x + fish.width > this.camera.x - 200);
	}

	updateBears(deltaMultiplier = 1) {
		for (let bear of this.bears) {
			bear.animationTimer += 0.05 * deltaMultiplier; 
			bear.y += Math.sin(bear.animationTimer) * 0.3 * deltaMultiplier;
		}

		this.bears = this.bears.filter((bear) => bear.x + bear.width > this.camera.x - 200);
	}

	updateBottles(deltaMultiplier = 1) {
		for (let bottle of this.bottles) {
			bottle.animationTimer += 0.08 * deltaMultiplier; 
			bottle.y += Math.sin(bottle.animationTimer) * 0.4 * deltaMultiplier;
		}

		this.bottles = this.bottles.filter((bottle) => bottle.x + bottle.width > this.camera.x - 200);
	}

	spawnFishOnIceberg(iceberg) {
		const fishMargin = 20; 
		const fishX = iceberg.x + fishMargin + Math.random() * (iceberg.width - 2 * fishMargin - 40); 
		const fishY = iceberg.y - 24; 

		const fish = {
			x: fishX,
			y: fishY,
			width: 40,
			height: 24,
			animationTimer: Math.random() * Math.PI * 2, 
			collected: false,
			imageType: Math.floor(Math.random() * 4) + 1,
		};
		this.fish.push(fish);
		this.fishSpawned++;
	}

	spawnBearOnIceberg(iceberg) {
		const bearMargin = 40; 
		const bearWidth = 80; 
		const bearHeight = 40; 
		const bearX = iceberg.x + bearMargin + Math.random() * (iceberg.width - 2 * bearMargin - bearWidth);
		const bearY = iceberg.y - bearHeight + 15; 

		const bear = {
			x: bearX,
			y: bearY,
			width: bearWidth,
			height: bearHeight,
			animationTimer: Math.random() * Math.PI * 2, 
		};
		this.bears.push(bear);
	}

	spawnBottleOnIceberg(iceberg) {
		const bottleMargin = 20; 
		const bottleX = iceberg.x + bottleMargin + Math.random() * (iceberg.width - 2 * bottleMargin - 48); 
		const bottleY = iceberg.y - 29; 

		const bottle = {
			x: bottleX,
			y: bottleY,
			width: 48, 
			height: 29, 
			animationTimer: Math.random() * Math.PI * 2, 
		};
		this.bottles.push(bottle);
	}

	smartFishSpawning(iceberg) {
		if (iceberg.isFinalIceberg) return;

		const distanceFromStart = iceberg.x - this.startPosition;
		const progressThroughLevel = Math.min(distanceFromStart / this.levelLength, 1);
		const expectedFishByNow = Math.floor(progressThroughLevel * (this.minFishRequired + 5)); 

		const regionSize = this.levelLength / (this.minFishRequired + 3); 
		const currentRegion = Math.floor(distanceFromStart / regionSize);
		const shouldGuaranteeFish =
			this.fishSpawned < expectedFishByNow || distanceFromStart - this.lastGuaranteedFishX > regionSize * 1.5;

		const isApproachingEnd = progressThroughLevel > 0.8;
		const fishNeededToComplete = this.minFishRequired - this.fishSpawned;

		let spawnChance = 0.3; 

		if (shouldGuaranteeFish) {
			spawnChance = 0.8; 
		} else if (this.fishSpawned >= this.minFishRequired + 8) {
			spawnChance = 0.15; 
		}

		if (isApproachingEnd && fishNeededToComplete > 0) {
			spawnChance = 1.0; 
		}

		if (this.fishSpawned < Math.floor(progressThroughLevel * this.minFishRequired * 0.7)) {
			spawnChance = 1.0; 
		}

		if (Math.random() < spawnChance) {
			this.spawnFishOnIceberg(iceberg);
			if (shouldGuaranteeFish) {
				this.lastGuaranteedFishX = iceberg.x;
			}
		}
	}

	isIcebergOverlapping(targetIceberg) {
		for (let existingIceberg of this.icebergs) {
			if (existingIceberg === targetIceberg) continue;

			const horizontalOverlap = !(
				targetIceberg.x + targetIceberg.width < existingIceberg.x ||
				existingIceberg.x + existingIceberg.width < targetIceberg.x
			);

			if (horizontalOverlap) {
				const overlapStart = Math.max(targetIceberg.x, existingIceberg.x);
				const overlapEnd = Math.min(
					targetIceberg.x + targetIceberg.width,
					existingIceberg.x + existingIceberg.width
				);
				const overlapWidth = overlapEnd - overlapStart;
				const overlapPercentage = overlapWidth / Math.min(targetIceberg.width, existingIceberg.width);

				if (overlapPercentage > 0.2) return true;
			}
		}
		return false;
	}

	smartBearSpawning(iceberg) {
		if (iceberg.isFinalIceberg) return;

		if (!this.isIcebergOverlapping(iceberg)) return;

		const distanceFromStart = iceberg.x - this.startPosition;
		if (distanceFromStart < 600) return;

		const hasExistingFish = this.fish.some(
			(fish) =>
				fish.x >= iceberg.x &&
				fish.x <= iceberg.x + iceberg.width &&
				fish.y >= iceberg.y - 30 &&
				fish.y <= iceberg.y + 10
		);

		let spawnChance = hasExistingFish ? 0.2 : 0.45; 

		const progressThroughLevel = Math.min(distanceFromStart / this.levelLength, 1);
		if (progressThroughLevel > 0.7) {
			spawnChance *= 0.6; 
		}

		if (Math.random() < spawnChance) {
			this.spawnBearOnIceberg(iceberg);
		}
	}

	smartBottleSpawning(iceberg) {
		if (iceberg.isFinalIceberg) return;

		const distanceFromStart = iceberg.x - this.startPosition;
		if (distanceFromStart < 400) return;

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

		let spawnChance = 0.35; 

		if (hasExistingFish || hasExistingBear) {
			spawnChance = 0.15; 
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
			particle.velocityY += 0.1 * deltaMultiplier; 
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

			if (snowflake.y > this.camera.y + this.logicalHeight + 50) {
				snowflake.y = this.camera.y - 50;
				snowflake.x = this.camera.x + Math.random() * this.logicalWidth;
			}

			if (snowflake.x < this.camera.x - 50) {
				snowflake.x = this.camera.x + this.logicalWidth + Math.random() * 100;
				snowflake.y = this.camera.y + Math.random() * this.logicalHeight;
			}
		}
	}

	updateWaves(deltaMultiplier = 1) {
		if (Math.random() < 0.05) {
			const lowerHalfStart = this.camera.y + this.logicalHeight / 2;

			this.waves.push({
				x: this.camera.x + Math.random() * this.logicalWidth, 
				y: lowerHalfStart + Math.random() * (this.logicalHeight / 2),
				speedX: (Math.random() - 0.5) * 0.4, 
				speedY: (Math.random() - 0.5) * 1.2, 
				alpha: 0.4 + Math.random() * 0.4,
				life: 1.0,
				scale: 0.3 + Math.random() * 0.4, 
				wobbleSpeed: Math.random() * 0.3 + 0.15, 
				wobbleAmount: Math.random() * 1.2 + 0.4, 
			});
		}

		for (let i = this.waves.length - 1; i >= 0; i--) {
			const wave = this.waves[i];

			wave.x += wave.speedX * deltaMultiplier;
			wave.y += wave.speedY * deltaMultiplier;

			const time = Date.now() * 0.005; 
			wave.x += Math.sin(time * wave.wobbleSpeed) * wave.wobbleAmount * deltaMultiplier;
			wave.y += Math.cos(time * wave.wobbleSpeed * 1.3) * wave.wobbleAmount * deltaMultiplier;

			wave.life -= 0.002 * deltaMultiplier;

			if (wave.life <= 0 || Math.abs(wave.x - this.camera.x) > this.logicalWidth * 1.5) {
				this.waves.splice(i, 1);
			}
		}
	}

	validatePenguinPosition() {
		for (let iceberg of this.icebergs) {
			const icebergX = iceberg.colliderX !== undefined ? iceberg.colliderX : iceberg.x;
			const icebergY = iceberg.colliderY !== undefined ? iceberg.colliderY : iceberg.y;
			const icebergWidth = iceberg.colliderWidth !== undefined ? iceberg.colliderWidth : iceberg.width;
			const icebergHeight = iceberg.colliderHeight !== undefined ? iceberg.colliderHeight : iceberg.height;

			const isInsideHorizontally =
				this.penguin.x + this.penguin.width > icebergX + 15 && this.penguin.x < icebergX + icebergWidth - 15;

			const isInsideVertically =
				this.penguin.y + this.penguin.height > icebergY + 15 && this.penguin.y < icebergY + icebergHeight - 15;

			if (isInsideHorizontally && isInsideVertically) {
				const distanceToTop = Math.abs(this.penguin.y + this.penguin.height - icebergY);
				const distanceToBottom = Math.abs(this.penguin.y - (icebergY + icebergHeight));
				const distanceToLeft = Math.abs(this.penguin.x + this.penguin.width - icebergX);
				const distanceToRight = Math.abs(this.penguin.x - (icebergX + icebergWidth));

				const minDistance = Math.min(distanceToTop, distanceToBottom, distanceToLeft, distanceToRight);
				const smoothingFactor = 0.3; 

				if (minDistance === distanceToTop) {
					const targetY = icebergY - this.penguin.height;
					this.penguin.y = this.penguin.y * (1 - smoothingFactor) + targetY * smoothingFactor;
					this.penguin.velocityY = Math.min(this.penguin.velocityY, -1); 
					this.penguin.onIceberg = true;
				} else if (minDistance === distanceToBottom) {
					const targetY = icebergY + icebergHeight;
					this.penguin.y = this.penguin.y * (1 - smoothingFactor) + targetY * smoothingFactor;
					this.penguin.velocityY = Math.max(this.penguin.velocityY, 1); 
					this.penguin.onIceberg = false;
				} else if (minDistance === distanceToLeft) {
					const targetX = icebergX - this.penguin.width;
					this.penguin.x = this.penguin.x * (1 - smoothingFactor) + targetX * smoothingFactor;
					this.penguin.velocityX = Math.min(this.penguin.velocityX, -1); 
				} else {
					const targetX = icebergX + icebergWidth;
					this.penguin.x = this.penguin.x * (1 - smoothingFactor) + targetX * smoothingFactor;
					this.penguin.velocityX = Math.max(this.penguin.velocityX, 1); 
				}
				break;
			}
		}
	}

	checkSolidCollisions(prevX, prevY, newX, newY) {
		const penguinWidth = this.penguin.width;
		const penguinHeight = this.penguin.height;

		for (let iceberg of this.icebergs) {
			const icebergX = iceberg.colliderX !== undefined ? iceberg.colliderX : iceberg.x;
			const icebergY = iceberg.colliderY !== undefined ? iceberg.colliderY : iceberg.y;
			const icebergWidth = iceberg.colliderWidth !== undefined ? iceberg.colliderWidth : iceberg.width;
			const icebergHeight = iceberg.colliderHeight !== undefined ? iceberg.colliderHeight : iceberg.height;

			const wouldOverlap =
				newX < icebergX + icebergWidth - 1 &&
				newX + penguinWidth > icebergX + 1 &&
				newY < icebergY + icebergHeight - 1 &&
				newY + penguinHeight > icebergY - 3; 

			if (wouldOverlap) {
				const wasOverlapping =
					prevX < icebergX + icebergWidth - 1 &&
					prevX + penguinWidth > icebergX + 1 &&
					prevY < icebergY + icebergHeight - 1 &&
					prevY + penguinHeight > icebergY - 3;

				if (wasOverlapping) continue;

				const standingOnSurface =
					prevY + penguinHeight >= icebergY - 5 && 
					prevY + penguinHeight <= icebergY + 15 && 
					this.penguin.onIceberg; 

				const moveX = newX - prevX;
				const moveY = newY - prevY;

				if (standingOnSurface && Math.abs(moveY) <= 2) {
					if (Math.abs(moveX) > Math.abs(moveY)) continue;
				}

				const overlapLeft = prevX + penguinWidth - icebergX;
				const overlapRight = icebergX + icebergWidth - prevX;
				const overlapTop = prevY + penguinHeight - icebergY;
				const overlapBottom = icebergY + icebergHeight - prevY;

				const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

				if (minOverlap === overlapTop && moveY > 0) {
					return {
						type: "vertical",
						correctedX: newX,
						correctedY: icebergY - penguinHeight,
					};
				} else if (minOverlap === overlapBottom && moveY < 0) {
					return {
						type: "vertical",
						correctedX: newX,
						correctedY: icebergY + icebergHeight,
					};
				} else if (minOverlap === overlapLeft && moveX > 0) {
					return {
						type: "horizontal",
						correctedX: icebergX - penguinWidth,
						correctedY: newY,
					};
				} else if (minOverlap === overlapRight && moveX < 0) {
					return {
						type: "horizontal",
						correctedX: icebergX + icebergWidth,
						correctedY: newY,
					};
				} else {
					return {
						type: "corner",
						correctedX: prevX,
						correctedY: prevY,
					};
				}
			}
		}

		return null; 
	}

	checkCollisions() {
		const wasOnIceberg = this.penguin.onIceberg;
		this.penguin.onIceberg = false;

		for (let iceberg of this.icebergs) {
			const colliderX = iceberg.colliderX !== undefined ? iceberg.colliderX : iceberg.x;
			const colliderY = iceberg.colliderY !== undefined ? iceberg.colliderY : iceberg.y;
			const colliderWidth = iceberg.colliderWidth !== undefined ? iceberg.colliderWidth : iceberg.width;
			const colliderHeight = iceberg.colliderHeight !== undefined ? iceberg.colliderHeight : iceberg.height;

			if (iceberg.isFinalIceberg) {
				const penguinCollidesFinalIceberg =
					this.penguin.x < colliderX + colliderWidth &&
					this.penguin.x + this.penguin.width > colliderX &&
					this.penguin.y < colliderY + colliderHeight &&
					this.penguin.y + this.penguin.height > colliderY;

				if (penguinCollidesFinalIceberg && !this.levelCompleted) {
					this.levelCompleted = true;

					const hasEnoughFish = this.score >= this.minFishRequired;
					const hasTimeLeft = this.timer.remainingTime > 0;

					if (hasEnoughFish && hasTimeLeft) {
						this.levelWin();
					} else {
						this.gameOver(); 
					}
					return; 
				}
			}

			if (
				this.penguin.x + this.penguin.width > colliderX + 5 && 
				this.penguin.x < colliderX + colliderWidth - 5 &&
				this.penguin.y + this.penguin.height >= colliderY - 3 &&
				this.penguin.y + this.penguin.height <= colliderY + 12 &&
				this.penguin.velocityY >= -1 
			) {
				this.penguin.y = colliderY - this.penguin.height + 3;
				this.penguin.velocityY = 0;
				this.penguin.onIceberg = true;
				this.penguin.gliding = false;

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

			if (
				this.penguin.x < fish.x + fish.width &&
				this.penguin.x + this.penguin.width > fish.x &&
				this.penguin.y < fish.y + fish.height &&
				this.penguin.y + this.penguin.height > fish.y &&
				!fish.collected
			) {
				fish.collected = true;
				this.score += 1;
				this.updateScoreDisplay();
				this.createFishCollectionParticles(fish.x + fish.width / 2, fish.y + fish.height / 2);
				this.playSound("collect");
				this.fish.splice(i, 1);
			}
		}
	}

	checkBottleCollection() {
		for (let i = this.bottles.length - 1; i >= 0; i--) {
			const bottle = this.bottles[i];

			if (
				this.penguin.x < bottle.x + bottle.width &&
				this.penguin.x + this.penguin.width > bottle.x &&
				this.penguin.y < bottle.y + bottle.height &&
				this.penguin.y + this.penguin.height > bottle.y
			) {
				this.score = Math.max(0, this.score - 1); 
				this.updateScoreDisplay();

				if (this.bottleMessageElement) {
					this.bottleMessageElement.textContent = "OOOPS, watch out for the plastic waste! You lose a fish.";
					this.bottleMessageElement.style.display = "block";

					setTimeout(() => {
						if (this.bottleMessageElement) {
							this.bottleMessageElement.style.display = "none";
						}
					}, 3000);
				}

				this.createBottleCollectionParticles(bottle.x + bottle.width / 2, bottle.y + bottle.height / 2);
				this.playSound("collect");
				this.bottles.splice(i, 1);
			}
		}
	}

	checkBearCollisions() {
		for (let i = this.bears.length - 1; i >= 0; i--) {
			const bear = this.bears[i];

			if (
				this.penguin.x < bear.x + bear.width &&
				this.penguin.x + this.penguin.width > bear.x &&
				this.penguin.y < bear.y + bear.height &&
				this.penguin.y + this.penguin.height > bear.y
			) {
				this.bearCollision = true; 
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
				color: `hsl(${Math.random() * 30}, 50%, ${Math.random() * 20 + 30}%)`, 
			});
		}
	}

	createJumpParticles() {
		const visualOffset = this.imagesReady && this.images.penguin ? 30 : 8;

		for (let i = 0; i < 8; i++) {
			this.particles.push({
				x: this.penguin.x + this.penguin.width / 2,
				y: this.penguin.y + this.penguin.height + visualOffset, 
				velocityX: (Math.random() - 0.5) * 6,
				velocityY: Math.random() * -3,
				life: 30,
				color: `rgba(255, 255, 255, ${Math.random() * 0.8 + 0.2})`,
			});
		}
	}

	createSlipParticles() {
		const visualOffset = this.imagesReady && this.images.penguin ? 30 : 8;

		for (let i = 0; i < 3; i++) {
			this.particles.push({
				x: this.penguin.x + this.penguin.width / 2 + (Math.random() - 0.5) * this.penguin.width,
				y: this.penguin.y + this.penguin.height + visualOffset - 5, 
				velocityX: -this.penguin.velocityX * 0.5 + (Math.random() - 0.5) * 2,
				velocityY: Math.random() * -1 - 0.5,
				life: 20,
				color: `rgba(173, 216, 230, ${Math.random() * 0.6 + 0.4})`, 
			});
		}
	}

	gameOver() {
		this.gameState = "gameOver";
		this.stopBackgroundMusicWithFade();
		
		let message = "OOOPS you fell in the icy water!";
		if (this.bearCollision) {
			message = "OOOPS, watch out for the polar bears!";
		} else if (this.penguin.y <= this.waterLevel && this.timer.remainingTime <= 0) {
			message = "TIME'S UP!";
		}
		
		const lossReason = document.getElementById("lossReason");
		if (lossReason) lossReason.textContent = message;

		if (this.gameOverElement) {
			this.gameOverElement.style.display = "flex";
		}

		this.playSound("gameOver");
		this.timer.stop();
		this.timer.hide();

		// Hide HUD
		if (typeof showGameHUD === "function") {
			showGameHUD(false);
		}
	}

	createScoreDisplay() {
		this.scoreContainer = document.getElementById("gameScore");
		this.scoreText = document.getElementById("scoreText");
		this.scoreMessage = document.getElementById("scoreMessage");
	}

	updateScoreDisplay() {
		if (this.scoreText) {
			this.scoreText.textContent = `x ${this.score}`;
		}
		if (this.scoreMessage) {
			if (this.score >= this.minFishRequired) {
				this.scoreMessage.style.color = "#4cd964"; // Premium green
			} else {
				this.scoreMessage.style.color = "#ff3b30"; // Premium red warning
			}
		}
	}

	updateFishRequirement() {
		if (this.scoreMessage) {
			this.scoreMessage.textContent = `collect at least ${this.minFishRequired}!`;
		}
		this.updateScoreDisplay();
	}

	createProgressBar() {
		this.progressSystemContainer = document.getElementById("progressSystemContainer");
		this.progressBarFill = document.getElementById("progressBarFill");
		this.progressPenguin = document.getElementById("progressPenguin");
		this.progressText = document.getElementById("progressText");
		this.bottleMessageElement = document.getElementById("bottleMessage");
	}

	updateProgressBar() {
		if (this.progressBarFill && this.progressText && this.progressPenguin) {
			const progressPercent = Math.round(this.levelProgress * 100);
			this.progressBarFill.style.width = `${progressPercent}%`;
			this.progressText.textContent = `Level Progress: ${progressPercent}%`;

			this.progressPenguin.style.left = `${progressPercent}%`;

			// Smooth status color updates
			if (progressPercent >= 90) {
				this.progressBarFill.style.backgroundColor = "#4cd964"; 
			} else if (progressPercent >= 70) {
				this.progressBarFill.style.backgroundColor = "#ff9500"; 
			} else {
				this.progressBarFill.style.backgroundColor = "#4a90e2"; 
			}
		}
	}

	checkLevelCompletion() {
		// Handled in collisions
	}

	levelWin() {
		this.gameState = "won";
		this.stopBackgroundMusicWithFade();
		this.timer.stop();
		this.timer.hide();
		
		if (typeof showGameHUD === "function") {
			showGameHUD(false);
		}

		this.showWinScreen();
		this.playSound("win");
	}

	showWinScreen() {
		if (this.winScreenElement) {
			const winScoreEl = document.getElementById("winScore");
			const winTimeEl = document.getElementById("winTime");
			
			if (winScoreEl) winScoreEl.textContent = this.score;
			if (winTimeEl) winTimeEl.textContent = this.timer.formatTime(Math.ceil(this.timer.remainingTime));

			this.winScreenElement.style.display = "flex";
		}
	}

	restart() {
		// Reset state
		this.gameState = "playing";
		this.score = 0;
		this.fromRestart = true;
		this.bearCollision = false; 
		
		// Reset music playing status
		if (this.backgroundMusic) {
			try {
				this.backgroundMusic.pause();
				this.backgroundMusic.currentTime = 0;
				this.backgroundMusic.volume = 0.2;
				this.startBackgroundMusic();
			} catch (e) {
				console.warn("Failed to reset background music:", e);
			}
		}

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
		this.bears = []; 
		this.bottles = []; 
		this.glideTimer = 0;
		this.particles = [];
		this.snowflakes = []; 

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

		this.updateProgressBar();

		// Recreate game world
		this.generateInitialIcebergs();
		this.positionPenguinOnFirstIceberg(); 
		this.generateSnowflakes(); 

		// Hide overlays
		if (this.gameOverElement) this.gameOverElement.style.display = "none";
		if (this.winScreenElement) this.winScreenElement.style.display = "none";

		// Update displays
		this.updateScoreDisplay();
	}

	render() {
		// Clear entire physical screen
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		// Show loading screen if images aren't ready
		if (!this.imagesReady) {
			this.ctx.fillStyle = "#87CEEB";
			this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

			this.ctx.fillStyle = "#FFFFFF";
			this.ctx.font = "32px Outfit";
			this.ctx.textAlign = "center";
			this.ctx.fillText("Loading Penguin Glider...", this.canvas.width / 2, this.canvas.height / 2 - 20);

			this.ctx.font = "24px Outfit";
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

		// Apply scaled resolution
		this.ctx.scale(this.scale, this.scale);

		// Apply camera translation
		this.ctx.translate(-this.camera.x, -this.camera.y);

		// Draw infinite sky gradient
		const gradient = this.ctx.createLinearGradient(
			0, 
			this.camera.y,
			0,
			this.camera.y + this.logicalHeight
		);
		gradient.addColorStop(0, "#6BA6CD"); 
		gradient.addColorStop(0.7, "#36648B"); 
		gradient.addColorStop(1, "#0F1F4A"); 
		this.ctx.fillStyle = gradient;

		const renderBuffer = this.logicalWidth * 2; 
		const leftBound = this.camera.x - renderBuffer;
		const rightBound = this.camera.x + this.logicalWidth + renderBuffer;
		const topBound = this.camera.y - renderBuffer;
		const bottomBound = this.camera.y + this.logicalHeight + renderBuffer;

		this.ctx.fillRect(leftBound, topBound, rightBound - leftBound, bottomBound - topBound);

		// Draw clouds
		this.drawInfiniteCloudLayer(0.05, -this.logicalHeight * 0.7, 0.4, ["cloud1", "cloud2", "cloud3"]);
		this.drawInfiniteCloudLayer(0.1, -this.logicalHeight * 0.5, 0.3, ["cloud4", "cloud5"]);

		// Draw mountains
		if (this.images.moutain) {
			const mountainDistance = Math.min(500, this.logicalHeight * 0.6);
			const mountainHeight = Math.min(225, this.logicalHeight * 0.8);
			const parallaxSpeed = 0.3; 
			const parallaxX = this.camera.x * parallaxSpeed;

			const mountainAspect = this.images.moutain.naturalWidth / this.images.moutain.naturalHeight;
			const mountainWidth = mountainHeight * mountainAspect;

			const leftBoundM = this.camera.x - this.logicalWidth;
			const rightBoundM = this.camera.x + this.logicalWidth + this.logicalWidth;

			if (this.mountainImageYOffset === null && this.icebergs && this.icebergs.length > 0) {
				const firstIceberg = this.icebergs[0];
				this.mountainImageYOffset = firstIceberg.y - mountainHeight + 100;
			}

			const startTile = Math.floor((leftBoundM - parallaxX) / mountainWidth);
			const endTile = Math.ceil((rightBoundM - parallaxX) / mountainWidth);

			for (let tile = startTile; tile <= endTile; tile++) {
				const x = parallaxX + tile * mountainWidth;
				const mountainY =
					this.mountainImageYOffset !== null ? this.mountainImageYOffset : this.waterLevel - mountainDistance;

				this.drawImagePreserveAspect(this.images.moutain, x, mountainY, mountainWidth, mountainHeight, "top");

				const fadeHeight = mountainHeight * 0.3; 
				const fadeStartY = mountainY + mountainHeight - fadeHeight;

				const fadeGradient = this.ctx.createLinearGradient(0, fadeStartY, 0, mountainY + mountainHeight);
				fadeGradient.addColorStop(0, "rgba(15, 31, 74, 0)"); 
				fadeGradient.addColorStop(0.5, "rgba(15, 31, 74, 0.3)"); 
				fadeGradient.addColorStop(1, "rgba(15, 31, 74, 0.7)"); 

				this.ctx.fillStyle = fadeGradient;
				this.ctx.fillRect(x, fadeStartY, mountainWidth, fadeHeight);
			}
		}

		// Draw snowflakes
		for (let snowflake of this.snowflakes) {
			if (
				snowflake.x > this.camera.x - 50 &&
				snowflake.x < this.camera.x + this.logicalWidth + 50 &&
				snowflake.y > this.camera.y - 50 &&
				snowflake.y < this.camera.y + this.logicalHeight + 50
			) {
				const img = this.images["snow1"]; 
				if (img) {
					const size = 60;
					const offset = size / 2;
					this.ctx.drawImage(img, snowflake.x - offset, snowflake.y - offset, size, size);
				}
			}
		}

		// Full screen overlay
		const fullScreenGradient = this.ctx.createLinearGradient(
			0,
			this.camera.y, 
			0,
			this.camera.y + this.logicalHeight 
		);
		fullScreenGradient.addColorStop(0, "rgba(200, 220, 240, 0.08)"); 
		fullScreenGradient.addColorStop(0.3, "rgba(150, 180, 210, 0.15)"); 
		fullScreenGradient.addColorStop(0.7, "rgba(100, 130, 160, 0.25)"); 
		fullScreenGradient.addColorStop(1, "rgba(60, 80, 110, 0.35)"); 

		this.ctx.fillStyle = fullScreenGradient;

		const gradientRenderBuffer = this.logicalWidth * 2;
		this.ctx.fillRect(
			this.camera.x - gradientRenderBuffer,
			this.camera.y,
			this.logicalWidth + gradientRenderBuffer * 2,
			this.logicalHeight
		);

		// Draw regular icebergs
		for (let iceberg of this.icebergs) {
			if (iceberg.isFinalIceberg) continue;

			if (this.imagesReady && this.images[`iceberg${iceberg.imageType}`]) {
				this.ctx.drawImage(
					this.images[`iceberg${iceberg.imageType}`],
					iceberg.x,
					iceberg.y,
					iceberg.width,
					iceberg.height
				);
			} else {
				this.ctx.fillStyle = "#E6F3FF";
				this.ctx.fillRect(iceberg.x, iceberg.y, iceberg.width, iceberg.height);
			}
		}

		// Draw items
		for (let fish of this.fish) {
			this.drawFish(fish);
		}

		for (let bear of this.bears) {
			this.drawBear(bear);
		}

		for (let bottle of this.bottles) {
			this.drawBottle(bottle);
		}

		// Draw particles
		for (let particle of this.particles) {
			if (this.imagesReady && this.images.bubble && particle.color.includes("180")) {
				this.ctx.globalAlpha = 0.7;
				this.drawImagePreserveAspect(this.images.bubble, particle.x - 6, particle.y - 6, 12, 12, "center");
				this.ctx.globalAlpha = 1;
			} else {
				this.ctx.fillStyle = particle.color;
				this.ctx.fillRect(particle.x - 3, particle.y - 3, 6, 6);
			}
		}

		// Draw penguin
		this.drawPenguin();

		// Draw foreground water
		if (this.images.water) {
			this.ctx.globalAlpha = 0.4;
			const waterImage = this.images.water;
			const waterWidth = waterImage.naturalWidth;
			const waterHeight = waterImage.naturalHeight;
			const leftBoundW = this.camera.x - this.logicalWidth - this.logicalWidth;
			const rightBoundW = this.camera.x + this.logicalWidth + this.logicalWidth;
			const startTileX = Math.floor(leftBoundW / waterWidth);
			const endTileX = Math.ceil(rightBoundW / waterWidth);
			
			if (this.waterImageYOffset === null && this.icebergs && this.icebergs.length > 0) {
				const firstIceberg = this.icebergs[0];
				this.waterImageYOffset = firstIceberg.y + 50 - this.waterLevel;
			}
			let yOffset = this.waterImageYOffset !== null ? this.waterImageYOffset : 0;
			for (let tileX = startTileX; tileX <= endTileX; tileX++) {
				const x = tileX * waterWidth;
				for (
					let y = this.waterLevel + yOffset;
					y < this.camera.y + this.logicalHeight + this.logicalWidth;
					y += waterHeight
				) {
					this.ctx.drawImage(waterImage, x, y, waterWidth, waterHeight);
				}
			}
			this.ctx.globalAlpha = 1;
		} else {
			this.ctx.globalAlpha = 0.4;
			this.ctx.fillStyle = "#0F1F4A";
			const renderBufferW2 = this.logicalWidth * 2;
			this.ctx.fillRect(
				this.camera.x - this.logicalWidth - renderBufferW2,
				this.waterLevel,
				this.logicalWidth + renderBufferW2 * 2,
				this.logicalHeight + renderBufferW2
			);
			this.ctx.globalAlpha = 1;
		}

		// Draw waves
		if (this.images.waves) {
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

		// Draw final iceberg in foreground
		for (let iceberg of this.icebergs) {
			if (iceberg.isFinalIceberg && this.images["end-level"]) {
				this.ctx.drawImage(this.images["end-level"], iceberg.x, iceberg.y, iceberg.width, iceberg.height);
			}
		}

		// Debug hitboxes
		if (this.showHitboxes) {
			this.drawAllHitboxes();
		}

		// Restore scaling context
		this.ctx.restore();
	}

	drawPenguin() {
		const x = this.penguin.x;
		const y = this.penguin.y;
		const w = this.penguin.width;
		const h = this.penguin.height;

		if (this.imagesReady && this.images.penguin) {
			const visualOffset = 30; 
			this.drawImagePreserveAspect(this.images.penguin, x, y + visualOffset, w, h, "bottom");
		} else {
			const visualOffset = 8;
			this.ctx.fillStyle = "#2C2C2C";
			this.ctx.fillRect(x + w * 0.1, y + visualOffset + h * 0.2, w * 0.8, h * 0.7);
		}
	}

	drawFish(fish) {
		const x = fish.x;
		const y = fish.y;
		const w = fish.width;
		const h = fish.height;

		if (this.imagesReady && this.images[`fish${fish.imageType}`]) {
			this.drawImagePreserveAspect(this.images[`fish${fish.imageType}`], x, y, w, h, "center");
		} else {
			this.ctx.fillStyle = "#FF6B6B";
			this.ctx.beginPath();
			this.ctx.ellipse(x + w * 0.4, y + h * 0.5, w * 0.4, h * 0.4, 0, 0, Math.PI * 2);
			this.ctx.fill();
		}

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

		if (this.imagesReady && this.images.bear) {
			this.drawImagePreserveAspect(this.images.bear, x, y, w, h, "center");
		} else {
			this.ctx.fillStyle = "#8B4513";
			this.ctx.fillRect(x + w * 0.1, y + h * 0.3, w * 0.8, h * 0.6);
		}
	}

	drawBottle(bottle) {
		const x = bottle.x;
		const y = bottle.y;
		const w = bottle.width;
		const h = bottle.height;

		if (this.imagesReady && this.images.bottle) {
			this.ctx.save();
			this.ctx.shadowColor = "rgba(255, 0, 0, 0.8)";
			this.ctx.shadowBlur = 30; 
			this.ctx.shadowOffsetX = 0;
			this.ctx.shadowOffsetY = 0;
			this.drawImagePreserveAspect(this.images.bottle, x, y, w, h, "center");
			this.ctx.restore();
		} else {
			this.ctx.fillStyle = "#654321"; 
			this.ctx.fillRect(x + w * 0.3, y + h * 0.1, w * 0.4, h * 0.8);
		}
	}

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
		this.drawHitbox(this.penguin.x, this.penguin.y, this.penguin.width, this.penguin.height, "lime", "Penguin");

		for (let i = 0; i < this.icebergs.length; i++) {
			const iceberg = this.icebergs[i];
			const hitboxX = iceberg.colliderX !== undefined ? iceberg.colliderX : iceberg.x;
			const hitboxY = iceberg.colliderY !== undefined ? iceberg.colliderY : iceberg.y;
			const hitboxWidth = iceberg.colliderWidth !== undefined ? iceberg.colliderWidth : iceberg.width;
			const hitboxHeight = iceberg.colliderHeight !== undefined ? iceberg.colliderHeight : iceberg.height;

			this.drawHitbox(hitboxX, hitboxY, hitboxWidth, hitboxHeight, "cyan", `Iceberg ${i + 1}`);
		}

		for (let i = 0; i < this.fish.length; i++) {
			const fish = this.fish[i];
			this.drawHitbox(fish.x, fish.y, fish.width, fish.height, "yellow", `Fish ${i + 1}`);
		}

		for (let i = 0; i < this.bears.length; i++) {
			const bear = this.bears[i];
			this.drawHitbox(bear.x, bear.y, bear.width, bear.height, "red", `Bear ${i + 1}`);
		}

		this.ctx.save();
		this.ctx.strokeStyle = "blue";
		this.ctx.lineWidth = 3;
		this.ctx.beginPath();
		this.ctx.moveTo(this.camera.x - this.logicalWidth, this.waterLevel);
		this.ctx.lineTo(this.camera.x + this.logicalWidth * 2, this.waterLevel);
		this.ctx.stroke();
		this.ctx.restore();
	}

	gameLoop(currentTime = 0) {
		if (this.lastTime === 0) {
			this.lastTime = currentTime;
		}

		this.deltaTime = currentTime - this.lastTime;
		this.lastTime = currentTime;

		this.deltaTime = Math.min(this.deltaTime, this.fixedDeltaTime * 3);

		const deltaMultiplier = this.deltaTime / this.fixedDeltaTime;

		this.update(deltaMultiplier);
		this.render();
		requestAnimationFrame((time) => this.gameLoop(time));
	}

	async startBackgroundMusic() {
		if (!this.backgroundMusic) return;

		try {
			if (this.backgroundMusic.ended || this.backgroundMusic.currentTime >= this.backgroundMusic.duration) {
				this.backgroundMusic.currentTime = 0;
			}

			this.backgroundMusic.volume = 0.2; 

			if (this.musicFadeInterval) {
				clearInterval(this.musicFadeInterval);
				this.musicFadeInterval = null;
			}

			await this.backgroundMusic.play();
		} catch (error) {
			console.error("Failed to start background music:", error);
		}
	}

	stopBackgroundMusic() {
		if (this.backgroundMusic) {
			try {
				this.backgroundMusic.pause();
				this.backgroundMusic.currentTime = 0; 
			} catch (error) {
				console.warn("Error stopping background music:", error);
			}
		}
	}

	stopBackgroundMusicWithFade() {
		if (this.backgroundMusic && !this.backgroundMusic.paused) {
			const originalVolume = this.backgroundMusic.volume;

			const fadeDuration = 1000; 
			const fadeSteps = 20;
			const stepTime = fadeDuration / fadeSteps;
			const volumeStep = this.backgroundMusic.volume / fadeSteps;

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
						this.backgroundMusic.volume = originalVolume; 
					}
					clearInterval(this.fadeInterval);
					this.fadeInterval = null;
				}
			}, stepTime);
		}
	}

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

let game;

function restartGame() {
	if (game) {
		game.restart();
	}
}

// start.js - Animated intro for Penguin Glider
window.addEventListener("DOMContentLoaded", function () {
	// Create water-bubbles audio element
	var bubbleAudio = new Audio("music/water-bubbles.mp3");
	bubbleAudio.loop = true;
	bubbleAudio.preload = "auto";
	bubbleAudio.volume = 0.6; // High volume as requested
	
	// Add error handling and loading events for debugging
	bubbleAudio.addEventListener('canplay', function() {
		console.log("Water bubbles audio loaded successfully");
	});
	bubbleAudio.addEventListener('error', function(e) {
		console.error("Water bubbles audio failed to load:", e);
	});

	// Grab HTML elements
	var startScreen = document.getElementById("startScreen");
	var introBg = document.getElementById("introBg");
	var introLogo = document.getElementById("introLogo");
	var loadingContainer = document.getElementById("loadingContainer");
	var loadingText = document.getElementById("loadingText");
	var introContent = document.getElementById("introContent");
	var playBtn = document.getElementById("playBtn");

	var tempGame = null;
	var logoAnimationTriggered = false;
	var logoStartTime = Date.now();
	var minimumLogoDisplayTime = 4000; // 4 seconds minimum display time

	// Start image loading immediately when DOM is loaded
	function initImageLoading() {
		if (!tempGame) {
			tempGame = new PenguinGlider(false); // Create game instance with autoStart disabled (sets state to "intro")
		}

		// Update loading progress periodically
		function updateLoadingProgress() {
			if (tempGame && loadingText && !tempGame.imagesReady) {
				var progress = Math.round((tempGame.imagesLoaded / tempGame.totalImages) * 100);
				loadingText.textContent = `Loading... ${progress}%`;
			}
		}

		// Poll for when images are ready AND minimum time has passed
		function checkImagesReady() {
			var timeElapsed = Date.now() - logoStartTime;
			var minimumTimePassed = timeElapsed >= minimumLogoDisplayTime;

			updateLoadingProgress();

			if (tempGame && tempGame.imagesReady && minimumTimePassed && !logoAnimationTriggered) {
				logoAnimationTriggered = true;
				shrinkLogoToTopAndShowIntro();
			} else if (!logoAnimationTriggered) {
				setTimeout(checkImagesReady, 100); // Check every 100ms
			}
		}

		checkImagesReady();
	}

	// Initialize image loading
	if (introLogo.complete) {
		initImageLoading();
	} else {
		introLogo.onload = function () {
			initImageLoading();
		};
	}

	// Transition loader screen to intro screen
	function shrinkLogoToTopAndShowIntro() {
		// Play bubbles audio
		bubbleAudio.play().catch(e => console.log("Bubbles audio autoplay prevented:", e));

		// Fade out loading container
		if (loadingContainer) {
			loadingContainer.style.opacity = "0";
			setTimeout(() => {
				loadingContainer.style.display = "none";
			}, 500);
		}

		// Fade out white background to show blue gradient
		if (introBg) {
			introBg.style.opacity = "0";
			setTimeout(() => {
				introBg.style.display = "none";
			}, 800);
		}

		// Shrink and move logo
		if (introLogo) {
			introLogo.classList.add("loaded");
		}

		// Show intro text and play button
		setTimeout(() => {
			if (introContent) {
				introContent.classList.add("show");
			}
		}, 700);
	}

	// Play button click handler
	if (playBtn) {
		playBtn.addEventListener("click", function () {
			// Fade out bubbles audio over 1 second
			if (bubbleAudio && !bubbleAudio.paused) {
				var bubbleFadeOut = setInterval(() => {
					if (bubbleAudio.volume > 0.05) {
						bubbleAudio.volume = Math.max(0, bubbleAudio.volume - 0.05);
					} else {
						bubbleAudio.pause();
						bubbleAudio.volume = 1;
						clearInterval(bubbleFadeOut);
					}
				}, 50);
			}

			// Fade out the start screen completely
			if (startScreen) {
				startScreen.style.opacity = "0";
				setTimeout(() => {
					startScreen.style.display = "none";
				}, 600);
			}

			// Start the game loop and timer
			if (tempGame && tempGame.imagesReady) {
				window.game = tempGame;
				tempGame.fromRestart = false;
				tempGame.gameState = "playing"; // Transition game state to playing
				tempGame.timer.start(); // Start the timer
				tempGame.startBackgroundMusic(); // Start background music
				
				// Show the HUD
				if (typeof showGameHUD === "function") {
					showGameHUD(true);
				}
			} else {
				// Fallback
				if (typeof startGame === "function") {
					startGame();
				}
			}
		});
	}
});

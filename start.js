// start.js - Animated intro for Penguin Glider
window.addEventListener("DOMContentLoaded", function () {
	// Create white background overlay
	var bg = document.createElement("div");
	bg.id = "introBg";
	bg.style.position = "fixed";
	bg.style.left = "0";
	bg.style.top = "0";
	bg.style.width = "100vw";
	bg.style.height = "100vh";
	bg.style.background = "#fff";
	bg.style.zIndex = "1000";
	bg.style.transition = "background 0.5s";
	document.body.appendChild(bg);

	// Create logo with blue glow and elegant font
	var logo = document.createElement("img");
	logo.src = "img/penguin-glider.png";
	logo.alt = "Penguin Glider";
	logo.id = "introLogo";
	logo.style.position = "fixed";
	logo.style.left = "50%";
	logo.style.top = "50%";
	logo.style.transform = "translate(-50%,-50%)";
	logo.style.zIndex = "1001";
	logo.style.transition = "all 0.9s cubic-bezier(.4,2,.6,1)";
	logo.style.maxWidth = "60vw";
	logo.style.maxHeight = "60vh";
	logo.style.filter = "drop-shadow(0 0 32px #b3e0ff) drop-shadow(0 0 8px #4a90e2)";
	document.body.appendChild(logo);

	// Create a temporary game instance to load images and check when they're ready
	var tempGame = null;
	var logoAnimationTriggered = false;
	var logoStartTime = Date.now(); // Track when logo first appears
	var minimumLogoDisplayTime = 5000; // 5 seconds minimum display time

	// Start image loading immediately when DOM is loaded
	function initImageLoading() {
		// Only create game instance if not already created
		if (!tempGame) {
			tempGame = new PenguinGlider(false); // Create game instance with autoStart disabled
		}

		// Poll for when images are ready AND minimum time has passed
		function checkImagesReady() {
			var timeElapsed = Date.now() - logoStartTime;
			var minimumTimePassed = timeElapsed >= minimumLogoDisplayTime;

			if (tempGame && tempGame.imagesReady && minimumTimePassed && !logoAnimationTriggered) {
				logoAnimationTriggered = true;
				shrinkLogoToTopAndShowIntro();
			} else if (!logoAnimationTriggered) {
				setTimeout(checkImagesReady, 100); // Check every 100ms
			}
		}

		checkImagesReady();
	}

	// Initialize image loading when the logo loads or immediately if it's already loaded
	logo.onload = function () {
		initImageLoading();
	};

	// Also try to initialize immediately in case the logo loads very fast
	if (logo.complete) {
		initImageLoading();
	}

	// Optional: Add a text title overlay for more elegant font (if you want text on top of the image)
	/*
    var title = document.createElement('div');
    title.textContent = 'Penguin Glider';
    title.style.position = 'fixed';
    title.style.left = '50%';
    title.style.top = 'calc(50% + 90px)';
    title.style.transform = 'translate(-50%,0)';
    title.style.zIndex = '1002';
    title.style.fontFamily = 'Segoe UI, Arial, Helvetica Neue, sans-serif';
    title.style.fontWeight = '300';
    title.style.fontSize = '2.2em';
    title.style.letterSpacing = '0.04em';
    title.style.color = '#0a3a5c';
    title.style.textShadow = '0 0 18px #b3e0ff, 0 2px 0 #fff';
    document.body.appendChild(title);
    */

	// Only show logo at first

	// Function to shrink and move logo to top (never disappears)
	function shrinkLogoToTopAndShowIntro() {
		// Animate logo up and shrink, keep visible at top
		logo.style.maxWidth = "180px";
		logo.style.maxHeight = "120px";
		logo.style.top = "10%";
		logo.style.left = "50%";
		logo.style.transform = "translate(-50%, 0) scale(0.7)";
		logo.style.filter = "drop-shadow(0 0 48px #b3e0ff) drop-shadow(0 0 24px #4a90e2)";
		// Do NOT fade out the background here; keep it until Play is pressed
		// Show text and play button after logo animates
		setTimeout(() => {
			var text = document.createElement("div");
			text.id = "introText";
			text.style.position = "fixed";
			text.style.top = "calc(10% + 120px)";
			text.style.left = "50%";
			text.style.transform = "translateX(-50%)";
			text.style.opacity = "1";
			text.style.zIndex = "1001";
			// Default desktop width
			text.style.width = "50vw";
			text.style.maxWidth = "520px";
			// Responsive: make wider on tablet and mobile
			if (window.innerWidth <= 900) {
				text.style.width = "85vw";
				text.style.maxWidth = "96vw";
				text.style.fontSize = "1.12em";
			}
			if (window.innerWidth <= 600) {
				text.style.width = "98vw";
				text.style.maxWidth = "99vw";
				text.style.fontSize = "1em";
			}
			text.style.textAlign = "center";
			text.style.fontFamily = "Segoe UI, Arial, Helvetica Neue, sans-serif";
			text.style.fontWeight = "300";
			text.style.color = "#0a3a5c";
			text.style.background = "none";
			text.style.border = "none";
			text.style.borderRadius = "0";
			text.style.boxShadow = "none";
			text.style.padding = "0 10px";
			text.style.letterSpacing = "0.01em";
			text.style.textShadow = "0 4px 32px #b3e0ff, 0 2px 12px #4a90e2, 0 1px 0 #fff";
			text.textContent =
				"Brrr… it’s freezing in Antarctica! \n\n You’re a super-fast penguin mom racing across sliding icebergs to feed your hungry chick. \n\n Grab as many fish as you can, but watch out — an orca is waiting in the water, a polar bear is on the hunt, and plastic junk is everywhere. \n\n Don’t slip, don’t get caught, don’t stay too long in the icy water… and don’t be late!";
			text.style.whiteSpace = "pre-line"; // makes \n show as a line break
			document.body.appendChild(text);

			var playBtn = document.createElement("img");
			playBtn.src = "img/play.png";
			playBtn.alt = "Play";
			playBtn.id = "playBtn";
			playBtn.style.position = "fixed";
			playBtn.style.top = "calc(10% + 120px + " + (text.offsetHeight + 40) + "px)";
			playBtn.style.left = "50%";
			playBtn.style.transform = "translateX(-50%)";
			playBtn.style.cursor = "pointer";
			playBtn.style.zIndex = "1001";
			playBtn.style.width = "220px";
			playBtn.style.display = "block";
			playBtn.style.filter = "drop-shadow(0 4px 16px #b3e0ff)";
			playBtn.style.transition = "transform 0.3s ease";
			// Add hover effect
			playBtn.addEventListener("mouseover", () => {
				playBtn.style.transform = "translate(-50%, 0) scale(1.1)";
			});
			playBtn.addEventListener("mouseout", () => {
				playBtn.style.transform = "translateX(-50%)";
			});
			playBtn.addEventListener("click", function () {
				// Remove all intro elements (including white bg)
				bg.remove();
				logo.remove();
				text.remove();
				playBtn.remove();

				// Use the existing game instance and start it properly
				if (tempGame && tempGame.imagesReady) {
					// Set the global game variable for restart functionality
					window.game = tempGame;
					tempGame.fromRestart = false; // Ensure it's treated as a fresh start
					tempGame.timer.start(); // Start the timer
					tempGame.startBackgroundMusic(); // Start background music
					// Hide start screen and begin gameplay
					const startScreen = document.getElementById("startScreen");
					if (startScreen) {
						startScreen.style.display = "none";
					}
				} else {
					// Fallback: call the original startGame function
					if (typeof startGame === "function") {
						startGame();
					}
				}
			});
			document.body.appendChild(playBtn);
		}, 700);
	}

	// Remove the manual trigger events since we now auto-trigger when images load
	// The logo will automatically animate when images are ready
});

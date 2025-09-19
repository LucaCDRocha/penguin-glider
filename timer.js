class GameTimer {
	constructor(duration = 60) {
		// 2 minutes in seconds
		this.totalDuration = duration;
		this.remainingTime = duration;
		this.isRunning = false;
		this.timerElement = null;
		this.onTimeUp = null;
		this.createTimerElement();
	}

	createTimerElement() {
		this.timerElement = document.createElement("div");
		this.timerElement.id = "gameTimer";
		this.timerElement.style.position = "fixed";
		this.timerElement.style.top = "max(20px, env(safe-area-inset-top, 20px))";
		this.timerElement.style.left = "20px";
		this.timerElement.style.color = "#000000"; // Black color
		this.timerElement.style.fontFamily = "'Digital-7', 'LCD', monospace"; // Digital watch style
		this.timerElement.style.fontSize = "clamp(36px, 6vw, 48px)";
		this.timerElement.style.fontWeight = "400"; // Thinner font
		this.timerElement.style.letterSpacing = "2px"; // Spacing for digital look
		this.timerElement.style.zIndex = "1"; // Behind snow
		this.timerElement.style.padding = "clamp(4px, 1vw, 6px) clamp(8px, 2vw, 10px)";
		this.timerElement.style.borderRadius = "4px";

		this.timerElement.style.zIndex = "10";
		this.updateDisplay();
		document.body.appendChild(this.timerElement);
	}

	formatTime(seconds) {
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
	}

	updateDisplay() {
		if (this.timerElement) {
			const timeLeft = Math.ceil(this.remainingTime);
			this.timerElement.textContent = `${this.formatTime(timeLeft)}`;

			// Change color when 10 seconds or less
			if (timeLeft <= 10) {
				this.timerElement.style.color = "red";
			} else {
				this.timerElement.style.color = "#000000"; // default black
			}
		}
	}

	start() {
		if (!this.isRunning) {
			this.isRunning = true;
			this.lastUpdate = Date.now();
			this.update();
		}
	}

	stop() {
		this.isRunning = false;
	}

	reset() {
		this.remainingTime = this.totalDuration;
		this.updateDisplay();
		this.stop();
	}

	setTimeUpCallback(callback) {
		this.onTimeUp = callback;
	}

	update() {
		if (!this.isRunning) return;

		const now = Date.now();
		const delta = (now - this.lastUpdate) / 1000;
		this.lastUpdate = now;

		this.remainingTime = Math.max(0, this.remainingTime - delta);
		this.updateDisplay();

		if (this.remainingTime <= 0) {
			this.stop();
			if (this.onTimeUp) {
				this.onTimeUp();
			}
		} else {
			requestAnimationFrame(() => this.update());
		}
	}

	hide() {
		if (this.timerElement) {
			this.timerElement.style.display = "none";
		}
	}

	show() {
		if (this.timerElement) {
			this.timerElement.style.display = "block";
		}
	}
}

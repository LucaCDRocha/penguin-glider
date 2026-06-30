class GameTimer {
	constructor(duration = 60) {
		this.totalDuration = duration;
		this.remainingTime = duration;
		this.isRunning = false;
		this.timerElement = null;
		this.onTimeUp = null;
		this.createTimerElement();
	}

	createTimerElement() {
		// Grab existing element from HTML
		this.timerElement = document.getElementById("gameTimer");
		
		if (!this.timerElement) {
			// Fallback in case HTML structure is missing
			this.timerElement = document.createElement("div");
			this.timerElement.id = "gameTimer";
			document.body.appendChild(this.timerElement);
		}
		
		this.updateDisplay();
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
				this.timerElement.style.color = "#ff3b30"; // Red warning color
			} else {
				this.timerElement.style.color = ""; // Revert to CSS default (white)
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

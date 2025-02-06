// script.js

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('highScore');
const messageDisplay = document.getElementById('message');

let platform = {
    x: 0,  // Initialize to 0, will be set in initCanvasSize
    y: 0,
    radius: 0, // Initialize, will be set based on canvas size
    angleX: 0,
    angleY: 0
};

let sphere = {
    x: 0, // Initialize
    y: 0,
    radius: 20,
    speedX: 0,
    speedY: 0
};

let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let isPlaying = false;
let animationFrameId;
let lastTimestamp = 0;
let tiltSensitivity = 150; // Adjust this for game feel

// --- Utility Functions ---

function initCanvasSize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    // Recalculate positions and sizes based on the new canvas size
    platform.x = canvas.width / 2;
    platform.y = canvas.height / 2;
    platform.radius = Math.min(canvas.width, canvas.height) * 0.4; // Keep it within bounds
    sphere.x = platform.x; // Reset sphere position
    sphere.y = platform.y;
}

// --- Drawing Functions ---

function drawPlatform() {
    ctx.save();
    ctx.translate(platform.x, platform.y);
    ctx.rotate(platform.angleX);

    ctx.beginPath();
    ctx.arc(0, 0, platform.radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#ddd';
    ctx.fill();
    ctx.strokeStyle = '#999'; // Add a subtle border
    ctx.stroke();

    ctx.restore();
}

function drawSphere() {
    ctx.beginPath();
    ctx.arc(sphere.x, sphere.y, sphere.radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#007bff';
    ctx.fill();
}

// --- Game Logic Functions ---

function update(timestamp) {
    if (!isPlaying) return;

    const deltaTime = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;

    // Update sphere speed based on platform tilt
    sphere.speedX += platform.angleY * tiltSensitivity * deltaTime;
    sphere.speedY += -platform.angleX * tiltSensitivity * deltaTime; // Inverted for correct direction

    // Apply damping (friction)
    sphere.speedX *= 0.99;
    sphere.speedY *= 0.99;

    // Update sphere position
    sphere.x += sphere.speedX * 60 * deltaTime;  // Multiply by a factor for smoother movement
    sphere.y += sphere.speedY * 60 * deltaTime;

    // Collision detection
    const distance = Math.sqrt((sphere.x - platform.x) ** 2 + (sphere.y - platform.y) ** 2);
    if (distance + sphere.radius > platform.radius) {
        gameOver();
        return; // Stop the update loop
    }

    // Update and display score
    score += deltaTime;
    scoreDisplay.textContent = `Score: ${Math.floor(score)}`;

    // Render the frame
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlatform();
    drawSphere();

    animationFrameId = requestAnimationFrame(update);
}

function startGame() {
    isPlaying = true;
    score = 0;
    scoreDisplay.textContent = "Score: 0";
    sphere.x = platform.x;
    sphere.y = platform.y;
    sphere.speedX = 0;
    sphere.speedY = 0;
    startButton.style.display = 'none';
    messageDisplay.textContent = '';
    lastTimestamp = performance.now(); // Initialize for deltaTime calculation
    animationFrameId = requestAnimationFrame(update);
}

function gameOver() {
    isPlaying = false;
    cancelAnimationFrame(animationFrameId);
    startButton.style.display = 'block';
    messageDisplay.textContent = "Game Over!";

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
        highScoreDisplay.textContent = `High Score: ${Math.floor(highScore)}`;
    }
}

function handleOrientation(event) {
    if (!isPlaying) return;

    let tiltLR = event.gamma; // Left-to-right
    let tiltFB = event.beta;  // Front-to-back

    // Landscape mode adjustment
    if (window.innerWidth > window.innerHeight) {
        [tiltLR, tiltFB] = [tiltFB, tiltLR]; // Swap values
    }

    // Clamp tilt values
    tiltLR = Math.max(-45, Math.min(45, tiltLR));
    tiltFB = Math.max(-45, Math.min(45, tiltFB));

    // Convert to radians
    platform.angleX = tiltFB * Math.PI / 180;
    platform.angleY = tiltLR * Math.PI / 180;
}

// --- Event Listeners and Initialization ---

// Initialize canvas size and responsive resizing
initCanvasSize();
window.addEventListener('resize', initCanvasSize);

// Gyroscope permission handling and event listener setup
if (window.DeviceOrientationEvent) {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS 13+
        startButton.addEventListener('click', () => {
            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        window.addEventListener('deviceorientation', handleOrientation);
                        startGame();
                    } else {
                        messageDisplay.textContent = "Gyroscope permission denied.";
                    }
                })
                .catch(error => {
                    console.error("Error requesting gyroscope permission:", error);
                    messageDisplay.textContent = "Error requesting permission.";
                });
        });
    } else {
        // Older iOS, Android, or desktop (if supported)
        window.addEventListener('deviceorientation', handleOrientation);
         startButton.addEventListener('click', startGame);
    }
} else {
    messageDisplay.textContent = "Gyroscope not supported on this device.";
}

// Display initial high score
highScoreDisplay.textContent = `High Score: ${Math.floor(highScore)}`;

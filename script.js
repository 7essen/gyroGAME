// script.js

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const messageDisplay = document.getElementById('message');
const turnLeftButton = document.getElementById('turnLeft');
const turnRightButton = document.getElementById('turnRight');
const moveForwardButton = document.getElementById('moveForward');
const moveBackwardButton = document.getElementById('moveBackward');

// --- Game Constants ---

const FOV = Math.PI / 3; // Field of View (60 degrees)
const CELL_SIZE = 10;  // Size of each maze cell (for map generation)
const WALL_HEIGHT = 150; // Apparent height of the walls
const PLAYER_SPEED = 0.15; // How many cells the player moves per frame
const TURN_SPEED = 0.05; // How many radians the player turns per frame
const NUM_RAYS = 120;   // Number of rays for raycasting
const MAP_WIDTH = 20;    // Width of the maze (in cells)
const MAP_HEIGHT = 20;   // Height of the maze

// --- Game Variables ---

let player = {
    x: 2,  // Initial player position (in cells)
    y: 2,
    angle: 0,  // Initial player angle (in radians)
};

let map = [];  // The 2D array representing the maze
let isPlaying = false;

// --- Utility Functions ---

function initCanvasSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Redraw the scene if the size changes, but only if playing
    if (isPlaying) {
        render();
    }
}
function createButtonEvents(button, action) {
     // Use named functions for easier adding/removing
     function startAction() { action(true); }
     function stopAction()  { action(false); }

    button.addEventListener('touchstart', startAction, { passive: true });
    button.addEventListener('mousedown',  startAction);
    button.addEventListener('touchend',   stopAction,  { passive: true });
    button.addEventListener('mouseup',    stopAction);
    button.addEventListener('mouseleave', stopAction);
}
// --- Maze Generation (Recursive Backtracker) ---

function generateMaze() {
    // 1. Create a grid filled with walls.
    for (let y = 0; y < MAP_HEIGHT; y++) {
        map[y] = [];
        for (let x = 0; x < MAP_WIDTH; x++) {
            map[y][x] = 1; // 1 represents a wall, 0 represents a passage.
        }
    }

    // 2. Pick a random starting cell.
    let startX = Math.floor(Math.random() * MAP_WIDTH);
    let startY = Math.floor(Math.random() * MAP_HEIGHT);
    carvePassage(startX, startY);

      // Mark the exit (opposite side of the starting point)
      let exitX, exitY;

      if (startX < MAP_WIDTH / 2) {
          exitX = MAP_WIDTH - 2; // Place on the right
      } else {
          exitX = 1;          // Place on the left
      }

      if (startY < MAP_HEIGHT / 2) {
        exitY = MAP_HEIGHT - 2;
      }else{
        exitY = 1;
      }

    map[exitY][exitX] = 2; // 2 represents the exit.

    // Place the player at the starting cell
    player.x = startX + 0.5;
    player.y = startY + 0.5;
    player.angle = 0;
}

function carvePassage(x, y) {
    map[y][x] = 0; // Mark the current cell as a passage.

    const directions = [
        { dx: 0, dy: -1 }, // North
        { dx: 1, dy: 0 },  // East
        { dx: 0, dy: 1 },  // South
        { dx: -1, dy: 0 }  // West
    ];

    // Shuffle the directions randomly
    directions.sort(() => Math.random() - 0.5);

    for (const dir of directions) {
        const newX = x + dir.dx * 2; // Move 2 cells to ensure walls between passages
        const newY = y + dir.dy * 2;

        // Check if the new cell is within bounds and unvisited.
        if (newX >= 0 && newX < MAP_WIDTH && newY >= 0 && newY < MAP_HEIGHT && map[newY][newX] === 1) {
            // Carve a passage to the new cell.
            map[y + dir.dy][x + dir.dx] = 0;
            carvePassage(newX, newY);
        }
    }
}


// --- Raycasting and Rendering ---

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the ceiling and floor (simple gradient or solid color)
    ctx.fillStyle = '#777'; // Ceiling
    ctx.fillRect(0, 0, canvas.width, canvas.height / 2);
    ctx.fillStyle = '#555'; // Floor
    ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);

    // Raycasting
    for (let i = 0; i < NUM_RAYS; i++) {
        const rayAngle = player.angle - FOV / 2 + (i / NUM_RAYS) * FOV;
        const ray = castRay(player.x, player.y, rayAngle);

        if (ray) {
            drawWallSlice(i, ray);
             // Check if the ray hit the exit
            if (ray.exit) {
                 drawExitSlice(i, ray);
            }
        }
    }
}

function castRay(x, y, angle) {
    let dx = Math.cos(angle);
    let dy = Math.sin(angle);
    let rayX = x;
    let rayY = y;
    let distance = 0;
    let hitWall = false;
    let hitExit = false;

    while (!hitWall && distance < 20) { // Limit ray distance to avoid infinite loops
        rayX += dx * 0.1;
        rayY += dy * 0.1;
        distance += 0.1;

        const mapX = Math.floor(rayX);
        const mapY = Math.floor(rayY);

        if (mapX < 0 || mapX >= MAP_WIDTH || mapY < 0 || mapY >= MAP_HEIGHT) {
            hitWall = true; // Treat out-of-bounds as a wall
        } else if (map[mapY][mapX] === 1) {
            hitWall = true;
        } else if (map[mapY][mapX] === 2) {
            hitWall = true; // Treat the exit as a wall for raycasting purposes
            hitExit = true;
        }
    }

     // Correct fish-eye distortion
     const correctedDistance = distance * Math.cos(angle - player.angle);
     return { distance: correctedDistance, hitWall, hitExit };
}

function drawWallSlice(rayIndex, ray) {
    const sliceWidth = canvas.width / NUM_RAYS;
    const sliceHeight = WALL_HEIGHT / (ray.distance + 0.0001); // Avoid division by zero

    const x = rayIndex * sliceWidth;
    const y = canvas.height / 2 - sliceHeight / 2;

    // Simple shading based on distance
    const shade = Math.min(1, ray.distance / 10);
    const wallColor = `hsl(0, 0%, ${50 - shade * 30}%)`; // Grayscale, darker with distance

    ctx.fillStyle = wallColor;
    ctx.fillRect(x, y, sliceWidth, sliceHeight);
}
function drawExitSlice(rayIndex, ray) {
    const sliceWidth = canvas.width / NUM_RAYS;
    const sliceHeight = WALL_HEIGHT / (ray.distance + 0.0001);

    const x = rayIndex * sliceWidth;
    const y = canvas.height / 2 - sliceHeight / 2;

    ctx.fillStyle = 'green'; // Distinct color for the exit
    ctx.fillRect(x, y, sliceWidth, sliceHeight);
}

// --- Input Handling ---

let movement = { forward: false, backward: false, turnLeft: false, turnRight: false };

function update() {
    if (!isPlaying) return;

    // Turning
    if (movement.turnLeft) player.angle -= TURN_SPEED;
    if (movement.turnRight) player.angle += TURN_SPEED;

    // Keep the angle within 0 to 2*PI
    player.angle = (player.angle + 2 * Math.PI) % (2 * Math.PI);

    // Movement
    let moveStep = movement.forward ? PLAYER_SPEED : (movement.backward ? -PLAYER_SPEED : 0);
    let newX = player.x + Math.cos(player.angle) * moveStep;
    let newY = player.y + Math.sin(player.angle) * moveStep;

    // Collision detection (simple)
    if (isWalkable(newX, newY)) {
        player.x = newX;
        player.y = newY;
    }
      // Check for win condition (reaching the exit)
      if (map[Math.floor(player.y)][Math.floor(player.x)] === 2) {
           winGame();
           return; // Stop updating
      }

    render();
    requestAnimationFrame(update);
}

function isWalkable(x, y) {
    const mapX = Math.floor(x);
    const mapY = Math.floor(y);
    if (mapX < 0 || mapX >= MAP_WIDTH || mapY < 0 || mapY >= MAP_HEIGHT) {
        return false; // Out of bounds
    }
    return map[mapY][mapX] === 0 || map[mapY][mapX] === 2; // 0 is walkable, 2 is exit
}

// --- Gyroscope Handling ---
let previousTiltLR = 0;
function handleOrientation(event) {
    if (!isPlaying) return;

    let tiltLR = event.gamma || 0; // Left-to-right

     // Landscape mode adjustment
     if (window.innerWidth > window.innerHeight) {
        tiltLR = event.beta || 0;
    }

    // Smoothing (optional, but makes movement less jittery)
    const smoothing = 0.3;
    tiltLR = tiltLR * smoothing + previousTiltLR * (1 - smoothing);
    previousTiltLR = tiltLR;

    // Update player angle based on tilt (with clamping)
     const tiltAngle = tiltLR * Math.PI / 180; // Convert to radians
     player.angle += tiltAngle * 0.3;  // Adjust sensitivity by multiplying
     player.angle = (player.angle + 2 * Math.PI) % (2 * Math.PI); // Keep it within 0-2PI
     render(); // Re-render immediately after changing angle
}

// --- Game Start/End ---

function startGame() {
   if(isPlaying) return; // Prevent staring multiple times
    isPlaying = true;
    messageDisplay.textContent = '';
    generateMaze();
    render();
    requestAnimationFrame(update);
}
function winGame() {
    isPlaying = false;
    messageDisplay.textContent = "You Win! Click to restart.";
    messageDisplay.addEventListener('click', restartGame);
}
function restartGame(){
     messageDisplay.removeEventListener('click', restartGame); // Prevent multiple listener
     startGame();
}
// --- Event Listeners ---

initCanvasSize();
window.addEventListener('resize', initCanvasSize);


createButtonEvents(turnLeftButton,    (pressed) => {movement.turnLeft = pressed});
createButtonEvents(turnRightButton,   (pressed) => {movement.turnRight = pressed});
createButtonEvents(moveForwardButton, (pressed) => {movement.forward = pressed});
createButtonEvents(moveBackwardButton,(pressed) => {movement.backward = pressed});


// Gyroscope permission handling and initial game start
if (window.DeviceOrientationEvent) {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS 13+
        messageDisplay.textContent = "Tap to start and grant gyroscope access";
         messageDisplay.addEventListener('click', () => {
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
                    console.error("Error requesting permission:", error);
                    messageDisplay.textContent = "Error requesting gyroscope permission.";
                });
        });
    } else {
        // Older iOS, Android, or desktop
        window.addEventListener('deviceorientation', handleOrientation);
         messageDisplay.textContent = "Tap to start";
         messageDisplay.addEventListener('click', startGame);

    }
} else {
    messageDisplay.textContent = "Gyroscope not supported.";
}

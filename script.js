// script.js (Complete Stage 2 - Combined and Refactored)

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const fireButton = document.getElementById('fireButton');
const healthDisplay = document.getElementById('health');
const ammoDisplay = document.getElementById('ammo');
const messageDisplay = document.getElementById('message');
const scoreDisplay = document.getElementById('score');
const weaponSwitchButton = document.getElementById('weaponSwitch');

// Movement buttons
const moveUpButton = document.getElementById('moveUp');
const moveDownButton = document.getElementById('moveDown');
const moveLeftButton = document.getElementById('moveLeft');
const moveRightButton = document.getElementById('moveRight');

// Matter.js setup
const engine = Matter.Engine.create();
const world = engine.world;

// --- Game Variables ---

let player = {
    body: null,
    size: 30,
    health: 100,
    ammo: 30,
    angle: 0,
    speed: 5,
    currentWeapon: 'pistol', // 'pistol' or 'shotgun'
    shotgunAmmo: 10,
};

let bullets = [];
let enemies = [];
const maxEnemies = 5;
let isPlaying = false;
let score = 0;

// Input handling
let moveInput = {
    up: false,
    down: false,
    left: false,
    right: false
};

// --- Utility Functions ---

function initCanvasSize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    resetGame(); // Reset positions on resize
}

// Helper function for creating walls
function createWall(x, y, width, height) {
    const wall = Matter.Bodies.rectangle(x, y, width, height, {
        isStatic: true,
        label: 'wall',
        render: { fillStyle: '#8B4513' }  // Brown color for walls
    });
    Matter.World.add(world, wall);
    return wall;
}

// Creates walls around the edges of the canvas
function createArenaBounds() {
    const wallThickness = 20;
    createWall(canvas.width / 2, -wallThickness / 2, canvas.width, wallThickness); // Top
    createWall(canvas.width / 2, canvas.height + wallThickness / 2, canvas.width, wallThickness); // Bottom
    createWall(-wallThickness / 2, canvas.height / 2, wallThickness, canvas.height); // Left
    createWall(canvas.width + wallThickness / 2, canvas.height / 2, wallThickness, canvas.height); // Right
}

// --- Object Creation Functions ---

function createPlayer() {
    player.body = Matter.Bodies.rectangle(canvas.width / 2, canvas.height / 2, player.size, player.size, {
        frictionAir: 0.1,
        friction: 0.5,
        restitution: 0.2,
        label: 'player'
    });
    Matter.World.add(world, player.body);
}

function createEnemy() {
    if (enemies.length < maxEnemies) {
        const size = 25;
        let x, y;
        // Keep generating random positions until the enemy is far enough from the player
        do {
            x = Math.random() * canvas.width;
            y = Math.random() * canvas.height;
        } while (Matter.Vector.magnitude({ x: x - player.body.position.x, y: y - player.body.position.y }) < 200);

        const enemy = {
            body: Matter.Bodies.rectangle(x, y, size, size, {
                frictionAir: 0.1,
                friction: 0.5,
                restitution: 0.2,
                label: 'enemy',
                render: { fillStyle: 'red' }
            }),
            size: size,
            health: 30,
            speed: 2
        };
        Matter.World.add(world, enemy.body);
        enemies.push(enemy);
    }
}

// --- Drawing Functions ---

function drawPlayer() {
    ctx.save();
    ctx.translate(player.body.position.x, player.body.position.y);
    ctx.rotate(player.angle);
    ctx.fillStyle = 'blue';
    ctx.fillRect(-player.size / 2, -player.size / 2, player.size, player.size);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(player.size, 0);  // Facing direction
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
}

function drawBullets() {
    bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.position.x, bullet.position.y, bullet.radius, 0, 2 * Math.PI);
        ctx.fillStyle = bullet.render.fillStyle; // Use bullet's fillStyle
        ctx.fill();
    });
}

function drawEnemies() {
    enemies.forEach(enemy => {
        ctx.save();
        ctx.translate(enemy.body.position.x, enemy.body.position.y);
        // Rotate the enemy to face the player
        const angleToPlayer = Matter.Vector.angle(enemy.body.position, player.body.position);
        ctx.rotate(angleToPlayer);
        ctx.fillStyle = enemy.body.render.fillStyle; // Use enemy's fillStyle
        ctx.fillRect(-enemy.size / 2, -enemy.size / 2, enemy.size, enemy.size);

        // Draw enemy health bar
        const healthBarWidth = enemy.size;
        const healthBarHeight = 5;
        const healthPercentage = enemy.health / 30;
        ctx.fillStyle = 'gray';
        ctx.fillRect(-healthBarWidth / 2, -enemy.size / 2 - 15, healthBarWidth, healthBarHeight);
        ctx.fillStyle = 'green';
        ctx.fillRect(-healthBarWidth / 2, -enemy.size / 2 - 15, healthBarWidth * healthPercentage, healthBarHeight);

        ctx.restore();
    });
}

// --- Game Logic Functions ---

function update() {
    if (!isPlaying) return;

    Matter.Engine.update(engine, 1000 / 60);

    handleMovementInput();
    applyBoundaries(player.body, player.size);

    // Update UI
    healthDisplay.textContent = `Health: ${player.health}`;
    ammoDisplay.textContent = `Ammo: ${player.currentWeapon === 'pistol' ? player.ammo : player.shotgunAmmo}`;
    scoreDisplay.textContent = `Score: ${score}`;

    // Update and remove off-screen bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        if (bullet.position.x < 0 || bullet.position.x > canvas.width ||
            bullet.position.y < 0 || bullet.position.y > canvas.height) {
            Matter.World.remove(world, bullet);
            bullets.splice(i, 1);
        }
    }

    // Update enemies and AI
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const direction = Matter.Vector.sub(player.body.position, enemy.body.position);
        const normalizedDirection = Matter.Vector.normalise(direction);
        const enemyVelocity = Matter.Vector.mult(normalizedDirection, enemy.speed);
        Matter.Body.setVelocity(enemy.body, enemyVelocity);
        applyBoundaries(enemy.body, enemy.size);

        if (enemy.health <= 0) {
            Matter.World.remove(world, enemy.body);
            enemies.splice(i, 1);
            score += 10;
            createEnemy(); // Respawn enemies
        }
    }

    // Render the scene
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlayer();
    drawBullets();
    drawEnemies();

    requestAnimationFrame(update);
}

function handleMovementInput() {
    let moveX = 0;
    let moveY = 0;

    if (moveInput.up) moveY -= player.speed;
    if (moveInput.down) moveY += player.speed;
    if (moveInput.left) moveX -= player.speed;
    if (moveInput.right) moveX += player.speed;

    Matter.Body.setVelocity(player.body, { x: moveX, y: moveY });
}

function applyBoundaries(body, size) {
    const halfSize = size / 2;
    if (body.position.x < halfSize) {
        Matter.Body.setPosition(body, { x: halfSize, y: body.position.y });
        Matter.Body.setVelocity(body, { x: 0, y: body.velocity.y });
    }
    if (body.position.x > canvas.width - halfSize) {
        Matter.Body.setPosition(body, { x: canvas.width - halfSize, y: body.position.y });
        Matter.Body.setVelocity(body, { x: 0, y: body.velocity.y });
    }
    if (body.position.y < halfSize) {
        Matter.Body.setPosition(body, { x: body.position.x, y: halfSize });
        Matter.Body.setVelocity(body, { x: body.velocity.x, y: 0 });
    }
    if (body.position.y > canvas.height - halfSize) {
        Matter.Body.setPosition(body, { x: body.position.x, y: canvas.height - halfSize });
        Matter.Body.setVelocity(body, { x: body.velocity.x, y: 0 });
    }
}
// --- Weapon and Bullet Functions ---

function fireBullet() {
    if (player.currentWeapon === 'pistol' && player.ammo > 0) {
        player.ammo--;
        createSingleBullet(5, 15);
    } else if (player.currentWeapon === 'shotgun' && player.shotgunAmmo > 0) {
        player.shotgunAmmo--;
        createShotgunBlast();
    }
}

function createSingleBullet(size, speed) {
    const bulletX = player.body.position.x + (player.size / 2) * Math.cos(player.angle);
    const bulletY = player.body.position.y + (player.size / 2) * Math.sin(player.angle);
    const bullet = Matter.Bodies.circle(bulletX, bulletY, size, {
        frictionAir: 0.001,
        restitution: 0.8,
        label: 'bullet',
        render: { fillStyle: 'yellow' }
    });
    bullet.radius = size; // Store the radius for drawing
    const velocity = { x: speed * Math.cos(player.angle), y: speed * Math.sin(player.angle) };
    Matter.Body.setVelocity(bullet, velocity);
    Matter.World.add(world, bullet);
    bullets.push(bullet);
}

function createShotgunBlast() {
    const numPellets = 8;
    const spread = 0.3;
    const pelletSpeed = 12;
    const pelletSize = 3;

    for (let i = 0; i < numPellets; i++) {
        const angleOffset = (Math.random() - 0.5) * spread;
        const pelletAngle = player.angle + angleOffset;
        const pelletX = player.body.position.x + (player.size / 2) * Math.cos(pelletAngle);
        const pelletY = player.body.position.y + (player.size / 2) * Math.sin(pelletAngle);

        const pellet = Matter.Bodies.circle(pelletX, pelletY, pelletSize, {
            frictionAir: 0.01,
            restitution: 0.5,
            label: 'bullet',
            render: { fillStyle: 'orange' }
        });
        pellet.radius = pelletSize;
        const velocity = { x: pelletSpeed * Math.cos(pelletAngle), y: pelletSpeed * Math.sin(pelletAngle) };
        Matter.Body.setVelocity(pellet, velocity);
        Matter.World.add(world, pellet);
        bullets.push(pellet);
    }
}
function switchWeapon() {
    player.currentWeapon = player.currentWeapon === 'pistol' ? 'shotgun' : 'pistol';
    console.log("Current weapon:", player.currentWeapon);
}

// --- Collision Handling ---

function setupCollisionHandling() {
    Matter.Events.on(engine, 'collisionStart', (event) => {
        const pairs = event.pairs;
        for (const pair of pairs) { // More concise loop
            const { bodyA, bodyB } = pair;

            if (bodyA.label === 'bullet' && bodyB.label === 'enemy') {
                handleBulletHitEnemy(bodyA, bodyB);
            } else if (bodyB.label === 'bullet' && bodyA.label === 'enemy') {
                handleBulletHitEnemy(bodyB, bodyA);
            } else if ((bodyA.label === 'enemy' && bodyB.label === 'player') || (bodyB.label === 'enemy' && bodyA.label === 'player')) {
                 handlePlayerEnemyCollision(bodyA, bodyB);
            }
        }
    });
}
function handlePlayerEnemyCollision(bodyA, bodyB) {
    // Determine which body is the player and which is the enemy
    const playerBody = bodyA.label === 'player' ? bodyA : bodyB;
    const enemyBody = bodyA.label === 'enemy' ? bodyA : bodyB;
    // Reduce player's health
    player.health -= 5;

    // Check for game over
    if (player.health <= 0) {
        gameOver();
    }
}
function handleBulletHitEnemy(bullet, enemyBody) {
    Matter.World.remove(world, bullet);
    const bulletIndex = bullets.indexOf(bullet);
    if (bulletIndex > -1) {
        bullets.splice(bulletIndex, 1);
    }

    const enemy = enemies.find(e => e.body === enemyBody);
    if (enemy) {
        enemy.health -= (player.currentWeapon === 'pistol' ? 10 : 5);
    }
}

// --- Game State Functions ---
function resetGame() {
    // Reset player
    player.health = 100;
    player.ammo = 30;
    player.shotgunAmmo = 10;
    player.currentWeapon = 'pistol';
    if (player.body) {
        Matter.Body.setPosition(player.body, { x: canvas.width / 2, y: canvas.height / 2 });
        Matter.Body.setVelocity(player.body, {x: 0, y: 0});
    }

    // Clear bullets
    bullets.forEach(b => Matter.World.remove(world, b));
    bullets = [];

    // Clear and recreate enemies
    enemies.forEach(e => Matter.World.remove(world, e.body));
    enemies = [];
    for (let i = 0; i < maxEnemies; i++) {
        createEnemy();
    }
     score = 0;
}

function startGame() {
    if(isPlaying) return; // Prevent starting multiple games
    isPlaying = true;
    score = 0;
    messageDisplay.textContent = '';
    createPlayer(); // Create or reset the player
    createArenaBounds(); //Create the arena
    requestAnimationFrame(update); // Start/resume the game loop
}

function gameOver() {
    isPlaying = false;
    messageDisplay.textContent = 'Game Over!';

    // Clean up Matter.js bodies
    if (player.body) {
        Matter.World.remove(world, player.body);
    }
    bullets.forEach(b => Matter.World.remove(world, b));
    enemies.forEach(e => Matter.World.remove(world, e.body));

    // Clear arrays
    bullets = [];
    enemies = [];
}

// --- Input Handling ---

let previousTiltLR = null;
let previousTiltFB = null;

function handleOrientation(event) {
    if (!isPlaying) return;

    let tiltLR = event.gamma || 0;
    let tiltFB = event.beta || 0;

    // Landscape mode adjustment
    if (window.innerWidth > window.innerHeight) {
        [tiltLR, tiltFB] = [tiltFB, tiltLR];
    }

    // Smoothing
    const smoothing = 0.2;
    tiltLR = tiltLR * smoothing + (1 - smoothing) * (previousTiltLR || tiltLR);
    tiltFB = tiltFB * smoothing + (1 - smoothing) * (previousTiltFB || tiltFB);
    previousTiltLR = tiltLR;
    previousTiltFB = tiltFB;

    // Calculate player angle
    player.angle = Math.atan2(tiltFB, tiltLR) - Math.PI / 2;
}

// --- Event Listeners ---

initCanvasSize();
window.addEventListener('resize', initCanvasSize);
fireButton.addEventListener('click', fireBullet);
weaponSwitchButton.addEventListener('click', switchWeapon);

// Movement buttons (touchstart/touchend for mobile, mousedown/mouseup for desktop)
function handleButtonDown(button, direction) {
    button.addEventListener('touchstart', () => { moveInput[direction] = true; }, { passive: true });
    button.addEventListener('mousedown', () => { moveInput[direction] = true; });
}

function handleButtonUp(button, direction) {
    button.addEventListener('touchend', () => { moveInput[direction] = false; }, { passive: true });
    button.addEventListener('mouseup', () => { moveInput[direction] = false; });
    button.addEventListener('mouseleave', () => { moveInput[direction] = false; });
}

handleButtonDown(moveUpButton, 'up');
handleButtonUp(moveUpButton, 'up');
handleButtonDown(moveDownButton, 'down');
handleButtonUp(moveDownButton, 'down');
handleButtonDown(moveLeftButton, 'left');
handleButtonUp(moveLeftButton, 'left');
handleButtonDown(moveRightButton, 'right');
handleButtonUp(moveRightButton, 'right');

setupCollisionHandling();

// --- Gyroscope Permission Handling and Game Start ---

if (window.DeviceOrientationEvent) {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS 13+
        fireButton.addEventListener('click', () => {
            DeviceOrientationEvent.requestPermission()
                .then(permissionState => {
                    if (permissionState === 'granted') {
                        window.addEventListener('deviceorientation', handleOrientation);
                        if (!isPlaying) { // Ensure startGame is only called once
                            startGame();
                        }
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
        startGame(); // Start the game directly for non-iOS 13+
    }
} else {
    messageDisplay.textContent = "Gyroscope not supported.";
}

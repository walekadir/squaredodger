const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const bestScoreElement = document.getElementById('best-score');
const coinsElement = document.getElementById('coins');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMessage = document.getElementById('overlay-message');
const menuFeatures = document.getElementById('menu-features');
const actionButton = document.getElementById('action-button');
const muteButton = document.getElementById('mute-button');
const statusText = document.getElementById('status-text');
const difficultyText = document.getElementById('difficulty-text');
const missionTitle = document.getElementById('mission-title');
const missionCopy = document.getElementById('mission-copy');
const skinsGrid = document.getElementById('skins-grid');
const controlButtons = document.querySelectorAll('[data-control]');
const collapsibleCards = document.querySelectorAll('[data-collapsible-card]');
const panelToggleButtons = document.querySelectorAll('[data-toggle-panel]');

const STORAGE_KEY = 'square-dodger-save-v2';
const keys = {};
const touchState = { left: false, right: false };
const playerStart = { x: 185, y: 450 };
const particles = [];

const skins = [
    { id: 'classic', name: 'Classic Blue', color: '#6CABDD', accent: '#dff5ff', price: 0, description: 'Starter look' },
    { id: 'ember', name: 'Ember Rush', color: '#ff7a59', accent: '#ffe2d7', price: 25, description: 'Warmer trail glow' },
    { id: 'mint', name: 'Mint Pulse', color: '#6ee7b7', accent: '#d8fff0', price: 60, description: 'Crisp high-score energy' },
    { id: 'royal', name: 'Royal Neon', color: '#9d7dff', accent: '#efe7ff', price: 120, description: 'Premium late-game flex' }
];

const missions = [
    { title: 'Warm-up Run', description: 'Score 12 in a single run to prove the loop has staying power.', target: 12 },
    { title: 'Momentum Builder', description: 'Hit 25 in one run so the difficulty curve starts to sing.', target: 25 },
    { title: 'Store Opener', description: 'Bank 90 credits total so players can meaningfully unlock cosmetics.', target: 90 },
    { title: 'Legend Check', description: 'Reach a best score of 40 and the arcade pitch becomes a real challenge.', target: 40 }
];

const defaultSave = {
    bestScore: 0,
    coins: 0,
    soundEnabled: true,
    selectedSkin: 'classic',
    unlockedSkins: ['classic']
};

const save = loadSave();

const game = {
    score: 0,
    bestScore: save.bestScore,
    coins: save.coins,
    state: 'menu',
    elapsed: 0,
    spawnTimer: 0,
    spawnInterval: 0.95,
    enemySpeedBonus: 0,
    lastTime: 0,
    runCoins: 0,
    combo: 0,
    flashAlpha: 0
};

const player = {
    x: playerStart.x,
    y: playerStart.y,
    size: 30,
    speed: 290,
    dy: 0,
    jumpPower: -560,
    grounded: true,
    squash: 1,
    stretch: 1
};

const physics = {
    gravity: 1480,
    floor: canvas.height
};

const audio = {
    context: null,
    master: null
};

let enemies = [];

initializeUi();

window.addEventListener('keydown', (event) => {
    keys[event.code] = true;

    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'].includes(event.code)) {
        event.preventDefault();
    }

    if (event.code === 'KeyP' && game.state === 'running') {
        pauseGame();
    } else if (event.code === 'Enter' && game.state !== 'running') {
        startGame();
    }
});

window.addEventListener('keyup', (event) => {
    keys[event.code] = false;
});

actionButton.addEventListener('click', () => {
    unlockAudio();

    if (game.state === 'paused') {
        resumeGame();
        return;
    }

    startGame();
});

muteButton.addEventListener('click', () => {
    save.soundEnabled = !save.soundEnabled;
    persistSave();
    updateSoundButton();
});

controlButtons.forEach((button) => {
    const control = button.dataset.control;
    const activate = (event) => {
        event.preventDefault();
        unlockAudio();
        handleControlPress(control);
    };
    const deactivate = (event) => {
        event.preventDefault();
        handleControlRelease(control);
    };

    button.addEventListener('pointerdown', activate);
    button.addEventListener('pointerup', deactivate);
    button.addEventListener('pointercancel', deactivate);
    button.addEventListener('pointerleave', deactivate);
});

panelToggleButtons.forEach((button) => {
    button.addEventListener('click', () => {
        const card = button.closest('[data-collapsible-card]');
        if (!card) return;

        const collapsed = card.classList.toggle('is-collapsed');
        button.textContent = collapsed ? 'Show' : 'Hide';
    });
});

function loadSave() {
    try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!raw) return { ...defaultSave };

        return {
            bestScore: Number(raw.bestScore) || 0,
            coins: Number(raw.coins) || 0,
            soundEnabled: raw.soundEnabled !== false,
            selectedSkin: skins.some((skin) => skin.id === raw.selectedSkin) ? raw.selectedSkin : 'classic',
            unlockedSkins: Array.isArray(raw.unlockedSkins) && raw.unlockedSkins.length ? raw.unlockedSkins : ['classic']
        };
    } catch (error) {
        return { ...defaultSave };
    }
}

function persistSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
}

function initializeUi() {
    scoreElement.textContent = '0';
    updateSoundButton();
    renderSkins();
    updateHud();
    updateMission();
    setInitialPanelState();
    showMenu();
}

function getSelectedSkin() {
    return skins.find((skin) => skin.id === save.selectedSkin) || skins[0];
}

function updateSoundButton() {
    muteButton.textContent = save.soundEnabled ? 'Sound On' : 'Sound Off';
}

function setInitialPanelState() {
    const mobileView = window.matchMedia('(max-width: 700px)').matches;

    collapsibleCards.forEach((card, index) => {
        const button = card.querySelector('[data-toggle-panel]');
        const shouldCollapse = mobileView && index > 0;
        card.classList.toggle('is-collapsed', shouldCollapse);
        if (button) {
            button.textContent = shouldCollapse ? 'Show' : 'Hide';
        }
    });
}

function renderSkins() {
    skinsGrid.innerHTML = '';

    skins.forEach((skin) => {
        const card = document.createElement('div');
        card.className = `skin-card${skin.id === save.selectedSkin ? ' active' : ''}`;

        const unlocked = save.unlockedSkins.includes(skin.id);
        const label = unlocked
            ? (skin.id === save.selectedSkin ? 'Equipped' : 'Equip')
            : `Unlock ${skin.price}`;

        card.innerHTML = `
            <div class="skin-top">
                <div class="skin-preview" style="background:${skin.color}"></div>
                <div class="skin-meta">
                    <strong>${skin.name}</strong>
                    <span>${skin.description}</span>
                </div>
            </div>
            <button type="button" class="${unlocked ? '' : 'secondary-button'}">${label}</button>
        `;

        const button = card.querySelector('button');
        button.addEventListener('click', () => handleSkinAction(skin.id));
        skinsGrid.appendChild(card);
    });
}

function handleSkinAction(skinId) {
    const skin = skins.find((entry) => entry.id === skinId);
    if (!skin) return;

    const unlocked = save.unlockedSkins.includes(skin.id);
    if (!unlocked) {
        if (game.coins < skin.price) {
            statusText.textContent = `Need ${skin.price - game.coins} more credits to unlock ${skin.name}.`;
            return;
        }

        game.coins -= skin.price;
        save.coins = game.coins;
        save.unlockedSkins = [...new Set([...save.unlockedSkins, skin.id])];
        statusText.textContent = `${skin.name} unlocked.`;
        playSound(640, 0.08, 'square', 0.04);
    }

    save.selectedSkin = skin.id;
    persistSave();
    updateHud();
    renderSkins();
}

function resetGame() {
    game.score = 0;
    game.elapsed = 0;
    game.spawnTimer = 0;
    game.spawnInterval = 0.95;
    game.enemySpeedBonus = 0;
    game.runCoins = 0;
    game.combo = 0;
    game.flashAlpha = 0;

    player.x = playerStart.x;
    player.y = playerStart.y;
    player.dy = 0;
    player.grounded = true;
    player.squash = 1;
    player.stretch = 1;

    particles.length = 0;
    enemies = [];

    updateHud();
}

function startGame() {
    resetGame();
    game.state = 'running';
    overlay.hidden = true;
    statusText.textContent = 'Stay alive, bank credits, and push your best score.';
    playSound(420, 0.05, 'sawtooth', 0.03);
}

function pauseGame() {
    game.state = 'paused';
    menuFeatures.hidden = true;
    overlayTitle.textContent = 'Paused';
    overlayMessage.textContent = 'Your run is frozen. Jump back in when you are ready.';
    actionButton.textContent = 'Resume Run';
    overlay.hidden = false;
    statusText.textContent = 'Game paused.';
}

function resumeGame() {
    game.state = 'running';
    overlay.hidden = true;
    statusText.textContent = 'Back in the run. Keep the rhythm.';
}

function showMenu() {
    game.state = 'menu';
    menuFeatures.hidden = false;
    overlayTitle.textContent = 'Square Dodger';
    overlayMessage.textContent = 'Arcade survival with progression. Build score, earn credits, and unlock skins that persist between sessions.';
    actionButton.textContent = 'Start Run';
    overlay.hidden = false;
}

function endGame() {
    game.state = 'gameover';
    const earnedCoins = Math.max(3, Math.floor(game.score / 2) + (game.score >= 20 ? 5 : 0));
    game.runCoins = earnedCoins;
    game.coins += earnedCoins;

    if (game.score > game.bestScore) {
        game.bestScore = game.score;
    }

    save.bestScore = game.bestScore;
    save.coins = game.coins;
    persistSave();

    menuFeatures.hidden = true;
    overlayTitle.textContent = game.score === game.bestScore && game.score > 0 ? 'New Best Run' : 'Run Over';
    overlayMessage.textContent = `Score ${game.score}. You earned ${earnedCoins} credits this run and now have ${game.coins} total.`;
    actionButton.textContent = 'Play Again';
    overlay.hidden = false;

    statusText.textContent = game.score === game.bestScore && game.score > 0
        ? 'New best score locked in.'
        : 'Upgrade a skin or chase a cleaner run.';

    burst(player.x + player.size / 2, player.y + player.size / 2, 24, getSelectedSkin().color, 120);
    playSound(180, 0.22, 'triangle', 0.06);
    game.flashAlpha = 0.18;
    updateHud();
    updateMission();
    renderSkins();
}

function updateHud() {
    scoreElement.textContent = String(game.score);
    bestScoreElement.textContent = `Best: ${game.bestScore}`;
    coinsElement.textContent = `Credits: ${game.coins}`;
    difficultyText.textContent = `Difficulty: ${getDifficultyLabel()}`;
}

function updateMission() {
    const mission = missions.find((entry) => !isMissionCompleted(entry)) || missions[missions.length - 1];
    missionTitle.textContent = mission.title;
    missionCopy.textContent = mission.description;
}

function isMissionCompleted(mission) {
    if (mission.title === 'Store Opener') {
        return game.coins >= mission.target;
    }

    return game.bestScore >= mission.target;
}

function getDifficultyLabel() {
    if (game.elapsed > 42) return 'Legend';
    if (game.elapsed > 30) return 'Elite';
    if (game.elapsed > 18) return 'Pro';
    if (game.elapsed > 9) return 'Rising';
    return 'Rookie';
}

function handleControlPress(control) {
    if (control === 'left' || control === 'right') {
        touchState[control] = true;
    }

    if (control === 'jump' && player.grounded && game.state === 'running') {
        jump();
    }
}

function handleControlRelease(control) {
    if (control === 'left' || control === 'right') {
        touchState[control] = false;
    }
}

function jump() {
    player.dy = player.jumpPower;
    player.grounded = false;
    player.stretch = 1.18;
    player.squash = 0.88;
    burst(player.x + player.size / 2, player.y + player.size, 6, getSelectedSkin().accent, 36);
    playSound(520, 0.05, 'square', 0.025);
}

function spawnEnemy() {
    const size = 18 + Math.random() * 28;
    enemies.push({
        x: Math.random() * (canvas.width - size),
        y: -size,
        size,
        speed: 220 + Math.random() * 140 + game.enemySpeedBonus,
        color: Math.random() > 0.5 ? '#DA291C' : '#ff8b7a',
        spin: (Math.random() - 0.5) * 0.08
    });
}

function awardDodge(enemy) {
    game.score += 1;
    game.combo += 1;
    if (game.combo > 0 && game.combo % 8 === 0) {
        game.coins += 1;
        save.coins = game.coins;
        statusText.textContent = `Combo bonus. Extra credit earned at ${game.combo} dodges.`;
        playSound(720, 0.06, 'triangle', 0.03);
    } else {
        playSound(610, 0.03, 'triangle', 0.02);
    }

    burst(enemy.x + enemy.size / 2, canvas.height - 10, 4, enemy.color, 28);
    updateHud();
}

function update(deltaTime) {
    if (game.state !== 'running') {
        updateParticles(deltaTime);
        return;
    }

    game.elapsed += deltaTime;
    game.enemySpeedBonus = Math.min(280, game.elapsed * 8.5);
    game.spawnInterval = Math.max(0.3, 0.92 - game.elapsed * 0.012);
    game.spawnTimer += deltaTime;
    game.flashAlpha = Math.max(0, game.flashAlpha - deltaTime * 0.45);

    const movingLeft = keys.ArrowLeft || keys.KeyA || touchState.left;
    const movingRight = keys.ArrowRight || keys.KeyD || touchState.right;
    const wantsJump = keys.Space || keys.ArrowUp || keys.KeyW;

    if (movingLeft) player.x -= player.speed * deltaTime;
    if (movingRight) player.x += player.speed * deltaTime;

    if (wantsJump && player.grounded) {
        jump();
        keys.Space = false;
        keys.ArrowUp = false;
        keys.KeyW = false;
    }

    player.x = Math.max(0, Math.min(canvas.width - player.size, player.x));
    player.dy += physics.gravity * deltaTime;
    player.y += player.dy * deltaTime;

    player.squash += (1 - player.squash) * 10 * deltaTime;
    player.stretch += (1 - player.stretch) * 10 * deltaTime;

    if (player.y + player.size >= physics.floor) {
        if (!player.grounded && player.dy > 120) {
            burst(player.x + player.size / 2, physics.floor - 4, 8, getSelectedSkin().accent, 42);
            playSound(240, 0.04, 'triangle', 0.02);
        }

        player.y = physics.floor - player.size;
        player.dy = 0;
        player.grounded = true;
        player.squash = 1.15;
        player.stretch = 0.9;
    }

    while (game.spawnTimer >= game.spawnInterval) {
        game.spawnTimer -= game.spawnInterval;
        spawnEnemy();
    }

    enemies = enemies.filter((enemy) => {
        enemy.y += enemy.speed * deltaTime;

        const collided =
            player.x < enemy.x + enemy.size &&
            player.x + player.size > enemy.x &&
            player.y < enemy.y + enemy.size &&
            player.y + player.size > enemy.y;

        if (collided) {
            endGame();
            return true;
        }

        if (enemy.y > canvas.height) {
            awardDodge(enemy);
            return false;
        }

        return true;
    });

    updateParticles(deltaTime);
    updateMission();
}

function updateParticles(deltaTime) {
    for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        particle.x += particle.vx * deltaTime;
        particle.y += particle.vy * deltaTime;
        particle.life -= deltaTime;
        particle.alpha = Math.max(0, particle.life / particle.maxLife);

        if (particle.life <= 0) {
            particles.splice(index, 1);
        }
    }
}

function burst(x, y, count, color, force) {
    for (let index = 0; index < count; index += 1) {
        const angle = (Math.PI * 2 * index) / count + Math.random() * 0.2;
        const speed = force * (0.4 + Math.random() * 0.8);
        particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color,
            life: 0.4 + Math.random() * 0.25,
            maxLife: 0.6
        });
    }
}

function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#163a4d');
    gradient.addColorStop(1, '#061019');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    for (let index = 0; index < 14; index += 1) {
        const y = ((index * 40) + game.elapsed * 60) % (canvas.height + 40);
        ctx.fillRect(0, y, canvas.width, 2);
    }

    if (game.flashAlpha > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${game.flashAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function drawPlayer() {
    const skin = getSelectedSkin();
    const drawWidth = player.size * player.squash;
    const drawHeight = player.size * player.stretch;
    const offsetX = (player.size - drawWidth) / 2;
    const offsetY = (player.size - drawHeight) / 2;

    ctx.save();
    ctx.fillStyle = skin.color;
    ctx.shadowBlur = 18;
    ctx.shadowColor = `${skin.color}aa`;
    ctx.fillRect(player.x + offsetX, player.y + offsetY, drawWidth, drawHeight);

    ctx.fillStyle = skin.accent;
    ctx.fillRect(player.x + offsetX + drawWidth * 0.22, player.y + offsetY + drawHeight * 0.24, drawWidth * 0.16, drawHeight * 0.16);
    ctx.fillRect(player.x + offsetX + drawWidth * 0.62, player.y + offsetY + drawHeight * 0.24, drawWidth * 0.16, drawHeight * 0.16);
    ctx.restore();
}

function drawEnemies() {
    enemies.forEach((enemy) => {
        ctx.save();
        ctx.translate(enemy.x + enemy.size / 2, enemy.y + enemy.size / 2);
        ctx.rotate((enemy.y / canvas.height) * enemy.spin * 6);
        ctx.fillStyle = enemy.color;
        ctx.fillRect(-enemy.size / 2, -enemy.size / 2, enemy.size, enemy.size);
        ctx.restore();
    });
}

function drawParticles() {
    particles.forEach((particle) => {
        ctx.save();
        ctx.globalAlpha = particle.alpha;
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x, particle.y, 4, 4);
        ctx.restore();
    });
}

function drawRunInfo() {
    if (game.state !== 'running') return;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(12, 12, 132, 34);
    ctx.fillStyle = '#f5fbff';
    ctx.font = 'bold 14px Segoe UI';
    ctx.fillText(`Combo ${game.combo}`, 24, 34);
    ctx.restore();
}

function render() {
    drawBackground();
    drawParticles();
    drawPlayer();
    drawEnemies();
    drawRunInfo();
}

function unlockAudio() {
    if (audio.context) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    audio.context = new AudioContextClass();
    audio.master = audio.context.createGain();
    audio.master.gain.value = 0.05;
    audio.master.connect(audio.context.destination);
}

function playSound(frequency, duration, type, volume) {
    if (!save.soundEnabled || !audio.context || !audio.master) {
        return;
    }

    const oscillator = audio.context.createOscillator();
    const gain = audio.context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, audio.context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audio.master);
    oscillator.start();
    oscillator.stop(audio.context.currentTime + duration);
}

function gameLoop(timestamp) {
    if (!game.lastTime) {
        game.lastTime = timestamp;
    }

    const deltaTime = Math.min((timestamp - game.lastTime) / 1000, 0.032);
    game.lastTime = timestamp;

    update(deltaTime);
    render();

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

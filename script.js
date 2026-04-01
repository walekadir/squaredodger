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
const aboutButton = document.getElementById('about-button');
const demoButton = document.getElementById('demo-button');
const aboutCopy = document.getElementById('about-copy');

const STORAGE_KEY = 'square-dodger-save-v2';
const keys = {};
const touchState = { left: false, right: false };
const playerStart = { x: 185, y: 450 };
const particles = [];
const praiseWords = ['Well done!', 'Kudos!', 'Impressive!', 'Amazing!', 'Super star!'];
const difficultyLabels = ['Rookie', 'Sprinter', 'Turbo', 'Rocket', 'Lightning', 'Galaxy'];
const numberTips = [
    (value) => `${value} is ${value % 2 === 0 ? 'even' : 'odd'}.`,
    (value) => `${value} ${value % 2 === 0 ? 'can' : 'cannot'} be shared into 2 equal groups.`,
    (value) => `Count it out: ${value} little blocks make ${value}.`,
    (value) => `${value} comes right after ${value - 1 || 0}.`
];

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
    flashAlpha: 0,
    celebrationText: '',
    celebrationAccent: '#ffe27a',
    celebrationTimer: 0,
    celebrationDuration: 0,
    powerJumpCharges: 0,
    powerJumpMilestone: 50,
    praiseMilestone: 10,
    difficultyMilestone: 20,
    enemyCounter: 0,
    difficultyStage: 0
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
    stretch: 1,
    blinkTimer: 1.8,
    blinkDuration: 0,
    powerJumpActive: false
};

const physics = {
    gravity: 1480,
    floor: canvas.height
};

const helpModes = {
    default: {
        copy: 'Start a run, dodge the numbered bricks, build score, and earn credits for skins. Every 10 points celebrates progress, and every 50 points unlocks a power jump that smashes one brick for bonus score.',
        status: 'Press start to begin.',
        features: [
            {
                title: 'Number-brick challenge',
                body: 'Each red brick now carries a number to keep the action playful and educational.'
            },
            {
                title: 'Milestone surprises',
                body: 'Celebrate every 10 points, unlock power jumps at 50, and push for bigger scores.'
            },
            {
                title: 'Mobile-ready controls',
                body: 'Move, jump, and smash on touch or keyboard without extra setup.'
            }
        ]
    },
    walkthrough: {
        title: 'How the run works',
        message: 'Move left or right to stay clear of the falling bricks. Jump when the path closes, then use a power jump later in the run to smash through a block for extra points.',
        features: [
            {
                title: 'Start simple',
                body: 'The opening seconds are deliberately calmer so first-time players can understand the controls.'
            },
            {
                title: 'Build rhythm',
                body: 'Each dodge adds score, and milestone celebrations confirm that you are progressing.'
            },
            {
                title: 'Unlock style',
                body: 'Run credits buy skins, and those unlocks stay saved on the same device.'
            }
        ],
        copy: 'Quick walkthrough: step into the run, dodge to score, hit milestone celebrations, then spend credits on new skins. The entire loop is visible without downloading anything or handing over personal info.',
        status: 'Walkthrough loaded. You can start immediately when you feel ready.'
    },
    demo: {
        title: 'What to expect in your first 20 seconds',
        message: 'You will see numbered red bricks dropping from above. The pace starts friendly, then speeds up as your score climbs and special power jumps begin to unlock.',
        features: [
            {
                title: 'Second 1 to 5',
                body: 'Learn movement and get comfortable staying under clear lanes.'
            },
            {
                title: 'Second 6 to 15',
                body: 'The rhythm sharpens, combo credits show up, and the run starts feeling rewarding.'
            },
            {
                title: 'Second 16 onward',
                body: 'Difficulty ramps up, milestone praise appears, and the game asks for sharper reactions.'
            }
        ],
        copy: 'Demo tip: treat the first few seconds as your onboarding space. Once the timing clicks, the game rewards consistency with credits, celebrations, and stronger runs.',
        status: 'Demo tips are visible now. Start a run to feel the ramp in real time.'
    }
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

aboutButton?.addEventListener('click', () => {
    applyHelpMode('walkthrough');
});

demoButton?.addEventListener('click', () => {
    applyHelpMode('demo');
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
    applyHelpMode('default');
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
    game.spawnInterval = 1.02;
    game.enemySpeedBonus = 0;
    game.runCoins = 0;
    game.combo = 0;
    game.flashAlpha = 0;
    game.celebrationText = '';
    game.celebrationTimer = 0;
    game.celebrationDuration = 0;
    game.powerJumpCharges = 0;
    game.powerJumpMilestone = 50;
    game.praiseMilestone = 10;
    game.difficultyMilestone = 20;
    game.enemyCounter = 0;
    game.difficultyStage = 0;

    player.x = playerStart.x;
    player.y = playerStart.y;
    player.dy = 0;
    player.grounded = true;
    player.squash = 1;
    player.stretch = 1;
    player.blinkTimer = 1 + Math.random() * 2;
    player.blinkDuration = 0;
    player.powerJumpActive = false;

    particles.length = 0;
    enemies = [];

    updateHud();
}

function startGame() {
    resetGame();
    game.state = 'running';
    overlay.hidden = true;
    statusText.textContent = 'Catch the rhythm, dodge the number bricks, and learn while you play.';
    playJingle([
        [420, 0.05, 'sawtooth', 0.03, 0],
        [560, 0.08, 'triangle', 0.025, 0.04]
    ]);
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
    overlayMessage.textContent = 'Arcade survival with number bricks, surprise power jumps, fun sounds, and unlockable looks that stick between sessions.';
    renderFeatureList(helpModes.default.features);
    actionButton.textContent = 'Start Run';
    overlay.hidden = false;
}

function renderFeatureList(items) {
    menuFeatures.innerHTML = '';

    items.forEach((item) => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `${item.title}<span>${item.body}</span>`;
        menuFeatures.appendChild(listItem);
    });
}

function applyHelpMode(mode) {
    const content = helpModes[mode];
    if (!content) return;

    if (aboutButton) {
        aboutButton.textContent = mode === 'walkthrough' ? 'Walkthrough Loaded' : 'Show Quick Walkthrough';
    }

    if (demoButton) {
        demoButton.textContent = mode === 'demo' ? 'Demo Tips Loaded' : 'Show Demo Tips';
    }

    if (aboutCopy) {
        aboutCopy.textContent = content.copy;
    }

    if (game.state === 'menu') {
        if (content.title) {
            overlayTitle.textContent = content.title;
        }

        if (content.message) {
            overlayMessage.textContent = content.message;
        }

        if (content.features) {
            renderFeatureList(content.features);
        }

        overlay.hidden = false;
        menuFeatures.hidden = false;
    }

    statusText.textContent = content.status;
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
    return difficultyLabels[Math.min(game.difficultyStage, difficultyLabels.length - 1)];
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
    player.powerJumpActive = game.powerJumpCharges > 0;
    if (player.powerJumpActive) {
        game.powerJumpCharges -= 1;
        triggerCelebration('Power Jump!', '#9cf6c9', 0.85);
        statusText.textContent = game.powerJumpCharges > 0
            ? `Power jump smash ready. ${game.powerJumpCharges} extra charge${game.powerJumpCharges === 1 ? '' : 's'} left.`
            : 'Power jump smash used. Reach the next 50-point mark for another one.';
        playJingle([
            [660, 0.05, 'square', 0.03, 0],
            [880, 0.09, 'triangle', 0.03, 0.03]
        ]);
    } else {
        playSound(520, 0.05, 'square', 0.025);
    }

    burst(player.x + player.size / 2, player.y + player.size, 6, getSelectedSkin().accent, 36);
}

function spawnEnemy() {
    const size = 18 + Math.random() * 28;
    game.enemyCounter += 1;
    const label = ((game.enemyCounter - 1) % 30) + 1;
    enemies.push({
        x: Math.random() * (canvas.width - size),
        y: -size,
        size,
        speed: 190 + Math.random() * 110 + game.enemySpeedBonus,
        color: label % 2 === 0 ? '#ff7c6b' : '#d94d41',
        label,
        spin: (Math.random() - 0.5) * 0.08,
        wobble: Math.random() * Math.PI * 2
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

    if (game.score > 0 && game.score % 5 === 0) {
        const tip = numberTips[(game.score / 5 - 1) % numberTips.length];
        statusText.textContent = `Number note: ${tip(enemy.label)}`;
    }

    burst(enemy.x + enemy.size / 2, canvas.height - 10, 4, enemy.color, 28);
    handleMilestones();
    updateHud();
}

function awardPowerJumpBreak(enemy) {
    game.score += 10;
    game.combo += 3;
    triggerCelebration('+10 Smash!', '#9cf6c9', 0.7);
    burst(enemy.x + enemy.size / 2, enemy.y + enemy.size / 2, 14, '#fff0a8', 90);
    burst(enemy.x + enemy.size / 2, enemy.y + enemy.size / 2, 12, enemy.color, 65);
    playJingle([
        [520, 0.04, 'square', 0.028, 0],
        [720, 0.05, 'square', 0.03, 0.03],
        [980, 0.08, 'triangle', 0.03, 0.06]
    ]);
    statusText.textContent = 'Boom! Power jump smashed a number brick for 10 points.';
    player.powerJumpActive = false;
    handleMilestones();
    updateHud();
}

function handleMilestones() {
    while (game.score >= game.praiseMilestone) {
        const praise = praiseWords[(game.praiseMilestone / 10 - 1) % praiseWords.length];
        triggerCelebration(praise, '#ffe27a', 0.95);
        burst(player.x + player.size / 2, player.y, 12, '#ffe27a', 58);
        playJingle([
            [700, 0.04, 'triangle', 0.02, 0],
            [840, 0.05, 'triangle', 0.024, 0.04],
            [980, 0.06, 'triangle', 0.026, 0.08]
        ]);
        game.praiseMilestone += 10;
    }

    while (game.score >= game.difficultyMilestone) {
        game.difficultyStage += 1;
        game.difficultyMilestone += 20;
        game.flashAlpha = 0.14;
        statusText.textContent = `Level up. ${getDifficultyLabel()} mode is live, so the bricks will move a little faster now.`;
        playJingle([
            [300, 0.05, 'sawtooth', 0.025, 0],
            [420, 0.05, 'square', 0.025, 0.04],
            [540, 0.07, 'triangle', 0.025, 0.08]
        ]);
    }

    while (game.score >= game.powerJumpMilestone) {
        game.powerJumpCharges += 1;
        game.powerJumpMilestone += 50;
        triggerCelebration('Power Jump Ready!', '#9cf6c9', 1.2);
        burst(player.x + player.size / 2, player.y, 16, '#9cf6c9', 72);
        statusText.textContent = `Power jump unlocked. Press jump to smash one brick for 10 points. Charges: ${game.powerJumpCharges}.`;
        playJingle([
            [540, 0.05, 'square', 0.028, 0],
            [720, 0.05, 'square', 0.028, 0.04],
            [920, 0.09, 'triangle', 0.03, 0.08]
        ]);
    }
}

function triggerCelebration(text, accent, duration) {
    game.celebrationText = text;
    game.celebrationAccent = accent;
    game.celebrationDuration = duration;
    game.celebrationTimer = duration;
}

function update(deltaTime) {
    if (game.state !== 'running') {
        updateParticles(deltaTime);
        return;
    }

    game.elapsed += deltaTime;
    game.enemySpeedBonus = Math.min(260, game.difficultyStage * 34 + game.elapsed * 4.2);
    game.spawnInterval = Math.max(0.34, 1.02 - (game.difficultyStage * 0.055) - game.elapsed * 0.004);
    game.spawnTimer += deltaTime;
    game.flashAlpha = Math.max(0, game.flashAlpha - deltaTime * 0.45);
    game.celebrationTimer = Math.max(0, game.celebrationTimer - deltaTime);

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
    player.blinkTimer -= deltaTime;

    if (player.blinkDuration > 0) {
        player.blinkDuration = Math.max(0, player.blinkDuration - deltaTime);
    } else if (player.blinkTimer <= 0) {
        player.blinkDuration = 0.14;
        player.blinkTimer = 1.2 + Math.random() * 2.4;
    }

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
        player.powerJumpActive = false;
    }

    while (game.spawnTimer >= game.spawnInterval) {
        game.spawnTimer -= game.spawnInterval;
        spawnEnemy();
    }

    enemies = enemies.filter((enemy) => {
        enemy.y += enemy.speed * deltaTime;
        enemy.x += Math.sin((game.elapsed * 2.2) + enemy.wobble) * enemy.spin * 14;
        enemy.x = Math.max(0, Math.min(canvas.width - enemy.size, enemy.x));

        const collided =
            player.x < enemy.x + enemy.size &&
            player.x + player.size > enemy.x &&
            player.y < enemy.y + enemy.size &&
            player.y + player.size > enemy.y;

        if (collided) {
            if (player.powerJumpActive) {
                awardPowerJumpBreak(enemy);
                return false;
            }
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
    const eyeHeight = player.blinkDuration > 0 ? drawHeight * 0.04 : drawHeight * 0.16;
    const eyeY = player.y + offsetY + drawHeight * 0.26;

    ctx.save();
    ctx.fillStyle = skin.color;
    ctx.shadowBlur = player.powerJumpActive ? 28 : 18;
    ctx.shadowColor = player.powerJumpActive ? '#9cf6c9' : `${skin.color}aa`;
    ctx.fillRect(player.x + offsetX, player.y + offsetY, drawWidth, drawHeight);

    ctx.fillStyle = skin.accent;
    ctx.fillRect(player.x + offsetX + drawWidth * 0.22, eyeY, drawWidth * 0.16, eyeHeight);
    ctx.fillRect(player.x + offsetX + drawWidth * 0.62, eyeY, drawWidth * 0.16, eyeHeight);

    if (player.powerJumpActive) {
        ctx.strokeStyle = '#d8fff0';
        ctx.lineWidth = 3;
        ctx.strokeRect(player.x + offsetX - 4, player.y + offsetY - 4, drawWidth + 8, drawHeight + 8);
    }
    ctx.restore();
}

function drawEnemies() {
    enemies.forEach((enemy) => {
        ctx.save();
        ctx.translate(enemy.x + enemy.size / 2, enemy.y + enemy.size / 2);
        ctx.rotate((enemy.y / canvas.height) * enemy.spin * 6);
        ctx.fillStyle = enemy.color;
        ctx.fillRect(-enemy.size / 2, -enemy.size / 2, enemy.size, enemy.size);

        ctx.strokeStyle = enemy.label % 2 === 0 ? '#ffd7a3' : '#ffb8b0';
        ctx.lineWidth = 2;
        ctx.strokeRect(-enemy.size / 2, -enemy.size / 2, enemy.size, enemy.size);

        ctx.fillStyle = '#fff7ea';
        ctx.font = `bold ${Math.max(12, enemy.size * 0.42)}px Segoe UI`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(enemy.label), 0, 1);
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
    ctx.fillRect(12, 12, 196, 64);
    ctx.fillStyle = '#f5fbff';
    ctx.font = 'bold 14px Segoe UI';
    ctx.fillText(`Combo ${game.combo}`, 24, 34);
    ctx.font = '12px Segoe UI';
    ctx.fillStyle = game.powerJumpCharges > 0 ? '#9cf6c9' : '#c7d8e3';
    ctx.fillText(`Power jumps ${game.powerJumpCharges}`, 24, 52);
    ctx.fillStyle = '#ffe27a';
    ctx.fillText(`Next wow ${game.praiseMilestone}`, 108, 34);
    ctx.fillText(`Next smash ${game.powerJumpMilestone}`, 108, 52);
    ctx.restore();
}

function drawCelebration() {
    if (game.celebrationTimer <= 0) return;

    const progress = game.celebrationTimer / game.celebrationDuration;
    const alpha = Math.min(1, progress * 1.5);
    const scale = 1 + (1 - progress) * 0.16;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height * 0.25);
    ctx.scale(scale, scale);
    ctx.fillStyle = `rgba(5, 15, 23, ${0.2 + alpha * 0.45})`;
    ctx.fillRect(-124, -32, 248, 64);
    ctx.strokeStyle = game.celebrationAccent;
    ctx.lineWidth = 3;
    ctx.strokeRect(-124, -32, 248, 64);
    ctx.fillStyle = game.celebrationAccent;
    ctx.font = 'bold 26px Segoe UI';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = alpha;
    ctx.fillText(game.celebrationText, 0, 0);
    ctx.restore();
}

function render() {
    drawBackground();
    drawParticles();
    drawPlayer();
    drawEnemies();
    drawRunInfo();
    drawCelebration();
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
    gain.gain.setValueAtTime(volume, audio.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.context.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audio.master);
    oscillator.start();
    oscillator.stop(audio.context.currentTime + duration);
}

function playJingle(notes) {
    if (!save.soundEnabled || !audio.context || !audio.master) {
        return;
    }

    notes.forEach(([frequency, duration, type, volume, delay]) => {
        const oscillator = audio.context.createOscillator();
        const gain = audio.context.createGain();
        const startTime = audio.context.currentTime + delay;
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(volume, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        oscillator.connect(gain);
        gain.connect(audio.master);
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    });
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

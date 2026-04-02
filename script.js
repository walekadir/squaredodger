const canvas = document.getElementById('gameCanvas'), ctx = canvas.getContext('2d');
const previewCanvas = document.getElementById('previewCanvas'), previewCtx = previewCanvas.getContext('2d');
const scoreEl = document.getElementById('score'), bestEl = document.getElementById('best-score'), coinsEl = document.getElementById('coins');
const statusEl = document.getElementById('status-text'), heatEl = document.getElementById('difficulty-text');
const overlay = document.getElementById('overlay'), overlayTitle = document.getElementById('overlay-title'), overlayMessage = document.getElementById('overlay-message'), overlayFlavor = document.getElementById('overlay-flavor');
const overlayStats = document.getElementById('overlay-stats'), overlayScore = document.getElementById('overlay-score'), overlayBest = document.getElementById('overlay-best'), overlayCredits = document.getElementById('overlay-credits');
const menuFeatures = document.getElementById('menu-features'), actionButton = document.getElementById('action-button'), heroStartButton = document.getElementById('hero-start-button'), muteButton = document.getElementById('mute-button'), shareButton = document.getElementById('share-button');
const challengeList = document.getElementById('challenge-list'), challengeFill = document.getElementById('challenge-progress-fill'), challengeLabel = document.getElementById('challenge-progress-label'), challengeCopy = document.getElementById('challenge-progress-copy');
const leaderboardList = document.getElementById('leaderboard-list'), skinsGrid = document.getElementById('skins-grid'), upgradesGrid = document.getElementById('upgrades-grid'), idlePrompt = document.getElementById('idle-prompt');

const STORAGE_KEY = 'square-dodger-save-v4', LEGACY_KEY = 'square-dodger-save-v3', SHARE_URL = 'https://jidsgame.netlify.app/';
const keys = {}, touchState = { left: false, right: false, lastX: null, startY: null }, particles = [];
let enemies = [], idleTimer = null;

const challengeTiers = [
    { title: 'Rookie', target: 10, copy: 'Get your first clean run.' },
    { title: 'Survivor', target: 25, copy: 'Unlock the first real pressure.' },
    { title: 'Dangerous', target: 50, copy: 'The lane starts fearing you.' },
    { title: 'Legend', target: 100, copy: 'A proper browser arcade flex.' }
];
const heatLabels = ['Opening', 'Sharp', 'Danger', 'Mayhem', 'Blackout'];

// NEW: Dynamic background colors based on heat
const heatColors = [
    ['#10213e', '#081326', '#03060d'], // 0: Blue
    ['#0d2e2e', '#061a1a', '#020a0a'], // 1: Teal
    ['#2e0d29', '#1a0615', '#0a0208'], // 2: Purple
    ['#3e1010', '#260808', '#0d0303'], // 3: Red
    ['#111111', '#050505', '#000000']  // 4: Blackout
];

const leaderboardSeed = [
    { name: 'Tobi', score: 42, tag: 'Lagos lane' }, { name: 'Maya', score: 39, tag: 'Night run' },
    { name: 'Chioma', score: 35, tag: 'Close calls only' }, { name: 'Liam', score: 31, tag: 'Smooth fingers' },
    { name: 'Zainab', score: 28, tag: 'One more run' }, { name: 'Noah', score: 26, tag: 'Lucky smash' }
];

const skins = [
    { id: 'classic', name: 'Classic Blue', color: '#58c3ff', accent: '#dfffff', price: 0, description: 'Clean arcade starter' },
    { id: 'ember', name: 'Ember Rush', color: '#ff7b66', accent: '#ffe0d8', price: 25, description: 'Heat-wave glow' },
    { id: 'mint', name: 'Mint Pulse', color: '#7cf0b6', accent: '#e7fff3', price: 60, description: 'Cool-headed late game' },
    { id: 'nova', name: 'Nova Gold', color: '#ffd45f', accent: '#fff5cf', price: 120, description: 'High-score flex' }
];

// NEW: Upgrades Shop Configuration
const storeUpgrades = [
    { id: 'quickCharge', name: 'Quick Charge', maxLevel: 2, prices: [80, 200], effects: [25, 20, 15], desc: 'Lower points needed to unlock a smash.' },
    { id: 'deepPockets', name: 'Deep Pockets', maxLevel: 2, prices: [120, 280], effects: [1, 2, 3], desc: 'Hold more charged smashes at once.' }
];

const save = loadSave();
const playerStart = { x: 185, y: 590 };

const game = {
    score: 0, bestScore: save.bestScore, coins: save.coins, state: 'menu', elapsed: 0, spawnTimer: 0, 
    spawnInterval: .92, enemySpeedBonus: 0, lastTime: 0, combo: 0, flashAlpha: 0, celebrationText: '', 
    celebrationAccent: '#ffd45f', celebrationTimer: 0, celebrationDuration: 0, powerJumpCharges: 0, 
    nextPowerJumpScore: 25, praiseMilestone: 10, difficultyMilestone: 18, difficultyStage: 0, 
    lastSmashValue: 0, screenShake: 0, pulseTimer: 0
};

const player = { x: playerStart.x, y: playerStart.y, size: 30, speed: 300, dy: 0, jumpPower: -570, grounded: true, squash: 1, stretch: 1, blinkTimer: 1.5, blinkDuration: 0, powerJumpActive: false };
const preview = { elapsed: 0, spawnTimer: 0, spawnInterval: .55, particles: [], enemies: [], score: 27, combo: 12, flashAlpha: 0, player: { x: 210, y: previewCanvas.height - 58, size: 28, dy: 0, grounded: true, squash: 1, stretch: 1, blinkTimer: 1.2, blinkDuration: 0, powerJumpActive: false } };
const audio = { context: null, master: null };

initializeUi(); attachEvents(); requestAnimationFrame(gameLoop);

function loadSave() {
    const parsed = parseStorage(STORAGE_KEY) || parseStorage(LEGACY_KEY) || {};
    const unlocked = Array.isArray(parsed.unlockedSkins) && parsed.unlockedSkins.length ? parsed.unlockedSkins.filter(id => skins.some(s => s.id === id)) : ['classic'];
    const loadedUpgrades = parsed.upgrades || { quickCharge: 0, deepPockets: 0 };
    return {
        bestScore: Number(parsed.bestScore) || 0,
        coins: Number(parsed.coins) || 0,
        soundEnabled: parsed.soundEnabled !== false,
        selectedSkin: skins.some(s => s.id === parsed.selectedSkin) ? parsed.selectedSkin : 'classic',
        unlockedSkins: unlocked.includes('classic') ? unlocked : ['classic', ...unlocked],
        leaderboard: normalizeLeaderboard(parsed.leaderboard),
        upgrades: {
            quickCharge: typeof loadedUpgrades.quickCharge === 'number' ? loadedUpgrades.quickCharge : 0,
            deepPockets: typeof loadedUpgrades.deepPockets === 'number' ? loadedUpgrades.deepPockets : 0
        }
    };
}

function parseStorage(key) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; } }
function normalizeLeaderboard(entries) {
    if (!Array.isArray(entries) || !entries.length) return [...leaderboardSeed];
    const clean = entries.map(e => ({
        name: (typeof e.name === 'string' && e.name.trim() ? e.name.trim() : 'Player').slice(0, 18),
        score: Math.max(0, Number(e.score) || 0),
        tag: (typeof e.tag === 'string' && e.tag.trim() ? e.tag.trim() : 'Local board').slice(0, 28),
        isPlayer: e.isPlayer === true
    })).sort((a, b) => b.score - a.score).slice(0, 8);
    return clean.length ? clean : [...leaderboardSeed];
}

function persistSave() { localStorage.setItem(STORAGE_KEY, JSON.stringify(save)); }
function initializeUi() { updateSoundButton(); renderSkins(); renderUpgrades(); renderLeaderboard(); updateHud(); updateChallengeUI(); showMenu(); scheduleIdlePrompt(); }

function attachEvents() {
    window.addEventListener('keydown', e => {
        keys[e.code] = true;
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'].includes(e.code)) e.preventDefault();
        clearIdlePrompt();
        if (e.code === 'KeyP' && game.state === 'running') pauseGame();
        else if (e.code === 'Enter' && game.state !== 'running') handlePrimaryAction();
    });
    window.addEventListener('keyup', e => keys[e.code] = false);
    
    document.addEventListener('pointerdown', clearIdlePrompt, { passive: true });
    document.addEventListener('mousemove', () => { if (!idlePrompt.hidden) clearIdlePrompt(); }, { passive: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden && game.state === 'running') pauseGame(); });
    
    actionButton.addEventListener('click', handlePrimaryAction);
    heroStartButton.addEventListener('click', handlePrimaryAction);
    muteButton.addEventListener('click', () => { save.soundEnabled = !save.soundEnabled; persistSave(); updateSoundButton(); });
    shareButton.addEventListener('click', () => { if (game.score > 0 || game.bestScore > 0) shareScore(Math.max(game.score, game.bestScore)); });
    
    canvas.addEventListener('touchstart', e => {
        if(e.cancelable) e.preventDefault();
        unlockAudio(); clearIdlePrompt();
        if(game.state !== 'running') return;
        const touch = e.touches[0];
        touchState.lastX = touch.clientX; touchState.startY = touch.clientY;
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
        if(e.cancelable) e.preventDefault();
        if(game.state !== 'running') return;
        const touch = e.touches[0];
        
        if(touchState.lastX !== null) {
            const deltaX = touch.clientX - touchState.lastX;
            const scale = canvas.width / canvas.clientWidth;
            player.x += deltaX * scale * 1.4; 
            player.x = Math.max(0, Math.min(canvas.width - player.size, player.x));
            touchState.lastX = touch.clientX;
        }

        if(touchState.startY !== null) {
            const deltaY = touchState.startY - touch.clientY;
            if(deltaY > 35) { 
                if(player.grounded) jump();
                touchState.startY = touch.clientY; 
            }
        }
    }, { passive: false });

    canvas.addEventListener('touchend', e => {
        if(e.cancelable) e.preventDefault();
        touchState.lastX = null; touchState.startY = null;
    }, { passive: false });
}

function handlePrimaryAction() { unlockAudio(); clearIdlePrompt(); if (game.state === 'paused') { resumeGame(); return; } startGame(); }
function clearIdlePrompt() { idlePrompt.hidden = true; if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; } }
function scheduleIdlePrompt() { clearIdlePrompt(); if (game.state !== 'menu') return; idleTimer = setTimeout(() => { if (game.state === 'menu') idlePrompt.hidden = false; }, 1e4); }
function updateSoundButton() { muteButton.textContent = save.soundEnabled ? 'Sound On' : 'Sound Off'; }
function getSelectedSkin() { return skins.find(s => s.id === save.selectedSkin) || skins[0]; }

function renderSkins() {
    skinsGrid.innerHTML = '';
    skins.forEach(skin => {
        const unlocked = save.unlockedSkins.includes(skin.id), selected = save.selectedSkin === skin.id, card = document.createElement('div');
        card.className = `skin-card${selected ? ' active' : ''}`;
        card.innerHTML = `<div class="skin-top"><div class="skin-preview" style="background:${skin.color}"></div><div class="skin-meta"><strong>${escapeHtml(skin.name)}</strong><span>${escapeHtml(skin.description)}</span></div></div><button type="button" class="${unlocked ? '' : 'secondary-button'}">${unlocked ? (selected ? 'Equipped' : 'Equip') : `Unlock ${skin.price}`}</button>`;
        card.querySelector('button').addEventListener('click', () => handleSkinAction(skin.id));
        skinsGrid.appendChild(card);
    });
}

function handleSkinAction(skinId) {
    const skin = skins.find(s => s.id === skinId); if (!skin) return;
    const unlocked = save.unlockedSkins.includes(skin.id);
    if (!unlocked) {
        if (game.coins < skin.price) { statusEl.textContent = `${skin.name} needs ${skin.price - game.coins} more credits.`; return; }
        game.coins -= skin.price; save.coins = game.coins;
        save.unlockedSkins = [...new Set([...save.unlockedSkins, skin.id])];
        statusEl.textContent = `${skin.name} unlocked.`;
        playStack([{ frequency: 620, duration: .06, type: 'square', volume: .1 }, { frequency: 880, duration: .08, type: 'triangle', volume: .08, delay: .03 }]);
    }
    save.selectedSkin = skin.id; persistSave(); renderSkins(); updateHud();
}

// NEW: Upgrades Render Function
function renderUpgrades() {
    upgradesGrid.innerHTML = '';
    storeUpgrades.forEach(upg => {
        const level = save.upgrades[upg.id];
        const isMax = level >= upg.maxLevel;
        const price = isMax ? 'MAX' : upg.prices[level];
        const card = document.createElement('div');
        card.className = `skin-card`;
        card.innerHTML = `<div class="skin-top">
            <div class="skin-meta"><strong>${escapeHtml(upg.name)} (Lv ${level})</strong><span>${escapeHtml(upg.desc)}</span></div>
        </div>
        <button type="button" class="${isMax ? 'secondary-button' : ''}" ${isMax ? 'disabled' : ''}>${isMax ? 'Maxed' : `Buy ${price}`}</button>`;
        if (!isMax) card.querySelector('button').addEventListener('click', () => handleUpgradeAction(upg.id));
        upgradesGrid.appendChild(card);
    });
}

function handleUpgradeAction(id) {
    const upg = storeUpgrades.find(u => u.id === id);
    const level = save.upgrades[id];
    if (level >= upg.maxLevel) return;
    const price = upg.prices[level];
    if (game.coins < price) { statusEl.textContent = `Need ${price - game.coins} more credits.`; return; }
    
    game.coins -= price; save.coins = game.coins;
    save.upgrades[id] += 1;
    persistSave(); renderUpgrades(); updateHud();
    playStack([{ frequency: 720, duration: .08, type: 'square', volume: .1 }, { frequency: 1080, duration: .12, type: 'triangle', volume: .08, delay: .03 }]);
}

function renderLeaderboard() {
    leaderboardList.innerHTML = '';
    normalizeLeaderboard(save.leaderboard).forEach((entry, index) => {
        const row = document.createElement('div');
        row.className = `leaderboard-row${entry.isPlayer ? ' player' : ''}`;
        row.innerHTML = `<div class="leaderboard-name"><strong>#${index + 1} ${escapeHtml(entry.name)}</strong><span>${escapeHtml(entry.tag)}</span></div><div class="leaderboard-score">${entry.score}</div>`;
        leaderboardList.appendChild(row);
    });
}

function updateHud() {
    scoreEl.textContent = String(game.score); bestEl.textContent = String(game.bestScore);
    coinsEl.textContent = String(game.coins); heatEl.textContent = `Heat: ${getHeatLabel()}`;
}

function updateChallengeUI() {
    const reference = game.state === 'running' ? game.score : game.bestScore;
    const nextIndex = challengeTiers.findIndex(t => reference < t.target);
    const current = nextIndex === -1 ? challengeTiers.length - 1 : nextIndex;
    const prev = current === 0 ? 0 : challengeTiers[current - 1].target;
    const target = challengeTiers[current].target;
    const pct = nextIndex === -1 ? 100 : ((reference - prev) / (target - prev)) * 100;
    
    challengeFill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    
    if (nextIndex === -1) {
        challengeLabel.textContent = 'Legend cleared';
        challengeCopy.textContent = 'You already broke the final rung.';
    } else {
        const remain = Math.max(0, target - reference);
        challengeLabel.textContent = `Next target: ${challengeTiers[current].title} ${target}`;
        challengeCopy.textContent = remain === 0 ? 'Target locked in. Keep climbing.' : `${remain} point${remain === 1 ? '' : 's'} to go`;
    }
    
    challengeList.innerHTML = '';
    challengeTiers.forEach((tier, index) => {
        const item = document.createElement('div');
        item.className = `challenge-step${game.bestScore >= tier.target ? ' complete' : ''}${index === current && nextIndex !== -1 ? ' active' : ''}`;
        item.innerHTML = `<div><strong>${tier.title}</strong><span>${tier.copy}</span></div><strong>${tier.target}</strong>`;
        challengeList.appendChild(item);
    });
}

function resetGame() {
    // Dynamically set starting requirement based on Upgrade shop level
    const startReq = storeUpgrades.find(u => u.id === 'quickCharge').effects[save.upgrades.quickCharge];
    Object.assign(game, {
        score: 0, elapsed: 0, spawnTimer: 0, spawnInterval: .92, enemySpeedBonus: 0, combo: 0, flashAlpha: 0, 
        celebrationText: '', celebrationAccent: '#ffd45f', celebrationTimer: 0, celebrationDuration: 0, 
        powerJumpCharges: 0, nextPowerJumpScore: startReq, praiseMilestone: 10, difficultyMilestone: 18, 
        difficultyStage: 0, lastSmashValue: 0, lastTime: 0, screenShake: 0, pulseTimer: 0
    });
    Object.assign(player, { x: playerStart.x, y: playerStart.y, dy: 0, grounded: true, squash: 1, stretch: 1, blinkTimer: 1 + Math.random() * 2, blinkDuration: 0, powerJumpActive: false });
    particles.length = 0; enemies = []; 
    touchState.lastX = null; touchState.startY = null; 
    updateHud(); updateChallengeUI();
}

function startGame() {
    resetGame(); game.state = 'running'; overlay.hidden = true; menuFeatures.hidden = false; shareButton.hidden = true; overlayStats.hidden = true;
    statusEl.textContent = `Dodge for survival points. Charged smash lands every ${game.nextPowerJumpScore} score.`;
    playStack([{ frequency: 360, duration: .06, type: 'square', volume: .08 }, { frequency: 560, duration: .08, type: 'triangle', volume: .08, delay: .04 }, { frequency: 820, duration: .09, type: 'triangle', volume: .06, delay: .08 }]);
}

function pauseGame() {
    game.state = 'paused'; 
    touchState.lastX = null; touchState.startY = null;
    setOverlay({
        title: 'Paused', message: 'The lane is frozen. Jump back in when you are ready.', flavor: 'Your score and charges are waiting.', buttonLabel: 'Resume Run', showStats: false, showShare: false,
        features: [
            { title: 'Current goal', body: `Next challenge rung is ${getCurrentChallengeLabel()}.` },
            { title: 'Charged smashes', body: game.powerJumpCharges > 0 ? `${game.powerJumpCharges} smash charge${game.powerJumpCharges === 1 ? '' : 's'} ready.` : `Next charge unlocks at ${game.nextPowerJumpScore} points.` }
        ]
    });
    statusEl.textContent = 'Game paused.';
}

function resumeGame() { game.state = 'running'; overlay.hidden = true; statusEl.textContent = 'Back in the lane. Keep the board clean.'; }

function showMenu() {
    game.state = 'menu';
    const startReq = storeUpgrades.find(u => u.id === 'quickCharge').effects[save.upgrades.quickCharge];
    setOverlay({
        title: 'Ready to dodge?', message: 'Move left and right, jump over closing lanes, and spend a charged smash on the right block at the right time.', flavor: 'Fast runs. Clear stakes. No extra fluff.', buttonLabel: 'Start Run', showStats: false, showShare: false,
        features: [
            { title: 'Dodge = +1', body: 'Every block you survive adds one point and pushes the heat upward.' },
            { title: 'Charged smash = block value', body: `Survive ${startReq} points to charge. Break a numbered block to cash its exact value.` }
        ]
    });
    statusEl.textContent = 'Press Start Run to drop into the lane.'; scheduleIdlePrompt();
}

function setOverlay({ title, message, flavor, buttonLabel, showStats, showShare, features }) {
    overlayTitle.textContent = title; overlayMessage.textContent = message; overlayFlavor.textContent = flavor;
    actionButton.textContent = buttonLabel; shareButton.hidden = !showShare; overlayStats.hidden = !showStats;
    renderFeatureList(features || []); overlay.hidden = false;
}

function renderFeatureList(items) {
    menuFeatures.innerHTML = '';
    items.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `${escapeHtml(item.title)}<span>${escapeHtml(item.body)}</span>`;
        menuFeatures.appendChild(li);
    });
}

function endGame() {
    const isNewBest = game.score > game.bestScore, earnedCredits = Math.max(3, Math.floor(game.score / 3) + Math.floor(game.combo / 6));
    game.state = 'gameover'; game.coins += earnedCredits; 
    touchState.lastX = null; touchState.startY = null;
    if (isNewBest) game.bestScore = game.score;
    save.bestScore = game.bestScore; save.coins = game.coins;
    
    if (game.score > 0) insertLeaderboardEntry({ name: 'You', score: game.score, tag: isNewBest ? 'Fresh best run' : `Last run ${Math.max(1, Math.round(game.elapsed))}s`, isPlayer: true });
    
    persistSave(); renderLeaderboard(); renderSkins(); renderUpgrades(); updateHud(); updateChallengeUI();
    
    overlayScore.textContent = String(game.score); overlayBest.textContent = String(game.bestScore); overlayCredits.textContent = String(earnedCredits);
    
    setOverlay({
        title: isNewBest ? 'New Best Run' : 'Run Over', message: `Score ${game.score}. You banked ${earnedCredits} credits this run.`, flavor: getRunReaction(game.score, game.elapsed, isNewBest, game.lastSmashValue), buttonLabel: 'Run It Back', showStats: true, showShare: game.score > 0,
        features: [
            { title: 'Best run', body: `${game.bestScore} is the number to beat now.` },
            { title: 'Next ladder rung', body: getNextChallengeCopy(game.bestScore) }
        ]
    });
    statusEl.textContent = isNewBest ? 'That run moved the board.' : 'One cleaner dodge chain and you are back in it.';
    burst(particles, player.x + player.size / 2, player.y + player.size / 2, 28, getSelectedSkin().color, 132);
    playDeathSound(); game.flashAlpha = .22; game.screenShake = .35;
}

function insertLeaderboardEntry(entry) { save.leaderboard = save.leaderboard.filter(item => !item.isPlayer).concat(entry).sort((a, b) => b.score - a.score).slice(0, 8); }

function getRunReaction(score, elapsed, isNewBest, lastSmashValue) {
    const seconds = Math.max(1, Math.round(elapsed));
    if (isNewBest && score >= 50) return `You lasted ${seconds} seconds and bent the whole board around you.${lastSmashValue > 0 ? ` That ${lastSmashValue}-point smash helped.` : ''}`;
    if (score < 5) return `You lasted ${seconds} seconds. The board is not impressed.`;
    if (score < 15) return `You lasted ${seconds} seconds. The lane smelled hesitation, which is rude but fair.`;
    if (score < 30) return `You lasted ${seconds} seconds. One sharper dodge and this turns into a statement run.`;
    if (score < 60) return `You lasted ${seconds} seconds. That was close to becoming a leaderboard problem.`;
    return `You lasted ${seconds} seconds. The board is officially nervous.`;
}

function getNextChallengeCopy(score) { const next = challengeTiers.find(t => score < t.target); return next ? `${Math.max(0, next.target - score)} more point${next.target - score === 1 ? '' : 's'} to hit ${next.title}.` : 'Legend is already cleared. Keep stretching the board.'; }
function getCurrentChallengeLabel() { const next = challengeTiers.find(t => game.score < t.target); return next ? `${next.title} ${next.target}` : 'Legend cleared'; }
function getHeatLabel() { return heatLabels[Math.min(game.difficultyStage, heatLabels.length - 1)]; }

function jump() {
    player.dy = player.jumpPower; player.grounded = false; player.stretch = 1.18; player.squash = .88; player.powerJumpActive = game.powerJumpCharges > 0;
    if (player.powerJumpActive) {
        game.powerJumpCharges -= 1; 
        triggerCelebration('SMASH READY', '#7cf0b6', .82, 'Smash ready!');
        statusEl.textContent = game.powerJumpCharges > 0 ? `${game.powerJumpCharges} charged smash${game.powerJumpCharges === 1 ? '' : 'es'} still in reserve.` : 'Charged smash spent. Get the next score mark for another.';
        playStack([{ frequency: 420, duration: .05, type: 'square', volume: .1 }, { frequency: 630, duration: .06, type: 'sawtooth', volume: .08, delay: .02 }, { frequency: 920, duration: .08, type: 'triangle', volume: .07, delay: .05 }]);
    } else {
        playStack([{ frequency: 540, duration: .05, type: 'square', volume: .06 }, { frequency: 760, duration: .04, type: 'triangle', volume: .05, delay: .02 }]);
    }
    burst(particles, player.x + player.size / 2, player.y + player.size, 7, getSelectedSkin().accent, 44);
}

function awardDodge(enemy) {
    game.score += 1; game.combo += 1;
    if (game.combo > 0 && game.combo % 8 === 0) {
        game.coins += 1; save.coins = game.coins;
        statusEl.textContent = `Combo bonus. ${game.combo} clean dodges banked an extra credit.`;
        playStack([{ frequency: 710, duration: .05, type: 'triangle', volume: .08 }, { frequency: 980, duration: .04, type: 'triangle', volume: .06, delay: .03 }]);
    } else if (game.score % 6 === 0) {
        statusEl.textContent = `Heat climbing. Stay alive to unlock the next charged smash at ${game.nextPowerJumpScore}.`;
        playStack([{ frequency: 640, duration: .03, type: 'triangle', volume: .06 }, { frequency: 860, duration: .025, type: 'triangle', volume: .05, delay: .02 }]);
    } else {
        playStack([{ frequency: 590, duration: .025, type: 'triangle', volume: .05 }, { frequency: 780, duration: .022, type: 'triangle', volume: .04, delay: .015 }]);
    }
    burst(particles, enemy.x + enemy.size / 2, canvas.height - 10, 4, enemy.color, 32);
    handleMilestones(); updateHud(); updateChallengeUI();
}

function awardPowerJumpBreak(enemy) {
    game.score += enemy.label; game.combo += 3; game.lastSmashValue = enemy.label;
    game.screenShake = 0.35; 
    
    // NEW: TTS Callout for Smash
    triggerCelebration(`+${enemy.label} SMASH`, '#7cf0b6', .78, `Smashed for ${enemy.label}!`);
    burst(particles, enemy.x + enemy.size / 2, enemy.y + enemy.size / 2, 18, '#fff1b7', 98);
    burst(particles, enemy.x + enemy.size / 2, enemy.y + enemy.size / 2, 14, enemy.color, 76);
    statusEl.textContent = `Block ${enemy.label} shattered for ${enemy.label} points.`;
    player.powerJumpActive = false;
    playStack([{ frequency: 240, endFrequency: 180, duration: .1, type: 'sawtooth', volume: .08 }, { frequency: 520, duration: .05, type: 'square', volume: .08, delay: .02 }, { frequency: 940, duration: .09, type: 'triangle', volume: .08, delay: .04 }]);
    handleMilestones(); updateHud(); updateChallengeUI();
}

function handleMilestones() {
    const chargeReq = storeUpgrades.find(u => u.id === 'quickCharge').effects[save.upgrades.quickCharge];
    const maxCharges = storeUpgrades.find(u => u.id === 'deepPockets').effects[save.upgrades.deepPockets];

    while (game.score >= game.praiseMilestone) {
        // NEW: TTS Callout for Level Up
        triggerCelebration(`${game.praiseMilestone} LOCKED`, '#ffd45f', .92, `Awesome, well done! Level ${game.praiseMilestone} locked!`);
        burst(particles, player.x + player.size / 2, player.y, 12, '#ffd45f', 58);
        playStack([{ frequency: 720, duration: .04, type: 'triangle', volume: .06 }, { frequency: 860, duration: .05, type: 'triangle', volume: .07, delay: .03 }, { frequency: 1020, duration: .06, type: 'triangle', volume: .07, delay: .06 }]);
        game.praiseMilestone += 10;
    }
    while (game.score >= game.difficultyMilestone) {
        game.difficultyStage += 1; game.difficultyMilestone += 18; game.flashAlpha = .13;
        statusEl.textContent = `Heat spike. ${getHeatLabel()} mode is live.`;
        playStack([{ frequency: 280, duration: .05, type: 'sawtooth', volume: .06 }, { frequency: 420, duration: .05, type: 'square', volume: .07, delay: .03 }, { frequency: 620, duration: .06, type: 'triangle', volume: .06, delay: .06 }]);
    }
    while (game.score >= game.nextPowerJumpScore) {
        game.nextPowerJumpScore += chargeReq;
        if (game.powerJumpCharges < maxCharges) {
            game.powerJumpCharges += 1;
            // NEW: TTS Callout for Unlock
            triggerCelebration('CHARGED JUMP', '#7cf0b6', 1.08, 'Charged jump ready!');
            burst(particles, player.x + player.size / 2, player.y, 16, '#7cf0b6', 76);
            statusEl.textContent = 'Charged smash unlocked. Jump into a numbered block to cash its full value.';
            playStack([{ frequency: 520, duration: .05, type: 'square', volume: .08 }, { frequency: 720, duration: .06, type: 'square', volume: .07, delay: .03 }, { frequency: 980, duration: .1, type: 'triangle', volume: .08, delay: .06 }]);
        }
    }
}

// NEW: Added Text-To-Speech integration via `speechText` parameter
function triggerCelebration(text, accent, duration, speechText) { 
    game.celebrationText = text; game.celebrationAccent = accent; game.celebrationDuration = duration; game.celebrationTimer = duration; 
    if(save.soundEnabled && speechText && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(speechText);
        utterance.volume = 1; utterance.rate = 1.1;
        window.speechSynthesis.speak(utterance);
    }
}

function update(dt) {
    updatePreview(dt);
    if (game.state !== 'running') { updateParticles(particles, dt); return; }
    
    game.elapsed += dt;
    game.enemySpeedBonus = Math.min(260, game.difficultyStage * 34 + game.elapsed * 5);
    game.spawnInterval = Math.max(.34, .92 - game.difficultyStage * .05 - game.elapsed * .004);
    game.spawnTimer += dt;
    game.flashAlpha = Math.max(0, game.flashAlpha - dt * .5);
    game.screenShake = Math.max(0, game.screenShake - dt);
    game.celebrationTimer = Math.max(0, game.celebrationTimer - dt);
    
    game.pulseTimer += dt;
    const pulseInterval = Math.max(.22, .95 - game.difficultyStage * .15 - game.elapsed * .004);
    if (game.pulseTimer >= pulseInterval) {
        game.pulseTimer -= pulseInterval;
        playStack([{ frequency: 65 + game.difficultyStage * 8, duration: .12, type: 'sine', volume: .05 }]);
    }

    const movingLeft = keys.ArrowLeft || keys.KeyA;
    const movingRight = keys.ArrowRight || keys.KeyD;
    const wantsJump = keys.Space || keys.ArrowUp || keys.KeyW;
    
    if (movingLeft) player.x -= player.speed * dt;
    if (movingRight) player.x += player.speed * dt;
    if (wantsJump && player.grounded) { jump(); keys.Space = false; keys.ArrowUp = false; keys.KeyW = false; }
    
    player.x = Math.max(0, Math.min(canvas.width - player.size, player.x));
    player.dy += 1500 * dt; player.y += player.dy * dt; player.blinkTimer -= dt;
    
    if (player.blinkDuration > 0) player.blinkDuration = Math.max(0, player.blinkDuration - dt);
    else if (player.blinkTimer <= 0) { player.blinkDuration = .12; player.blinkTimer = 1 + Math.random() * 2.2; }
    
    player.squash += (1 - player.squash) * 10 * dt; player.stretch += (1 - player.stretch) * 10 * dt;
    
    if (player.y + player.size >= canvas.height) {
        if (!player.grounded && player.dy > 120) {
            burst(particles, player.x + player.size / 2, canvas.height - 4, 8, getSelectedSkin().accent, 42);
            playStack([{ frequency: 200, duration: .035, type: 'triangle', volume: .06 }]);
        }
        player.y = canvas.height - player.size; player.dy = 0; player.grounded = true; player.squash = 1.13; player.stretch = .92; player.powerJumpActive = false;
    }
    
    // NEW: Centralized Spawner with Squeeze and Jackpot hazards
    while (game.spawnTimer >= game.spawnInterval) { 
        game.spawnTimer -= game.spawnInterval; 
        const isSqueeze = game.difficultyStage >= 1 && Math.random() < 0.12;
        
        if (isSqueeze) {
            const gapIndex = Math.floor(Math.random() * 5); 
            const blockW = canvas.width / 5;
            for(let i=0; i<5; i++) {
                if (i === gapIndex) continue;
                enemies.push({ x: i * blockW + 5, y: -40, size: blockW - 10, speed: 190 + game.enemySpeedBonus, color: '#ff5454', label: 2 + Math.floor(Math.random()*5), spin: 0, wobble: 0, isTracker: false, shape: 'square', emoji: null, isJackpot: false });
            }
        } else {
            const isJackpot = game.difficultyStage >= 1 && Math.random() < 0.08;
            const size = 18 + Math.random() * 28;
            const label = isJackpot ? 50 : 2 + Math.floor(Math.random() * 10);
            const isTracker = !isJackpot && game.difficultyStage >= 2 && Math.random() < 0.25;
            const shapeTypes = ['square', 'circle', 'triangle', 'fruit'];
            const emojis = ['🍎', '🍉', '🍌', '🍒'];
            const shape = isJackpot ? 'diamond' : shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
            const emoji = shape === 'fruit' ? emojis[Math.floor(Math.random() * emojis.length)] : null;
            const color = isJackpot ? '#ffd45f' : (isTracker ? '#b252ff' : (label >= 8 ? '#ff7b66' : '#ff5454'));
            
            enemies.push({ x: Math.random() * (canvas.width - size), y: -size, size, speed: (isJackpot ? 320 : 190) + Math.random() * 110 + game.enemySpeedBonus, color, label, spin: (Math.random() - .5) * .08, wobble: Math.random() * Math.PI * 2, isTracker, shape, emoji, isJackpot });
        }
    }
    
    enemies = enemies.filter(enemy => {
        enemy.y += enemy.speed * dt;
        
        if (enemy.isTracker) {
            const trackSpeed = 70 + game.difficultyStage * 18;
            enemy.x += Math.sign((player.x + player.size / 2) - (enemy.x + enemy.size / 2)) * trackSpeed * dt;
        } else {
            enemy.x += Math.sin(game.elapsed * 2.3 + enemy.wobble) * enemy.spin * 14;
        }
        
        enemy.x = Math.max(0, Math.min(canvas.width - enemy.size, enemy.x));
        
        const collided = player.x < enemy.x + enemy.size && player.x + player.size > enemy.x && player.y < enemy.y + enemy.size && player.y + player.size > enemy.y;
        if (collided) {
            if (player.powerJumpActive) { awardPowerJumpBreak(enemy); return false; }
            endGame(); return true;
        }
        if (enemy.y > canvas.height) { awardDodge(enemy); return false; }
        return true;
    });
    updateParticles(particles, dt);
}

function updatePreview(dt) {
    preview.elapsed += dt; preview.spawnTimer += dt; preview.flashAlpha = Math.max(0, preview.flashAlpha - dt * .6);
    const p = preview.player, floor = previewCanvas.height - 30;
    p.x = Math.max(18, Math.min(previewCanvas.width - p.size - 18, previewCanvas.width / 2 + Math.sin(preview.elapsed * 1.3) * 128));
    if (Math.sin(preview.elapsed * 1.7) > .94 && p.grounded) { p.dy = -430; p.grounded = false; p.stretch = 1.16; p.squash = .88; p.powerJumpActive = Math.sin(preview.elapsed * .7) > .55; }
    p.dy += 1180 * dt; p.y += p.dy * dt; p.blinkTimer -= dt;
    if (p.blinkDuration > 0) p.blinkDuration = Math.max(0, p.blinkDuration - dt);
    else if (p.blinkTimer <= 0) { p.blinkDuration = .1; p.blinkTimer = 1 + Math.random() * 1.8; }
    p.squash += (1 - p.squash) * 10 * dt; p.stretch += (1 - p.stretch) * 10 * dt;
    if (p.y + p.size >= floor) { p.y = floor - p.size; p.dy = 0; p.grounded = true; p.powerJumpActive = false; p.squash = 1.1; p.stretch = .94; }
    
    // Spawn simple squares for preview
    while (preview.spawnTimer >= preview.spawnInterval) { 
        preview.spawnTimer -= preview.spawnInterval; 
        const size = 18 + Math.random() * 28, label = 2 + Math.floor(Math.random() * 10);
        preview.enemies.push({ x: Math.random() * (previewCanvas.width - size), y: -size, size, speed: 190 + Math.random() * 110 + 42, color: label >= 8 ? '#ff7b66' : '#ff5454', label, spin: (Math.random() - .5) * .08, wobble: Math.random() * Math.PI * 2, shape: 'square' });
    }
    
    preview.enemies = preview.enemies.filter(enemy => {
        enemy.y += enemy.speed * dt * .85; enemy.x += Math.sin(preview.elapsed * 2.1 + enemy.wobble) * enemy.spin * 10;
        const collided = p.x < enemy.x + enemy.size && p.x + p.size > enemy.x && p.y < enemy.y + enemy.size && p.y + p.size > enemy.y;
        if (collided) {
            if (p.powerJumpActive) { burst(preview.particles, enemy.x + enemy.size / 2, enemy.y + enemy.size / 2, 12, '#fff1b7', 86); burst(preview.particles, enemy.x + enemy.size / 2, enemy.y + enemy.size / 2, 10, enemy.color, 68); preview.flashAlpha = .14; preview.score += enemy.label; preview.combo += 2; return false; }
            burst(preview.particles, p.x + p.size / 2, p.y + p.size / 2, 8, '#ff7b66', 52); preview.flashAlpha = .1; preview.score = 16; preview.combo = 4; preview.enemies.length = 0; return false;
        }
        if (enemy.y > previewCanvas.height) { preview.score += 1; preview.combo += 1; return false; }
        return true;
    });
    updateParticles(preview.particles, dt);
}

function updateParticles(list, dt) {
    for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.alpha = Math.max(0, p.life / p.maxLife);
        if (p.life <= 0) list.splice(i, 1);
    }
}

function burst(list, x, y, count, color, force) {
    for (let i = 0; i < count; i++) {
        const angle = Math.PI * 2 * i / count + Math.random() * .24, speed = force * (.4 + Math.random() * .8);
        list.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, color, life: .42 + Math.random() * .25, maxLife: .62 });
    }
}

// NEW: Dynamic Background color shift
function drawBackground(target, width, height, elapsed, flashAlpha) {
    const heatIdx = Math.min(game.difficultyStage, 4);
    const colors = heatColors[heatIdx];
    
    const g = target.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, colors[0]); g.addColorStop(.45, colors[1]); g.addColorStop(1, colors[2]);
    target.fillStyle = g; target.fillRect(0, 0, width, height);
    
    const halo = target.createRadialGradient(width * .5, height * .18, 18, width * .5, height * .18, width * .75);
    halo.addColorStop(0, 'rgba(112,246,255,.22)'); halo.addColorStop(1, 'rgba(112,246,255,0)');
    target.fillStyle = halo; target.fillRect(0, 0, width, height);
    
    const floorGlow = target.createLinearGradient(0, height * .78, 0, height);
    floorGlow.addColorStop(0, 'rgba(255,212,95,0)'); floorGlow.addColorStop(1, 'rgba(255,212,95,.12)');
    target.fillStyle = floorGlow; target.fillRect(0, height * .78, width, height * .22);
    
    for (let i = 0; i < 18; i++) {
        const y = (i * 34 + elapsed * 74) % (height + 36), alpha = .02 + (i % 5) * .012;
        target.fillStyle = `rgba(255,255,255,${alpha})`; target.fillRect(0, y, width, 2);
    }
    for (let i = 0; i < 12; i++) {
        const x = (i * 48 + Math.sin(elapsed * .6 + i) * 16 + elapsed * 12) % (width + 60), y = (i * 60 + elapsed * 24) % (height + 80);
        target.fillStyle = 'rgba(255,255,255,.07)'; target.fillRect(x, y, 2, 2);
    }
    
    target.fillStyle = 'rgba(255,255,255,.1)'; target.fillRect(0, height - 30, width, 3);
    if (flashAlpha > 0) { target.fillStyle = `rgba(255,255,255,${flashAlpha})`; target.fillRect(0, 0, width, height); }
}

function drawPlayer(target, actor, skin) {
    const w = actor.size * actor.squash, h = actor.size * actor.stretch, ox = (actor.size - w) / 2, oy = (actor.size - h) / 2;
    const eyeH = actor.blinkDuration > 0 ? h * .04 : h * .16, eyeY = actor.y + oy + h * .26, x = actor.x + ox, y = actor.y + oy;
    const g = target.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, skin.accent); g.addColorStop(.5, skin.color); g.addColorStop(1, shadeColor(skin.color, -32));
    
    target.save();
    target.fillStyle = g; target.shadowBlur = actor.powerJumpActive ? 32 : 22; target.shadowColor = actor.powerJumpActive ? '#7cf0b6' : `${skin.color}aa`;
    target.fillRect(x, y, w, h);
    target.fillStyle = 'rgba(255,255,255,.18)'; target.fillRect(x + w * .12, y + h * .1, w * .18, h * .54);
    target.fillStyle = skin.accent; target.fillRect(x + w * .22, eyeY, w * .16, eyeH); target.fillRect(x + w * .62, eyeY, w * .16, eyeH);
    target.fillStyle = 'rgba(4,16,24,.4)'; target.fillRect(x + w * .3, y + h * .72, w * .38, Math.max(2, h * .08));
    target.strokeStyle = 'rgba(255,255,255,.14)'; target.lineWidth = 2; target.strokeRect(x + 1, y + 1, w - 2, h - 2);
    
    if (actor.powerJumpActive) { target.strokeStyle = '#d8fff0'; target.lineWidth = 3; target.strokeRect(x - 4, y - 4, w + 8, h + 8); }
    target.restore();
}

// NEW: Shape Mixer Drawing Logic
function drawEnemies(target, list, elapsed, height) {
    list.forEach(enemy => {
        const pulse = .84 + Math.sin(elapsed * 4 + enemy.wobble) * .16, size = enemy.size;
        
        target.save();
        target.translate(enemy.x + size / 2, enemy.y + size / 2);
        target.rotate(enemy.y / height * enemy.spin * 6);
        target.shadowBlur = 16 + pulse * 10; target.shadowColor = `${enemy.color}aa`;
        
        if (enemy.shape === 'fruit') {
            target.font = `${size * 0.9}px Arial`;
            target.textAlign = 'center'; target.textBaseline = 'middle';
            target.fillText(enemy.emoji, 0, 0);
            
            // Background dot so text is readable over the emoji
            target.fillStyle = 'rgba(0,0,0,0.6)';
            target.beginPath(); target.arc(0, 0, size * 0.4, 0, Math.PI * 2); target.fill();
        } else {
            const g = target.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2);
            g.addColorStop(0, '#ffe6de'); g.addColorStop(.35, enemy.color); g.addColorStop(1, shadeColor(enemy.color, -34));
            target.fillStyle = g;
            target.strokeStyle = enemy.isJackpot ? '#ffffff' : (enemy.isTracker ? '#f2c2ff' : (enemy.label >= 8 ? '#ffe3a8' : '#ffc4b9'));
            target.lineWidth = 2;
            
            target.beginPath();
            if (enemy.shape === 'circle') {
                target.arc(0, 0, size/2, 0, Math.PI * 2);
            } else if (enemy.shape === 'triangle') {
                target.moveTo(0, -size/2); target.lineTo(size/2, size/2); target.lineTo(-size/2, size/2); target.closePath();
            } else if (enemy.shape === 'diamond') {
                target.moveTo(0, -size/2); target.lineTo(size/2, 0); target.lineTo(0, size/2); target.lineTo(-size/2, 0); target.closePath();
            } else {
                target.rect(-size / 2, -size / 2, size, size);
            }
            target.fill(); target.stroke();
            
            if (enemy.shape === 'square') {
                target.fillStyle = 'rgba(255,255,255,.16)'; target.fillRect(-size * .28, -size * .3, size * .18, size * .58);
            }
        }
        
        target.fillStyle = '#fffaf1'; target.font = `bold ${Math.max(10, size * .34)}px "Press Start 2P"`;
        target.textAlign = 'center'; target.textBaseline = 'middle';
        target.fillText(String(enemy.label), 0, 2);
        target.restore();
    });
}

function drawParticles(target, list) {
    list.forEach(p => {
        target.save(); target.globalAlpha = p.alpha; target.fillStyle = p.color; target.shadowBlur = 10; target.shadowColor = p.color;
        target.fillRect(p.x, p.y, 4, 4); target.restore();
    });
}

function drawRunInfo() {
    if (game.state !== 'running') return;
    ctx.save();
    const g = ctx.createLinearGradient(14, 14, 226, 86);
    g.addColorStop(0, 'rgba(5,12,23,.86)'); g.addColorStop(1, 'rgba(17,45,68,.72)');
    ctx.fillStyle = g; ctx.fillRect(14, 14, 220, 82);
    ctx.strokeStyle = 'rgba(112,246,255,.28)'; ctx.lineWidth = 1.5; ctx.strokeRect(14.75, 14.75, 218.5, 80.5);
    
    ctx.fillStyle = '#f6fbff'; ctx.font = '12px "Press Start 2P"';
    ctx.fillText(`COMBO ${game.combo}`, 24, 38);
    ctx.fillStyle = game.powerJumpCharges > 0 ? '#7cf0b6' : '#d7e4ef'; ctx.fillText(`SMASH ${game.powerJumpCharges}`, 24, 62);
    ctx.fillStyle = '#ffd45f'; ctx.fillText(`NEXT ${game.nextPowerJumpScore}`, 24, 86);
    ctx.fillStyle = '#9ab0c8'; ctx.fillText(`HEAT ${getHeatLabel().toUpperCase()}`, 132, 38);
    ctx.fillText(`BEST ${game.bestScore}`, 132, 62); ctx.fillText(`SCORE ${game.score}`, 132, 86);
    ctx.restore();
}

function drawCelebration() {
    if (game.celebrationTimer <= 0) return;
    const progress = game.celebrationTimer / game.celebrationDuration, alpha = Math.min(1, progress * 1.5), scale = 1 + (1 - progress) * .12;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height * .24); ctx.scale(scale, scale);
    ctx.fillStyle = `rgba(4,8,16,${.24 + alpha * .48})`; ctx.fillRect(-142, -32, 284, 64);
    ctx.strokeStyle = game.celebrationAccent; ctx.lineWidth = 3; ctx.strokeRect(-142, -32, 284, 64);
    ctx.fillStyle = game.celebrationAccent; ctx.font = '16px "Press Start 2P"'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = alpha;
    ctx.fillText(game.celebrationText, 0, 2);
    ctx.restore();
}

function render() {
    const skin = getSelectedSkin();
    drawBackground(ctx, canvas.width, canvas.height, game.elapsed, game.flashAlpha);
    
    ctx.save();
    if (game.state === 'running' && game.screenShake > 0) {
        const intensity = game.screenShake * 40;
        ctx.translate((Math.random() - .5) * intensity, (Math.random() - .5) * intensity);
    }
    drawParticles(ctx, particles);
    drawPlayer(ctx, player, skin);
    drawEnemies(ctx, enemies, game.elapsed, canvas.height);
    ctx.restore();
    
    drawRunInfo(); drawCelebration();
    drawBackground(previewCtx, previewCanvas.width, previewCanvas.height, preview.elapsed, preview.flashAlpha);
    drawParticles(previewCtx, preview.particles); drawPlayer(previewCtx, preview.player, skins[1]);
    drawEnemies(previewCtx, preview.enemies, preview.elapsed, previewCanvas.height); drawPreviewHud();
}

function drawPreviewHud() {
    previewCtx.save(); previewCtx.fillStyle = 'rgba(4,8,16,.7)'; previewCtx.fillRect(12, 12, 190, 54);
    previewCtx.strokeStyle = 'rgba(112,246,255,.24)'; previewCtx.strokeRect(12.5, 12.5, 189, 53);
    previewCtx.fillStyle = '#f6fbff'; previewCtx.font = '10px "Press Start 2P"'; previewCtx.fillText(`SCORE ${preview.score}`, 22, 33);
    previewCtx.fillStyle = '#7cf0b6'; previewCtx.fillText('LIVE LOOP', 22, 55);
    previewCtx.restore();
}

function unlockAudio() {
    if (audio.context) return;
    const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
    // NEW: Volume increased from .08 to .35
    audio.context = new Ctx(); audio.master = audio.context.createGain(); audio.master.gain.value = .35; audio.master.connect(audio.context.destination);
    
    // Attempt to wake up Speech Synthesis early
    if (window.speechSynthesis) window.speechSynthesis.getVoices();
}

function playStack(notes) {
    if (!save.soundEnabled || !audio.context || !audio.master) return;
    notes.forEach(note => {
        const osc = audio.context.createOscillator(), gain = audio.context.createGain(), start = audio.context.currentTime + (note.delay || 0), end = start + note.duration;
        osc.type = note.type; osc.frequency.setValueAtTime(note.frequency, start);
        if (note.endFrequency) osc.frequency.exponentialRampToValueAtTime(Math.max(1, note.endFrequency), end);
        gain.gain.setValueAtTime(Math.max(.0001, note.volume), start); gain.gain.exponentialRampToValueAtTime(.0001, end);
        osc.connect(gain); gain.connect(audio.master); osc.start(start); osc.stop(end);
    });
}

function playDeathSound() { playStack([{ frequency: 260, endFrequency: 120, duration: .22, type: 'sawtooth', volume: .1 }, { frequency: 430, endFrequency: 180, duration: .18, type: 'square', volume: .08, delay: .03 }]); }
function shareScore(score) { window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I scored ${score} on Square Dodger - beat me: ${SHARE_URL}`)}`, '_blank', 'noopener,noreferrer'); }
function shadeColor(hex, amount) {
    const n = hex.replace('#', ''); if (n.length !== 6) return hex;
    const num = Number.parseInt(n, 16), clamp = v => Math.max(0, Math.min(255, v)), r = clamp((num >> 16) + amount), g = clamp(((num >> 8) & 255) + amount), b = clamp((num & 255) + amount);
    return `rgb(${r}, ${g}, ${b})`;
}
function escapeHtml(value) { return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'); }
function gameLoop(timestamp) { if (!game.lastTime) game.lastTime = timestamp; const dt = Math.min((timestamp - game.lastTime) / 1e3, .032); game.lastTime = timestamp; update(dt); render(); requestAnimationFrame(gameLoop); }
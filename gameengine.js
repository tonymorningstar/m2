var enemies = [];
var GAME_SPEED = 1.0;
const RUN_SPEED = 3.5;
const TERMINAL_V = 10.0;
const WORLD_SIZE = 2400;
const ENEMY_SPEED = 1.5;
const KEY_UP = 38;
const KEY_SPACE = 32;
const KEY_LEFT = 37;
const KEY_RIGHT = 39;
const KEY_DOWN = 40;
const KEY_A = 65;
const KEY_D = 68;
const KEY_W = 87;
const KEY_S = 83;
const OBJ_ABOVE = 1;
const OBJ_BELOW = 2;
const OBJ_LEFT = 3;
const OBJ_RIGHT = 4;
const GROUNDED_TIMER = 500;
const MOTION_LEFT = 0;
const MOTION_RIGHT = 1;
const SETTINGS_KEY = 'mario-game-settings';
const DEFAULT_SETTINGS = {
    sound: true,
    music: true,
    mobileControls: true,
    scanlines: true,
    gameSpeed: 1.0
};
const ENEMY_FRAMES = [
    { x: 8, y: 358, w: 16, h: 16 },
    { x: 32, y: 358, w: 16, h: 16 },
    { x: 57, y: 358, w: 16, h: 16 },
    { x: 80, y: 358, w: 16, h: 16 }
];
const GAME_WIDTH = 400;
const GAME_HEIGHT = 300;
var GRAPHICS = {};
var AUDIO = {};
var settings = {};
var pressedTouchButtons = {};
var controlDebugEl;

var update_interval;
var posX, posY = 200;
var current_speed = 3.0;
var jump_height = 20.0;
var vertialV = 1.0;
var bOnSurface = true;
var bCanJump = true;
var bAttemptingToWarp = false;
var bDead = false;
var stage, mario, coin_counter, stats_pane_coin, debug;
var keysDown = [];
var collidables = [];
var elevators = [];
var coins = [];
var hitables = [];
var coinboxes = [];
var mushroomboxes = [];
var warppipes = [];
var mushrooms = [];
var theta = 0;
var hoizontal_motion_direction = MOTION_RIGHT;
var collideCount = 0;
var enemyAnimTick = 0;

function loadSettings() {
    try {
        var saved = localStorage.getItem(SETTINGS_KEY);
        if (saved) {
            return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(saved));
        }
    } catch (e) {}
    return Object.assign({}, DEFAULT_SETTINGS);
}

function saveSettings() {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {}
}

function applySettings() {
    GAME_SPEED = settings.gameSpeed;
    var scanlines = document.getElementById('scanlines');
    var mobileControls = document.getElementById('mobile-controls');
    if (scanlines) {
        scanlines.classList.toggle('hidden', !settings.scanlines);
    }
    if (mobileControls) {
        mobileControls.classList.toggle('hidden', !settings.mobileControls);
    }
    var speedLabel = document.getElementById('speed-label');
    if (speedLabel) {
        speedLabel.textContent = settings.gameSpeed.toFixed(1) + 'x';
    }
}

function initSettingsUI() {
    settings = loadSettings();
    applySettings();

    document.getElementById('setting-sound').checked = settings.sound;
    document.getElementById('setting-music').checked = settings.music;
    document.getElementById('setting-mobile').checked = settings.mobileControls;
    document.getElementById('setting-scanlines').checked = settings.scanlines;
    document.getElementById('setting-speed').value = settings.gameSpeed;

    document.getElementById('settings-open').addEventListener('click', function () {
        document.getElementById('settings-overlay').classList.remove('hidden');
    });

    document.getElementById('settings-close').addEventListener('click', function () {
        document.getElementById('settings-overlay').classList.add('hidden');
    });

    document.getElementById('settings-reset').addEventListener('click', function () {
        settings = Object.assign({}, DEFAULT_SETTINGS);
        document.getElementById('setting-sound').checked = settings.sound;
        document.getElementById('setting-music').checked = settings.music;
        document.getElementById('setting-mobile').checked = settings.mobileControls;
        document.getElementById('setting-scanlines').checked = settings.scanlines;
        document.getElementById('setting-speed').value = settings.gameSpeed;
        saveSettings();
        applySettings();
        restartGameLoop();
    });

    document.getElementById('setting-sound').addEventListener('change', function () {
        settings.sound = this.checked;
        saveSettings();
    });

    document.getElementById('setting-music').addEventListener('change', function () {
        settings.music = this.checked;
        saveSettings();
        if (!settings.music) {
            var ow = document.getElementById('audio_overworld');
            if (ow) ow.pause();
        }
    });

    document.getElementById('setting-mobile').addEventListener('change', function () {
        settings.mobileControls = this.checked;
        saveSettings();
        applySettings();
    });

    document.getElementById('setting-scanlines').addEventListener('change', function () {
        settings.scanlines = this.checked;
        saveSettings();
        applySettings();
    });

    document.getElementById('setting-speed').addEventListener('input', function () {
        settings.gameSpeed = parseFloat(this.value);
        document.getElementById('speed-label').textContent = settings.gameSpeed.toFixed(1) + 'x';
        saveSettings();
        applySettings();
        restartGameLoop();
    });
}

function playAudio(name) {
    if (!settings.sound) return;
    if (AUDIO[name]) AUDIO[name]();
}

function playMusic() {
    if (!settings.music) return;
    if (AUDIO.overworld) AUDIO.overworld();
}

function restartGameLoop() {
    if (update_interval) {
        clearInterval(update_interval);
    }
    update_interval = setInterval(update, 1000 / (60 * GAME_SPEED));
}

function setEnemyFrame(enemy, frameIndex) {
    var frame = ENEMY_FRAMES[frameIndex % ENEMY_FRAMES.length];
    var scale = 2;
    enemy.el.style.width = (frame.w * scale) + 'px';
    enemy.el.style.height = (frame.h * scale) + 'px';
    enemy.el.style.backgroundSize = (436 * scale) + 'px ' + (673 * scale) + 'px';
    var bx = frame.x * scale;
    var by = frame.y * scale;
    if (enemy.dir < 0) {
        enemy.el.style.transform = 'scaleX(-1)';
    } else {
        enemy.el.style.transform = 'scaleX(1)';
    }
    enemy.el.style.backgroundPosition = '-' + bx + 'px -' + by + 'px';
}

function createEnemy(x, y, leftBound, rightBound) {
    var el = document.createElement('div');
    el.className = 'enemy';
    stage.appendChild(el);
    var enemy = {
        el: el,
        x: x,
        y: y,
        dir: MOTION_RIGHT,
        leftBound: leftBound,
        rightBound: rightBound,
        dead: false,
        frame: 0
    };
    setEnemyFrame(enemy, 0);
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    enemies.push(enemy);
    return enemy;
}

function spawnEnemies(ground_bricks) {
    var groundY = stage.offsetHeight - 32 - 32;
    createEnemy(ground_bricks[4].offsetLeft + 20, groundY, ground_bricks[4].offsetLeft, ground_bricks[6].offsetLeft - 32);
    createEnemy(ground_bricks[11].offsetLeft + 10, groundY, ground_bricks[11].offsetLeft, ground_bricks[13].offsetLeft - 32);
    createEnemy(ground_bricks[16].offsetLeft + 30, groundY, ground_bricks[16].offsetLeft, ground_bricks[19].offsetLeft - 32);
}

function updateEnemies() {
    enemyAnimTick++;
    for (var i = 0; i < enemies.length; i++) {
        var enemy = enemies[i];
        if (enemy.dead) continue;

        enemy.x += enemy.dir * ENEMY_SPEED;
        if (enemy.x <= enemy.leftBound) {
            enemy.x = enemy.leftBound;
            enemy.dir = MOTION_RIGHT;
        }
        if (enemy.x + enemy.el.offsetWidth >= enemy.rightBound) {
            enemy.x = enemy.rightBound - enemy.el.offsetWidth;
            enemy.dir = MOTION_LEFT;
        }

        if (enemyAnimTick % 12 === 0) {
            enemy.frame = (enemy.frame + 1) % ENEMY_FRAMES.length;
            setEnemyFrame(enemy, enemy.frame);
        }

        enemy.el.style.left = enemy.x + 'px';
    }
}

function checkEnemyCollisions() {
    if (bDead) return;

    for (var i = 0; i < enemies.length; i++) {
        var enemy = enemies[i];
        if (enemy.dead) continue;
        if (!isCloseToMario(enemy.el)) continue;

        var marioBottom = posY + mario.offsetHeight;
        var marioCenterX = posX + mario.offsetWidth / 2;
        var enemyTop = enemy.y;
        var enemyLeft = enemy.x;
        var enemyRight = enemy.x + enemy.el.offsetWidth;

        var falling = vertialV > 0 && !bOnSurface;
        var stomp = falling &&
            marioBottom <= enemyTop + 10 &&
            marioCenterX > enemyLeft &&
            marioCenterX < enemyRight;

        if (stomp) {
            enemy.dead = true;
            enemy.el.className = 'enemy dead';
            vertialV = -jump_height * 0.6;
            bOnSurface = false;
            playAudio('bump');
            animatePoints(enemy.el, 100);
            return;
        }

        if (posX + mario.offsetWidth > enemyLeft &&
            posX < enemyRight &&
            posY + mario.offsetHeight > enemyTop &&
            posY < enemy.y + enemy.el.offsetHeight) {
            killMario();
            return;
        }
    }
}

function killMario() {
    if (bDead) return;
    bDead = true;
    clearInterval(update_interval);
    playAudio('died');
    var ow = document.getElementById('audio_overworld');
    if (ow) ow.pause();
    setTimeout(function () {
        window.location.reload();
    }, 3000 / GAME_SPEED);
}

function update() {
    if (bDead) return;

    if (!bOnSurface) {
        posY += vertialV / 2.0;
    }
    vertialV = vertialV + 1.0;
    if (vertialV > TERMINAL_V) vertialV = TERMINAL_V;

    if (bOnSurface && keysDown.length === 0) {
        vertialV = 0.0;
        setSprite(mario, hoizontal_motion_direction === MOTION_RIGHT ? GRAPHICS.standing_right : GRAPHICS.standing_left);
    }

    bAttemptingToWarp = !(keysDown.indexOf(KEY_DOWN) < 0 && keysDown.indexOf(KEY_S) < 0);

    if (!bAttemptingToWarp && mario.offsetTop > stage.offsetHeight) {
        killMario();
        return true;
    }

    for (var key in keysDown) {
        switch (keysDown[key]) {
            case KEY_RIGHT:
            case KEY_D:
                posX += current_speed;
                if (stage.scrollLeft < WORLD_SIZE)
                    stage.scrollLeft = mario.offsetLeft - stage.offsetWidth / 2 + mario.offsetWidth / 2;
                if (bOnSurface)
                    setSprite(mario, GRAPHICS.running_right);
                hoizontal_motion_direction = MOTION_RIGHT;
                break;
            case KEY_UP:
            case KEY_SPACE:
            case KEY_W:
                if (bOnSurface && bCanJump) {
                    bCanJump = false;
                    playAudio('jump');
                    setTimeout(function () { bCanJump = true; }, GROUNDED_TIMER);
                    vertialV = -jump_height;
                    posY -= jump_height;
                    bOnSurface = false;
                    setSprite(mario, hoizontal_motion_direction === MOTION_RIGHT ? GRAPHICS.jumping_right : GRAPHICS.jumping_left);
                }
                break;
            case KEY_LEFT:
            case KEY_A:
                if (bOnSurface)
                    setSprite(mario, GRAPHICS.running_left);
                posX -= current_speed;
                stage.scrollLeft = mario.offsetLeft - stage.offsetWidth / 2 + mario.offsetWidth / 2;
                hoizontal_motion_direction = MOTION_LEFT;
                break;
            case KEY_DOWN:
            case KEY_S:
                if (bOnSurface)
                    bAttemptingToWarp = true;
                break;
            default:
        }
    }

    theta++;
    for (var e in elevators) {
        var _ePos = 165 + 45 * Math.sin(theta / 80);
        elevators[e].style.top = _ePos + 'px';
    }

    updateEnemies();
    collisionAdjust();
    checkEnemyCollisions();

    mario.style.left = posX + 'px';
    mario.style.top = posY + 'px';
}

function isObtainable(obj) {
    if (mushrooms.indexOf(obj) > -1) {
        removeFromCollection(mushrooms, obj);
        animateFormChange(mario, mario.className, "mario_big", 8);
        playAudio('powerup');
        return true;
    }

    if (coins.indexOf(obj) > -1) {
        removeFromCollection(coins, obj);
        removeFromCollection(collidables, obj);
        animatePoints(obj, 200);
        stage.removeChild(obj);
        takeCoin();
        return true;
    }
    return false;
}

function playHitAnimation(obj) {
    if (hitables.indexOf(obj) > -1) {
        var currY = obj.offsetTop;
        obj.style.top = currY - 5 + "px";
        setTimeout(function () { obj.style.top = currY + "px"; }, 200 / GAME_SPEED);
        playAudio('bump');
    }
    if (coinboxes.indexOf(obj) > -1) {
        var c = document.createElement("img");
        stage.appendChild(c);
        setSprite(c, GRAPHICS.coin);
        c.style.position = "absolute";
        c.style.top = obj.offsetTop + "px";
        c.style.left = obj.offsetLeft + obj.offsetWidth / 2 - c.offsetWidth / 2 + "px";
        obj.style.zIndex = 1000;
        takeCoin();
        animateUp(c, 5, 1, function () { stage.removeChild(c); });
    }
    if (mushroomboxes.indexOf(obj) > -1) {
        removeFromCollection(mushroomboxes, obj);
        var c = document.createElement("img");
        stage.appendChild(c);
        setSprite(c, GRAPHICS.mushroom_head);
        c.style.position = "absolute";
        c.style.top = obj.offsetTop + "px";
        c.style.left = obj.offsetLeft + obj.offsetWidth / 2 - c.offsetWidth / 2 + "px";
        obj.style.zIndex = 1000;
        mushrooms.push(c);
        playAudio('mushroom');
        collidables.push(c);
        coins.push(c);
        animateUp(c, 3.4, 1.0);
    }
}

function animatePoints(obj, pointsValue) {
    var p = document.createElement("div");
    p.className = "points";
    stage.appendChild(p);
    p.innerHTML = pointsValue;
    p.style.top = obj.offsetTop + "px";
    p.style.left = obj.offsetLeft + "px";
    animateUp(p, 4, 1.0, function () {
        stage.removeChild(p);
    });
}

function animateFormChange(obj, originalClassName, newClassName, times) {
    if (times === 0) return;
    obj.className = times % 2 === 0 ? originalClassName : newClassName;
    setTimeout(function () { animateFormChange(obj, originalClassName, newClassName, --times); }, 100 / GAME_SPEED);
}

function animateUp(obj, amount, incY, endCallBack) {
    if (incY >= amount) {
        if (endCallBack) endCallBack();
        return;
    }
    obj.style.top = obj.offsetTop - incY + "px";
    setTimeout(function () { animateUp(obj, amount, incY + 0.2, endCallBack); }, 30 / GAME_SPEED);
}

function animateDown(obj, amount, incY, endCallBack) {
    if (incY >= amount) {
        endCallBack();
        return;
    }
    obj.style.top = obj.offsetTop + incY + "px";
    setTimeout(function () { animateDown(obj, amount, incY + 1, endCallBack); }, 70 / GAME_SPEED);
}

function isWarpPipe(obj) {
    if (warppipes.indexOf(obj) > -1 && bAttemptingToWarp) {
        clearInterval(update_interval);
        mario.className = mario.className + " mario_warping";
        playAudio('pipe');
        animateDown(mario, 15, 1, function () {
            window.location.reload();
        });
    }
}

function takeCoin() {
    coin_counter.innerHTML = parseInt(coin_counter.innerHTML) + 1;
    playAudio('coin');
}

function collisionAdjust() {
    if (posX < 0) posX = 0;
    if (posX + mario.offsetWidth > WORLD_SIZE) posX = WORLD_SIZE - mario.offsetWidth;

    bOnSurface = false;
    collideCount = 0;
    var isFalling = vertialV > 1.0;

    for (var c in collidables) {
        if (!isCloseToMario(collidables[c])) continue;
        collideCount++;

        switch (getSideColliding(collidables[c])) {
            case OBJ_BELOW:
                if (!isFalling) playHitAnimation(collidables[c]);
                if (isObtainable(collidables[c])) break;
                if (bOnSurface) break;
                posY = collidables[c].offsetTop + collidables[c].offsetHeight;
                if (!isFalling) vertialV = 0.0;
                bOnSurface = true;
                break;
            case OBJ_ABOVE:
                if (isObtainable(collidables[c])) break;
                posY = collidables[c].offsetTop - mario.offsetHeight;
                bOnSurface = true;
                vertialV = 0.0;
                if (isWarpPipe(collidables[c])) break;
                current_speed = RUN_SPEED;
                break;
            case OBJ_LEFT:
                if (isObtainable(collidables[c])) break;
                posX = collidables[c].offsetLeft - mario.offsetWidth;
                if (!bCanJump)
                    current_speed = 0.8;
                break;
            case OBJ_RIGHT:
                if (isObtainable(collidables[c])) break;
                posX = collidables[c].offsetLeft + collidables[c].offsetWidth;
                if (!bCanJump)
                    current_speed = 0.8;
                break;
            default:
        }
    }
}

function isCloseToMario(obj) {
    var left = obj.offsetLeft !== undefined ? obj.offsetLeft : parseFloat(obj.style.left) || 0;
    var top = obj.offsetTop !== undefined ? obj.offsetTop : parseFloat(obj.style.top) || 0;
    return Math.abs(left - mario.offsetLeft) < 100 && Math.abs(top - mario.offsetTop) < 100;
}

function getSideColliding(obj) {
    if (posY + mario.offsetHeight > obj.offsetTop &&
        posX + mario.offsetWidth / 2 > obj.offsetLeft &&
        posX + mario.offsetWidth / 2 < obj.offsetLeft + obj.offsetWidth &&
        posY < obj.offsetTop &&
        posY + mario.offsetHeight < obj.offsetTop + obj.offsetHeight)
        return OBJ_ABOVE;
    if (posY > obj.offsetTop &&
        posY < obj.offsetTop + obj.offsetHeight &&
        posX + mario.offsetWidth / 2 > obj.offsetLeft &&
        posX + mario.offsetWidth / 2 < obj.offsetLeft + obj.offsetWidth)
        return OBJ_BELOW;
    if (posX + mario.offsetWidth > obj.offsetLeft &&
        posY + mario.offsetHeight / 2 < obj.offsetTop + obj.offsetHeight &&
        posX < obj.offsetLeft &&
        posY + mario.offsetHeight / 2 > obj.offsetTop)
        return OBJ_LEFT;
    if (posX < obj.offsetLeft + obj.offsetWidth &&
        posX + mario.offsetWidth > obj.offsetLeft + obj.offsetWidth &&
        posY + mario.offsetHeight / 2 > obj.offsetTop &&
        posY + mario.offsetHeight / 2 < obj.offsetTop + obj.offsetHeight)
        return OBJ_RIGHT;

    return 0;
}

function setSprite(obj, src) {
    if (obj.src.indexOf(src) < 0) {
        obj.src = src;
    }
}

function hideSprite(obj) {
    obj.className = obj.className + " hide";
}

function renderWorld(oncomplete) {
    stage.style.backgroundImage = "url('" + GRAPHICS.clouds + "')";
    setSprite(stats_pane_coin, GRAPHICS.coin);

    var ground_bricks = [];
    for (var i = 0; i < 24; i++) {
        var gU = dropUnit(null, GRAPHICS.ground_brick, i * 100, stage.offsetHeight - 32);
        ground_bricks.push(gU);
        if ([3, 18, 19].indexOf(i) > -1) {
            hideSprite(gU);
        } else {
            collidables.push(ground_bricks[i]);
        }
    }

    var p1 = dropUnit(ground_bricks[0], GRAPHICS.ground_pipe);
    collidables.push(p1);

    dropUnit(ground_bricks[1], GRAPHICS.bush, 50);
    dropUnit(ground_bricks[5], GRAPHICS.bush);
    dropUnit(ground_bricks[7], GRAPHICS.bush);
    dropUnit(ground_bricks[10], GRAPHICS.bush);
    dropUnit(ground_bricks[15], GRAPHICS.bush);

    var cb1 = dropUnit(ground_bricks[14], GRAPHICS.question_block, null, -64);
    coinboxes.push(cb1);
    hitables.push(cb1);
    collidables.push(cb1);

    var b4 = dropUnit(ground_bricks[9], GRAPHICS.ground_pipe);
    var b5 = dropUnit(ground_bricks[8], GRAPHICS.question_block, -30, -150);

    hitables.push(b5);
    coinboxes.push(b5);

    var bb1;
    for (var j = 0; j < 3; j++) {
        bb1 = dropUnit(ground_bricks[5], GRAPHICS.block_brick, j * 32, -64);
        hitables.push(bb1);
        collidables.push(bb1);
        if (j === 1) {
            mushroomboxes.push(bb1);
        }
    }
    for (var k = 0; k < 3; k++) {
        bb1 = dropUnit(ground_bricks[7], GRAPHICS.block_brick, k * 32, -64);
        hitables.push(bb1);
        collidables.push(bb1);
    }
    var b6 = dropUnit(ground_bricks[10], GRAPHICS.moving_block);
    var b7 = dropUnit(ground_bricks[17], GRAPHICS.moving_block, 120);
    var mu1 = dropUnit(ground_bricks[17], GRAPHICS.moving_block, 220, 50);

    elevators.push(b6);
    elevators.push(b7);
    elevators.push(mu1);

    collidables.push(b6);
    collidables.push(b7);
    collidables.push(mu1);

    for (var m = 0; m < 3; m++) {
        var c1 = dropUnit(ground_bricks[7], GRAPHICS.coin, m * 32, -10);
        collidables.push(c1);
        coins.push(c1);
    }
    for (var n = 0; n < 4; n++) {
        var c2 = dropUnit(ground_bricks[6], GRAPHICS.coin, n * 32 + 5, -100 - n * 32);
        collidables.push(c2);
        coins.push(c2);
    }
    for (var o = 0; o < 3; o++) {
        var c3 = dropUnit(ground_bricks[10], GRAPHICS.coin, o * 32, -232);
        collidables.push(c3);
        coins.push(c3);
    }

    for (var p = 1; p < 4; p++) {
        if (p === 3) {
            bb1 = dropUnit(ground_bricks[15], GRAPHICS.question_block, p * 32, -p * 32);
            mushroomboxes.push(bb1);
        }
        else bb1 = dropUnit(ground_bricks[15], GRAPHICS.block_brick, p * 32, -2 * 32);
        hitables.push(bb1);
        collidables.push(bb1);

        var c4 = dropUnit(b7, GRAPHICS.coin, 60, -p * 32 - 140);
        collidables.push(c4);
        coins.push(c4);
    }

    for (var q = 0; q < 9; q++) {
        for (var r = 0; r < 11; r++) {
            if (r <= q) continue;
            var c5 = dropUnit(ground_bricks[20], GRAPHICS.small_brick, r * 20, -q * 20);
            collidables.push(c5);
        }
    }

    var b8 = dropUnit(ground_bricks[12], GRAPHICS.ground_pipe);
    collidables.push(b8);

    var b9 = dropUnit(ground_bricks[23], GRAPHICS.ground_pipe);
    warppipes.push(b9);
    collidables.push(b9);

    collidables.push(b4);
    collidables.push(b5);

    spawnEnemies(ground_bricks);

    oncomplete();
}

function dropUnit(referenceSprite, graphic_src, left, bottom) {
    var new_unit = document.createElement("img");
    stage.appendChild(new_unit);
    setSprite(new_unit, graphic_src);
    new_unit.style.position = "absolute";
    new_unit.style.top = (referenceSprite !== null ? referenceSprite.offsetTop - new_unit.clientHeight + (bottom || 0) : bottom) + "px";
    new_unit.style.left = (referenceSprite !== null ? referenceSprite.offsetLeft + (left || 0) : left) + "px";
    return new_unit;
}

function removeFromCollection(arr, obj) {
    if (arr.indexOf(obj) > -1) arr.splice(arr.indexOf(obj), 1);
}

function onkeyDown(e) {
    var evt = window.event || e;
    var keyunicode = e.charCode || e.keyCode;
    if (evt.preventDefault)
        evt.preventDefault();
    else {
        evt.returnValue = false;
    }
    if (keysDown.indexOf(keyunicode) > -1) return;

    keysDown.push(keyunicode);
    playMusic();
    return false;
}

function onKeyUp(e) {
    var keyunicode = e.charCode || e.keyCode;
    removeFromCollection(keysDown, keyunicode);
}

function layoutGameViewport() {
    var screen = document.getElementById('game-screen');
    var viewport = document.getElementById('game-viewport');
    if (!screen || !viewport) return;

    var sw = screen.clientWidth;
    var sh = screen.clientHeight;
    var scale = Math.min(sw / GAME_WIDTH, sh / GAME_HEIGHT);
    var scaledW = GAME_WIDTH * scale;
    var scaledH = GAME_HEIGHT * scale;

    viewport.style.width = GAME_WIDTH + 'px';
    viewport.style.height = GAME_HEIGHT + 'px';
    viewport.style.transform = 'scale(' + scale + ')';
    viewport.style.left = ((sw - scaledW) / 2) + 'px';
    viewport.style.top = ((sh - scaledH) / 2) + 'px';
}

function updateControlDebug() {
    if (!controlDebugEl) return;
    var labels = Object.keys(pressedTouchButtons).filter(function (k) {
        return pressedTouchButtons[k];
    });
    if (labels.length === 0) {
        controlDebugEl.textContent = 'Pressed: (none)';
    } else {
        controlDebugEl.textContent = 'Pressed: ' + labels.join(', ');
    }
}

function setTouchButtonState(id, label, isPressed) {
    var btn = document.getElementById(id);
    if (btn) {
        btn.classList.toggle('pressed', isPressed);
    }
    if (isPressed) {
        pressedTouchButtons[label] = true;
    } else {
        delete pressedTouchButtons[label];
    }
    updateControlDebug();
}

function pushGameKey(keyCode) {
    if (keysDown.indexOf(keyCode) < 0) {
        keysDown.push(keyCode);
        playMusic();
    }
}

function preventTouchScroll(e) {
    e.preventDefault();
    e.stopPropagation();
}

function bindMobileControls() {
    function bindKeyBtn(id, label, keyCode) {
        var btn = document.getElementById(id);
        if (!btn) return;

        var pressCount = 0;

        function press(e) {
            preventTouchScroll(e);
            pressCount++;
            if (pressCount === 1) {
                setTouchButtonState(id, label, true);
                pushGameKey(keyCode);
            }
        }

        function release(e) {
            preventTouchScroll(e);
            pressCount = Math.max(0, pressCount - 1);
            if (pressCount === 0) {
                setTouchButtonState(id, label, false);
                removeFromCollection(keysDown, keyCode);
            }
        }

        btn.addEventListener('pointerdown', press);
        btn.addEventListener('pointerup', release);
        btn.addEventListener('pointercancel', release);
        btn.addEventListener('touchstart', press, { passive: false });
        btn.addEventListener('touchend', release, { passive: false });
        btn.addEventListener('touchcancel', release, { passive: false });
    }

    function bindActionBtn(id, label, onDown, onUp) {
        var btn = document.getElementById(id);
        if (!btn) return;

        var pressCount = 0;

        function press(e) {
            preventTouchScroll(e);
            pressCount++;
            if (pressCount === 1) {
                setTouchButtonState(id, label, true);
                onDown();
            }
        }

        function release(e) {
            preventTouchScroll(e);
            pressCount = Math.max(0, pressCount - 1);
            if (pressCount === 0) {
                setTouchButtonState(id, label, false);
                if (onUp) onUp();
            }
        }

        btn.addEventListener('pointerdown', press);
        btn.addEventListener('pointerup', release);
        btn.addEventListener('pointercancel', release);
        btn.addEventListener('touchstart', press, { passive: false });
        btn.addEventListener('touchend', release, { passive: false });
        btn.addEventListener('touchcancel', release, { passive: false });
    }

    bindKeyBtn('btn-left', 'LEFT', KEY_LEFT);
    bindKeyBtn('btn-right', 'RIGHT', KEY_RIGHT);
    bindKeyBtn('btn-up', 'UP', KEY_UP);
    bindKeyBtn('btn-down', 'DOWN', KEY_DOWN);
    bindKeyBtn('btn-a', 'A', KEY_SPACE);
    bindKeyBtn('btn-b', 'B', KEY_DOWN);

    bindActionBtn('btn-select', 'SELECT', function () {
        document.getElementById('settings-overlay').classList.remove('hidden');
    });

    bindActionBtn('btn-start', 'START', function () {
        playMusic();
    });

    document.getElementById('mobile-controls').addEventListener('touchmove', preventTouchScroll, { passive: false });
}

function preventPageScroll() {
    document.addEventListener('touchmove', function (e) {
        if (e.target.closest('#mobile-controls, #gameboy-shell, #settings-panel')) {
            e.preventDefault();
        }
    }, { passive: false });

    window.addEventListener('gesturestart', preventTouchScroll, { passive: false });
    window.addEventListener('gesturechange', preventTouchScroll, { passive: false });
}

function debugUpdate() {
    var str = "Collision space: " + collideCount + "\n";
    str += "Collidable: " + collidables.length + "\n";
    str += "Enemies: " + enemies.filter(function (e) { return !e.dead; }).length + "\n";
    str += "Keys: " + keysDown.join().toString() + "\n";
    if (debug) debug.value = str;
}

function run() {
    posX = mario.offsetLeft;
    posY = mario.offsetTop;
    layoutGameViewport();
    restartGameLoop();
    setInterval(debugUpdate, 100);
    $(document).keydown(onkeyDown);
    $(document).keyup(onKeyUp);
    bindMobileControls();
}

$(document).ready(function () {
    debug = document.getElementById('debug');
    stage = document.getElementById('stage');
    mario = document.getElementById('sprite');
    coin_counter = document.getElementById('coin_counter');
    stats_pane_coin = document.getElementById('stats_pane_coin');
    controlDebugEl = document.getElementById('control-debug');

    layoutGameViewport();
    window.addEventListener('resize', layoutGameViewport);
    preventPageScroll();
    initSettingsUI();

    $("audio").each(function () {
        AUDIO[this.id.replace('audio_', '')] = (function (a) {
            return function () {
                if (!settings.sound) return a;
                if (a.duration > 0 && !a.paused) {
                    if (a.id === "audio_coin") AUDIO.coin2();
                    else if (a.id === "audio_coin2") AUDIO.coin3();
                    else if (a.id === "audio_coin3") AUDIO.coin4();
                } else {
                    a.play();
                }
                return a;
            };
        })(this);
    });

    var _spriteCount = $(".sprite").length;
    var _spriteLoaded = 0;
    $(".sprite").each(function (i, s) {
        var preload = new Image();
        preload.src = s.value;
        preload.onload = function () {
            GRAPHICS[s.id] = this.src;
            if (++_spriteLoaded === _spriteCount) {
                renderWorld(run);
            }
        };
    });
});

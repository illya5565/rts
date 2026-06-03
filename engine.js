function startBattle() {
    if (!playerArmy.length) return;
    isPlacementPhase = false;
    document.getElementById("start-btn").disabled = true;

    squads.forEach(sq => {
        if (sq.side !== "player") return;
        sq.manualTarget = null; sq.attackOrder = null; sq.isGuarding = false;
    });

    const enemyCount = currentWave + 1;
    const spacing    = Math.floor(worldHeight / (enemyCount + 1));
    for (let i = 0; i < enemyCount; i++) {
        squads.push(createSquad("enemy", "Line Infantry", worldWidth - 100, spacing * (i + 1)));
    }

    if (typeof Audio !== "undefined") Audio.playBattleMusic();
    requestAnimationFrame(gameLoop);
}

function gameLoop(time) {
    updateCamera();
    update(time);
    draw();
    if (!checkWinner()) requestAnimationFrame(gameLoop);
}

function update() {
    if (isPlacementPhase) return;
    updateProjectiles();
    for (const sq of squads) {
        if (!sq.alive) continue;
        sq.tickMorale();
        _updateSquad(sq);
    }
    squads = squads.filter(s => s.alive && !s.isFullyDead);
}

function _updateSquad(sq) {
    if (isAutoMode || sq.side !== "player") _assignAutoTarget(sq);
    _moveSquad(sq, sq.getMoveTarget());
    for (const sol of sq.soldiers) {
        if (!sol.alive) continue;
        if (sq.isMoving) sol.setAnimState("move");
        else if (sol.state !== "shoot") sol.setAnimState("idle");
    }
    _tryShoot(sq);
    if (sq.isFullyDead) sq.alive = false;
}

function _assignAutoTarget(sq) {
    const enemies = squads.filter(t => t.side !== sq.side && t.alive);
    const allies  = squads.filter(a => a.side === sq.side && a.alive && a !== sq && !a.isSupport);
    const target  = (sq.isSupport && allies.length) ? _nearest(sq, allies)
                  : enemies.length ? _nearest(sq, enemies) : null;
    if (target) { sq.attackOrder = target; sq.manualTarget = null; }
}

function _moveSquad(sq, moveTarget) {
    if (!moveTarget) { sq.isMoving = false; return; }

    const dist   = Math.hypot(moveTarget.x - sq.x, moveTarget.y - sq.y);
    const isMan  = !!moveTarget.isManual;
    const stopD  = isMan ? 10 : (sq.isSupport ? 70 : Math.max(10, sq.stats.range - 40));

    if (sq.targetPoint) {
        _rotateToward(sq, sq.targetPoint.x, sq.targetPoint.y);
        sq.isMoving = false;
        return;
    }

    if (moveTarget.hitbox && moveTarget.side !== sq.side && areSquadsColliding(sq, moveTarget)) {
        sq.isMoving = false; return;
    }

    if (dist <= stopD) {
        sq.isMoving = false;
        if (isMan) {
            if (sq.targetArrivalAngle !== undefined) {
                if (_rotateToward(sq, null, null, sq.targetArrivalAngle)) {
                    sq.manualTarget = null; sq.isGuarding = true; delete sq.targetArrivalAngle;
                }
            } else { sq.manualTarget = null; sq.isGuarding = true; }
        }
        return;
    }

    if (!_rotateToward(sq, moveTarget.x, moveTarget.y)) { sq.isMoving = false; return; }

    sq.isMoving = true;
    let speed   = sq.effectiveSpeed;

    if (squads.some(o => o !== sq && o.alive && areSquadsColliding(sq, o))) speed *= 0.5;

    const cmd = squads.find(b =>
        b.side === sq.side && b.alive && b.aura?.includes("all_stats") &&
        Math.hypot(b.x-sq.x, b.y-sq.y) < 200
    );
    if (cmd) speed *= (cmd.aura === "all_stats_mega" ? 1.4 : 1.2);

    sq.x = Math.max(0, Math.min(worldWidth,  sq.x + Math.cos(sq.angle) * speed));
    sq.y = Math.max(0, Math.min(worldHeight, sq.y + Math.sin(sq.angle) * speed));
}

function _rotateToward(sq, tx, ty, explicitAngle) {
    const targetAngle = explicitAngle !== undefined ? explicitAngle : Math.atan2(ty - sq.y, tx - sq.x);
    let diff = targetAngle - sq.angle;
    while (diff < -Math.PI) diff += Math.PI*2;
    while (diff >  Math.PI) diff -= Math.PI*2;
    if (Math.abs(diff) <= sq.rotSpeed) { sq.angle = targetAngle; return true; }
    sq.angle += (diff > 0 ? 1 : -1) * sq.rotSpeed;
    return false;
}

function _tryShoot(sq) {
    if (!sq.canFight) return;
    if (performance.now() - sq.lastShot < sq.stats.reload) return;

    let tx = null, ty = null, tSq = null;

    if (sq.targetPoint) {
        tx = sq.targetPoint.x; ty = sq.targetPoint.y;
    } else {
        const enemies = squads.filter(t => t.side !== sq.side && t.alive);
        if (!enemies.length) return;
        const near = _nearest(sq, enemies);
        if (Math.hypot(near.x-sq.x, near.y-sq.y) > sq.stats.range + 50) return;
        tSq = near;
        const sol = near.soldiers.find(s => s.alive);
        if (sol) { const wp = sol.worldPos(near.x, near.y, Math.cos(near.angle), Math.sin(near.angle)); tx = wp.x; ty = wp.y; }
        else     { tx = near.x; ty = near.y; }
    }

    if (tx === null) return;
    let diff = Math.abs(sq.angle - Math.atan2(ty-sq.y, tx-sq.x));
    if (diff > Math.PI) diff = Math.PI*2 - diff;
    if (diff > 0.8) return;

    shootSquad(sq, tSq, { x: tx, y: ty });
}

function updateCamera() {
    if (keys[config.up])    camera.y -= camera.speed;
    if (keys[config.down])  camera.y += camera.speed;
    if (keys[config.left])  camera.x -= camera.speed;
    if (keys[config.right]) camera.x += camera.speed;
    camera.x = Math.max(0, Math.min(camera.x, worldWidth  - canvas.width));
    camera.y = Math.max(0, Math.min(camera.y, worldHeight - canvas.height));
}

function checkWinner() {
    if (isPlacementPhase) return false;
    const pAlive = squads.some(s => s.side === "player" && s.alive);
    const eAlive = squads.some(s => s.side === "enemy"  && s.alive);
    if (!eAlive) { playerGold += 100 + currentWave*20; currentWave++; showResult("WIN"); return true; }
    if (!pAlive) { showResult("LOSE"); return true; }
    return false;
}

function showResult(result) {
    if (typeof Audio !== "undefined") { if (result === "WIN") Audio.playWin(); else Audio.playLose(); }
    const overlay = document.getElementById("result-overlay");
    document.getElementById("result-text").innerText    = result === "WIN" ? "WIN" : "LOSE";
    document.getElementById("result-subtext").innerText = result === "WIN"
        ? `wawe ${currentWave-1} complete. +${100 + (currentWave-1)*20} gold`
        : "defeat";

    const btns = document.getElementById("result-buttons");
    btns.innerHTML = "";
    if (result === "WIN") {
        const b = document.createElement("button");
        b.innerText = "NEXT WAVE";
        b.style.cssText = "padding:10px 28px;font-size:15px;background:#1e419b;color:#fff;border:2px solid #4466cc;cursor:pointer;";
        b.onclick = () => { Audio.playButton(); resultNextWave(); };
        btns.appendChild(b);
    } else {
        const b = document.createElement("button");
        b.innerText = "RESTART";
        b.style.cssText = "padding:10px 28px;font-size:15px;background:#6b1e1e;color:#fff;border:2px solid #cc4444;cursor:pointer;";
        b.onclick = () => { Audio.playButton(); resultRestart(); };
        btns.appendChild(b);
    }
    const bMenu = document.createElement("button");
    bMenu.innerText = "MAIN MENU";
    bMenu.style.cssText = "padding:10px 28px;font-size:15px;background:#444;color:#fff;border:2px solid #888;cursor:pointer;";
    bMenu.onclick = () => { Audio.playButton(); resultMainMenu(); };
    btns.appendChild(bMenu);

    overlay.style.display = "flex";
}

function resultNextWave() {
    document.getElementById("result-overlay").style.display = "none";
    _resetToPlacement();
}

function resultRestart() {
    document.getElementById("result-overlay").style.display = "none";
    playerGold  = 1000;
    currentWave = 1;
    _resetSkillTree();
    _resetToPlacement();
}

function _resetSkillTree() {
    SkillTree.nodes.forEach(n => { n.bought = false; });
    if (typeof renderTree === "function") renderTree();
    if (typeof renderShop === "function") renderShop();
}

function resultMainMenu() { location.reload(); }

function _resetToPlacement() {
    isPlacementPhase = true;
    selectedSquads   = [];
    squads           = [];
    playerArmy       = [];
    document.getElementById("start-btn").disabled = false;
    updateGoldDisplay();
    if (typeof Audio !== "undefined") Audio.playMenuMusic();
    placementLoop();
}

window.addEventListener("keydown", e => {
    if (e.code !== config.auto) return;
    isAutoMode = !isAutoMode;
    if (isAutoMode) squads.forEach(sq => {
        if (sq.side !== "player") return;
        sq.manualTarget = null; sq.attackOrder = null; sq.isGuarding = false;
    });
});

function placementLoop() {
    if (!isPlacementPhase) return;
    updateCamera();
    draw();
    requestAnimationFrame(placementLoop);
}

function _nearest(from, list) {
    return list.reduce((b, c) =>
        Math.hypot(c.x-from.x, c.y-from.y) < Math.hypot(b.x-from.x, b.y-from.y) ? c : b
    );
}

renderShop();
updateGoldDisplay();
placementLoop();
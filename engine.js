function startBattle() {
    if (!playerArmy.length) return;
    isPlacementPhase = false;
    document.getElementById("start-btn").disabled = true;

    squads.forEach(sq => {
        if (sq.side !== "player") return;
        sq.manualTarget = null; sq.attackOrder = null; sq.isGuarding = false;
    });

    let enemyCount;
    if (gameMode === "campaign" && selectedCampaignPin) {
        enemyCount = campaignCurrentWave;
    } else {
        enemyCount = currentWave;
    }
    
    const spacing = Math.floor(worldHeight / (enemyCount + 2));
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

    if (sq.isSupport && sq.attackOrder && sq.attackOrder.alive && sq.attackOrder.side === sq.side) {
        tSq = sq.attackOrder;
        const cos = Math.cos(tSq.angle), sin = Math.sin(tSq.angle);
        const sol = tSq.soldiers.find(s => s.alive);
        if (sol) {
            const wp = sol.worldPos(tSq.x, tSq.y, cos, sin);
            tx = wp.x;
            ty = wp.y;
        } else {
            tx = tSq.x;
            ty = tSq.y;
        }
    }
    else if (sq.targetPoint) {
        tx = sq.targetPoint.x;
        ty = sq.targetPoint.y;
    }
    else {
        const enemies = squads.filter(t => t.side !== sq.side && t.alive);
        if (!enemies.length) return;
        const near = _nearest(sq, enemies);
        if (Math.hypot(near.x - sq.x, near.y - sq.y) > sq.stats.range + 50) return;
        tSq = near;
        const sol = near.soldiers.find(s => s.alive);
        if (sol) {
            const wp = sol.worldPos(near.x, near.y, Math.cos(near.angle), Math.sin(near.angle));
            tx = wp.x;
            ty = wp.y;
        } else {
            tx = near.x;
            ty = near.y;
        }
    }

    if (tx === null) return;
    
    let diff = Math.abs(sq.angle - Math.atan2(ty - sq.y, tx - sq.x));
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
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
    const eAlive = squads.some(s => s.side === "enemy" && s.alive);
    
    if (!eAlive) {
        if (gameMode === "campaign" && selectedCampaignPin) {
            playerGold += 80 + campaignCurrentWave * 20;
            updateGoldDisplay();
            
            campaignCurrentWave++;
            
            if (campaignCurrentWave > campaignTotalWaves) {
                showResult("CAMPAIGN_POINT_CAPTURED");
            } else {
                showResult("CAMPAIGN_WAVE_CLEARED");
            }
        } else {
            playerGold += 100 + currentWave * 20;
            currentWave++;
            showResult("WIN");
        }
        return true;
    }
    
    if (!pAlive) {
        if (gameMode === "campaign" && selectedCampaignPin) {
            campaignLives--;
            
            if (campaignLives <= 0) {
                showResult("CAMPAIGN_OUT_OF_LIVES");
            } else {
                showResult("CAMPAIGN_LOST_LIFE");
            }
        } else {
            showResult("LOSE");
        }
        return true;
    }
    return false;
}

function capturePoint() {
    if (!selectedCampaignPin) return;
    
    let pinIndex = campaignMap.pins.findIndex(p => p === selectedCampaignPin);
    if (pinIndex !== -1 && campaignMap.isAdjacentToPlayerOwned(pinIndex)) {
        campaignMap.pins[pinIndex].owner = "player";
        
        campaignMap.render();
        
        let victoryCheck = campaignMap.checkCampaignVictory();
        if (victoryCheck) {
            if (victoryCheck.result === "CAMPAIGN_BASE_CAPTURED") {
                showCampaignVictory(victoryCheck.message, true);
            } else if (victoryCheck.result === "CAMPAIGN_BASE_LOST") {
                showCampaignVictory(victoryCheck.message, false);
            }
            return;
        }
        
        selectedCampaignPin = null;
        campaignMapMode = true;
        campaignConditionMet = false;
        
        document.getElementById("map-menu").style.display = 'block';
        document.getElementById("shop-controls").style.pointerEvents = "none";
        document.getElementById("shop-controls").style.opacity = "0.5";
        document.getElementById("start-btn").disabled = true;
        document.getElementById("start-btn").style.opacity = "0.5";
        
        if (typeof Audio !== "undefined") Audio.playMenuMusic();
        
        const mapCanvas = document.getElementById('map-canvas');
        const ctx = mapCanvas.getContext('2d');
        ctx.font = "bold 16px monospace";
        ctx.fillStyle = "#fff";
        ctx.shadowBlur = 4;
        ctx.shadowColor = "#000";
        ctx.fillText("Click on adjacent BASE to continue campaign", 50, 40);
        ctx.shadowBlur = 0;
    }
}

function showCampaignVictory(message, isVictory) {
    if (typeof Audio !== "undefined") {
        if (isVictory) Audio.playWin();
        else Audio.playLose();
    }
    
    const overlay = document.getElementById("result-overlay");
    const btns = document.getElementById("result-buttons");
    btns.innerHTML = "";
    
    if (isVictory) {
        document.getElementById("result-text").innerText = "VICTORY!";
        document.getElementById("result-subtext").innerHTML = `${message}<br>You have conquered the enemy stronghold!`;
        
        const b = document.createElement("button");
        b.innerText = "MAIN MENU";
        b.style.cssText = "padding:10px 28px;font-size:15px;background:#1e419b;color:#fff;border:2px solid #4466cc;cursor:pointer;";
        b.onclick = () => {
            Audio.playButton();
            document.getElementById("result-overlay").style.display = "none";
            resultMainMenu();
        };
        btns.appendChild(b);
    } else {
        document.getElementById("result-text").innerText = "DEFEAT!";
        document.getElementById("result-subtext").innerHTML = `${message}<br>Your base has fallen.`;
        
        const b = document.createElement("button");
        b.innerText = "MAIN MENU";
        b.style.cssText = "padding:10px 28px;font-size:15px;background:#6b1e1e;color:#fff;border:2px solid #cc4444;cursor:pointer;";
        b.onclick = () => {
            Audio.playButton();
            document.getElementById("result-overlay").style.display = "none";
            resultMainMenu();
        };
        btns.appendChild(b);
    }
    
    overlay.style.display = "flex";
}

function showResult(result) {
    if (typeof Audio !== "undefined") { 
        if (result === "WIN" || result === "CAMPAIGN_POINT_CAPTURED") Audio.playWin(); 
        else Audio.playLose(); 
    }
    
    const overlay = document.getElementById("result-overlay");
    const btns = document.getElementById("result-buttons");
    btns.innerHTML = "";
    
    if (result === "CAMPAIGN_POINT_CAPTURED") {
        document.getElementById("result-text").innerText = "POINT CAPTURED!";
        document.getElementById("result-subtext").innerHTML = `All ${campaignTotalWaves} waves completed!<br>Point added to your territory.`;
        
        const b = document.createElement("button");
        b.innerText = "CONTINUE";
        b.style.cssText = "padding:10px 28px;font-size:15px;background:#1e419b;color:#fff;border:2px solid #4466cc;cursor:pointer;";
        b.onclick = () => {
            Audio.playButton();
            document.getElementById("result-overlay").style.display = "none";
            capturePoint();
        };
        btns.appendChild(b);
        
        overlay.style.display = "flex";
        return;
    }
    
    if (result === "CAMPAIGN_OUT_OF_LIVES") {
        document.getElementById("result-text").innerText = "DEFEAT!";
        document.getElementById("result-subtext").innerHTML = `No lives remaining.<br>Point not captured. Returning to map...`;
        
        const b = document.createElement("button");
        b.innerText = "CONTINUE";
        b.style.cssText = "padding:10px 28px;font-size:15px;background:#6b1e1e;color:#fff;border:2px solid #cc4444;cursor:pointer;";
        b.onclick = () => {
            Audio.playButton();
            document.getElementById("result-overlay").style.display = "none";
            returnToCampaignMap();
        };
        btns.appendChild(b);
        
        overlay.style.display = "flex";
        return;
    }
    
    if (result === "CAMPAIGN_LOST_LIFE") {
        document.getElementById("result-text").innerText = "WAVE FAILED!";
        document.getElementById("result-subtext").innerHTML = `Lives remaining: ${campaignLives}<br>You will restart this wave with 1000 gold.`;
        
        const b = document.createElement("button");
        b.innerText = "TRY AGAIN";
        b.style.cssText = "padding:10px 28px;font-size:15px;background:#cc8800;color:#fff;border:2px solid #ffcc44;cursor:pointer;";
        b.onclick = () => {
            Audio.playButton();
            document.getElementById("result-overlay").style.display = "none";
            restartCurrentCampaignWave();
        };
        btns.appendChild(b);
        
        overlay.style.display = "flex";
        return;
    }
    
    if (result === "CAMPAIGN_WAVE_CLEARED") {
        document.getElementById("result-text").innerText = "WAVE CLEARED!";
        document.getElementById("result-subtext").innerHTML = `Wave ${campaignCurrentWave - 1}/${campaignTotalWaves} completed.<br>+${80 + (campaignCurrentWave - 1) * 20} gold earned.<br>Prepare for next wave...`;
        
        const b = document.createElement("button");
        b.innerText = "CONTINUE";
        b.style.cssText = "padding:10px 28px;font-size:15px;background:#1e419b;color:#fff;border:2px solid #4466cc;cursor:pointer;";
        b.onclick = () => {
            Audio.playButton();
            document.getElementById("result-overlay").style.display = "none";
            setupNextCampaignWave();
        };
        btns.appendChild(b);
        
        overlay.style.display = "flex";
        return;
    }
    
    if (result === "WIN") {
        document.getElementById("result-text").innerText = "WIN";
        document.getElementById("result-subtext").innerText = `Wave ${currentWave-1} complete. +${100 + (currentWave-1)*20} gold`;
        
        const b = document.createElement("button");
        b.innerText = "NEXT WAVE";
        b.style.cssText = "padding:10px 28px;font-size:15px;background:#1e419b;color:#fff;border:2px solid #4466cc;cursor:pointer;";
        b.onclick = () => { Audio.playButton(); resultNextWave(); };
        btns.appendChild(b);
    } else if (result === "LOSE") {
        document.getElementById("result-text").innerText = "LOSE";
        document.getElementById("result-subtext").innerText = "defeat";
        
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

function startCampaign() {
    playerGold = 1000;
    currentWave = 1;
    isPlacementPhase = false;
    campaignMapMode = true;
    campaignConditionMet = false;
    selectedSquads = [];
    squads = [];
    playerArmy = [];
    selectedCampaignPin = null;
    updateGoldDisplay();

    document.getElementById("shop-controls").style.pointerEvents = "none";
    document.getElementById("shop-controls").style.opacity = "0.5";
    document.getElementById("start-btn").disabled = true;
    document.getElementById("start-btn").style.opacity = "0.5";

    const mapCanvas = document.getElementById('map-canvas');
    
    if (!campaignMap) {
        campaignMap = new TacticalMap(mapCanvas);
        campaignMap.setPinClickCallback(onCampaignBaseSelected);
        campaignMap.generateWorld();
        campaignMap.generatePins();
        campaignMap.computeEdges();
    }
    
    campaignMap.render();
    document.getElementById('map-menu').style.display = 'block';

    const ctx = mapCanvas.getContext('2d');
    ctx.font = "bold 16px monospace";
    ctx.fillStyle = "#fff";
    ctx.shadowBlur = 4;
    ctx.shadowColor = "#000";
    ctx.fillText("★ Click on adjacent BASE to start campaign ★", 50, 40);
    ctx.shadowBlur = 0;
}

function _resetToPlacement() {
    isPlacementPhase = true;
    campaignMapMode = false;
    campaignConditionMet = false;
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

function setupNextCampaignWave() {
    squads = [];
    playerArmy = [];
    
    isPlacementPhase = true;
    document.getElementById("start-btn").disabled = false;
    document.getElementById("start-btn").style.opacity = "1";
    document.getElementById("shop-controls").style.pointerEvents = "auto";
    document.getElementById("shop-controls").style.opacity = "1";
    
    updateGoldDisplay();
    renderShop();
    
    placementLoop();
}

function restartCurrentCampaignWave() {
    playerGold = 1000;
    campaignCurrentWave = 1;
    
    updateGoldDisplay();
    
    squads = [];
    playerArmy = [];
    
    _resetSkillTree();
    
    renderShop();
    if (!selectedUnitType) {
        const firstBtn = document.querySelector('#shop-controls button');
        if (firstBtn) {
            const match = firstBtn.innerText.match(/^(.+?)\s*\(/);
            if (match) selectedUnitType = match[1];
            else selectedUnitType = firstBtn.innerText.split('(')[0].trim();
            renderShop();
        }
    }
    
    isPlacementPhase = true;
    document.getElementById("start-btn").disabled = false;
    document.getElementById("start-btn").style.opacity = "1";
    document.getElementById("shop-controls").style.pointerEvents = "auto";
    document.getElementById("shop-controls").style.opacity = "1";
    
    placementLoop();
}

function returnToCampaignMap() {
    isPlacementPhase = false;
    campaignMapMode = true;
    campaignConditionMet = false;
    selectedCampaignPin = null;
    campaignCurrentWave = 1;
    campaignTotalWaves = 0;
    campaignLives = 3;
    
    playerGold = 1000;
    _resetSkillTree();
    
    squads = [];
    playerArmy = [];
    
    updateGoldDisplay();
    renderShop();
    
    if (campaignMap) {
        campaignMap.render();
        document.getElementById('map-menu').style.display = 'block';
        
        const mapCanvas = document.getElementById('map-canvas');
        const ctx = mapCanvas.getContext('2d');
        ctx.font = "bold 16px monospace";
        ctx.fillStyle = "#fff";
        ctx.shadowBlur = 4;
        ctx.shadowColor = "#000";
        ctx.fillText("Click on adjacent BASE to continue campaign", 50, 40);
        ctx.shadowBlur = 0;
    }
    
    document.getElementById("shop-controls").style.pointerEvents = "none";
    document.getElementById("shop-controls").style.opacity = "0.5";
    document.getElementById("start-btn").disabled = true;
    document.getElementById("start-btn").style.opacity = "0.5";
    
    if (typeof Audio !== "undefined") Audio.playMenuMusic();
}

function onCampaignBaseSelected(pin, index) {
    if (campaignConditionMet) return;
    
    let pinIndex = campaignMap.pins.findIndex(p => p === pin);
    
    if (pin.owner === "player") {
        return;
    }
    
    if (!campaignMap.isAdjacentToPlayerOwned(pinIndex)) {
        return;
    }
    
    campaignConditionMet = true;
    campaignMapMode = false;
    
    selectedCampaignPin = pin;
    campaignTotalWaves = pin.waves;
    campaignRemainingWaves = pin.waves;
    campaignCurrentWave = 1;
    campaignLives = 3;

    const mapMenu = document.getElementById('map-menu');
    mapMenu.style.display = 'none';

    document.getElementById("shop-controls").style.pointerEvents = "auto";
    document.getElementById("shop-controls").style.opacity = "1";
    document.getElementById("start-btn").disabled = false;
    document.getElementById("start-btn").style.opacity = "1";
    
    if (typeof renderShop === "function") renderShop();
    
    if (!selectedUnitType) {
        const firstBtn = document.querySelector('#shop-controls button');
        if (firstBtn) {
            const match = firstBtn.innerText.match(/^(.+?)\s*\(/);
            if (match) selectedUnitType = match[1];
            else selectedUnitType = firstBtn.innerText.split('(')[0].trim();
            renderShop();
        }
    }

    isPlacementPhase = true;
    placementLoop();
    if (typeof Audio !== "undefined") Audio.playMenuMusic();
}
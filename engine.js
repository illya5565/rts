function startBattle() {
    if (playerArmy.length === 0) return;
    isPlacementPhase = false;
    document.getElementById("start-btn").disabled = true;
    
    for(let i = 0; i < currentWave + 1; i++) {
        squads.push(createSquad("enemy", "Line Infantry", 1100, 50 + (i * 100)));
    }
    requestAnimationFrame(gameLoop);
}

function gameLoop(time) {
    updateCamera();
    update(time);
    draw();
    if (!checkWinner()) {
        requestAnimationFrame(gameLoop);
    }
}

function update(time) {
    if (isPlacementPhase) return;

    if (typeof updateProjectiles === "function") {
        updateProjectiles();
    }

    squads.forEach(s => {
        if (!s.alive) return;

        const now = performance.now();
        const supportTypes = ["Commander", "Ensign", "Medic", "Mounted Commander", "High Officer", "Field Surgeon", "Medical Squad"];
        const isSupport = supportTypes.includes(s.type);

        s.deathTimes = (s.deathTimes || []).filter(t => now - t < 5000);
        const aliveCount = s.soldiers.filter(sol => sol.alive).length;
        const initial = s.initialCount || 40;

        if (s.state === 1) {
            const deadRecently = s.deathTimes.length;
            const deadTotal = initial - aliveCount;
            if (deadRecently >= initial * 0.4 || deadTotal >= initial * 0.6) {
                s.state = 2;
                s.targetPoint = null;
                s.manualTarget = null;
                s.attackOrder = null;
                s.isGuarding = false; 
            }
        }

        let moveTarget = null;
        let isManualOrder = false;

        if (s.state === 2) {
            const retreatX = (s.side === "player" ? 0 : worldWidth);
            moveTarget = { x: retreatX, y: s.y };
            if (Math.abs(s.x - retreatX) < 50) {
                const recoverCount = Math.floor(initial * 0.2);
                let recovered = 0;
                s.soldiers.forEach(sol => {
                    if (!sol.alive && recovered < recoverCount) {
                        sol.alive = true;
                        sol.hp = sol.maxHp;
                        recovered++;
                    }
                });
                s.state = 3;
            }
        } 
        else {
            if (!isAutoMode && s.side === "player" && s.manualTarget) {
                moveTarget = s.manualTarget;
                isManualOrder = true;
                s.isGuarding = false;
            } 
            else if (s.attackOrder && s.attackOrder.alive) {
                moveTarget = s.attackOrder; 
                s.isGuarding = false;
            }
            else if (s.isGuarding) {
                moveTarget = null; 
            }
            else {
                let enemies = squads.filter(t => t.side !== s.side && t.alive);
                let combatAllies = squads.filter(a => a.side === s.side && a.alive && a !== s && !supportTypes.includes(a.type));

                if (isSupport && combatAllies.length > 0) {
                    moveTarget = combatAllies.reduce((p, c) => Math.hypot(c.x-s.x, c.y-s.y) < Math.hypot(p.x-s.x, p.y-s.y) ? c : p);
                } else if (enemies.length > 0) {
                    moveTarget = enemies.reduce((p, c) => Math.hypot(c.x-s.x, c.y-s.y) < Math.hypot(p.x-s.x, p.y-s.y) ? c : p);
                }
            }
        }

        if (moveTarget) {
            let dx = moveTarget.x - s.x;
            let dy = moveTarget.y - s.y;
            let dist = Math.hypot(dx, dy);
            let stopDist = (s.state === 2) ? 10 : (isManualOrder ? 10 : (isSupport ? 70 : s.stats.range - 20));
            let currentRotSpeed = s.stats.rotSpeed || 0.05;

            if (s.targetPoint && s.state !== 2) {
            let angleToPoint = Math.atan2(s.targetPoint.y - s.y, s.targetPoint.x - s.x);
            let diff = angleToPoint - s.angle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            if (Math.abs(diff) > (s.stats.rotSpeed || 0.05)) {
                s.angle += (diff > 0 ? 1 : -1) * (s.stats.rotSpeed || 0.05);
            } else {
                s.angle = angleToPoint;
            }
            moveTarget = null;
        }

            if (dist > stopDist) {
                let targetAngle = Math.atan2(dy, dx);
                let diff = targetAngle - s.angle;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;

                if (Math.abs(diff) > currentRotSpeed) {
                    s.angle += (diff > 0 ? 1 : -1) * currentRotSpeed;
                    s.isMoving = false;
                } else {
                    s.angle = targetAngle;
                    s.isMoving = true;
                    let speed = s.stats.speed * (s.state === 2 ? 1.6 : 1.0);
                    if (s.state !== 2) {
                        let cmd = squads.find(b => b.side === s.side && b.alive && b.aura?.includes("all_stats") && Math.hypot(b.x-s.x, b.y-s.y) < 200);
                        if (cmd) speed *= (cmd.aura === "all_stats_mega" ? 1.4 : 1.2);
                    }
                    s.x += Math.cos(s.angle) * speed;
                    s.y += Math.sin(s.angle) * speed;
                }
            } else {
                s.isMoving = false;
                if (isManualOrder) {
                    if (s.targetArrivalAngle !== undefined) {
                        let diffArrival = s.targetArrivalAngle - s.angle;
                        while (diffArrival < -Math.PI) diffArrival += Math.PI * 2;
                        while (diffArrival > Math.PI) diffArrival -= Math.PI * 2;
                        if (Math.abs(diffArrival) > currentRotSpeed) {
                            s.angle += (diffArrival > 0 ? 1 : -1) * currentRotSpeed;
                        } else {
                            s.angle = s.targetArrivalAngle;
                            s.manualTarget = null;
                            s.isGuarding = true;
                            delete s.targetArrivalAngle;
                        }
                    } else {
                        s.manualTarget = null;
                        s.isGuarding = true;
                    }
                }
            }
        }

if (s.state !== 2) {
    const now = performance.now();
    const isArtillery = s.stats.bulletType !== undefined;
    const reloadTime = s.stats.reload || 2000;

    if (now - (s.lastShot || 0) > reloadTime) {
        let targetX = null, targetY = null;
        let targetSquad = null;

        if (s.targetPoint) {
            targetX = s.targetPoint.x;
            targetY = s.targetPoint.y;
        } 
        else {
            let enemies = squads.filter(t => t.side !== s.side && t.alive);
            if (enemies.length > 0) {
                let nearest = enemies.reduce((p, c) => 
                    Math.hypot(c.x - s.x, c.y - s.y) < Math.hypot(p.x - s.x, p.y - s.y) ? c : p);
                
                let dist = Math.hypot(nearest.x - s.x, nearest.y - s.y);
                
                if (dist <= (s.stats.range + 50)) {
                    targetSquad = nearest;
                    let sol = nearest.soldiers.find(v => v.alive);
                    if (sol) {
                        const cos = Math.cos(nearest.angle);
                        const sin = Math.sin(nearest.angle);
                        targetX = nearest.x + (sol.offsetX * cos - sol.offsetY * sin);
                        targetY = nearest.y + (sol.offsetX * sin + sol.offsetY * cos);
                    } else {
                        targetX = nearest.x;
                        targetY = nearest.y;
                    }
                }
            }
        }

        if (targetX !== null) {
            const angleToTarget = Math.atan2(targetY - s.y, targetX - s.x);
            let angleDiff = Math.abs(s.angle - angleToTarget);
            while (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

            if (angleDiff < 0.5) { 
                
                if (isArtillery) {
                    if (typeof spawnProjectile === "function") {
                        spawnProjectile(s, { x: targetX, y: targetY });
                    }
                } else {
                    if (typeof shootSquad === "function" && targetSquad) {
                        shootSquad(s, targetSquad, { x: targetX, y: targetY });
                    }
                }

                s.lastShot = now;
                s.soldiers.forEach(sol => sol.lastShot = now);
            }
        }
    }
}
    });
}
function updateCamera() {
    if (keys['KeyW']) camera.y -= camera.speed;
    if (keys['KeyS']) camera.y += camera.speed;
    if (keys['KeyA']) camera.x -= camera.speed;
    if (keys['KeyD']) camera.x += camera.speed;

    camera.x = Math.max(0, Math.min(camera.x, worldWidth - canvas.width));
    camera.y = Math.max(0, Math.min(camera.y, worldHeight - canvas.height));
}

function checkWinner() {
    if (isPlacementPhase) return false;
    
    let pAlive = squads.some(s => s.side === "player" && s.alive);
    let eAlive = squads.some(s => s.side === "enemy" && s.alive);

    if (!eAlive && squads.length > 0) {
        alert("VICTORY!");
        playerGold += 100 + (currentWave * 20);
        currentWave++;
        resetToMenu();
        return true;
    } 
    
    if (!pAlive && squads.length > 0) {
        alert("DEFEAT...");
        location.reload(); 
        return true;
    }
    return false;
}
function resetToMenu() {
    isPlacementPhase = true;
    selectedSquads = [];
    document.getElementById("start-btn").disabled = false;
    squads.forEach(s => {
        if (s.side === "player") s.manualTarget = null;
    });
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyQ') {
        isAutoMode = !isAutoMode;
    }
});

renderShop();
updateGoldDisplay();
function placementLoop() {
    if (isPlacementPhase) {
        updateCamera();
        draw();
        requestAnimationFrame(placementLoop);
    }
}
placementLoop();
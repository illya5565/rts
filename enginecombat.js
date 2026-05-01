function handlePlacementClick(worldX, worldY) {
    if (!isPlacementPhase || !selectedUnitType) return;
    if (worldX > 450 || worldY < 0 || worldY > worldHeight) return;
    const cost = UnitStats[selectedUnitType].cost;
    if (playerGold >= cost && playerArmy.length < 20) {
        playerGold -= cost;
        const newSquad = createSquad("player", selectedUnitType, worldX, worldY);
        squads.push(newSquad);
        playerArmy.push(newSquad);
        updateGoldDisplay();
        if (typeof renderShop === "function") renderShop();
    }
}

function createSquad(side, type, x, y) {
    const stats = UnitStats[type];
    const soldierCount = stats.size || 40;
    const rotSpeed = stats.rotSpeed || 0.05;

    const isCavalry = ["Hussars", "Cuirassiers", "Dragoon", "Horse Jager", "Mounted Commander", "Ensign", "Commander", "High Officer"].includes(type);
    const isArtillery = ["6lb Cannon", "Howitzer", "Multi-barrel", "Mortar"].includes(type);

    const rows = Math.min(soldierCount, 10);
    const cols = Math.ceil(soldierCount / rows);
    const spacingX = isArtillery ? 22 : 15;
    const spacingY = isCavalry ? 18 : 10;

    const totalW = (cols - 1) * spacingX;
    const totalH = (rows - 1) * spacingY;
    const hW_unit = isArtillery ? 12 : (isCavalry ? 8 : 4);
    const hH_unit = isArtillery ? 6 : (isCavalry ? 8 : 6);

    const squadHitbox = { w: totalW + hW_unit, h: totalH + hH_unit };

    const textureCoords = {
        "Line Infantry": [1, 1], "Veteran Swordsmen": [1, 2], "Armored Knights": [1, 3], "Pikemen": [1, 4],
        "Ensign": [1, 5], "Commander": [1, 6], "High Officer": [1, 7], "Mounted Commander": [1, 8],
        "Fusiliers": [2, 2], "Grenadiers": [2, 3], "Elite Guard": [2, 4],
        "Medic": [3, 2], "Field Surgeon": [3, 3], "Medical Squad": [3, 4],
        "Hussars": [3, 5], "Cuirassiers": [3, 6], "Dragoon": [3, 7], "Horse Jager": [3, 8],
        "6lb Cannon": [5, 1], "Howitzer": [5, 3], "Multi-barrel": [5, 5], "Mortar": [5, 7]
    };

    const pos = textureCoords[type] || [1, 1];
    const sX = (pos[1] - 1) * 8;
    const sY = (pos[0] - 1) * 8;

    let spriteW = 8, spriteH = 8;
    if (isCavalry) spriteH = 16;
    else if (isArtillery) { spriteW = 16; spriteH = 16; }

    let hX = 1, hY = 1, hW = 4, hH = 6;
    if (isCavalry) { hX = 0; hW = 8; hY = 6; hH = 8; }
    else if (isArtillery) { hX = 2; hW = 12; hY = 1; hH = 6; }

    let soldiers = [];
    for (let i = 0; i < soldierCount; i++) {
        const col = Math.floor(i / rows);
        const row = i % rows;
        let offX = isArtillery ? 0 : (isCavalry ? 1 : 1);
        let offY = isArtillery ? 0 : (isCavalry ? -2 : 0);

        soldiers.push({
            offsetX: (col * spacingX) - (totalW / 2) + offX,
            offsetY: (row * spacingY) - (totalH / 2) + offY,
            hp: stats.hp, maxHp: stats.hp,
            alive: true,
            animFrame: 0, animTimer: 0,
            state: "idle",
            deathVariant: Math.floor(Math.random() * 4),
            deathRotation: Math.random() * Math.PI,
            spriteX: sX, spriteY: sY,
            spriteW, spriteH,
            hitX: hX, hitY: hY, hitW: hW, hitH: hH
        });
    }

    return {
        side, type, x, y,
        stats: { ...stats },
        rotationSpeed: rotSpeed,
        soldiers, alive: true, state: 1,
        initialCount: soldierCount,
        deathTimes: [],
        angle: (side === "player") ? 0 : Math.PI,
        isMoving: false,
        aura: stats.aura || null,
        lastShot: 0,
        collisionType: isArtillery ? "precise" : "group",
        hitbox: squadHitbox,
        groupRadius: Math.max(squadHitbox.w, squadHitbox.h) / 2
    };
}

function isPointInSquad(px, py, sq) {
    if (!sq.alive) return false;
    const dx = Math.abs(px - sq.x);
    const dy = Math.abs(py - sq.y);
    return dx < (sq.hitbox.w / 2) && dy < (sq.hitbox.h / 2);
}

function killSoldier(sol, wx, wy, killedByCannon) {
    if (!sol.alive) return;
    sol.alive = false;
    sol.state = "dead";
    sol.animFrame = 0;
    sol.animTimer = 0;
    sol.deathVariant = Math.floor(Math.random() * 2);
    sol.killedBy = killedByCannon ? 'cannon' : 'bullet';

    if (typeof createEffect === "function") {
        if (killedByCannon) {
            createEffect(wx, wy, 'blood_heavy');
            createEffect(wx, wy, 'gibs');
        } else {
            createEffect(wx, wy, 'blood');
        }
    }
}

function spawnProjectile(attacker, target) {
    const isMortar   = attacker.type === "Mortar";
    const isHowitzer = attacker.type === "Howitzer";
    const isMulti    = attacker.type === "Multi-barrel";
    const is6lb      = attacker.type === "6lb Cannon";

    let p = {
        side: attacker.side,
        type: attacker.stats.bulletType,
        x: attacker.x,
        y: attacker.y,
        startX: attacker.x,
        startY: attacker.y,
        targetX: target.x + (Math.random() * 40 - 20),
        targetY: target.y + (Math.random() * 40 - 20),
        z: 0,
        traveled: 0,
        dmg: attacker.stats.dmg,
        state: "fly",
        splash: attacker.stats.splashRadius || 30,
        isPiercing: is6lb || isMulti,
        usesArc: isMortar,
        hitEnemies: new Set()
    };

    p.dist = Math.hypot(p.targetX - p.x, p.targetY - p.y);
    if (p.dist < 1) p.dist = 1;

    if (isMortar) {
        p.maxZ = p.dist * 0.7;
        p.speed = 2.5;
        p.splash = 25;
    } else if (isHowitzer) {
        p.maxZ = p.dist * 0.25;
        p.speed = 6;
        p.splash = 20;
    } else if (isMulti) {
        p.maxZ = 0;
        p.speed = 12;
        p.splash = 8;
    } else {
        p.maxZ = 0;
        p.speed = 5;
        p.splash = 15;
    }

    projectiles.push(p);

    if (typeof createEffect === "function") {
        createEffect(attacker.x, attacker.y, 'smoke');
    }
}

function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let p = projectiles[i];

        if (p.state === "fly") {
            p.traveled += p.speed;
            let t = Math.min(p.traveled / p.dist, 1);

            p.x = p.startX + (p.targetX - p.startX) * t;
            p.y = p.startY + (p.targetY - p.startY) * t;

            p.z = p.usesArc ? Math.sin(t * Math.PI) * (p.maxZ || 0) : 0;

            const LOW_Z = 12;
            const isLow = p.z < LOW_Z;

            if (isLow) {
                squads.forEach(sq => {
                    if (!sq.alive) return;
                    if (!isPointInSquad(p.x, p.y, sq)) return;

                    const cos = Math.cos(sq.angle);
                    const sin = Math.sin(sq.angle);

                    sq.soldiers.forEach(sol => {
                        if (!sol.alive) return;
                        if (p.hitEnemies.has(sol)) return;

                        const wx = sq.x + (sol.offsetX * cos - sol.offsetY * sin);
                        const wy = sq.y + (sol.offsetX * sin + sol.offsetY * cos);

                        const hitRadius = p.isPiercing ? 5 : 8;
                        if (Math.hypot(p.x - wx, p.y - wy) < hitRadius) {
                            sol.hp -= p.dmg * 0.5;
                            p.hitEnemies.add(sol);

                            if (sol.hp <= 0) {
                                const isCannon = (p.type === "mortar_shell" || p.type === "big_ball");
                                killSoldier(sol, wx, wy, isCannon);
                                sq.deathTimes.push(performance.now());
                            }

                            if (!p.isPiercing) p.speed *= 0.85;
                        }
                    });
                });
            }

            if (t >= 1) {
                p.z = 0;
                const hasSplash = (p.type === "mortar_shell" || p.type === "big_ball");
                if (hasSplash) {
                    applySplashDamage(p.x, p.y, p.splash || 20, p.dmg, p.side, true);
                }
                if (typeof createEffect === "function") {
                    createEffect(p.x, p.y, 'impact_dust');
                    createEffect(p.x, p.y - 4, 'smoke');
                }
                p.state = "impact";
            }

        } else if (p.state === "impact") {
            if (p.type === "mortar_shell" || p.type === "big_ball") {
                projectiles.splice(i, 1);
            } else {
                p.state = "roll";
                p.speed = 2;
                p.angle = Math.atan2(p.targetY - p.startY, p.targetX - p.startX);
            }

        } else if (p.state === "roll") {
            p.x += Math.cos(p.angle) * p.speed;
            p.y += Math.sin(p.angle) * p.speed;
            p.speed *= 0.95;

            squads.forEach(sq => {
                if (!sq.alive) return;
                if (!isPointInSquad(p.x, p.y, sq)) return;

                const cos = Math.cos(sq.angle);
                const sin = Math.sin(sq.angle);
                sq.soldiers.forEach(sol => {
                    if (!sol.alive || p.hitEnemies.has(sol)) return;
                    const wx = sq.x + (sol.offsetX * cos - sol.offsetY * sin);
                    const wy = sq.y + (sol.offsetX * sin + sol.offsetY * cos);
                    if (Math.hypot(p.x - wx, p.y - wy) < 6) {
                        sol.hp -= 15;
                        p.hitEnemies.add(sol);
                        if (sol.hp <= 0) {
                            killSoldier(sol, wx, wy, true);
                            sq.deathTimes.push(performance.now());
                        }
                        p.speed *= 0.88;
                    }
                });
            });

            if (p.speed < 0.2) projectiles.splice(i, 1);
        }
    }
}

function applySplashDamage(x, y, radius, damage, side, isBigBoom) {
    squads.forEach(sq => {
        if (!sq.alive) return;

        const halfW = sq.hitbox.w / 2;
        const halfH = sq.hitbox.h / 2;
        const closestX = Math.max(sq.x - halfW, Math.min(x, sq.x + halfW));
        const closestY = Math.max(sq.y - halfH, Math.min(y, sq.y + halfH));
        if (Math.hypot(x - closestX, y - closestY) > radius) return;

        const cos = Math.cos(sq.angle);
        const sin = Math.sin(sq.angle);

        sq.soldiers.forEach(sol => {
            if (!sol.alive) return;
            const wx = sq.x + (sol.offsetX * cos - sol.offsetY * sin);
            const wy = sq.y + (sol.offsetX * sin + sol.offsetY * cos);
            const d = Math.hypot(wx - x, wy - y);
            if (d <= radius) {
                const falloff = 1 - (d / radius);
                sol.hp -= damage * falloff;
                if (sol.hp <= 0) {
                    killSoldier(sol, wx, wy, isBigBoom || false);
                    sq.deathTimes.push(performance.now());
                }
            }
        });

        if (!sq.soldiers.some(sol => sol.alive)) sq.alive = false;
    });
}

function shootSquad(attacker, target, aimPoint) {
    const aliveSoldiers = attacker.soldiers.filter(s => s.alive);
    if (aliveSoldiers.length === 0) return;

    if (attacker.stats.bulletType) {
        if (((target && target.alive) || aimPoint) && !attacker.isMoving) {
            const readySoldier = attacker.soldiers.find(s =>
                s.alive && (!s.lastShot || performance.now() - s.lastShot > attacker.stats.reload)
            );
            if (readySoldier) {
                const tx = aimPoint ? aimPoint.x : (target ? target.x : attacker.x);
                const ty = aimPoint ? aimPoint.y : (target ? target.y : attacker.y);
                spawnProjectile(attacker, { x: tx, y: ty });
                readySoldier.lastShot = performance.now();
                attacker.lastShot = performance.now();
            }
        }
        return;
    }

    const canUseBayonets = attacker.stats.hasBayonets ||
        ["Pikemen", "Veteran Swordsmen", "Armored Knights"].includes(attacker.type);
    const colliding = target ? areSquadsColliding(attacker, target) : false;
    const isMelee = canUseBayonets && colliding;

    if (attacker.isMoving && !isMelee) return;

    if (target) {
        const angleToTarget = Math.atan2(target.y - attacker.y, target.x - attacker.x);
        let angleDiff = Math.abs(attacker.angle - angleToTarget);
        while (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
        if (angleDiff > 0.3 && !isMelee) return;
    }

    let maxAccBonus = 0;
    squads.forEach(b => {
        if (b.side === attacker.side && b.alive && b !== attacker) {
            const d = Math.hypot(b.x - attacker.x, b.y - attacker.y);
            if (d < 150) {
                if (b.aura === "accuracy")      maxAccBonus = Math.max(maxAccBonus, 0.3);
                if (b.aura === "all_stats")     maxAccBonus = Math.max(maxAccBonus, 0.25);
                if (b.aura === "all_stats_mega") maxAccBonus = Math.max(maxAccBonus, 0.5);
            }
        }
    });

    let finalAcc = attacker.stats.acc + maxAccBonus;
    let finalDmg = attacker.stats.dmg;
    let currentReload = attacker.stats.reload;

    if (isMelee) {
        finalAcc = 1.0;
        finalDmg = attacker.stats.dmg * 1.5;
        currentReload = 600;
    }

    if (finalDmg > 0 && Math.random() < finalAcc) {
        if (attacker.stats.splashRadius) {
            const sx = aimPoint ? aimPoint.x : (target ? target.x : attacker.x);
            const sy = aimPoint ? aimPoint.y : (target ? target.y : attacker.y);
            applySplashDamage(sx, sy, attacker.stats.splashRadius, finalDmg, attacker.side, false);
        } else {
            let totalDamage = aliveSoldiers.length * (finalDmg / 10);
            if (target && target.alive) {
                while (totalDamage > 0) {
                    const victims = target.soldiers.filter(s => s.alive);
                    if (victims.length === 0) { target.alive = false; break; }
                    const victim = victims[Math.floor(Math.random() * victims.length)];
                    victim.hp -= finalDmg;
                    if (victim.hp <= 0) {
                        const cos = Math.cos(target.angle);
                        const sin = Math.sin(target.angle);
                        const wx = target.x + (victim.offsetX * cos - victim.offsetY * sin);
                        const wy = target.y + (victim.offsetX * sin + victim.offsetY * cos);
                        killSoldier(victim, wx, wy, false);
                        target.deathTimes.push(performance.now());
                    }
                    totalDamage -= 10;
                }
            }
        }
    }
    attacker.lastShot = performance.now() - (attacker.stats.reload - currentReload);

    if (["heal", "heal_mega", "heal_multi"].includes(attacker.aura)) {
        const injuredSquads = squads.filter(s => {
            if (s.side !== attacker.side || !s.alive) return false;
            const halfW = s.hitbox.w / 2;
            const halfH = s.hitbox.h / 2;
            const closestX = Math.max(s.x - halfW, Math.min(attacker.x, s.x + halfW));
            const closestY = Math.max(s.y - halfH, Math.min(attacker.y, s.y + halfH));
            if (Math.hypot(attacker.x - closestX, attacker.y - closestY) > attacker.stats.range) return false;
            return s.soldiers.some(sol => sol.alive && sol.hp < sol.maxHp);
        });
        if (injuredSquads.length > 0) {
            const limit = attacker.aura === "heal_multi" ? 3 : 1;
            const healAmt = attacker.aura === "heal_mega" ? 15 : 8;
            injuredSquads.slice(0, limit).forEach(sq => {
                sq.soldiers.forEach(sol => {
                    if (sol.alive && sol.hp < sol.maxHp)
                        sol.hp = Math.min(sol.maxHp, sol.hp + healAmt);
                });
            });
        }
    }
}

function areSquadsColliding(s1, s2) {
    if (!s1.hitbox || !s2.hitbox) return false;

    const getCorners = (s) => {
        const halfW = s.hitbox.w / 2;
        const halfH = s.hitbox.h / 2;
        const cos = Math.cos(s.angle);
        const sin = Math.sin(s.angle);
        return [
            { x: s.x + (-halfW * cos - -halfH * sin), y: s.y + (-halfW * sin + -halfH * cos) },
            { x: s.x + ( halfW * cos - -halfH * sin), y: s.y + ( halfW * sin + -halfH * cos) },
            { x: s.x + ( halfW * cos -  halfH * sin), y: s.y + ( halfW * sin +  halfH * cos) },
            { x: s.x + (-halfW * cos -  halfH * sin), y: s.y + (-halfW * sin +  halfH * cos) }
        ];
    };

    const corners1 = getCorners(s1);
    const corners2 = getCorners(s2);
    const axes = [];
    [corners1, corners2].forEach(corners => {
        for (let i = 0; i < 2; i++) {
            const p1 = corners[i], p2 = corners[i + 1];
            axes.push({ x: -(p2.y - p1.y), y: p2.x - p1.x });
        }
    });

    for (const axis of axes) {
        const project = (corners) => {
            let min = Infinity, max = -Infinity;
            corners.forEach(p => {
                const dot = p.x * axis.x + p.y * axis.y;
                min = Math.min(min, dot);
                max = Math.max(max, dot);
            });
            return { min, max };
        };
        const p1 = project(corners1);
        const p2 = project(corners2);
        if (p1.max < p2.min || p2.max < p1.min) return false;
    }
    return true;
}
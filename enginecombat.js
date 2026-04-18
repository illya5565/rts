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

const squadHitbox = {
  w: totalW + hW_unit , 
  h: totalH + hH_unit
};

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
    else if (isArtillery) spriteW = 16; 

    let hX = 1, hY = 1, hW = 4, hH = 6;
    if (isCavalry) { hX = 0; hW = 8; hY = 6; hH = 8; }
    else if (isArtillery) { hX = 2; hW = 12; hY = 1; hH = 6; }

    let soldiers = [];
    for (let i = 0; i < soldierCount; i++) {
        const col = Math.floor(i / rows);
        const row = i % rows;
        let offX = 0;
        let offY = 0;
        if (isArtillery) {
            offX = 0;
            offY = 0;
        } else if (isCavalry) {
            offX = 1;
            offY = -2;
        } else {
            offX = 1;
            offY = 0;
        }

        soldiers.push({
            offsetX: (col * spacingX) - (totalW / 2) + offX,
            offsetY: (row * spacingY) - (totalH / 2) + offY,
            hp: stats.hp, 
            maxHp: stats.hp, 
            alive: true,
            animFrame: 0,
            animTimer: 0,
            state: "idle",
            deathVariant: Math.floor(Math.random() * 4),
            deathRotation: Math.random() * Math.PI,
            spriteX: sX, 
            spriteY: sY, 
            spriteW: spriteW, 
            spriteH: spriteH,
            hitX: hX, 
            hitY: hY, 
            hitW: hW, 
            hitH: hH
        });
    }

    return {
        side, 
        type, 
        x, 
        y, 
        stats: { ...stats }, 
        rotationSpeed: rotSpeed,
        soldiers, 
        alive: true, 
        
        state: 1, 
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
function spawnProjectile(attacker, target) {
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
        speed: 4,
        dmg: attacker.stats.dmg,
        state: "fly",
        splash: attacker.stats.splashRadius || 40,
        isPiercing: false
    };

    p.dist = Math.hypot(p.targetX - p.x, p.targetY - p.y);
    
    const uType = attacker.type; 

    if (uType === "Howitzer") {
        p.maxZ = p.dist * 0.1;
        p.speed = 5;
    } 
    else if (uType === "Mortar") {
        p.maxZ = p.dist * 0.8;
        p.speed = 2;
    } 
    else if (uType === "Multi-barrel") {
        p.maxZ = 0;
        p.isPiercing = true;
        p.speed = 10;
        p.splash = 0;
    } 
    else {
        p.maxZ = p.dist * 0.2;
    }

    projectiles.push(p);
    createEffect(attacker.x, attacker.y, 'smoke');
}
function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let p = projectiles[i];
        
        if (p.state === "fly") {
            p.traveled += p.speed;
            let t = p.traveled / p.dist;
            
            p.x = p.startX + (p.targetX - p.startX) * t;
            p.y = p.startY + (p.targetY - p.startY) * t;
            p.z = Math.sin(t * Math.PI) * p.maxZ;

            if (p.z < 15) {
                squads.forEach(sq => {
                    if (sq.alive && sq.side !== p.side) {
                        if (isPointInSquad(p.x, p.y, sq)) {
                            sq.soldiers.forEach(sol => {
                                if (sol.alive) {
                                    const cos = Math.cos(sq.angle);
                                    const sin = Math.sin(sq.angle);
                                    const sx = sq.x + (sol.offsetX * cos - sol.offsetY * sin);
                                    const sy = sq.y + (sol.offsetX * sin + sol.offsetY * cos);

                                    if (Math.hypot(p.x - sx, p.y - sy) < 8) {
    sol.hp -= (p.state === "roll" ? 10 : p.dmg * 0.5);
    
    if (sol.hp <= 0 && sol.alive) {
    sol.alive = false;
    sol.state = "dead";
    sol.animFrame = 0;
    sol.animTimer = 0;
if (typeof createEffect === "function") {
    createEffect(sol.x, sol.y, 'blood');
}


   

        sol.deathVariant = Math.floor(Math.random() * 2);
        sol.killedBy = (p.type === "mortar_shell" || p.type === "cannonball") ? 'cannon' : 'bullet';
        createEffect(sx, sy, 'blood'); 
    }
    p.speed *= 0.9; 
}
                                }
                            });
                        }
                    }
                });
            }

           if (t >= 1) {
    p.state = "impact";
    p.z = 0;
    
    const splashRad = p.type === "mortar_shell" ? 30 : 15; 
    const splashDmg = p.dmg;
    
    applySplashDamage(p.x, p.y, splashRad, splashDmg, p.side);
}
        } 
        else if (p.state === "impact") {
            p.state = "roll";
            p.speed = p.type === "mortar_shell" ? 0 : 2.5; 
            p.angle = Math.atan2(p.targetY - p.startY, p.targetX - p.startX);
        } 
        else if (p.state === "roll") {
            p.x += Math.cos(p.angle) * p.speed;
            p.y += Math.sin(p.angle) * p.speed;
            p.speed *= 0.96; 

            squads.forEach(sq => {
                if (sq.alive && sq.side !== p.side) {
                    if (isPointInSquad(p.x, p.y, sq)) {
                        sq.soldiers.forEach(sol => {
                            if (sol.alive) {
                                const cos = Math.cos(sq.angle);
                                const sin = Math.sin(sq.angle);
                                const sx = sq.x + (sol.offsetX * cos - sol.offsetY * sin);
                                const sy = sq.y + (sol.offsetX * sin + sol.offsetY * cos);

                                if (Math.hypot(p.x - sx, p.y - sy) < 8) {
    sol.hp -= (p.state === "roll" ? 10 : p.dmg * 0.5);
    
    if (sol.hp <= 0 && sol.alive) {
    sol.alive = false;
    sol.state = "dead";
    sol.animFrame = 0;
    sol.animTimer = 0;
    if (typeof createEffect === "function") {
    createEffect(sol.x, sol.y, 'blood');
}


        sol.deathVariant = Math.floor(Math.random() * 2);
        sol.killedBy = (p.type === "mortar_shell" || p.type === "cannonball") ? 'cannon' : 'bullet';
        createEffect(sx, sy, 'blood'); 
    }
    p.speed *= 0.9; 
}
                            }
                        });
                    }
                }
            });

            if (p.speed < 0.2) projectiles.splice(i, 1);
        }
    }
}

function applySplashDamage(x, y, radius, damage, side) {
    s.soldiers.forEach(sol => {

    if (!sol.alive) {
        sol.state = "dead";
        return;
    }

        const halfW = s.hitbox.w / 2;
        const halfH = s.hitbox.h / 2;
        const closestX = Math.max(s.x - halfW, Math.min(x, s.x + halfW));
        const closestY = Math.max(s.y - halfH, Math.min(y, s.y + halfH));
        const distToRect = Math.hypot(x - closestX, y - closestY);
        if (distToRect > radius) return;

        let hit = false;
        s.soldiers.forEach(sol => {

    if (!sol.alive) {
        sol.state = "dead";
        return;
    }
            
            const cos = Math.cos(s.angle);
            const sin = Math.sin(s.angle);
            const sWorldX = s.x + (soldier.offsetX * cos - soldier.offsetY * sin);
            const sWorldY = s.y + (soldier.offsetX * sin + soldier.offsetY * cos);
            
            const d = Math.hypot(sWorldX - x, sWorldY - y);

            if (d <= radius) {
                const falloff = 1 - (d / radius);
                soldier.hp -= damage * falloff;
                hit = true;
            }
        });
        
        if (hit && !s.soldiers.some(sol => sol.alive)) s.alive = false;
    });
}

function shootSquad(attacker, target, aimPoint) {
    const aliveSoldiers = attacker.soldiers.filter(s => s.alive);
    if (aliveSoldiers.length === 0) return;

    if (attacker.stats.bulletType) {
if (( (target && target.alive) || aimPoint) && !attacker.isMoving) {
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

    const dist = target ? Math.hypot(target.x - attacker.x, target.y - attacker.y) : 999;
    const canUseBayonets = attacker.stats.hasBayonets || ["Pikemen", "Veteran Swordsmen", "Armored Knights"].includes(attacker.type);
    const colliding = areSquadsColliding(attacker, target);
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
            let d = Math.hypot(b.x - attacker.x, b.y - attacker.y);
            if (d < 150) {
                if (b.aura === "accuracy") maxAccBonus = Math.max(maxAccBonus, 0.3);
                if (b.aura === "all_stats") maxAccBonus = Math.max(maxAccBonus, 0.25);
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
            const sx = aimPoint ? aimPoint.x : target.x;
            const sy = aimPoint ? aimPoint.y : target.y;
            applySplashDamage(sx, sy, attacker.stats.splashRadius, finalDmg, attacker.side);
        } else {
            let totalDamage = aliveSoldiers.length * (finalDmg / 10);
            if (target && target.alive) {
                while (totalDamage > 0) {
                    let victims = target.soldiers.filter(s => s.alive);
                    if (victims.length === 0) { target.alive = false; break; }
                    let victim = victims[Math.floor(Math.random() * victims.length)];
                    victim.hp -= finalDmg; 
                    if (victim.hp <= 0) {
                        victim.alive = false;
                        target.deathTimes.push(performance.now());
                    }
                    totalDamage -= 10;
                }
            }
        }
    }

    attacker.lastShot = performance.now() - (attacker.stats.reload - currentReload);

    if (["heal", "heal_mega", "heal_multi"].includes(attacker.aura)) {
    let injuredSquads = squads.filter(s => {
        if (s.side !== attacker.side || !s.alive) return false;
        const halfW = s.hitbox.w / 2;
        const halfH = s.hitbox.h / 2;
        const closestX = Math.max(s.x - halfW, Math.min(attacker.x, s.x + halfW));
        const closestY = Math.max(s.y - halfH, Math.min(attacker.y, s.y + halfH));
        const distToRect = Math.hypot(attacker.x - closestX, attacker.y - closestY);
        if (distToRect > attacker.stats.range) return false;
        return s.soldiers.some(sol => sol.alive && sol.hp < sol.maxHp);
    });

    if (injuredSquads.length > 0) {
        let limit = attacker.aura === "heal_multi" ? 3 : 1;
        let healAmt = attacker.aura === "heal_mega" ? 15 : 8;

        injuredSquads.slice(0, limit).forEach(sq => {
            sq.soldiers.forEach(sol => {
                if (sol.alive && sol.hp < sol.maxHp) {
                    sol.hp = Math.min(sol.maxHp, sol.hp + healAmt);
                }
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
            { x: s.x + (halfW * cos - -halfH * sin),  y: s.y + (halfW * sin + -halfH * cos) },
            { x: s.x + (halfW * cos - halfH * sin),   y: s.y + (halfW * sin + halfH * cos) },
            { x: s.x + (-halfW * cos - halfH * sin),  y: s.y + (-halfW * sin + halfH * cos) }
        ];
    };

    const corners1 = getCorners(s1);
    const corners2 = getCorners(s2);

    const axes = [];
    [corners1, corners2].forEach(corners => {
        for (let i = 0; i < 2; i++) {
            const p1 = corners[i];
            const p2 = corners[i + 1];
            axes.push({ x: -(p2.y - p1.y), y: p2.x - p1.x });
        }
    });

    for (let axis of axes) {
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
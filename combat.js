function areSquadsColliding(s1, s2) {
    if (!s1.hitbox || !s2.hitbox) return false;
    const corners = s => {
        const hw = s.hitbox.w/2, hh = s.hitbox.h/2;
        const c = Math.cos(s.angle), sn = Math.sin(s.angle);
        return [
            { x: s.x + (-hw*c - -hh*sn), y: s.y + (-hw*sn + -hh*c) },
            { x: s.x + ( hw*c - -hh*sn), y: s.y + ( hw*sn + -hh*c) },
            { x: s.x + ( hw*c -  hh*sn), y: s.y + ( hw*sn +  hh*c) },
            { x: s.x + (-hw*c -  hh*sn), y: s.y + (-hw*sn +  hh*c) },
        ];
    };
    const c1 = corners(s1), c2 = corners(s2);
    const axes = [];
    [c1, c2].forEach(pts => {
        for (let i = 0; i < 2; i++) {
            const p1 = pts[i], p2 = pts[i+1];
            axes.push({ x: -(p2.y-p1.y), y: p2.x-p1.x });
        }
    });
    for (const ax of axes) {
        const proj = pts => {
            let mn = Infinity, mx = -Infinity;
            pts.forEach(p => { const d = p.x*ax.x + p.y*ax.y; mn = Math.min(mn,d); mx = Math.max(mx,d); });
            return { mn, mx };
        };
        const p1 = proj(c1), p2 = proj(c2);
        if (p1.mx < p2.mn || p2.mx < p1.mn) return false;
    }
    return true;
}

function isPointInSquad(px, py, sq) {
    if (!sq.alive) return false;
    return Math.abs(px - sq.x) < sq.hitbox.w/2 && Math.abs(py - sq.y) < sq.hitbox.h/2;
}

function killSoldier(sol, wx, wy, cause) {
    if (!sol.alive) return;
    sol.alive = false;
    deathAnims.push({
        x: wx, y: wy,
        animType: Math.floor(Math.random()*4),
        animFrame: 0, animTimer: 0,
        flip: (sol.lastAngle||0) > Math.PI/2 || (sol.lastAngle||0) < -Math.PI/2,
    });
    if (typeof createEffect === "function") {
        createEffect(wx, wy, cause === "cannon" ? "blood_heavy" : "blood");
        if (cause === "cannon") createEffect(wx, wy, "gibs");
    }
}

function applySplashDamage(x, y, radius, damage, ownerSide, isBigBoom) {
    squads.forEach(sq => {
        if (!sq.alive) return;
        const hw = sq.hitbox.w/2, hh = sq.hitbox.h/2;
        const cx = Math.max(sq.x-hw, Math.min(x, sq.x+hw));
        const cy = Math.max(sq.y-hh, Math.min(y, sq.y+hh));
        if (Math.hypot(x-cx, y-cy) > radius) return;
        const cos = Math.cos(sq.angle), sin = Math.sin(sq.angle);
        sq.soldiers.forEach(sol => {
            if (!sol.alive) return;
            const wp = sol.worldPos(sq.x, sq.y, cos, sin);
            const d  = Math.hypot(wp.x-x, wp.y-y);
            if (d <= radius) {
                const died = sol.takeDamage(damage * (1 - d/radius) * sq.dmgTakenMult);
                if (died) { killSoldier(sol, wp.x, wp.y, isBigBoom ? "cannon" : "bullet"); sq.onSoldierDeath(); }
            }
        });
        if (!sq.soldiers.some(s => s.alive)) sq.alive = false;
    });
}

function updateProjectiles() {
    for (let i = projectiles.length-1; i >= 0; i--) {
        const p = projectiles[i];
        const events = p.tick(squads);
        for (const ev of events) {
            if (ev.type === "kill") {
                killSoldier(ev.soldier, ev.x, ev.y, ev.cause);
            } else if (ev.type === "splash") {
                applySplashDamage(ev.x, ev.y, ev.radius, ev.dmg, p.side, true);
            } else if (ev.type === "impact") {
                if (typeof createEffect === "function") {
                    createEffect(ev.x, ev.y, "impact_dust");
                    createEffect(ev.x, ev.y, "cannon_impact");
                    createEffect(ev.x, ev.y-4, "smoke");
                    if (typeof Audio !== "undefined") Audio.playImpact();
                }
            }
        }
        if (p.isDone) projectiles.splice(i, 1);
    }
}

function getAuraBonus(attacker) {
    let accBonus = 0, spdBonus = 0;
    for (const b of squads) {
        if (b.side !== attacker.side || !b.alive || b === attacker) continue;
        if (Math.hypot(b.x-attacker.x, b.y-attacker.y) > 200) continue;
        if (b.aura === "accuracy")       accBonus = Math.max(accBonus, 0.30);
        if (b.aura === "all_stats")      { accBonus = Math.max(accBonus, 0.25); spdBonus = Math.max(spdBonus, 0.20); }
        if (b.aura === "all_stats_mega") { accBonus = Math.max(accBonus, 0.50); spdBonus = Math.max(spdBonus, 0.40); }
    }
    return { accBonus, spdBonus };
}

function shootSquad(attacker, target, aimPoint) {
    const now = performance.now();
    if (now - attacker.lastShot < attacker.stats.reload) return false;

    const alive = attacker.soldiers.filter(s => s.alive);
    if (!alive.length) return false;

    const colliding = target ? areSquadsColliding(attacker, target) : false;
    const isMelee   = attacker.isMeleeUnit && colliding;

    if (target && !isMelee) {
        let diff = Math.abs(attacker.angle - Math.atan2(target.y-attacker.y, target.x-attacker.x));
        if (diff > Math.PI) diff = Math.PI*2 - diff;
        if (diff > 0.8) return false;
    }

    if (attacker.isMoving && !isMelee) return false;

    const { accBonus } = getAuraBonus(attacker);
    let finalAcc = Math.min(1.0, attacker.effectiveAcc + accBonus);
    let finalDmg = attacker.stats.dmg;

    if (isMelee) { finalAcc = 1.0; finalDmg *= 1.5; }

    alive.forEach(sol => sol.setAnimState("shoot"));
    attacker.lastShot = now;
    if (!attacker.stats.bulletType) {
        if (typeof Audio !== "undefined") Audio.playShoot(attacker.isCavalry);
    }

    if (attacker.stats.bulletType) {
        const tx = aimPoint ? aimPoint.x : (target ? target.x : attacker.x);
        const ty = aimPoint ? aimPoint.y : (target ? target.y : attacker.y);
        projectiles.push(new Projectile(attacker, { x: tx, y: ty }));
        if (typeof createEffect === "function") createEffect(attacker.x, attacker.y, "smoke");
        if (typeof Audio !== "undefined") Audio.playCannon();
        return true;
    }

    if (Math.random() >= finalAcc) return true;

    if (attacker.stats.splashRadius && aimPoint) {
        applySplashDamage(aimPoint.x, aimPoint.y, attacker.stats.splashRadius, finalDmg, attacker.side, false);
        return true;
    }

    if (!target || !target.alive) return true;

    let remaining = alive.length * finalDmg;
    while (remaining > 0) {
        const victims = target.soldiers.filter(s => s.alive);
        if (!victims.length) { target.alive = false; break; }
        const victim = victims[Math.floor(Math.random() * victims.length)];
        const died   = victim.takeDamage(finalDmg * target.dmgTakenMult);
        remaining -= finalDmg;
        if (died) {
            const wp = victim.worldPos(target.x, target.y, Math.cos(target.angle), Math.sin(target.angle));
            killSoldier(victim, wp.x, wp.y, isMelee ? "melee" : "bullet");
            target.onSoldierDeath();
        }
    }

    _tickHealAura(attacker);
    return true;
}

function _tickHealAura(attacker) {
    if (!["heal","heal_mega","heal_multi"].includes(attacker.aura)) return;
    const limit   = attacker.aura === "heal_multi" ? 3 : 1;
    const healAmt = attacker.aura === "heal_mega"  ? 15 : 8;
    squads
        .filter(s => s.side === attacker.side && s.alive && s !== attacker &&
                     Math.hypot(attacker.x-s.x, attacker.y-s.y) < attacker.stats.range &&
                     s.soldiers.some(sol => sol.alive && sol.hp < sol.maxHp))
        .slice(0, limit)
        .forEach(sq => sq.soldiers.forEach(sol => {
            if (sol.alive && sol.hp < sol.maxHp) sol.hp = Math.min(sol.maxHp, sol.hp + healAmt);
        }));
}

function handlePlacementClick(worldX, worldY) {
    if (!isPlacementPhase || !selectedUnitType) return;
    if (worldX > 450 || worldY < 0 || worldY > worldHeight) return;
    const cost = UnitStats[selectedUnitType].cost;
    if (playerGold < cost || playerArmy.length >= 20) return;
    playerGold -= cost;
    const sq = createSquad("player", selectedUnitType, worldX, worldY);
    squads.push(sq);
    playerArmy.push(sq);
    updateGoldDisplay();
    if (typeof renderShop === "function") renderShop();
}
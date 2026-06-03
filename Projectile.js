class Projectile {
    constructor(attacker, targetPos) {
        this.side       = attacker.side;
        this.ownerSquad = attacker;
        this.type       = attacker.stats.bulletType;
        this.dmg        = attacker.stats.dmg;
        this.splash     = attacker.stats.splashRadius || 30;
        this.hitEnemies = new Set();

        this.x      = attacker.x;
        this.y      = attacker.y;
        this.startX = attacker.x;
        this.startY = attacker.y;
        this.z      = 0;

        const scatter = this._scatterFor(attacker.type);
        this.targetX = targetPos.x + (Math.random() * scatter - scatter / 2);
        this.targetY = targetPos.y + (Math.random() * scatter - scatter / 2);

        this.dist     = Math.max(1, Math.hypot(this.targetX - this.x, this.targetY - this.y));
        this.traveled = 0;
        this.state    = "fly";

        this._applyTypeParams(attacker.type);

        this.angle = Math.atan2(this.targetY - this.startY, this.targetX - this.startX);
    }

    _scatterFor(type) {
        switch (type) {
            case "Mortar":       return 80;
            case "Multi-barrel": return 20;
            case "Howitzer":     return 50;
            default:             return 40;
        }
    }

    _applyTypeParams(type) {
        switch (type) {
            case "Mortar":
                this.maxZ      = this.dist * 0.7;
                this.speed     = 2.5;
                this.splash    = 60;
                this.usesArc   = true;
                this.neverLow  = true;
                this.isPiercing = false;
                break;
            case "Howitzer":
                this.maxZ      = this.dist * 0.18;
                this.speed     = 6;
                this.splash    = 35;
                this.usesArc   = false;
                this.isPiercing = false;
                break;
            case "Multi-barrel":
                this.maxZ      = 0;
                this.speed     = 12;
                this.splash    = 8;
                this.alwaysLow = true;
                this.isPiercing = true;
                break;
            default:
                this.maxZ      = this.dist * 0.08;
                this.speed     = 5;
                this.splash    = 15;
                this.isPiercing = true;
                break;
        }
    }

    tick(allSquads) {
        if (this.state === "done") return [];

        if (this.state === "fly")  return this._tickFly(allSquads);
        if (this.state === "roll") return this._tickRoll(allSquads);
        return [];
    }

    _tickFly(allSquads) {
        const events = [];
        this.traveled += this.speed;
        const t = Math.min(this.traveled / this.dist, 1);

        this.x = this.startX + (this.targetX - this.startX) * t;
        this.y = this.startY + (this.targetY - this.startY) * t;
        this.z = this.usesArc ? Math.sin(t * Math.PI) * (this.maxZ || 0) : 0;

        const LOW_Z   = 12;
        const isLow   = this.alwaysLow ? true : (this.neverLow ? false : this.z < LOW_Z);
        const hasSplash = (this.type === "mortar_shell" || this.type === "big_ball");

        if (isLow) {
            for (const sq of allSquads) {
                if (!sq.alive || sq === this.ownerSquad) continue;
                if (!isPointInSquad(this.x, this.y, sq)) continue;

                const cos = Math.cos(sq.angle), sin = Math.sin(sq.angle);
                for (const sol of sq.soldiers) {
                    if (!sol.alive || this.hitEnemies.has(sol)) continue;
                    const wp = sol.worldPos(sq.x, sq.y, cos, sin);
                    const hitR = this.isPiercing ? 5 : 8;
                    if (Math.hypot(this.x - wp.x, this.y - wp.y) < hitR) {
                        const died = sol.takeDamage(this.dmg * 0.5 * sq.dmgTakenMult);
                        this.hitEnemies.add(sol);
                        if (died) {
                            events.push({ type: "kill", x: wp.x, y: wp.y, squad: sq, soldier: sol, cause: "cannon" });
                            sq.onSoldierDeath();
                        }
                        if (!this.isPiercing) this.speed *= 0.85;
                    }
                }
            }
        }

        if (t >= 1) {
            this.z = 0;
            events.push({ type: "impact", x: this.x, y: this.y });
            if (hasSplash) {
                events.push({ type: "splash", x: this.x, y: this.y, radius: this.splash, dmg: this.dmg });
            }

            if (this.neverLow) {
                this.state = "done";
            } else {
                this.state = "roll";
                this.hitEnemies.clear();
                this.speed = 2.5;
            }
        }

        return events;
    }

    _tickRoll(allSquads) {
        const events = [];
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.speed *= 0.98;

        for (const sq of allSquads) {
            if (!sq.alive || sq === this.ownerSquad) continue;
            if (!isPointInSquad(this.x, this.y, sq)) continue;

            const cos = Math.cos(sq.angle), sin = Math.sin(sq.angle);
            for (const sol of sq.soldiers) {
                if (!sol.alive || this.hitEnemies.has(sol)) continue;
                const wp = sol.worldPos(sq.x, sq.y, cos, sin);
                if (Math.hypot(this.x - wp.x, this.y - wp.y) < 10) {
                    const died = sol.takeDamage(this.dmg * 0.5 * sq.dmgTakenMult);
                    this.hitEnemies.add(sol);
                    if (died) {
                        events.push({ type: "kill", x: wp.x, y: wp.y, squad: sq, soldier: sol, cause: "cannon" });
                        sq.onSoldierDeath();
                    }
                }
            }
        }

        if (this.speed < 0.3) this.state = "done";
        return events;
    }

    get isDone() { return this.state === "done"; }
}
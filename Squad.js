const MORALE_DEBUFF_THRESHOLD  = 0.45;
const MORALE_RECOVER_THRESHOLD = 0.65;
const MORALE_REGEN_RATE        = 0.0006;
const MORALE_LOSS_PER_DEATH    = 0.04;
const MORALE_LOSS_RECENT_MULT  = 2.0;
const DEBUFF_ACC_MIN           = 0.50;
const DEBUFF_DMGTAKEN_MAX      = 1.50;

const TEXTURE_COORDS = {
    "Line Infantry":    [1,1], "Veteran Swordsmen": [1,2],
    "Armored Knights":  [1,3], "Pikemen":            [1,4],
    "Ensign":           [1,5], "Commander":          [1,6],
    "High Officer":     [1,7], "Mounted Commander":  [1,8],
    "Fusiliers":        [2,2], "Grenadiers":         [2,3], "Elite Guard":   [2,4],
    "Medic":            [3,2], "Field Surgeon":      [3,3], "Medical Squad": [3,4],
    "Hussars":          [3,5], "Cuirassiers":        [3,6],
    "Dragoon":          [3,7], "Horse Jager":        [3,8],
    "6lb Cannon":       [5,1], "Howitzer":           [5,3],
    "Multi-barrel":     [5,5], "Mortar":             [5,7],
};

const CAVALRY_TYPES   = new Set(["Hussars","Cuirassiers","Dragoon","Horse Jager",
                                  "Mounted Commander","Ensign","Commander","High Officer"]);
const ARTILLERY_TYPES = new Set(["6lb Cannon","Howitzer","Multi-barrel","Mortar"]);
const SUPPORT_TYPES   = new Set(["Commander","Ensign","Medic","Mounted Commander",
                                  "High Officer","Field Surgeon","Medical Squad"]);
const MELEE_TYPES     = new Set(["Veteran Swordsmen","Armored Knights","Pikemen"]);
const BAYONET_TYPES   = new Set(["Fusiliers","Grenadiers"]);

class Squad {
    constructor(side, type, x, y) {
        this.side  = side;
        this.type  = type;
        this.x     = x;
        this.y     = y;
        this.angle = (side === "player") ? 0 : Math.PI;
        this.alive = true;

        this.stats = { ...UnitStats[type] };

        this.isCavalry   = CAVALRY_TYPES.has(type);
        this.isArtillery = ARTILLERY_TYPES.has(type);
        this.isSupport   = SUPPORT_TYPES.has(type);
        this.isMeleeUnit = MELEE_TYPES.has(type) || BAYONET_TYPES.has(type);
        this.aura        = this.stats.aura || null;

        this.isMoving           = false;
        this.rotSpeed           = this.stats.rotSpeed || 0.05;
        this.lastShot           = 0;
        this.manualTarget       = null;
        this.attackOrder        = null;
        this.targetPoint        = null;
        this.targetArrivalAngle = undefined;
        this.isGuarding         = false;

        this.morale           = 1.0;
        this.isDebuffed       = false;
        this.accDebuff        = 1.0;
        this.dmgTakenMult     = 1.0;
        this.recentDeathTimes = [];

        this._buildHitbox();
        this.soldiers     = this._buildSoldiers();
        this.initialCount = this.soldiers.length;
        this.groupRadius  = Math.max(this.hitbox.w, this.hitbox.h) / 2;
    }

    _buildHitbox() {
        const cnt     = this.stats.size || 1;
        const maxRows = this.isArtillery ? 1 : (this.isCavalry ? 3 : 6);

        let bestRows = 1, bestCols = cnt;
        for (let r = 1; r <= Math.min(cnt, maxRows); r++) {
            const c = Math.ceil(cnt / r);
            if (Math.abs(c - r) <= Math.abs(bestCols - bestRows)) {
                bestRows = r; bestCols = c;
            }
        }

        const spacingX = this.isArtillery ? 24 : (this.isCavalry ? 20 : 14);
        const spacingY = this.isArtillery ? 20 : (this.isCavalry ? 20 : 10);
        const hW       = this.isArtillery ? 12 : (this.isCavalry ? 8 : 4);
        const hH       = this.isArtillery ?  6 : (this.isCavalry ? 8 : 6);

        this._rows = bestRows; this._cols = bestCols;
        this._spacingX = spacingX; this._spacingY = spacingY;
        this.hitbox = { w: (bestCols-1)*spacingX + hW, h: (bestRows-1)*spacingY + hH };
    }

    _buildSoldiers() {
        const cnt    = this.stats.size || 1;
        const pos    = TEXTURE_COORDS[this.type] || [1,1];
        const sX     = (pos[1]-1) * 8;
        const sY     = (pos[0]-1) * 8;
        const sw     = this.isArtillery ? 16 : 8;
        const sh     = (this.isCavalry || this.isArtillery) ? 16 : 8;
        const totalW = (this._cols-1) * this._spacingX;
        const totalH = (this._rows-1) * this._spacingY;

        return Array.from({ length: cnt }, (_, i) => new Soldier({
            offsetX: Math.floor(i / this._rows) * this._spacingX - totalW / 2,
            offsetY: (i % this._rows) * this._spacingY - totalH / 2,
            hp: this.stats.hp,
            spriteX: sX, spriteY: sY, spriteW: sw, spriteH: sh,
        }));
    }

    onSoldierDeath() {
        const now = performance.now();
        this.recentDeathTimes.push(now);
        const recent = this.recentDeathTimes.filter(t => now - t < 3000).length;
        const loss   = MORALE_LOSS_PER_DEATH * (recent > 3 ? MORALE_LOSS_RECENT_MULT : 1);
        this.morale  = Math.max(0, this.morale - loss);
        this._applyMoraleDebuffs();
    }

    _applyMoraleDebuffs() {
        if (this.morale >= MORALE_RECOVER_THRESHOLD) {
            this.accDebuff = 1.0; this.dmgTakenMult = 1.0; this.isDebuffed = false;
            return;
        }
        if (this.morale < MORALE_DEBUFF_THRESHOLD) {
            const t = this.morale / MORALE_DEBUFF_THRESHOLD;
            this.accDebuff    = DEBUFF_ACC_MIN + (1.0 - DEBUFF_ACC_MIN) * t;
            this.dmgTakenMult = DEBUFF_DMGTAKEN_MAX - (DEBUFF_DMGTAKEN_MAX - 1.0) * t;
            this.isDebuffed   = true;
        }
    }

    tickMorale() {
        const now = performance.now();
        this.recentDeathTimes = this.recentDeathTimes.filter(t => now - t < 5000);
        this.morale = Math.min(1, this.morale + MORALE_REGEN_RATE);
        this._applyMoraleDebuffs();
    }

    getMoveTarget() {
        if (this.targetPoint) return null;
        if (this.manualTarget) return { ...this.manualTarget, isManual: true };
        if (this.attackOrder && this.attackOrder.alive) return this.attackOrder;
        return null;
    }

    get effectiveSpeed() { return this.stats.speed; }
    get effectiveAcc()   { return Math.min(1, this.stats.acc * this.accDebuff); }
    get aliveCount()     { return this.soldiers.filter(s => s.alive).length; }
    get isFullyDead()    { return !this.soldiers.some(s => s.alive); }
    get canFight()       { return !this.isFullyDead; }
}

function createSquad(side, type, x, y) { return new Squad(side, type, x, y); }
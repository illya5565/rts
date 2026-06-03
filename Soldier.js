class Soldier {
    constructor({ offsetX, offsetY, hp, spriteX, spriteY, spriteW = 8, spriteH = 8 }) {
        this.offsetX = offsetX;
        this.offsetY = offsetY;
        this.hp      = hp;
        this.maxHp   = hp;
        this.alive   = true;

        this.animFrame = 0;
        this.animTimer = 0;
        this.state     = "idle";

        this.spriteX = spriteX;
        this.spriteY = spriteY;
        this.spriteW = spriteW;
        this.spriteH = spriteH;

        this.lastAngle = 0;
    }

    worldPos(squadX, squadY, cos, sin) {
        return {
            x: squadX + (this.offsetX * cos - this.offsetY * sin),
            y: squadY + (this.offsetX * sin + this.offsetY * cos),
        };
    }

    takeDamage(amount) {
        this.hp -= amount;
        return this.hp <= 0;
    }

    setAnimState(state) {
        if (this.state === state) return;
        this.state     = state;
        this.animFrame = 0;
        this.animTimer = 0;
    }

    tickAnim(step = 128) {
        this.animTimer++;
        if (this.state === "shoot") {
            if (this.animTimer > 8)  { this.animFrame++; this.animTimer = 0; }
            if (this.animFrame >= 3) { this.state = "idle"; this.animFrame = 0; return this.spriteX; }
            return this.spriteX + (3 + this.animFrame) * step;
        }
        if (this.state === "move") {
            if (this.animTimer > 18) { this.animFrame = (this.animFrame === 1) ? 2 : 1; this.animTimer = 0; }
            if (this.animFrame < 1)  this.animFrame = 1;
            return this.spriteX + this.animFrame * step;
        }
        this.animFrame = 0;
        this.animTimer = 0;
        return this.spriteX;
    }
}
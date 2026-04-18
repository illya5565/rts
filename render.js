const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
let particles = [];

const spriteSheet = new Image();
spriteSheet.src = 'textures.png';

let redSpriteSheet = null;
let texturesLoaded = false;

spriteSheet.onload = () => {
    texturesLoaded = true;
    createRedSheet();
    if (typeof draw === "function") draw(); 
};

function createRedSheet() {
    if (!spriteSheet.complete) return;
    const offCanvas = document.createElement('canvas');
    offCanvas.width = spriteSheet.width;
    offCanvas.height = spriteSheet.height;
    const offCtx = offCanvas.getContext('2d');
    offCtx.drawImage(spriteSheet, 0, 0);

    try {
        const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i] === 26 && data[i+1] === 0 && data[i+2] === 255) {
                data[i] = 200; data[i+1] = 0; data[i+2] = 0;
            }
            if (data[i] === 18 && data[i+1] === 0 && data[i+2] === 179) {
                data[i] = 140; data[i+1] = 0; data[i+2] = 0;
            }
        }
        offCtx.putImageData(imgData, 0, 0);
        redSpriteSheet = offCanvas;
    } catch (e) {
        console.error(e);
    }
}
function createEffect(x, y, type) {
    const count = type === 'blood' ? 6 : 4;
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * (type === 'blood' ? 2 : 1),
            vy: type === 'blood' ? (Math.random() - 0.5) * 2 : -Math.random() * 0.8,
            life: 1.0,
            type: type,
            size: type === 'blood' ? 1.5 : 2 + Math.random() * 3
        });
    }
}

function updateAndDrawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.02;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.type === 'blood' ? "#7d0000" : "rgba(200, 200, 200, 0.5)";
        if (p.type === 'blood') {
            ctx.fillRect(p.x - camera.x, p.y - camera.y, p.size, p.size);
        } else {
            ctx.beginPath();
            ctx.arc(p.x - camera.x, p.y - camera.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function draw() {
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "#1a1a1a"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    ctx.fillStyle = "#2e3b12";
    ctx.fillRect(0, 0, worldWidth, worldHeight);

    if (isPlacementPhase) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
        ctx.fillRect(0, 0, 450, worldHeight); 
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(450, 0);
        ctx.lineTo(450, worldHeight);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    squads.forEach(sq => {
    if (!sq.soldiers.some(s => s.alive)) return;

    if (sq.alive && typeof selectedSquads !== "undefined" && selectedSquads.includes(sq)) {
        ctx.fillStyle = "rgba(0, 255, 0, 0.1)";
        ctx.strokeStyle = "rgba(0, 255, 0, 0.4)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sq.x, sq.y, 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(sq.x, sq.y);
        ctx.lineTo(sq.x + Math.cos(sq.angle) * 35, sq.y + Math.sin(sq.angle) * 35);
        ctx.stroke();
    }

    const isEnemy = sq.side !== "player";
    const currentSheet = (isEnemy && redSpriteSheet) ? redSpriteSheet : spriteSheet;

    sq.soldiers.forEach(sol => {
        const cos = Math.cos(sq.angle);
        const sin = Math.sin(sq.angle);
        const x = sq.x + (sol.offsetX * cos - sol.offsetY * sin);
        const y = sq.y + (sol.offsetX * sin + sol.offsetY * cos);

        if (texturesLoaded && currentSheet) {
            let sx = sol.spriteX;
            let sy = sol.spriteY;
            const stepX = 128;

            sol.animTimer++;

if (sol.state === "dead") {
    if (sol.animTimer > 10 && sol.animFrame < 3) {
        sol.animFrame++;
        sol.animTimer = 0;
    }
    sx = (15 + sol.animFrame) * stepX;
    sy = sol.killedBy === 'cannon' ? 0 : 16;
}
else if (sol.state === "shoot") {
    if (sol.animTimer > 5) {
        sol.animFrame++;
        if (sol.animFrame > 2) sol.animFrame = 0;
        sol.animTimer = 0;
    }
    sx = sol.spriteX + (3 + sol.animFrame) * stepX;
}
else if (sol.state === "move") {
    if (sol.animTimer > 12) {
        sol.animFrame = sol.animFrame === 1 ? 2 : 1;
        sol.animTimer = 0;
    }
    sx = sol.spriteX + sol.animFrame * stepX;
}
else {
    sx = sol.spriteX;
}

            ctx.save();
            ctx.translate(x, y);
            if (Math.abs(sq.angle) > Math.PI / 2) ctx.scale(-1, 1);
            ctx.drawImage(currentSheet, sx, sy, 8, 16, -4, -8, 8, 16);
            ctx.restore();
        } else {
            ctx.fillStyle = sol.alive ? (isEnemy ? "#9b1e1e" : "#1e419b") : "rgba(0,0,0,0.3)";
            ctx.fillRect(x - 2, y - (sol.alive ? 4 : 1), 4, sol.alive ? 6 : 2);
        }
    });
});

    if (typeof projectiles !== "undefined") {
        projectiles.forEach(p => {
            ctx.fillStyle = "black";
            if (p.type === "cannonball" || p.type === "multi_cannonball") {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
            }
        });
    }

    if (typeof isSelecting !== "undefined" && isSelecting) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1;
        const rx = selectionBox.x1;
        const ry = selectionBox.y1;
        const rw = selectionBox.x2 - selectionBox.x1;
        const rh = selectionBox.y2 - selectionBox.y1;
        
        ctx.strokeRect(rx, ry, rw, rh);
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.fillRect(rx, ry, rw, rh);
    }

    if (typeof isRightClickDragging !== "undefined" && isRightClickDragging) {
        ctx.strokeStyle = "rgba(255, 255, 0, 0.7)";
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.arc(orderPoint.x, orderPoint.y, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(orderPoint.x, orderPoint.y);
        ctx.lineTo(dragEndPoint.x, dragEndPoint.y);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    ctx.restore(); 

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(10, 10, 250, 50);
    
    ctx.fillStyle = "white";
    ctx.font = "bold 13px monospace";
    ctx.fillText("Q: " + (isAutoMode ? "auto-battle [ON]" : "auto-battle [OFF]"), 20, 30);
    ctx.font = "12px monospace";
    ctx.fillText("WASD: move | mouse: move\atack units", 20, 50);
}
function drawSoldier(ctx, s, squad) {
    let frameX = 0;
    let frameY = squad.side === "player" ? 0 : 128;

    if (!s.alive) {
        frameX = (6 + (s.deathVariant || 0)) * 128; 
    } else {
        if (s.isShooting) {
            s.animTimer++;
            if (s.animTimer > 5) {
                s.animFrame++;
                if (s.animFrame > 5 || s.animFrame < 3) s.animFrame = 3;
                s.animTimer = 0;
            }
            frameX = s.animFrame * 128;
        } else if (squad.isMoving) {
            s.animTimer++;
            if (s.animTimer > 10) {
                s.animFrame = (s.animFrame === 1) ? 2 : 1;
                s.animTimer = 0;
            }
            frameX = s.animFrame * 128;
        } else {
            frameX = 0;
        }
    }

    ctx.save();
    ctx.translate(s.x - camera.x, s.y - camera.y);
    ctx.rotate(squad.angle);
    
    ctx.drawImage(
        squad.side === "player" ? spriteSheet : redSpriteSheet,
        frameX, frameY, 128, 128, 
        -16, -16, 32, 32
    );
    ctx.restore();
}
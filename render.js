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
    } catch (e) { console.error(e); }
}

function createEffect(x, y, type) {

    if (type === 'blood') {
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.4 + Math.random() * 2;
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.6 + Math.random() * 0.3,
                decay: 0.03,
                type: 'blood',
                size: Math.random() < 0.5 ? 1 : 2
            });
        }
        particles.push({
            x: x + (Math.random() - 0.5) * 3,
            y: y + (Math.random() - 0.5) * 3,
            vx: 0, vy: 0,
            life: 1, decay: 0.004,
            type: 'blood_pool',
            size: 2 + Math.floor(Math.random() * 2)
        });

    } else if (type === 'blood_heavy') {
        for (let i = 0; i < 14; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.8 + Math.random() * 4;
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.7 + Math.random() * 0.4,
                decay: 0.02,
                type: 'blood',
                size: Math.random() < 0.4 ? 3 : 2
            });
        }
        for (let i = 0; i < 3; i++) {
            particles.push({
                x: x + (Math.random() - 0.5) * 8,
                y: y + (Math.random() - 0.5) * 8,
                vx: 0, vy: 0,
                life: 1, decay: 0.002,
                type: 'blood_pool',
                size: 3 + Math.floor(Math.random() * 3)
            });
        }

    } else if (type === 'gibs') {
        const n = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 3;
            particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.9, decay: 0.014,
                type: 'gib',
                size: 2 + Math.floor(Math.random() * 2)
            });
        }

    } else if (type === 'smoke') {
        for (let i = 0; i < 5; i++) {
            particles.push({
                x: x + (Math.random() - 0.5) * 3,
                y: y + (Math.random() - 0.5) * 3,
                vx: (Math.random() - 0.5) * 0.3,
                vy: -0.2 - Math.random() * 0.8,
                life: 0.8 + Math.random() * 0.2,
                decay: 0.018,
                type: 'smoke',
                size: 2 + Math.floor(Math.random() * 3)
            });
        }

    } else if (type === 'impact_dust') {
        for (let i = 0; i < 14; i++) {
            const angle = -Math.PI + Math.random() * Math.PI;
            const speed = 0.3 + Math.random() * 2;
            particles.push({
                x: x + (Math.random() - 0.5) * 5,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 0.6,
                life: 0.6 + Math.random() * 0.5,
                decay: 0.016,
                type: 'dust',
                size: 1 + Math.floor(Math.random() * 3)
            });
        }
    }
}

function updateAndDrawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;
        if (p.vx !== 0) p.vx *= 0.90;
        if (p.vy !== 0) p.vy *= 0.90;

        p.life -= p.decay || 0.02;
        if (p.life <= 0) { particles.splice(i, 1); continue; }

        const sx = p.x - camera.x;
        const sy = p.y - camera.y;
        if (sx < -10 || sx > canvas.width + 10 || sy < -10 || sy > canvas.height + 10) continue;

        ctx.globalAlpha = Math.min(p.life, 1);

        if (p.type === 'blood') {
            ctx.fillStyle = "#7a0000";
            ctx.fillRect(sx | 0, sy | 0, p.size, p.size);

        } else if (p.type === 'blood_pool') {
            ctx.fillStyle = "#4a0000";
            ctx.fillRect(sx | 0, sy | 0, p.size * 2, p.size);

        } else if (p.type === 'gib') {
            ctx.fillStyle = "#3a0000";
            ctx.fillRect(sx | 0, sy | 0, p.size, p.size);

        } else if (p.type === 'smoke') {
            ctx.fillStyle = "#a09880";
            ctx.globalAlpha = p.life * 0.5;
            ctx.fillRect(sx | 0, sy | 0, p.size, p.size);

        } else if (p.type === 'dust') {
            ctx.fillStyle = "#8c7d5a";
            ctx.globalAlpha = p.life * 0.55;
            ctx.fillRect(sx | 0, sy | 0, p.size, p.size);
        }
    }
    ctx.globalAlpha = 1;
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
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.fillRect(0, 0, 450, worldHeight);
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(450, 0);
        ctx.lineTo(450, worldHeight);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    squads.forEach(sq => {
        const hasSoldiersToDraw = sq.soldiers.some(s => s.alive || s.state === "dead");
        if (!hasSoldiersToDraw) return;

        if (sq.alive && typeof selectedSquads !== "undefined" && selectedSquads.includes(sq)) {
            ctx.fillStyle = "rgba(0,255,0,0.1)";
            ctx.strokeStyle = "rgba(0,255,0,0.4)";
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
        const isArtillery = ["6lb Cannon", "Howitzer", "Multi-barrel", "Mortar"].includes(sq.type);
        const currentSheet = (isEnemy && redSpriteSheet) ? redSpriteSheet : spriteSheet;

        sq.soldiers.forEach(sol => {
            const cos = Math.cos(sq.angle);
            const sin = Math.sin(sq.angle);
            const x = sq.x + (sol.offsetX * cos - sol.offsetY * sin);
            const y = sq.y + (sol.offsetX * sin + sol.offsetY * cos);

            if (texturesLoaded && currentSheet) {
                const step = 128;
                let sx = sol.spriteX;
                let sy = sol.spriteY;

                sol.animTimer = (sol.animTimer || 0) + 1;

                if (sol.state === "dead") {
                    if (sol.animTimer > 8 && sol.animFrame < 3) {
                        sol.animFrame++;
                        sol.animTimer = 0;
                    }
                    sx = (14 + sol.animFrame % 2) * step;
                    sy = sol.killedBy === 'cannon' ? 8 : 0;

                } else if (sol.state === "shoot") {
                    if (sol.animTimer > 6) {
                        sol.animFrame++;
                        sol.animTimer = 0;
                    }
                    if (sol.animFrame >= 3) {
                        sol.state = "idle";
                        sol.animFrame = 0;
                        sol.animTimer = 0;
                        sx = sol.spriteX;
                    } else {
                        sx = sol.spriteX + (3 + sol.animFrame) * step;
                    }

                } else if (sol.state === "move") {
                    if (sol.animTimer > 12) {
                        sol.animFrame = sol.animFrame === 1 ? 2 : 1;
                        sol.animTimer = 0;
                    }
                    sx = sol.spriteX + sol.animFrame * step;

                } else {
                    sx = sol.spriteX;
                    sol.animFrame = 0;
                    sol.animTimer = 0;
                }

                ctx.save();
                ctx.translate(x, y);
                if (Math.abs(sq.angle) > Math.PI / 2) ctx.scale(-1, 1);
                if (isArtillery) {
                    ctx.drawImage(currentSheet, sx, sy, 16, 16, -8, -8, 16, 16);
                } else {
                    ctx.drawImage(currentSheet, sx, sy, 8, 16, -4, -8, 8, 16);
                }
                ctx.restore();

            } else {
                ctx.fillStyle = sol.alive
                    ? (isEnemy ? "#9b1e1e" : "#1e419b")
                    : "rgba(0,0,0,0.3)";
                ctx.fillRect(x - 2, y - (sol.alive ? 4 : 1), 4, sol.alive ? 6 : 2);
            }
        });
    });

    updateAndDrawParticles();

    if (typeof projectiles !== "undefined") {
        projectiles.forEach(p => {
            ctx.save();
            const drawY = p.y - (p.z || 0);

            if (p.type === "big_ball" || p.type === "cannonball") {
                ctx.fillStyle = "rgba(0,0,0,0.2)";
                ctx.fillRect((p.x - 3) | 0, (p.y) | 0, 5, 2);
                ctx.fillStyle = "#111";
                ctx.fillRect((p.x - 2) | 0, (drawY - 2) | 0, 4, 4);

            } else if (p.type === "mortar_shell") {
                ctx.fillStyle = "rgba(0,0,0,0.15)";
                ctx.fillRect((p.x - 2) | 0, (p.y) | 0, 4, 2);
                ctx.fillStyle = "#2a2a2a";
                ctx.fillRect((p.x - 2) | 0, (drawY - 2) | 0, 4, 4);

            } else if (p.type === "small_ball") {
                ctx.fillStyle = "#111";
                ctx.fillRect((p.x - 1) | 0, (drawY - 1) | 0, 3, 3);

            } else {
                ctx.fillStyle = "#333";
                ctx.fillRect((p.x - 1) | 0, (p.y - 1) | 0, 2, 2);
            }
            ctx.restore();
        });
    }

    if (typeof isSelecting !== "undefined" && isSelecting) {
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1;
        ctx.strokeRect(selectionBox.x1, selectionBox.y1,
            selectionBox.x2 - selectionBox.x1,
            selectionBox.y2 - selectionBox.y1);
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(255,255,255,0.07)";
        ctx.fillRect(selectionBox.x1, selectionBox.y1,
            selectionBox.x2 - selectionBox.x1,
            selectionBox.y2 - selectionBox.y1);
    }

    if (typeof isRightClickDragging !== "undefined" && isRightClickDragging) {
        ctx.strokeStyle = "rgba(255,255,0,0.7)";
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

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(10, 10, 250, 50);
    ctx.fillStyle = "white";
    ctx.font = "bold 13px monospace";
    ctx.fillText("Q: " + (isAutoMode ? "auto-battle [ON]" : "auto-battle [OFF]"), 20, 30);
    ctx.font = "12px monospace";
    ctx.fillText("WASD: move | mouse: move/attack units", 20, 50);
}
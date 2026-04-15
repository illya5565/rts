const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

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
        if (!sq.alive && sq.soldiers.every(s => !s.alive)) return;

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
            const rx = sol.offsetX * cos - sol.offsetY * sin;
            const ry = sol.offsetX * sin + sol.offsetY * cos;
            const x = sq.x + rx;
            const y = sq.y + ry;

            if (sol.alive) {
                if (texturesLoaded && currentSheet) {
                    ctx.save();
                    ctx.translate(x, y);
                    const lookingLeft = Math.abs(sq.angle) > Math.PI / 2;
                    if (lookingLeft) ctx.scale(-1, 1);
                    ctx.drawImage(
                        currentSheet, 
                        sol.spriteX, sol.spriteY, sol.spriteW, sol.spriteH,
                        -sol.spriteW / 2, -sol.spriteH / 2, sol.spriteW, sol.spriteH 
                    );
                    ctx.restore();
                } else {
                    ctx.fillStyle = isEnemy ? "#9b1e1e" : "#1e419b";
                    ctx.fillRect(x - 2, y - 2, 4, 5); 
                }
            } else {
                ctx.fillStyle = "rgba(0,0,0,0.3)";
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(sol.deathRotation || 0); 
                ctx.fillRect(-3, -1, 6, 2);
                ctx.restore();
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
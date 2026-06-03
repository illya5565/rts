const canvas = document.getElementById("gameCanvas");
const ctx    = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

let particles      = [];
let cannonAnims    = [];
let texturesLoaded = false;

const spriteSheet = new Image();
spriteSheet.src   = "textures.png";
let redSpriteSheet = null;

spriteSheet.onload = () => {
    texturesLoaded  = true;
    redSpriteSheet  = _buildRedSheet();
    if (typeof draw === "function") draw();
};

function _buildRedSheet() {
    const off = document.createElement("canvas");
    off.width = spriteSheet.width; off.height = spriteSheet.height;
    const c = off.getContext("2d");
    c.drawImage(spriteSheet, 0, 0);
    try {
        const img = c.getImageData(0, 0, off.width, off.height);
        const d   = img.data;
        for (let i = 0; i < d.length; i += 4) {
            if (d[i]===26  && d[i+1]===0 && d[i+2]===255) { d[i]=200; d[i+1]=0; d[i+2]=0; }
            if (d[i]===18  && d[i+1]===0 && d[i+2]===179) { d[i]=140; d[i+1]=0; d[i+2]=0; }
        }
        c.putImageData(img, 0, 0);
        return off;
    } catch(e) { console.error(e); return null; }
}

function createEffect(x, y, type) {
    switch (type) {
        case "blood":
            for (let i=0;i<6;i++) _addParticle(x,y,"blood",0.4+Math.random()*2,0.6+Math.random()*0.3,0.03,Math.random()<0.5?1:2);
            _addPool(x, y, 2+Math.floor(Math.random()*2), 0.004);
            break;
        case "blood_heavy":
            for (let i=0;i<14;i++) _addParticle(x,y,"blood",0.8+Math.random()*4,0.7+Math.random()*0.4,0.02,Math.random()<0.4?3:2);
            for (let i=0;i<3;i++)  _addPool(x+(Math.random()-.5)*8, y+(Math.random()-.5)*8, 3+Math.floor(Math.random()*3), 0.002);
            break;
        case "gibs":
            for (let i=0;i<3+Math.floor(Math.random()*3);i++) _addParticle(x,y,"gib",1+Math.random()*3,0.9,0.014,2+Math.floor(Math.random()*2));
            break;
        case "smoke":
            for (let i=0;i<5;i++) particles.push({ x:x+(Math.random()-.5)*3, y:y+(Math.random()-.5)*3, vx:(Math.random()-.5)*0.3, vy:-0.2-Math.random()*0.8, life:0.8+Math.random()*0.2, decay:0.018, type:"smoke", size:2+Math.floor(Math.random()*3) });
            break;
        case "impact_dust":
            for (let i=0;i<14;i++) { const a=-Math.PI+Math.random()*Math.PI, s=0.3+Math.random()*2; particles.push({ x:x+(Math.random()-.5)*5, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s-.6, life:0.6+Math.random()*0.5, decay:0.016, type:"dust", size:1+Math.floor(Math.random()*3) }); }
            break;
        case "cannon_impact":
            cannonAnims.push({ x, y, frame: 0, timer: 0 });
            break;
    }
}

function _addParticle(x, y, type, speed, life, decay, size) {
    const a = Math.random()*Math.PI*2;
    particles.push({ x, y, vx:Math.cos(a)*speed, vy:Math.sin(a)*speed, life, decay, type, size });
}
function _addPool(x, y, size, decay) {
    particles.push({ x, y, vx:0, vy:0, life:1, decay, type:"blood_pool", size });
}

function _updateAndDrawParticles() {
    for (let i = particles.length-1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        if (p.vx) p.vx *= 0.90;
        if (p.vy) p.vy *= 0.90;
        p.life -= p.decay || 0.02;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        const sx = (p.x - camera.x)|0, sy = (p.y - camera.y)|0;
        if (sx < -10 || sx > canvas.width+10 || sy < -10 || sy > canvas.height+10) continue;
        ctx.globalAlpha = p.life > 0.1 ? 1 : 0;
        switch (p.type) {
            case "blood": case "gib":
                ctx.fillStyle="#7d0000"; ctx.fillRect(sx,sy,p.size,p.size); break;
            case "blood_pool":
                ctx.fillStyle="#7d0000"; ctx.fillRect(sx,sy,p.size*2,p.size); break;
            case "smoke":
                ctx.fillStyle="#a09880"; ctx.globalAlpha=p.life*0.5; ctx.fillRect(sx,sy,p.size,p.size); break;
            case "dust":
                ctx.fillStyle="#8c7d5a"; ctx.globalAlpha=p.life*0.55; ctx.fillRect(sx,sy,p.size,p.size); break;
        }
    }
    ctx.globalAlpha = 1;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    ctx.fillStyle = "#1e3b12";
    ctx.fillRect(0, 0, worldWidth, worldHeight);

    if (isPlacementPhase) {
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.fillRect(0, 0, 450, worldHeight);
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.setLineDash([10,10]);
        ctx.beginPath(); ctx.moveTo(450,0); ctx.lineTo(450,worldHeight); ctx.stroke();
        ctx.setLineDash([]);
    }

    for (let i = deathAnims.length-1; i >= 0; i--) {
        const anim = deathAnims[i];
        anim.animTimer++;
        if (anim.animTimer > 30) { anim.animFrame++; anim.animTimer = 0; }
        if (anim.animFrame >= 4) { deathAnims.splice(i, 1); continue; }
        const ax = [112,120,112,120][anim.animType] + anim.animFrame*128;
        const ay = anim.animType < 2 ? 0 : 8;
        ctx.save();
        ctx.translate(anim.x, anim.y);
        if (anim.flip) ctx.scale(-1,1);
        ctx.drawImage(spriteSheet, ax, ay, 8, 8, -4,-4, 8, 8);
        ctx.restore();
    }

    for (let i = cannonAnims.length-1; i >= 0; i--) {
        const ca = cannonAnims[i];
        ca.timer++;
        if (ca.timer > 6) { ca.frame++; ca.timer = 0; }
        if (ca.frame >= 4) { cannonAnims.splice(i, 1); continue; }
        ctx.save();
        ctx.translate(ca.x, ca.y);
        ctx.drawImage(spriteSheet, 104 + ca.frame*128, 0, 8, 16, -4, -8, 8, 16);
        ctx.restore();
    }

    for (const sq of squads) {
        if (!sq.soldiers.some(s => s.alive)) continue;

        const isEnemy = sq.side !== "player";
        const sheet   = (isEnemy && redSpriteSheet) ? redSpriteSheet : spriteSheet;
        const cos     = Math.cos(sq.angle), sin = Math.sin(sq.angle);

        if (sq.alive && selectedSquads.includes(sq)) {
            const selColor = sq.isDebuffed ? "rgba(255,80,0,0.15)" : "rgba(0,255,0,0.10)";
            const strColor = sq.isDebuffed ? "rgba(255,80,0,0.5)"  : "rgba(0,255,0,0.4)";
            ctx.fillStyle   = selColor;
            ctx.strokeStyle = strColor;
            ctx.lineWidth   = 2;
            ctx.beginPath(); ctx.arc(sq.x, sq.y, 30, 0, Math.PI*2); ctx.fill(); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(sq.x, sq.y);
            ctx.lineTo(sq.x + cos*35, sq.y + sin*35);
            ctx.stroke();
        }

        for (const sol of sq.soldiers) {
            if (!sol.alive) continue;
            const wp = sol.worldPos(sq.x, sq.y, cos, sin);
            if (texturesLoaded && sheet) {
                const sx = sol.tickAnim(128);
                ctx.save();
                ctx.translate(wp.x, wp.y);
                if (Math.abs(sq.angle) > Math.PI/2) ctx.scale(-1,1);
                if (sq.isArtillery)     ctx.drawImage(sheet, sx, sol.spriteY, 16, 16, -8,-8, 16, 16);
                else if (sq.isCavalry)  ctx.drawImage(sheet, sx, sol.spriteY, 8, 16, -4,-8, 8, 16);
                else                    ctx.drawImage(sheet, sx, sol.spriteY, 8,  8, -4,-4,  8,  8);
                ctx.restore();
            } else {
                ctx.fillStyle = isEnemy ? "#9b1e1e" : "#1e419b";
                ctx.fillRect(wp.x-2, wp.y-4, 4, 6);
            }
        }
    }

    for (const p of projectiles) {
        ctx.save();
        const dy = p.y - (p.z||0);
        if (p.type === "big_ball" || p.type === "cannonball") {
            ctx.fillStyle="rgba(0,0,0,0.2)"; ctx.fillRect((p.x-3)|0, p.y|0, 5, 2);
            ctx.fillStyle="#111";            ctx.fillRect((p.x-2)|0, (dy-2)|0, 4, 4);
        } else if (p.type === "mortar_shell") {
            ctx.fillStyle="rgba(0,0,0,0.15)"; ctx.fillRect((p.x-2)|0, p.y|0, 4, 2);
            ctx.fillStyle="#2a2a2a";           ctx.fillRect((p.x-2)|0, (dy-2)|0, 4, 4);
        } else if (p.type === "small_ball") {
            ctx.fillStyle="#111"; ctx.fillRect((p.x-1)|0, (dy-1)|0, 3, 3);
        } else {
            ctx.fillStyle="#333"; ctx.fillRect((p.x-1)|0, (p.y-1)|0, 2, 2);
        }
        ctx.restore();
    }

    if (isSelecting) {
        ctx.strokeStyle="rgba(255,255,255,0.8)"; ctx.setLineDash([5,5]); ctx.lineWidth=1;
        ctx.strokeRect(selectionBox.x1, selectionBox.y1, selectionBox.x2-selectionBox.x1, selectionBox.y2-selectionBox.y1);
        ctx.setLineDash([]);
        ctx.fillStyle="rgba(255,255,255,0.07)";
        ctx.fillRect(selectionBox.x1, selectionBox.y1, selectionBox.x2-selectionBox.x1, selectionBox.y2-selectionBox.y1);
    }

    if (isRightClickDragging) {
        ctx.strokeStyle="rgba(255,255,0,0.7)"; ctx.lineWidth=2; ctx.setLineDash([10,5]);
        ctx.beginPath(); ctx.arc(orderPoint.x, orderPoint.y, 8, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(orderPoint.x, orderPoint.y); ctx.lineTo(dragEndPoint.x, dragEndPoint.y); ctx.stroke();
        ctx.setLineDash([]);
    }

    ctx.restore();
    _updateAndDrawParticles();

    ctx.fillStyle="rgba(0,0,0,0.55)"; ctx.fillRect(10,10,270,28);
    ctx.fillStyle="#fff"; ctx.font="12px monospace";
    ctx.fillText("Q: auto ["+(isAutoMode?"ON":"OFF")+"]  |  E: inspect  |  WASD: move", 18, 25);

    _drawInspectTooltip();
}

function _drawInspectTooltip() {
    if (!keys[config.inspect]) return;
    const wx = mouseWorldX, wy = mouseWorldY;
    const sq = squads.find(s => s.alive && isPointInSquad(wx, wy, s));
    if (!sq) return;

    const sx = mouseScreenX, sy = mouseScreenY;
    const W = 140, H = 64, PAD = 6;
    let tx = sx + 14, ty = sy - H - 8;
    if (ty < 0) ty = sy + 14;
    if (tx + W > canvas.width) tx = sx - W - 8;

    ctx.fillStyle   = "rgba(20,20,20,0.92)";
    ctx.strokeStyle = "#888";
    ctx.lineWidth   = 1;
    ctx.fillRect(tx, ty, W, H);
    ctx.strokeRect(tx, ty, W, H);

    if (texturesLoaded && spriteSheet.complete) {
        const pos = TEXTURE_COORDS[sq.type] || [1,1];
        const spX = (pos[1]-1)*8, spY = (pos[0]-1)*8;
        const sheet = sq.side !== "player" && redSpriteSheet ? redSpriteSheet : spriteSheet;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sheet, spX, spY, 8, 8, tx+PAD, ty+PAD, 24, 24);
    }

    const tx2 = tx + PAD + 28;
    ctx.fillStyle = "#ffd700";
    ctx.font      = "bold 11px monospace";
    ctx.fillText(sq.type, tx2, ty + PAD + 11);

    ctx.fillStyle = "#ccc";
    ctx.font      = "10px monospace";
    const alive   = sq.soldiers.filter(s => s.alive).length;
    const reload  = (sq.stats.reload / 1000).toFixed(1);
    ctx.fillText(`HP: ${sq.stats.hp}  [${alive}/${sq.initialCount}]`, tx2, ty + PAD + 25);
    ctx.fillText(`Reload: ${reload}s`, tx2, ty + PAD + 38);
    if (sq.isDebuffed) {
        ctx.fillStyle = "#ff6633";
        ctx.fillText(`Morale: ${Math.round(sq.morale*100)}%`, tx2, ty + PAD + 51);
    }
}
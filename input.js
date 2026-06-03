gameCanvas.oncontextmenu = e => e.preventDefault();

let dragEndPoint = { x:0, y:0 };
let orderPoint   = { x:0, y:0 };

gameCanvas.onmousedown = function(e) {
    const rect   = this.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldX  = screenX + camera.x;
    const worldY  = screenY + camera.y;

    if (e.button === 0) {
        if (isPlacementPhase) {
            handlePlacementClick(worldX, worldY);
        } else {
            isSelecting      = true;
            selectionBox.x1  = worldX; selectionBox.y1 = worldY;
            selectionBox.x2  = worldX; selectionBox.y2 = worldY;
        }
    } else if (e.button === 1) {
        e.preventDefault();
        if (!isPlacementPhase) {
            selectedSquads = squads.filter(s => s.side === "player" && s.alive);
            if (typeof draw === "function") draw();
        }
    } else if (e.button === 2) {
        if (isPlacementPhase) {
            const idx = squads.findIndex(sq => sq.side === "player" && isPointInSquad(worldX, worldY, sq));
            if (idx !== -1) {
                const sq = squads[idx];
                playerGold += UnitStats[sq.type].cost;
                squads.splice(idx, 1);
                playerArmy = playerArmy.filter(s => s !== sq);
                updateGoldDisplay();
                renderShop();
                draw();
                return;
            }
        }
        if (!isPlacementPhase && selectedSquads.length) {
            isRightClickDragging = true;
            orderPoint.x = worldX; orderPoint.y = worldY;
            dragEndPoint.x = worldX; dragEndPoint.y = worldY;
        }
    }
};

gameCanvas.onmousemove = function(e) {
    const rect   = this.getBoundingClientRect();
    mouseScreenX = e.clientX - rect.left;
    mouseScreenY = e.clientY - rect.top;
    mouseWorldX  = mouseScreenX + camera.x;
    mouseWorldY  = mouseScreenY + camera.y;

    if (isSelecting)          { selectionBox.x2 = mouseWorldX; selectionBox.y2 = mouseWorldY; }
    if (isRightClickDragging) { dragEndPoint.x  = mouseWorldX; dragEndPoint.y  = mouseWorldY; }
};

window.onmouseup = function(e) {
    const rect = gameCanvas.getBoundingClientRect();
    const x    = e.clientX - rect.left + camera.x;
    const y    = e.clientY - rect.top  + camera.y;

    if (e.button === 0 && isSelecting) {
        isSelecting = false;
        const xMin = Math.min(selectionBox.x1, selectionBox.x2);
        const xMax = Math.max(selectionBox.x1, selectionBox.x2);
        const yMin = Math.min(selectionBox.y1, selectionBox.y2);
        const yMax = Math.max(selectionBox.y1, selectionBox.y2);
        const drag = Math.hypot(selectionBox.x1-selectionBox.x2, selectionBox.y1-selectionBox.y2);

        if (drag < 5) {
            selectedSquads = squads.filter(sq => sq.side==="player" && sq.alive && isPointInSquad(x,y,sq)).slice(0,1);
        } else {
            selectedSquads = squads.filter(sq =>
                sq.side==="player" && sq.alive &&
                sq.x>=xMin && sq.x<=xMax && sq.y>=yMin && sq.y<=yMax
            );
        }
    }

    if (e.button === 2 && isRightClickDragging) {
        isRightClickDragging = false;
        const isSmallDrag = Math.hypot(x-orderPoint.x, y-orderPoint.y) < 20;
        const finalAngle  = Math.atan2(y-orderPoint.y, x-orderPoint.x);
        const clickedEnemy = squads.find(sq => sq.side!=="player" && sq.alive && isPointInSquad(orderPoint.x, orderPoint.y, sq));

        selectedSquads.forEach(sq => {
            sq.attackOrder  = null;
            sq.manualTarget = null;
            sq.targetPoint  = null;
            if (clickedEnemy) {
                sq.attackOrder = clickedEnemy;
            } else if (sq.stats.bulletType && isSmallDrag) {
                sq.targetPoint = { x: orderPoint.x, y: orderPoint.y };
            } else {
                sq.manualTarget       = { x: orderPoint.x, y: orderPoint.y };
                sq.targetArrivalAngle = isSmallDrag ? sq.angle : finalAngle;
            }
            sq.isGuarding = false;
        });
    }

    if (typeof draw === "function") draw();
};

window.addEventListener("keydown", e => { keys[e.code] = true; });
window.addEventListener("keyup",   e => { keys[e.code] = false; });

const controlGroups = {};
const groupKeys = { Digit1:1,Digit2:2,Digit3:3,Digit4:4,Digit5:5,Digit6:6,Digit7:7,Digit8:8,Digit9:9,Digit0:0 };

window.addEventListener("keydown", e => {
    if (!(e.code in groupKeys)) return;
    const g = groupKeys[e.code];
    if (e.ctrlKey) {
        e.preventDefault();
        controlGroups[g] = selectedSquads.filter(sq => sq.alive);
    } else if (!isPlacementPhase && controlGroups[g]?.length) {
        selectedSquads = controlGroups[g].filter(sq => sq.alive);
        if (typeof draw === "function") draw();
    }
});

window.addEventListener("keydown", e => {
    if (e.code === "KeyA" && e.ctrlKey && !isPlacementPhase) {
        e.preventDefault();
        selectedSquads = squads.filter(s => s.side === "player" && s.alive);
        if (typeof draw === "function") draw();
    }
    if (e.code === "Escape") {
        selectedSquads = [];
        if (typeof draw === "function") draw();
    }
    if (e.code === "KeyS" && e.ctrlKey && !isPlacementPhase) {
        e.preventDefault();
        selectedSquads.forEach(sq => { sq.manualTarget = null; sq.attackOrder = null; sq.isGuarding = true; });
        if (typeof draw === "function") draw();
    }
});
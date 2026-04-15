gameCanvas.oncontextmenu = (e) => e.preventDefault();

let dragEndPoint = { x: 0, y: 0 };
let orderPoint = { x: 0, y: 0 };

gameCanvas.onmousedown = function(e) {
    const rect = this.getBoundingClientRect();
    
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const worldX = screenX + camera.x;
    const worldY = screenY + camera.y;

    if (e.button === 0) {
        if (isPlacementPhase) {
            if (typeof handlePlacementClick === "function") {
                handlePlacementClick(worldX, worldY);
            }
        } else {
            isSelecting = true;
            selectionBox.x1 = worldX;
            selectionBox.y1 = worldY;
            selectionBox.x2 = worldX;
            selectionBox.y2 = worldY;
        }
    } 
    else if (e.button === 2) {
        if (isPlacementPhase) {
            const targetIndex = squads.findIndex(sq => 
                sq.side === "player" && 
                Math.hypot(sq.x - worldX, sq.y - worldY) < 30
            );

            if (targetIndex !== -1) {
                const squad = squads[targetIndex];
                playerGold += UnitStats[squad.type].cost; 
                
                squads.splice(targetIndex, 1);
                playerArmy = playerArmy.filter(s => s !== squad);
                
                if (typeof updateGoldDisplay === "function") updateGoldDisplay();
                if (typeof renderShop === "function") renderShop();
                if (typeof draw === "function") draw();
                return;
            }
        }

        if (!isPlacementPhase && selectedSquads.length > 0) {
            isRightClickDragging = true;
            orderPoint.x = worldX; 
            orderPoint.y = worldY;
            dragEndPoint.x = worldX;
            dragEndPoint.y = worldY;
        }
    }
};

gameCanvas.onmousemove = function(e) {
    const rect = this.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const worldX = screenX + camera.x;
    const worldY = screenY + camera.y;

    if (isSelecting) {
        selectionBox.x2 = worldX;
        selectionBox.y2 = worldY;
    }

    if (isRightClickDragging) {
        dragEndPoint.x = worldX;
        dragEndPoint.y = worldY;
    }
};

window.onmouseup = function(e) {
    const rect = gameCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left + camera.x;
    const y = e.clientY - rect.top + camera.y;

    if (e.button === 0 && isSelecting) {
        isSelecting = false;
        
        const xMin = Math.min(selectionBox.x1, selectionBox.x2);
        const xMax = Math.max(selectionBox.x1, selectionBox.x2);
        const yMin = Math.min(selectionBox.y1, selectionBox.y2);
        const yMax = Math.max(selectionBox.y1, selectionBox.y2);

        const dist = Math.hypot(selectionBox.x1 - selectionBox.x2, selectionBox.y1 - selectionBox.y2);

        if (dist < 5) {
            selectedSquads = squads.filter(sq => 
                sq.side === "player" && sq.alive &&
                Math.hypot(sq.x - x, sq.y - y) < 40
            ).slice(0, 1);
        } else {
            selectedSquads = squads.filter(sq => 
                sq.side === "player" && sq.alive &&
                sq.x >= xMin && sq.x <= xMax && sq.y >= yMin && sq.y <= yMax
            );
        }
    } 

    if (e.button === 2 && isRightClickDragging) {
        isRightClickDragging = false;
        
        const currentWorldX = x;
        const currentWorldY = y;

        let clickedEnemy = squads.find(sq => 
            sq.side !== "player" && sq.alive &&
            Math.hypot(sq.x - orderPoint.x, sq.y - orderPoint.y) < 50
        );

        let finalAngle = Math.atan2(currentWorldY - orderPoint.y, currentWorldX - orderPoint.x);
        const isSmallDrag = Math.hypot(currentWorldX - orderPoint.x, currentWorldY - orderPoint.y) < 20;

        selectedSquads.forEach(sq => {
            const isArtillery = sq.stats && sq.stats.bulletType !== undefined;

            if (clickedEnemy) {
                sq.attackOrder = clickedEnemy;
                sq.manualTarget = null;
                sq.targetPoint = null; 
            } else if (isArtillery && isSmallDrag) {
                sq.targetPoint = { x: orderPoint.x, y: orderPoint.y };
                sq.manualTarget = null; 
                sq.attackOrder = null;
            } else {
                sq.attackOrder = null;
                sq.manualTarget = { x: orderPoint.x, y: orderPoint.y };
                sq.targetArrivalAngle = isSmallDrag ? sq.angle : finalAngle;
                sq.targetPoint = null; 
            }
        });
    }

    if (typeof draw === "function") draw();
};

window.addEventListener('keydown', (e) => { 
    keys[e.code] = true; 
});

window.addEventListener('keyup', (e) => { 
    keys[e.code] = false; 
});
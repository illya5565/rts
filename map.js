class SeededRandom {
    constructor(seed = 123456789) {
        this.seed = seed;
        this.mod = 0x7fffffff;
        this.mult = 48271;
        this.inc = 0;
    }
    
    next() {
        this.seed = (this.seed * this.mult + this.inc) % this.mod;
        return this.seed / this.mod;
    }
    
    nextRange(min, max) {
        return min + this.next() * (max - min);
    }
    
    nextInt(min, max) {
        return Math.floor(this.nextRange(min, max));
    }
}

class TacticalMap {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = 700;
        this.height = 450;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.pins = [];
        this.edges = [];
        this.BASE_PIN_RADIUS = 12;
        this.NORMAL_PIN_RADIUS = 7;
        this.MIN_DIST = 45;
        this.terrain = null;
        this.tileSize = 4;
        this.walkableComponent = null;
        
        this.highlightedPin = null;
        this.pinClickCallback = null;
        this.random = null;
        this._currentTooltip = null;
        this._currentMoveHandler = null;
        
        this.initHoverEvents();
    }
    
    setPinClickCallback(callback) {
        this.pinClickCallback = callback;
    }
    
    initHoverEvents() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const mouseX = (e.clientX - rect.left) * scaleX;
            const mouseY = (e.clientY - rect.top) * scaleY;
            
            let newHighlight = null;
            for (let i = 0; i < this.pins.length; i++) {
                const p = this.pins[i];
                const r = p.isBase ? this.BASE_PIN_RADIUS : this.NORMAL_PIN_RADIUS;
                const dx = mouseX - p.x;
                const dy = mouseY - p.y;
                if (Math.hypot(dx, dy) <= r + 5) {
                    newHighlight = i;
                    break;
                }
            }
            if (newHighlight !== this.highlightedPin) {
                this.highlightedPin = newHighlight;
                this.render();
                if (newHighlight !== null) {
                    this.showPinTooltip(this.pins[newHighlight], e);
                } else {
                    this.hidePinTooltip();
                }
            }
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.highlightedPin = null;
            this.hidePinTooltip();
            this.render();
        });
        
        this.canvas.addEventListener('click', (e) => {
            if (!this.pinClickCallback) return;
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const mouseX = (e.clientX - rect.left) * scaleX;
            const mouseY = (e.clientY - rect.top) * scaleY;
            for (let i = 0; i < this.pins.length; i++) {
                const p = this.pins[i];
                const r = p.isBase ? this.BASE_PIN_RADIUS : this.NORMAL_PIN_RADIUS;
                if (Math.hypot(mouseX - p.x, mouseY - p.y) <= r) {
                    this.pinClickCallback(p, i);
                    break;
                }
            }
        });
    }
    
showPinTooltip(pin, event) {
    if (this._currentTooltip) this.hidePinTooltip();
    
    const tooltip = document.createElement('div');
    tooltip.className = 'skill-tooltip';
    
    let ownerText = "";
    let canAttack = false;
    
    if (pin.owner === "player") ownerText = "PLAYER BASE";
    else if (pin.owner === "enemy") ownerText = "ENEMY BASE";
    else ownerText = "NEUTRAL OUTPOST";
    
    let html = `<div style="color:#ffd700; font-weight:bold;">${pin.isBase ? '★ ' + ownerText + ' ★' : ownerText}</div>`;
    html += `<div>Waves: ${pin.waves || 1}</div>`;
    
    if (pin.owner === "player") {
        html += `<div><i>Your territory</i></div>`;
    } else if (pin.owner === "enemy") {
        let pinIndex = this.pins.findIndex(p => p === pin);
        if (pinIndex !== -1 && this.isAdjacentToPlayerOwned(pinIndex)) {
            html += `<div><i style="color:#ffaa66;">Adjacent to your territory - can attack!</i></div>`;
        } else {
            html += `<div><i style="color:#ff8888;">Not adjacent to your territory</i></div>`;
        }
    } else {
        let pinIndex = this.pins.findIndex(p => p === pin);
        if (pinIndex !== -1 && this.isAdjacentToPlayerOwned(pinIndex)) {
            html += `<div><i style="color:#ffaa66;">Adjacent to your territory - can capture!</i></div>`;
        } else {
            html += `<div><i style="color:#ff8888;">Not adjacent to your territory</i></div>`;
        }
    }
    
    tooltip.innerHTML = html;
    document.body.appendChild(tooltip);
    this._currentTooltip = tooltip;
    
    const updatePosition = (e) => {
        let left = e.clientX + 15;
        let top = e.clientY - 30;
        if (left + tooltip.offsetWidth > window.innerWidth) left = e.clientX - tooltip.offsetWidth - 5;
        if (top < 0) top = e.clientY + 20;
        tooltip.style.left = left + 'px';
        tooltip.style.top = top + 'px';
    };
    updatePosition(event);
    
    const moveHandler = (moveEvent) => updatePosition(moveEvent);
    this.canvas.addEventListener('mousemove', moveHandler);
    this._currentMoveHandler = moveHandler;
}
    
    hidePinTooltip() {
        if (this._currentTooltip) {
            this._currentTooltip.remove();
            this._currentTooltip = null;
        }
        if (this._currentMoveHandler) {
            this.canvas.removeEventListener('mousemove', this._currentMoveHandler);
            this._currentMoveHandler = null;
        }
    }

    _noise(x, y, octaves = 4, persistence = 0.5, lacunarity = 2.0) {
        let value = 0;
        let amplitude = 1;
        let frequency = 0.008;
        let maxValue = 0;
        
        for (let i = 0; i < octaves; i++) {
            value += amplitude * Math.sin(x * frequency) * Math.cos(y * frequency);
            value += amplitude * 0.5 * Math.sin(x * frequency * 1.7 + 1.2) * Math.cos(y * frequency * 1.3);
            value += amplitude * 0.3 * Math.sin((x * frequency * 2.3) + (y * frequency * 2.1)) * 0.8;
            
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }
        
        return (value / maxValue + 1) / 2;
    }

    generateWorld(seed = null) {
        if (seed === null) {
            seed = Math.floor(Math.random() * 0x7fffffff);
        }
        this.currentSeed = seed;
        this.random = new SeededRandom(seed);
        
        let cols = Math.ceil(this.width / this.tileSize);
        let rows = Math.ceil(this.height / this.tileSize);
        
        const islandType = this.random.nextInt(0, 7);
        
        const bigMountainCount = this.random.nextInt(2, 5);
        const smallMountainCount = this.random.nextInt(1, 4);
        
        const bigMountains = [];
        for (let i = 0; i < bigMountainCount; i++) {
            bigMountains.push({
                x: this.random.next() * this.width,
                y: this.random.next() * this.height,
                radius: this.random.nextRange(40, 100),
                strength: this.random.nextRange(0.7, 1.0)
            });
        }
        
        const smallMountains = [];
        for (let i = 0; i < smallMountainCount; i++) {
            smallMountains.push({
                x: this.random.next() * this.width,
                y: this.random.next() * this.height,
                radius: this.random.nextRange(15, 40),
                strength: this.random.nextRange(0.4, 0.7)
            });
        }
        
        let heightMap = Array(cols);
        for (let x = 0; x < cols; x++) {
            heightMap[x] = Array(rows);
            for (let y = 0; y < rows; y++) {
                let wx = x * this.tileSize;
                let wy = y * this.tileSize;
                
                let val = this._noise(wx, wy, 5, 0.55, 2.1);
                
                let shapeFactor = 0;
                let nx = (wx - this.width/2) / (this.width * 0.55);
                let ny = (wy - this.height/2) / (this.height * 0.55);
                let dist = Math.sqrt(nx*nx + ny*ny);
                
                switch(islandType) {
                    case 0:
                        shapeFactor = 1 - Math.pow(dist, 1.5);
                        break;
                    case 1:
                        shapeFactor = 1 - Math.pow(dist, 1.2);
                        if (dist < 0.4) shapeFactor += 0.2 * (1 - dist/0.4);
                        break;
                    case 2:
                        let leftIsland = 1 - Math.hypot(nx + 0.5, ny) / 1.2;
                        let rightIsland = 1 - Math.hypot(nx - 0.5, ny) / 1.2;
                        shapeFactor = Math.max(leftIsland, rightIsland, 0);
                        break;
                    case 3:
                        shapeFactor = 1 - Math.pow(dist, 1.8);
                        let archipelago = 0;
                        for (let a = 0; a < 5; a++) {
                            let ax = (wx * 0.003 + a * 1.3) % 1 - 0.5;
                            let ay = (wy * 0.003 + a * 2.1) % 1 - 0.5;
                            let adist = Math.hypot(ax, ay);
                            if (adist < 0.2) archipelago += 0.3 * (1 - adist/0.2);
                        }
                        shapeFactor = Math.min(1, shapeFactor + archipelago);
                        break;
                    case 4:
                        shapeFactor = 1 - Math.pow(dist, 1.4);
                        let ridge = Math.abs(nx - ny) < 0.4 ? 0.3 * (1 - Math.abs(nx - ny)/0.4) : 0;
                        shapeFactor += ridge;
                        break;
                    case 5:
                        shapeFactor = 1 - Math.pow(dist, 1.3);
                        if (nx < -0.2 && ny > -0.3 && ny < 0.3) shapeFactor -= 0.4;
                        break;
                    case 6:
                        shapeFactor = 1 - Math.abs(dist - 0.65) * 2.5;
                        shapeFactor = Math.max(0, Math.min(1, shapeFactor));
                        break;
                    case 7:
                        let broken = 1 - Math.pow(dist, 1.6);
                        if (dist < 0.3) broken -= 0.5;
                        shapeFactor = Math.max(0, broken);
                        break;
                    default:
                        shapeFactor = 1 - Math.pow(dist, 1.5);
                }
                
                shapeFactor = Math.max(0, Math.min(1, shapeFactor));
                
                let mountainFactor = 0;
                
                for (let m of bigMountains) {
                    let mx = (wx - m.x) / m.radius;
                    let my = (wy - m.y) / m.radius;
                    let mdist = Math.sqrt(mx*mx + my*my);
                    if (mdist < 1) {
                        mountainFactor += m.strength * (1 - Math.pow(mdist, 2));
                    }
                }
                
                for (let m of smallMountains) {
                    let mx = (wx - m.x) / m.radius;
                    let my = (wy - m.y) / m.radius;
                    let mdist = Math.sqrt(mx*mx + my*my);
                    if (mdist < 1) {
                        mountainFactor += m.strength * (1 - Math.pow(mdist, 1.5));
                    }
                }
                
                mountainFactor = Math.min(0.8, mountainFactor);
                
                let finalVal = val * 0.4 + shapeFactor * 0.6 + mountainFactor * 0.3;
                finalVal = Math.min(1, Math.max(0, finalVal));
                
                heightMap[x][y] = finalVal;
            }
        }

        for (let iter = 0; iter < 2; iter++) {
            let smooth = Array(cols);
            for (let x = 1; x < cols-1; x++) {
                smooth[x] = Array(rows);
                for (let y = 1; y < rows-1; y++) {
                    let sum = 0;
                    for (let dx = -1; dx <= 1; dx++) {
                        for (let dy = -1; dy <= 1; dy++) {
                            sum += heightMap[x+dx][y+dy];
                        }
                    }
                    smooth[x][y] = sum / 9;
                }
            }
            for (let x = 1; x < cols-1; x++) {
                for (let y = 1; y < rows-1; y++) {
                    heightMap[x][y] = smooth[x][y];
                }
            }
        }

        this.terrain = Array(cols);
        for (let x = 0; x < cols; x++) {
            this.terrain[x] = Array(rows);
            for (let y = 0; y < rows; y++) {
                let val = heightMap[x][y];
                if (val > 0.55) {
                    if (val > 0.75) this.terrain[x][y] = 2;
                    else this.terrain[x][y] = 1;
                } else {
                    this.terrain[x][y] = 0;
                }
            }
        }

        let lakeCount = this.random.nextInt(5, 15);
        for (let i = 0; i < lakeCount; i++) {
            let cx = Math.floor(3 + this.random.next() * (cols - 6));
            let cy = Math.floor(3 + this.random.next() * (rows - 6));
            let rad = Math.floor(2 + this.random.next() * 5);
            for (let x = Math.max(0, cx - rad); x <= Math.min(cols-1, cx + rad); x++) {
                for (let y = Math.max(0, cy - rad); y <= Math.min(rows-1, cy + rad); y++) {
                    if (Math.hypot(x - cx, y - cy) < rad && this.terrain[x][y] === 1) {
                        this.terrain[x][y] = 0;
                    }
                }
            }
        }

        this._findLargestWalkableComponent();
    }

    _findLargestWalkableComponent() {
        let cols = Math.ceil(this.width / this.tileSize);
        let rows = Math.ceil(this.height / this.tileSize);
        let visited = Array(cols).fill().map(() => Array(rows).fill(false));
        let bestComponent = Array(cols).fill().map(() => Array(rows).fill(false));
        let bestSize = 0;

        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                if (this.terrain[x][y] === 1 && !visited[x][y]) {
                    let stack = [[x, y]];
                    let component = [];
                    visited[x][y] = true;
                    while (stack.length) {
                        let [cx, cy] = stack.pop();
                        component.push([cx, cy]);
                        for (let dx = -1; dx <= 1; dx++) {
                            for (let dy = -1; dy <= 1; dy++) {
                                if (dx === 0 && dy === 0) continue;
                                let nx = cx + dx, ny = cy + dy;
                                if (nx >= 0 && nx < cols && ny >= 0 && ny < rows &&
                                    this.terrain[nx][ny] === 1 && !visited[nx][ny]) {
                                    visited[nx][ny] = true;
                                    stack.push([nx, ny]);
                                }
                            }
                        }
                    }
                    if (component.length > bestSize) {
                        bestSize = component.length;
                        bestComponent = Array(cols).fill().map(() => Array(rows).fill(false));
                        for (let [cx, cy] of component) {
                            bestComponent[cx][cy] = true;
                        }
                    }
                }
            }
        }
        this.walkableComponent = bestComponent;
    }

    isWalkable(x, y) {
        let tx = Math.floor(x / this.tileSize);
        let ty = Math.floor(y / this.tileSize);
        let cols = Math.ceil(this.width / this.tileSize);
        let rows = Math.ceil(this.height / this.tileSize);
        if (tx < 0 || tx >= cols || ty < 0 || ty >= rows) return false;
        return this.terrain[tx][ty] === 1 && this.walkableComponent[tx][ty];
    }

    isAdjacentToPlayerOwned(pinIndex) {
    if (this.pins[pinIndex].owner === "player") return true;
    
    for (let edge of this.edges) {
        let neighborIndex = null;
        if (edge.from === pinIndex) neighborIndex = edge.to;
        if (edge.to === pinIndex) neighborIndex = edge.from;
        
        if (neighborIndex !== null && this.pins[neighborIndex].owner === "player") {
            return true;
        }
    }
    return false;
}

getConnectedPlayerPins() {
    let playerPins = [];
    for (let i = 0; i < this.pins.length; i++) {
        if (this.pins[i].owner === "player") {
            playerPins.push(i);
        }
    }
    return playerPins;
}

getAdjacentEnemyPins() {
    let adjacentEnemies = [];
    for (let i = 0; i < this.pins.length; i++) {
        if (this.pins[i].owner !== "player" && this.isAdjacentToPlayerOwned(i)) {
            adjacentEnemies.push(i);
        }
    }
    return adjacentEnemies;
}
isPlayerBaseLost() {
    for (let pin of this.pins) {
        if (pin.owner === "enemy" && pin.isBase === true) {
            return true;
        }
    }
    return false;
}

isEnemyBaseCaptured() {
    for (let pin of this.pins) {
        if (pin.owner === "player" && pin.isBase === true && pin.x > this.width / 2) {
            return true;
        }
        if (pin.owner === "enemy" && pin.isBase === true && pin.x < this.width / 2) {
            return false;
        }
    }
    
    let hasPlayerBase = false;
    let hasEnemyBase = false;
    
    for (let pin of this.pins) {
        if (pin.isBase && pin.owner === "player") hasPlayerBase = true;
        if (pin.isBase && pin.owner === "enemy") hasEnemyBase = true;
    }
    
    return !hasEnemyBase && hasPlayerBase;
}

checkCampaignVictory() {
    let playerBaseExists = false;
    let enemyBaseExists = false;
    
    for (let pin of this.pins) {
        if (pin.isBase) {
            if (pin.owner === "player") playerBaseExists = true;
            if (pin.owner === "enemy") enemyBaseExists = true;
        }
    }
    
    if (!playerBaseExists) {
        return { result: "CAMPAIGN_BASE_LOST", message: "Your base has been captured! Campaign failed." };
    }
    
    if (!enemyBaseExists) {
        return { result: "CAMPAIGN_BASE_CAPTURED", message: "Enemy base captured! Victory!" };
    }
    
    return null;
}

generatePins() {
    this.pins = [];
    let margin = 50;
    let targetTotal = 22;
    let attempts = 0;
    while (this.pins.length < targetTotal && attempts < 1500) {
        let x = margin + this.random.next() * (this.width - 2*margin);
        let y = margin + this.random.next() * (this.height - 2*margin);
        let tooClose = false;
        for (let p of this.pins) {
            if (Math.hypot(p.x - x, p.y - y) < this.MIN_DIST) {
                tooClose = true;
                break;
            }
        }
        if (!tooClose && this.isWalkable(x, y)) {
            this.pins.push({x: x, y: y, isBase: false, owner: null, waves: 1 + Math.floor(this.random.next() * 2)});
        }
        attempts++;
    }

    if (this.pins.length < targetTotal) {
        for (let i = 0; i < 300 && this.pins.length < targetTotal; i++) {
            let x = 60 + this.random.next() * (this.width - 120);
            let y = 60 + this.random.next() * (this.height - 120);
            if (this.isWalkable(x, y)) {
                let ok = true;
                for (let p of this.pins) {
                    if (Math.hypot(p.x - x, p.y - y) < 35) ok = false;
                }
                if (ok) this.pins.push({x: x, y: y, isBase: false, owner: null, waves: 1 + Math.floor(this.random.next() * 2)});
            }
        }
    }

    if (this.pins.length >= 2) {
        let maxDist = 0;
        let idx1 = 0, idx2 = 1;
        for (let i = 0; i < this.pins.length; i++) {
            for (let j = i+1; j < this.pins.length; j++) {
                let d = Math.hypot(this.pins[i].x - this.pins[j].x, this.pins[i].y - this.pins[j].y);
                if (d > maxDist) {
                    maxDist = d;
                    idx1 = i;
                    idx2 = j;
                }
            }
        }
        
        if (this.pins[idx1].x < this.pins[idx2].x) {
            this.pins[idx1].owner = "player";
            this.pins[idx2].owner = "enemy";
        } else {
            this.pins[idx1].owner = "enemy";
            this.pins[idx2].owner = "player";
        }
        
        this.pins[idx1].isBase = true;
        this.pins[idx2].isBase = true;
        this.pins[idx1].waves = 3;
        this.pins[idx2].waves = 3;
        
        for (let i = 0; i < this.pins.length; i++) {
            if (!this.pins[i].isBase) {
                this.pins[i].isBase = false;
                if (this.pins[i].owner === undefined) {
                    this.pins[i].owner = null;
                }
            }
        }
    } else {
        for (let i = 0; i < this.pins.length; i++) {
            this.pins[i].waves = 1 + Math.floor(this.random.next() * 2);
        }
    }
}

    computeEdges() {
        const n = this.pins.length;
        if (n < 2) {
            this.edges = [];
            return;
        }

        let mstEdges = [];
        let inMST = new Array(n).fill(false);
        let minDist = new Array(n).fill(Infinity);
        let parent = new Array(n).fill(-1);
        minDist[0] = 0;
        for (let iter = 0; iter < n; iter++) {
            let u = -1;
            for (let i = 0; i < n; i++) {
                if (!inMST[i] && (u === -1 || minDist[i] < minDist[u])) u = i;
            }
            if (u === -1) break;
            inMST[u] = true;
            if (parent[u] !== -1) {
                mstEdges.push({from: parent[u], to: u});
            }
            for (let v = 0; v < n; v++) {
                if (!inMST[v]) {
                    let d = Math.hypot(this.pins[u].x - this.pins[v].x, this.pins[u].y - this.pins[v].y);
                    if (d < minDist[v]) {
                        minDist[v] = d;
                        parent[v] = u;
                    }
                }
            }
        }

        let extraEdges = [];
        const MAX_EXTRA = 2;
        const MAX_DIST = 250;
        let degree = new Array(n).fill(0);
        for (let e of mstEdges) {
            degree[e.from]++;
            degree[e.to]++;
        }
        for (let i = 0; i < n; i++) {
            let candidates = [];
            for (let j = 0; j < n; j++) {
                if (i === j) continue;
                let d = Math.hypot(this.pins[i].x - this.pins[j].x, this.pins[i].y - this.pins[j].y);
                if (d <= MAX_DIST) {
                    candidates.push({idx: j, dist: d});
                }
            }
            candidates.sort((a,b) => a.dist - b.dist);
            let needed = MAX_EXTRA - (degree[i] > 0 ? degree[i] - 1 : 0);
            if (needed < 0) needed = 0;
            let added = 0;
            for (let cand of candidates) {
                if (added >= needed) break;
                let already = false;
                for (let e of mstEdges) {
                    if ((e.from === i && e.to === cand.idx) || (e.from === cand.idx && e.to === i)) already = true;
                }
                for (let e of extraEdges) {
                    if ((e.from === i && e.to === cand.idx) || (e.from === cand.idx && e.to === i)) already = true;
                }
                if (!already && degree[cand.idx] < MAX_EXTRA + 1) {
                    extraEdges.push({from: i, to: cand.idx});
                    degree[i]++;
                    degree[cand.idx]++;
                    added++;
                }
            }
        }

        let allEdges = [...mstEdges, ...extraEdges];
        let unique = new Set();
        let finalEdges = [];
        for (let e of allEdges) {
            let key = e.from < e.to ? `${e.from},${e.to}` : `${e.to},${e.from}`;
            if (!unique.has(key)) {
                unique.add(key);
                finalEdges.push(e);
            }
        }

        this.edges = finalEdges.map(edge => {
            const p1 = this.pins[edge.from];
            const p2 = this.pins[edge.to];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.hypot(dx, dy);
            const sag = Math.min(25, 8 + len * 0.08);
            const perpX = -dy / len;
            const perpY = dx / len;
            const sign = (Math.sin(edge.from * 12.34 + edge.to * 56.78) > 0 ? 1 : -1);
            const cpX = (p1.x + p2.x) / 2 + perpX * sag * sign;
            const cpY = (p1.y + p2.y) / 2 + perpY * sag * sign;
            return { from: edge.from, to: edge.to, cp: { x: cpX, y: cpY } };
        });
    }

    drawBackground() {
        let ctx = this.ctx;
        ctx.fillStyle = '#c49a6c';
        ctx.fillRect(0, 0, this.width, this.height);
        let grad = ctx.createRadialGradient(this.width/2, this.height/2, this.width*0.3, this.width/2, this.height/2, this.width*0.8);
        grad.addColorStop(0, '#b88a4a');
        grad.addColorStop(1, '#7a562a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);
        
        if (!this.random) return;
        
        for (let i=0;i<80;i++) {
            ctx.fillStyle = `rgba(70,45,20,${0.02 + this.random.next() * 0.03})`;
            ctx.beginPath();
            ctx.ellipse(
                this.random.next() * this.width, 
                this.random.next() * this.height, 
                10 + this.random.next() * 30, 
                6 + this.random.next() * 20, 
                this.random.next() * Math.PI, 
                0, Math.PI*2
            );
            ctx.fill();
        }
    }

    drawLand() {
        let ctx = this.ctx;
        let cols = Math.ceil(this.width / this.tileSize);
        let rows = Math.ceil(this.height / this.tileSize);
        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                let t = this.terrain[x][y];
                let px = x * this.tileSize;
                let py = y * this.tileSize;
                if (t === 1) {
                    ctx.fillStyle = '#b8885a';
                    ctx.fillRect(px, py, this.tileSize, this.tileSize);
                } else if (t === 2) {
                    ctx.fillStyle = '#5a3a1a';
                    ctx.fillRect(px, py, this.tileSize, this.tileSize);
                } else {
                    ctx.fillStyle = '#d4c4a8';
                    ctx.fillRect(px, py, this.tileSize, this.tileSize);
                }
            }
        }
        if (!this.random) return;
        
        for (let i=0;i<150;i++) {
            let x = Math.floor(this.random.next() * cols);
            let y = Math.floor(this.random.next() * rows);
            if (this.terrain[x][y] === 0) {
                ctx.fillStyle = `rgba(80,50,20,0.05)`;
                ctx.fillRect(x*this.tileSize, y*this.tileSize, this.tileSize, this.tileSize);
            }
        }
    }

    drawStrings() {
        let ctx = this.ctx;
        for (let edge of this.edges) {
            const p1 = this.pins[edge.from];
            const p2 = this.pins[edge.to];
            const isHighlighted = (this.highlightedPin !== null && 
                                   (edge.from === this.highlightedPin || edge.to === this.highlightedPin));
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.quadraticCurveTo(edge.cp.x, edge.cp.y, p2.x, p2.y);
            if (isHighlighted) {
                ctx.strokeStyle = '#ff3333';
                ctx.lineWidth = 3.5;
            } else {
                ctx.strokeStyle = '#5c3a1a';
                ctx.lineWidth = 2;
            }
            ctx.stroke();
        }
    }

drawPins() {
    let ctx = this.ctx;
    for (let i = 0; i < this.pins.length; i++) {
        const pin = this.pins[i];
        let r = pin.isBase ? this.BASE_PIN_RADIUS : this.NORMAL_PIN_RADIUS;
        
        const isHighlighted = (this.highlightedPin === i);
        if (isHighlighted) {
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#ff6666';
            r += 2;
        }
        
        let grad;
        if (pin.owner === "player") {
            grad = ctx.createRadialGradient(pin.x-3, pin.y-3, 2, pin.x, pin.y, r);
            grad.addColorStop(0, '#6688ff');
            grad.addColorStop(0.7, '#2244aa');
            grad.addColorStop(1, '#112266');
        } else if (pin.owner === "enemy") {
            grad = ctx.createRadialGradient(pin.x-3, pin.y-3, 2, pin.x, pin.y, r);
            grad.addColorStop(0, '#ff6666');
            grad.addColorStop(0.7, '#aa2222');
            grad.addColorStop(1, '#661111');
        } else {
            grad = ctx.createRadialGradient(pin.x-3, pin.y-3, 2, pin.x, pin.y, r);
            grad.addColorStop(0, '#e8d5a8');
            grad.addColorStop(0.7, '#b88d5a');
            grad.addColorStop(1, '#7a582e');
        }
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, r, 0, Math.PI*2);
        ctx.fill();
        
        let innerColor;
        if (pin.owner === "player") innerColor = '#aaccff';
        else if (pin.owner === "enemy") innerColor = '#ffaaaa';
        else innerColor = '#3a2a1a';
        
        ctx.fillStyle = innerColor;
        ctx.beginPath();
        ctx.arc(pin.x, pin.y, 2.5, 0, Math.PI*2);
        ctx.fill();
        
        if (pin.isBase) {
            ctx.beginPath();
            ctx.moveTo(pin.x-7, pin.y-7);
            ctx.lineTo(pin.x+7, pin.y+7);
            ctx.moveTo(pin.x+7, pin.y-7);
            ctx.lineTo(pin.x-7, pin.y+7);
            ctx.lineWidth = 2.5;
            
            if (pin.owner === "player") ctx.strokeStyle = '#ffffff';
            else if (pin.owner === "enemy") ctx.strokeStyle = '#ffccaa';
            else ctx.strokeStyle = '#aa3a2a';
            
            ctx.stroke();
        }
        
        if (pin.owner !== "player") {
            let pinIndex = i;
            if (this.isAdjacentToPlayerOwned(pinIndex)) {
                ctx.beginPath();
                ctx.arc(pin.x, pin.y, r + 3, 0, Math.PI*2);
                ctx.strokeStyle = '#ffaa66';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 4]);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
        
        if (isHighlighted) {
            ctx.shadowBlur = 0;
        }
    }
}

    drawCompass() {
        let ctx = this.ctx;
        let cx = this.width-50;
        let cy = this.height-50;
        let rad = 24;
        ctx.beginPath();
        ctx.arc(cx, cy, rad+2, 0, Math.PI*2);
        ctx.fillStyle = '#e0c88a';
        ctx.fill();
        ctx.strokeStyle = '#8b5a2b';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        for (let i=0;i<8;i++) {
            let angle = i*Math.PI/4;
            let x1 = cx + Math.cos(angle)*(rad-2);
            let y1 = cy + Math.sin(angle)*(rad-2);
            let x2 = cx + Math.cos(angle)*(rad-8);
            let y2 = cy + Math.sin(angle)*(rad-8);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
        ctx.font = `bold 11px monospace`;
        ctx.fillStyle = '#5a3a1a';
        ctx.fillText("N", cx-4, cy-rad+8);
        ctx.fillText("S", cx-3, cy+rad-4);
        ctx.fillText("E", cx+rad-14, cy+4);
        ctx.fillText("W", cx-rad+6, cy+4);
    }

    render() {
        this.drawBackground();
        this.drawLand();
        this.drawStrings();
        this.drawPins();
        this.drawCompass();
    }

    generateAndDraw() {
        if (!this.random) {
            this.generateWorld();
            this.generatePins();
            this.computeEdges();
        }
        this.render();
    }
}
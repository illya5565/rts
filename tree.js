const SkillTree = {
    center: { id: "core", label: "Academy", x: 385, y: 200, bought: true, unlock: "Line Infantry" }, 
    nodes: [
        { id: "inf_vet_sword", unlock: "Veteran Swordsmen", label: "Vet. Swords", cost: 70, x: 300, y: 120, bought: false, req: "core" },
        { id: "inf_vet_fire", unlock: "Fusiliers", label: "Fusiliers", cost: 70, x: 470, y: 120, bought: false, req: "core" },
        { id: "inf_pike", unlock: "Pikemen", label: "Pikemen", cost: 100, x: 250, y: 40, bought: false, req: "inf_vet_sword", conflicts: "inf_knight" },
        { id: "inf_knight", unlock: "Knights", label: "Knights", cost: 180, x: 350, y: 40, bought: false, req: "inf_vet_sword", conflicts: "inf_pike" },
        { id: "inf_gren", unlock: "Grenadiers", label: "Grenadiers", cost: 130, x: 420, y: 40, bought: false, req: "inf_vet_fire", conflicts: "inf_elite" },
        { id: "inf_elite", unlock: "Elite Guard", label: "Imperial Guard", cost: 220, x: 520, y: 40, bought: false, req: "inf_vet_fire", conflicts: "inf_gren" },
        { id: "cav_base", label: "Stables", cost: 100, x: 530, y: 200, bought: false, req: "core" },
        { id: "cav_hussar", unlock: "Hussars", label: "Hussars", cost: 50, x: 630, y: 110, bought: false, req: "cav_base" },
        { id: "cav_cuir", unlock: "Cuirassiers", label: "Cuirassiers", cost: 90, x: 630, y: 170, bought: false, req: "cav_base" },
        { id: "cav_drag", unlock: "Dragoon", label: "Dragoons", cost: 70, x: 630, y: 230, bought: false, req: "cav_base" },
        { id: "cav_jager", unlock: "Horse Jager", label: "Jagers", cost: 100, x: 630, y: 290, bought: false, req: "cav_base" },
        { id: "sup_base", unlock: "Ensign", label: "Headquarters", cost: 70, x: 240, y: 200, bought: false, req: "core" },
        { id: "med_1", unlock: "Medic", label: "Medics", cost: 90, x: 150, y: 150, bought: false, req: "sup_base" },
        { id: "med_surge", unlock: "Field Surgeon", label: "Surgeons", cost: 160, x: 50, y: 120, bought: false, req: "med_1", conflicts: "med_squad" },
        { id: "med_squad", unlock: "Medical Squad", label: "Sanitary Corp", cost: 200, x: 50, y: 180, bought: false, req: "med_1", conflicts: "med_surge" },
        { id: "com_1", unlock: "Commander", label: "Officers", cost: 120, x: 150, y: 250, bought: false, req: "sup_base" },
        { id: "com_mount", unlock: "Mounted Commander", label: "Cavalry Gen.", cost: 250, x: 50, y: 220, bought: false, req: "com_1", conflicts: "com_high" },
        { id: "com_high", unlock: "High Officer", label: "Staff Officer", cost: 210, x: 50, y: 280, bought: false, req: "com_1", conflicts: "com_mount" },
        { id: "art_base", label: "Foundry", cost: 150, x: 385, y: 310, bought: false, req: "core" },
        { id: "art_mortar", unlock: "Mortar", label: "Mortars", cost: 240, x: 300, y: 400, bought: false, req: "art_base" },
        { id: "art_organ", unlock: "Multi-barrel", label: "Organ Gun", cost: 310, x: 355, y: 400, bought: false, req: "art_base" },
        { id: "art_howitzer", unlock: "Howitzer", label: "Howitzer", cost: 380, x: 415, y: 400, bought: false, req: "art_base" },
        { id: "art_6lb", unlock: "6lb Cannon", label: "Light Battery", cost: 100, x: 470, y: 400, bought: false, req: "art_base" }
    ]
};

let currentTooltip = null;

const unitDescriptions = {
    "Line Infantry":     "Standard line infantry, balanced stats.",
    "Fusiliers":         "Light infantry with improved firepower and range.",
    "Grenadiers":        "Assault infantry, shorter range but heavy armor and high health.",
    "Elite Guard":       "Crack marksmen with extreme range and damage, but fragile.",
    "Veteran Swordsmen": "Seasoned melee fighters, good speed and damage.",
    "Knights":           "Heavy shock infantry, massive health and damage, slow.",
    "Pikemen":           "Polearm infantry, long reach — effective against cavalry.",
    "Hussars":           "Light cavalry, very fast — perfect for flanking.",
    "Cuirassiers":       "Heavy armored cavalry, tough and hard-hitting.",
    "Dragoon":           "Mounted infantry, can shoot from horseback.",
    "Horse Jager":       "Mounted marksmen, long range and accurate.",
    "Ensign":            "Carries regimental flag, boosts nearby accuracy.",
    "Medic":             "Slowly heals a single friendly squad.",
    "Field Surgeon":     "Powerful healing for one squad.",
    "Medical Squad":     "Group of medics, heals multiple squads at once.",
    "Commander":         "Inspires troops, increases all stats nearby.",
    "Mounted Commander": "Commander on horseback, mobile aura.",
    "High Officer":      "Senior officer, powerful all-stat boost aura.",
    "6lb Cannon":        "Light artillery, solid range and splash damage.",
    "Mortar":            "High arc, very long range but inaccurate.",
    "Multi-barrel":      "Rapid-firing anti-personnel gun, low splash.",
    "Howitzer":          "Heavy howitzer, massive explosion and damage."
};

function showSkillTooltip(node, event) {
    if (currentTooltip) hideSkillTooltip();

    const stats = node.unlock ? UnitStats[node.unlock] : null;
    const isBought = node.bought;
    const isBlocked = (() => {
        const allNodes = [SkillTree.center, ...SkillTree.nodes];
        const conflictNode = allNodes.find(n => n.id === node.conflicts);
        return conflictNode && conflictNode.bought;
    })();

    let html = '';
    
    if (node.unlock && stats) {
        html += `<div style="color:#ffd700; font-weight:bold; margin-bottom:2px;">${node.unlock}</div>`;
        const desc = unitDescriptions[node.unlock] || "A versatile military unit.";
        html += `<div style="color:#aaa; font-size:10px; margin-bottom:6px;">${desc}</div>`;
        
        html += `<span>HP: ${stats.hp}  [${stats.size}/${stats.size}]</span><br>`;
        html += `<span>Dmg: ${stats.dmg}  Range: ${stats.range}</span><br>`;
        html += `<span>Reload: ${(stats.reload/1000).toFixed(1)}s  Speed: ${stats.speed}</span><br>`;
        html += `<hr style="margin:4px 0; border-color:#444;">`;
        html += `<span class="cost">Cost: ${node.cost} gold</span>`;
        if (isBought) html += `<br><span style="color:#ffd700;">✓ researched</span>`;
        else if (isBlocked) html += `<br><span style="color:#cc4444;">✗ blocked (conflict)</span>`;
    } else {
        html += `<div style="color:#ffd700; font-weight:bold; margin-bottom:2px;">${node.label}</div>`;
        html += `<div style="color:#aaa; font-size:10px; margin-bottom:6px;">Unlocks new unit branches.</div>`;
        html += `<hr style="margin:4px 0; border-color:#444;">`;
        html += `<span class="cost">Cost: ${node.cost} gold</span>`;
        if (isBought) html += `<br><span style="color:#ffd700;">✓ researched</span>`;
    }

    const tooltip = document.createElement('div');
    tooltip.className = 'skill-tooltip';
    tooltip.innerHTML = html;
    document.body.appendChild(tooltip);
    currentTooltip = tooltip;

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
    node.divElement.addEventListener('mousemove', moveHandler);
    node.moveHandler = moveHandler;
}

function hideSkillTooltip() {
    if (currentTooltip) {
        currentTooltip.remove();
        currentTooltip = null;
    }
}

function renderTree() {
    const container = document.getElementById("tree-container");
    if (!container) return;
    container.innerHTML = "";
    
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.id = "tree-svg";
    container.appendChild(svg);

    const allNodes = [SkillTree.center, ...SkillTree.nodes];

    allNodes.forEach(node => {
        if (node.req) {
            const parent = allNodes.find(n => n.id === node.req);
            if (parent) {
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", node.x + 15);
                line.setAttribute("y1", node.y + 15);
                line.setAttribute("x2", parent.x + 15);
                line.setAttribute("y2", parent.y + 15);

                const conflictNode = allNodes.find(n => n.id === node.conflicts);
                const isBlockedByConflict = conflictNode && conflictNode.bought;
                const canBuyNow = parent.bought && !node.bought && !isBlockedByConflict;

                let lineColor = "#444";
                if (node.bought) lineColor = "#ffd700";
                else if (isBlockedByConflict) lineColor = "#9b1e1e";
                else if (canBuyNow) lineColor = "#1e419b";

                line.setAttribute("stroke", lineColor);
                line.setAttribute("stroke-width", "3");
                svg.appendChild(line);
            }
        }

        const div = document.createElement("div");
        const conflictNode = allNodes.find(n => n.id === node.conflicts);
        const isBlocked = conflictNode && conflictNode.bought;

        div.className = `skill-node ${node.bought ? 'bought' : ''} ${isBlocked ? 'blocked' : ''}`;
        div.style.left = node.x + "px";
        div.style.top = node.y + "px";

        div.onmouseover = (e) => {
            node.divElement = div;
            showSkillTooltip(node, e);
        };
        div.onmouseout = () => {
            hideSkillTooltip();
            if (node.moveHandler) {
                div.removeEventListener('mousemove', node.moveHandler);
                delete node.moveHandler;
            }
        };

        div.onclick = () => {
            if (typeof Audio !== "undefined") Audio.playButton();
            const parent = allNodes.find(n => n.id === node.req);
            if (!node.bought && !isBlocked && playerGold >= node.cost && (!parent || parent.bought)) {
                playerGold -= node.cost;
                node.bought = true;
                updateGoldDisplay();
                renderTree();
                renderShop();
            }
        };
        container.appendChild(div);
    });
}

function toggleTree() {
    const ui = document.getElementById("tree-menu");
    ui.style.display = (ui.style.display === "block") ? "none" : "block";
    if (ui.style.display === "block") {
        renderTree();
    } else {
        hideSkillTooltip();
    }
}
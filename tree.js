const SkillTree = {
    center: { id: "core", label: "Academy", x: 385, y: 200, bought: true, unlock: "Line Infantry" }, 
    nodes: [
        { id: "inf_vet_sword", unlock: "Veteran Swordsmen", label: "Vet. Swords", cost: 70, x: 300, y: 120, bought: false, req: "core" },
        { id: "inf_vet_fire", unlock: "Fusiliers", label: "Fusiliers", cost: 70, x: 470, y: 120, bought: false, req: "core" },
        { id: "inf_pike", unlock: "Pikemen", label: "Pikemen", cost: 100, x: 250, y: 40, bought: false, req: "inf_vet_sword", conflicts: "inf_knight" },
        { id: "inf_knight", unlock: "Armored Knights", label: "Knights", cost: 180, x: 350, y: 40, bought: false, req: "inf_vet_sword", conflicts: "inf_pike" },
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
        { id: "art_6lb", unlock: "6lb Cannon", label: "Light Battery", cost: 100, x: 470, y: 400, bought: false, req: "art_base" }]};
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

                if (node.bought) {
                    lineColor = "#ffd700";
                } else if (isBlockedByConflict) {
                    lineColor = "#9b1e1e";
                } else if (canBuyNow) {
                    lineColor = "#1e419b";
                }

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

        div.onmouseover = () => {
            const infoBox = document.getElementById("unit-info-display");
            if (infoBox) {
                let status = node.bought ? "[OPEN]" : isBlocked ? "[LOCKED]" : `[COST: ${node.cost}G]`;
                infoBox.innerText = `${status} ${node.label} - ${node.unlock || "Upgrade"}`;
            }
        };
        div.onmouseout = () => {
            const infoBox = document.getElementById("unit-info-display");
            if (infoBox) infoBox.innerText = "";
        };

        div.onclick = () => {
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
    if (ui.style.display === "block") renderTree();
}
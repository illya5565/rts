function updateGoldDisplay() {
    const el = document.getElementById("gold-display");
    if (el) {
        el.innerText = `Gold: ${playerGold} | Units: ${playerArmy.length}/20`;
    }
}

function renderShop() {
    const shop = document.getElementById("shop-controls");
    if (!shop) return;
    
    shop.innerHTML = "";
    
    const allNodes = [SkillTree.center, ...SkillTree.nodes];
    
    const unlockedUnits = allNodes
        .filter(node => node.bought && node.unlock)
        .map(node => node.unlock);

    allNodes.forEach(node => {
        if (node.unlock && node.bought) {
            const unitName = node.unlock;
            const stats = UnitStats[unitName];

            if (stats) {
                const isReplaced = unlockedUnits.some(name => 
                    UnitStats[name] && UnitStats[name].replaces === unitName
                );

                if (!isReplaced) {
                    const btn = document.createElement("button");
                    
                    btn.className = selectedUnitType === unitName ? "selected" : "";
                    btn.innerText = `${unitName} (${stats.cost}G)`;
                    
                    btn.onclick = () => {
                        selectedUnitType = unitName;
                        renderShop(); 
                    };
                    
                    shop.appendChild(btn);
                }
            }
        }
    });
}

updateGoldDisplay();
renderShop();
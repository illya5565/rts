const UnitStats = {

    "Line Infantry": {
        size: 24,
        hp: 45, dmg: 14, range: 190, reload: 2200,
        speed: 1.0, acc: 0.55, rotSpeed: 0.06, cost: 50,
    },
    "Fusiliers": {
        size: 20,
        hp: 55, dmg: 20, range: 230, reload: 1700,
        speed: 1.05, acc: 0.72, rotSpeed: 0.06, cost: 80,
        hasBayonets: true,
    },
    "Grenadiers": {
        replaces: "Fusiliers",
        size: 16,
        hp: 110, dmg: 28, range: 140, reload: 2000,
        speed: 0.95, acc: 0.75, rotSpeed: 0.05, cost: 160,
        hasBayonets: true,
    },
    "Elite Guard": {
        replaces: "Fusiliers",
        size: 18,
        hp: 75, dmg: 38, range: 480, reload: 1500,
        speed: 1.1, acc: 0.92, rotSpeed: 0.06, cost: 260,
    },

    "Veteran Swordsmen": {
        size: 20,
        hp: 65, dmg: 32, range: 42, reload: 1100,
        speed: 1.25, acc: 0.75, rotSpeed: 0.07, cost: 90,
    },
    "Armored Knights": {
        replaces: "Veteran Swordsmen",
        size: 12,
        hp: 220, dmg: 50, range: 55, reload: 1400,
        speed: 2.0, acc: 0.92, rotSpeed: 0.04, cost: 270,
    },
    "Pikemen": {
        replaces: "Veteran Swordsmen",
        size: 20,
        hp: 70, dmg: 38, range: 90, reload: 1400,
        speed: 1.05, acc: 0.82, rotSpeed: 0.07, cost: 130,
    },

    "Hussars": {
        size: 12,
        hp: 110, dmg: 28, range: 48, reload: 1100,
        speed: 3.2, acc: 0.80, rotSpeed: 0.03, cost: 110,
    },
    "Cuirassiers": {
        size: 10,
        hp: 180, dmg: 45, range: 52, reload: 950,
        speed: 2.7, acc: 0.82, rotSpeed: 0.025, cost: 200,
    },
    "Dragoon": {
        size: 12,
        hp: 120, dmg: 22, range: 210, reload: 2300,
        speed: 2.6, acc: 0.62, rotSpeed: 0.028, cost: 160,
    },
    "Horse Jager": {
        size: 10,
        hp: 105, dmg: 26, range: 320, reload: 1900,
        speed: 2.9, acc: 0.83, rotSpeed: 0.028, cost: 200,
    },

    "Ensign": {
        size: 1,
        hp: 45, dmg: 6, range: 120, reload: 2800,
        speed: 1.1, acc: 0.50, rotSpeed: 0.06, cost: 60,
        aura: "accuracy",
    },
    "Medic": {
        size: 1,
        hp: 38, dmg: 0, range: 130, reload: 2400,
        speed: 1.2, acc: 1.0, rotSpeed: 0.07, cost: 90,
        aura: "heal",
    },
    "Field Surgeon": {
        replaces: "Medic",
        size: 1,
        hp: 55, dmg: 0, range: 150, reload: 1800,
        speed: 1.2, acc: 1.0, rotSpeed: 0.07, cost: 160,
        aura: "heal_mega",
    },
    "Medical Squad": {
        replaces: "Medic",
        size: 3,
        hp: 50, dmg: 0, range: 130, reload: 2200,
        speed: 1.1, acc: 1.0, rotSpeed: 0.06, cost: 230,
        aura: "heal_multi",
    },
    "Commander": {
        size: 1,
        hp: 60, dmg: 12, range: 160, reload: 2400,
        speed: 1.05, acc: 0.72, rotSpeed: 0.05, cost: 130,
        aura: "all_stats",
    },
    "Mounted Commander": {
        replaces: "Commander",
        size: 1,
        hp: 130, dmg: 18, range: 160, reload: 2400,
        speed: 2.5, acc: 0.72, rotSpeed: 0.03, cost: 260,
        aura: "all_stats",
    },
    "High Officer": {
        replaces: "Commander",
        size: 1,
        hp: 70, dmg: 12, range: 170, reload: 2400,
        speed: 1.05, acc: 0.72, rotSpeed: 0.05, cost: 220,
        aura: "all_stats_mega",
    },

    "6lb Cannon": {
        size: 1,
        hp: 65, dmg: 130, range: 520, reload: 5500,
        speed: 0.2, acc: 0.9, rotSpeed: 0.012, cost: 160,
        bulletType: "small_ball", isSingle: true, splashRadius: 55,
    },
    "Mortar": {
        size: 1,
        hp: 75, dmg: 220, range: 900, reload: 8500,
        speed: 0.1, acc: 0.22, rotSpeed: 0.006, cost: 250,
        bulletType: "mortar_shell", isSingle: true, splashRadius: 110,
    },
    "Multi-barrel": {
        size: 1,
        hp: 85, dmg: 50, range: 200, reload: 450,
        speed: 0.3, acc: 0.32, rotSpeed: 0.014, cost: 320,
        bulletType: "small_ball", isSingle: true, splashRadius: 30,
    },
    "Howitzer": {
        size: 1,
        hp: 110, dmg: 400, range: 700, reload: 10000,
        speed: 0.1, acc: 0.52, rotSpeed: 0.006, cost: 400,
        bulletType: "big_ball", isSingle: true, splashRadius: 140,
    },
};
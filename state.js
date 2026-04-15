let squads = [];
let playerArmy = [];
let projectiles = [];
let isPlacementPhase = true;
let currentWave = 1;
let playerGold = 5000;
let selectedUnitType = null;
let isAutoMode = true;
let selectedSquads = [];
let isSelecting = false;
let selectionBox = { x1: 0, y1: 0, x2: 0, y2: 0 };
let worldWidth = 3000;
let worldHeight = 1000;
let camera = {
    x: 0,
    y: 0,
    speed: 7
};
let keys = {};
let isRightClickDragging = false;
let targetPoint = null;
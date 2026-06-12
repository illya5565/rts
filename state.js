let squads        = [];
let playerArmy    = [];
let projectiles   = [];
let deathAnims    = [];

let isPlacementPhase = true;
let currentWave      = 1;
let playerGold       = 1000;
let selectedUnitType = null;
let isAutoMode       = true;
let selectedSquads   = [];
let isSelecting      = false;
let selectionBox     = { x1: 0, y1: 0, x2: 0, y2: 0 };
let selectedCampaignPin = null;

let worldWidth  = 2000;
let worldHeight = 1000;

let campaignMapMode = false;
let campaignConditionMet = false;

let campaignMap = null;

let camera = { x: 0, y: 0, speed: 7 };
let keys   = {};
let isRightClickDragging = false;

let mouseScreenX = 0;
let mouseScreenY = 0;
let mouseWorldX  = 0;
let mouseWorldY  = 0;

let config = {
    up:      "KeyW",
    down:    "KeyS",
    left:    "KeyA",
    right:   "KeyD",
    auto:    "KeyQ",
    inspect: "KeyE",
};

let campaignRemainingWaves = 0;
let campaignCurrentWave = 1;
let campaignTotalWaves = 0;
let campaignLives = 3;
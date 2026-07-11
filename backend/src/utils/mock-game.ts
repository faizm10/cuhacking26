import { gameSpecSchema, type GameSpec } from "../lib/game/schema/game.js";

const BASE_GAME: GameSpec = gameSpecSchema.parse({
  title: "Star Dash",
  gameType: "collect",
  objective: "Collect all glowing stars while avoiding the drifting red bots.",
  controls: {
    keyboard: ["arrows", "wasd"],
    mouse: [],
    touch: ["drag"],
    instructions: "Move with WASD or arrow keys. On touch, drag the player.",
  },
  movementRules:
    "The player moves freely around the arena. Enemies patrol in straight lines and bounce at patrol limits.",
  player: {
    label: "Player",
    x: 92,
    y: 260,
    width: 34,
    height: 34,
    color: "#38bdf8",
    speed: 260,
    jumpStrength: 0,
    canShoot: false,
  },
  enemies: [
    {
      id: "enemy-1",
      label: "Bot",
      x: 420,
      y: 145,
      width: 34,
      height: 34,
      color: "#fb7185",
      movement: "patrol-horizontal",
      speed: 120,
      patrolDistance: 260,
      damage: 1,
    },
    {
      id: "enemy-2",
      label: "Bot",
      x: 690,
      y: 360,
      width: 34,
      height: 34,
      color: "#fb7185",
      movement: "patrol-vertical",
      speed: 100,
      patrolDistance: 190,
      damage: 1,
    },
  ],
  obstacles: [
    {
      id: "wall-1",
      label: "Wall",
      x: 240,
      y: 220,
      width: 110,
      height: 28,
      color: "#64748b",
      kind: "wall",
      solid: true,
      damage: 0,
    },
    {
      id: "hazard-1",
      label: "Zap",
      x: 550,
      y: 250,
      width: 120,
      height: 26,
      color: "#f97316",
      kind: "hazard",
      solid: false,
      damage: 1,
    },
  ],
  collectibles: [
    { id: "star-1", label: "Star", x: 820, y: 92, width: 24, height: 24, color: "#fde047", points: 10 },
    { id: "star-2", label: "Star", x: 790, y: 430, width: 24, height: 24, color: "#fde047", points: 10 },
    { id: "star-3", label: "Star", x: 142, y: 422, width: 24, height: 24, color: "#fde047", points: 10 },
  ],
  projectiles: {
    enabled: false,
    label: "Shot",
    color: "#f8fafc",
    width: 10,
    height: 10,
    speed: 0,
    cooldownMs: 500,
    direction: "right",
  },
  platforms: [],
  collisionRules: {
    playerHitsEnemy: "lose-life",
    playerHitsObstacle: "block",
    playerCollectsCollectible: "score-and-remove",
    projectileHitsEnemy: "ignore",
    outOfBounds: "block",
  },
  scoring: { start: 0, perCollectible: 10, perEnemy: 0, target: 30 },
  lives: 3,
  timer: { enabled: false, seconds: 60, countsDown: true },
  winCondition: "Collect all three stars.",
  loseCondition: "Lose all lives by touching enemies or hazards.",
  visualTheme: {
    style: "neon",
    background: { color: "#111827", pattern: "stars" },
    accentColor: "#22d3ee",
  },
  soundSettings: { enabled: false, music: "none", effects: false },
  difficulty: "easy",
  entityPositionsAndSizes:
    "Player starts left. Stars are spread across the arena. Two bots patrol near the middle and right side.",
});

export function getMockGame(selectedType?: string): GameSpec {
  const clone = structuredClone(BASE_GAME);
  if (selectedType === "simple-shooter") {
    clone.gameType = "simple-shooter";
    clone.title = "Star Blaster";
    clone.objective = "Shoot both bots before they touch you.";
    clone.player.canShoot = true;
    clone.projectiles.enabled = true;
    clone.projectiles.speed = 520;
    clone.projectiles.direction = "right";
    clone.scoring.target = 100;
    clone.scoring.perEnemy = 50;
    clone.winCondition = "Destroy every enemy.";
  }
  return gameSpecSchema.parse(clone);
}

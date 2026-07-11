import { gameSpecSchema, type GameSpec } from "./schema";

/**
 * Hand-written example games. Used as the mock-mode response (so the whole
 * pipeline runs without an OpenAI key), as manual test material, and as
 * known-good specs in unit tests. Each is validated at module load.
 */

const noProjectiles = {
  enabled: false,
  label: "",
  color: "#ffffff",
  width: 10,
  height: 10,
  speed: 400,
  cooldownMs: 400,
  direction: "toward-pointer",
} as const;

/** Astronaut collects stars while dodging drifting meteors. */
export const ASTRONAUT_STARS: GameSpec = gameSpecSchema.parse({
  title: "Star Snacker",
  shortDescription: "Float through space and grab every star.",
  gameType: "collect",
  objective: "Collect all 5 stars while avoiding the meteors.",
  controls: {
    keyboard: ["arrows", "wasd"],
    mouse: [],
    touch: ["drag"],
    instructions: "Arrow keys or WASD to fly",
  },
  player: {
    x: 60, y: 240, width: 42, height: 42,
    label: "Astronaut", color: "#e2e8f0", appearance: "creature",
    speed: 300, jumpStrength: 0, canShoot: false,
  },
  enemies: [
    { id: "meteor-1", label: "Meteor", color: "#f97316", appearance: "spiky",
      x: 380, y: 90, width: 44, height: 44,
      movement: "patrol-horizontal", speed: 140, patrolDistance: 300, damage: 1 },
    { id: "meteor-2", label: "Meteor", color: "#fb923c", appearance: "spiky",
      x: 520, y: 340, width: 52, height: 52,
      movement: "patrol-vertical", speed: 110, patrolDistance: 240, damage: 1 },
    { id: "meteor-3", label: "Meteor", color: "#ea580c", appearance: "spiky",
      x: 700, y: 180, width: 38, height: 38,
      movement: "bounce", speed: 160, patrolDistance: 340, damage: 1 },
  ],
  obstacles: [],
  collectibles: [
    { id: "star-1", label: "", color: "#facc15", appearance: "star", x: 260, y: 120, width: 30, height: 30, points: 10 },
    { id: "star-2", label: "", color: "#facc15", appearance: "star", x: 460, y: 250, width: 30, height: 30, points: 10 },
    { id: "star-3", label: "", color: "#facc15", appearance: "star", x: 640, y: 90, width: 30, height: 30, points: 10 },
    { id: "star-4", label: "", color: "#facc15", appearance: "star", x: 780, y: 320, width: 30, height: 30, points: 10 },
    { id: "star-5", label: "", color: "#facc15", appearance: "star", x: 870, y: 160, width: 30, height: 30, points: 10 },
  ],
  projectiles: noProjectiles,
  platforms: [],
  collisionRules: {
    playerHitsEnemy: "lose-life",
    playerHitsObstacle: "block",
    playerCollectsCollectible: "score-and-remove",
    projectileHitsEnemy: "ignore",
    outOfBounds: "block",
  },
  scoring: { start: 0, perCollectible: 10, perEnemy: 0, target: 0 },
  lives: 3,
  timer: { enabled: false, seconds: 60, countsDown: true },
  winCondition: "You collected every star!",
  loseCondition: "The meteors got you.",
  visualTheme: {
    style: "space",
    background: { color: "#0f172a", pattern: "stars" },
    accentColor: "#818cf8",
  },
  feel: { screenShake: true, particles: true, hitFlash: true, collectAnimation: true, bounce: true },
  difficulty: "easy",
});

/** Frog hops across lily-pad platforms to reach the pond. */
export const FROG_POND: GameSpec = gameSpecSchema.parse({
  title: "Pond Hopper",
  shortDescription: "Hop across the lily pads and dive into the pond.",
  gameType: "platform-jumper",
  objective: "Jump across the platforms and reach the pond on the right.",
  controls: {
    keyboard: ["arrows", "wasd"],
    mouse: [],
    touch: ["tap"],
    instructions: "Left/right to move, up to jump",
  },
  player: {
    x: 40, y: 420, width: 40, height: 36,
    label: "Frog", color: "#4ade80", appearance: "creature",
    speed: 260, jumpStrength: 560, canShoot: false,
  },
  enemies: [
    { id: "dragonfly", label: "Dragonfly", color: "#f472b6", appearance: "creature",
      x: 470, y: 200, width: 36, height: 28,
      movement: "patrol-horizontal", speed: 130, patrolDistance: 220, damage: 1 },
  ],
  obstacles: [
    { id: "water", label: "Water", color: "#38bdf8", kind: "hazard", solid: false,
      x: 0, y: 516, width: 240, height: 24, damage: 1 },
  ],
  collectibles: [
    { id: "fly-1", label: "", color: "#fde047", appearance: "gem", x: 330, y: 320, width: 24, height: 24, points: 5 },
    { id: "fly-2", label: "", color: "#fde047", appearance: "gem", x: 590, y: 220, width: 24, height: 24, points: 5 },
    { id: "pond", label: "Pond", color: "#22d3ee", appearance: "heart", x: 880, y: 400, width: 46, height: 46, points: 20 },
  ],
  projectiles: noProjectiles,
  platforms: [
    { id: "pad-1", label: "", color: "#65a30d", kind: "static", movement: "none", patrolDistance: 0, x: 0, y: 470, width: 200, height: 40 },
    { id: "pad-2", label: "", color: "#65a30d", kind: "static", movement: "none", patrolDistance: 0, x: 280, y: 400, width: 150, height: 32 },
    { id: "pad-3", label: "", color: "#65a30d", kind: "moving", movement: "patrol-vertical", patrolDistance: 120, x: 520, y: 330, width: 140, height: 32 },
    { id: "pad-4", label: "", color: "#65a30d", kind: "static", movement: "none", patrolDistance: 0, x: 720, y: 300, width: 130, height: 32 },
    { id: "pad-5", label: "", color: "#65a30d", kind: "static", movement: "none", patrolDistance: 0, x: 840, y: 460, width: 120, height: 40 },
  ],
  collisionRules: {
    playerHitsEnemy: "lose-life",
    playerHitsObstacle: "lose-life",
    playerCollectsCollectible: "score-and-remove",
    projectileHitsEnemy: "ignore",
    outOfBounds: "block",
  },
  scoring: { start: 0, perCollectible: 5, perEnemy: 0, target: 0 },
  lives: 3,
  timer: { enabled: false, seconds: 90, countsDown: true },
  winCondition: "You made it to the pond!",
  loseCondition: "You ran out of lives.",
  visualTheme: {
    style: "garden",
    background: { color: "#dcfce7", pattern: "hills" },
    accentColor: "#16a34a",
  },
  feel: { screenShake: true, particles: true, hitFlash: true, collectAnimation: true, bounce: true },
  difficulty: "normal",
});

/** Cat grabs fish while dodging puddles on the kitchen floor. */
export const CAT_FISH: GameSpec = gameSpecSchema.parse({
  title: "Fish Filcher",
  shortDescription: "Sneak around the kitchen and snag every fish.",
  gameType: "collect",
  objective: "Collect all 4 fish without stepping in a puddle.",
  controls: {
    keyboard: ["arrows", "wasd"],
    mouse: [],
    touch: ["drag"],
    instructions: "Arrow keys or WASD to prowl",
  },
  player: {
    x: 80, y: 260, width: 44, height: 38,
    label: "Cat", color: "#fb923c", appearance: "creature",
    speed: 320, jumpStrength: 0, canShoot: false,
  },
  enemies: [],
  obstacles: [
    { id: "puddle-1", label: "Puddle", color: "#60a5fa", kind: "hazard", solid: false, x: 300, y: 140, width: 120, height: 46, damage: 1 },
    { id: "puddle-2", label: "Puddle", color: "#60a5fa", kind: "hazard", solid: false, x: 520, y: 330, width: 150, height: 52, damage: 1 },
    { id: "puddle-3", label: "Puddle", color: "#60a5fa", kind: "hazard", solid: false, x: 700, y: 120, width: 110, height: 44, damage: 1 },
    { id: "table", label: "Table", color: "#a16207", kind: "wall", solid: true, x: 430, y: 60, width: 120, height: 90, damage: 0 },
  ],
  collectibles: [
    { id: "fish-1", label: "", color: "#38bdf8", appearance: "gem", x: 260, y: 380, width: 32, height: 24, points: 25 },
    { id: "fish-2", label: "", color: "#38bdf8", appearance: "gem", x: 480, y: 200, width: 32, height: 24, points: 25 },
    { id: "fish-3", label: "", color: "#38bdf8", appearance: "gem", x: 760, y: 300, width: 32, height: 24, points: 25 },
    { id: "fish-4", label: "", color: "#38bdf8", appearance: "gem", x: 860, y: 100, width: 32, height: 24, points: 25 },
  ],
  projectiles: noProjectiles,
  platforms: [],
  collisionRules: {
    playerHitsEnemy: "lose-life",
    playerHitsObstacle: "block",
    playerCollectsCollectible: "score-and-remove",
    projectileHitsEnemy: "ignore",
    outOfBounds: "block",
  },
  scoring: { start: 0, perCollectible: 25, perEnemy: 0, target: 0 },
  lives: 2,
  timer: { enabled: true, seconds: 45, countsDown: true },
  winCondition: "You got every fish — what a haul!",
  loseCondition: "Soggy paws! The puddles won.",
  visualTheme: {
    style: "pastel",
    background: { color: "#fef3c7", pattern: "dots" },
    accentColor: "#f59e0b",
  },
  feel: { screenShake: false, particles: true, hitFlash: true, collectAnimation: true, bounce: true },
  difficulty: "easy",
});

/** Classic pong: player paddle vs a patrolling AI paddle, first to 7. */
export const PONG_RALLY: GameSpec = gameSpecSchema.parse({
  title: "Paddle Battle",
  shortDescription: "Bat the ball past the AI paddle. First to 7 wins.",
  gameType: "pong",
  objective: "Score 7 points by hitting the ball past the right paddle.",
  controls: {
    keyboard: ["arrows", "wasd"],
    mouse: [],
    touch: ["drag"],
    instructions: "Up/down to move your paddle",
  },
  player: {
    x: 30, y: 220, width: 18, height: 110,
    label: "You", color: "#38bdf8", appearance: "block",
    speed: 420, jumpStrength: 0, canShoot: false,
  },
  enemies: [
    { id: "ball", label: "", color: "#facc15", appearance: "ball",
      x: 470, y: 260, width: 22, height: 22,
      movement: "bounce", speed: 300, patrolDistance: 0, damage: 0 },
    { id: "ai-paddle", label: "AI", color: "#f87171", appearance: "block",
      x: 912, y: 220, width: 18, height: 110,
      movement: "patrol-vertical", speed: 210, patrolDistance: 380, damage: 0 },
  ],
  obstacles: [],
  collectibles: [],
  projectiles: noProjectiles,
  platforms: [],
  collisionRules: {
    playerHitsEnemy: "bounce",
    playerHitsObstacle: "block",
    playerCollectsCollectible: "ignore",
    projectileHitsEnemy: "ignore",
    outOfBounds: "block",
  },
  scoring: { start: 0, perCollectible: 0, perEnemy: 0, target: 7 },
  lives: 3,
  timer: { enabled: false, seconds: 120, countsDown: true },
  winCondition: "You reached 7 points — champion!",
  loseCondition: "The ball got past you three times.",
  visualTheme: {
    style: "neon",
    background: { color: "#1e1b4b", pattern: "grid" },
    accentColor: "#a78bfa",
  },
  feel: { screenShake: true, particles: true, hitFlash: true, collectAnimation: true, bounce: true },
  difficulty: "normal",
});

export const EXAMPLE_GAMES: GameSpec[] = [
  ASTRONAUT_STARS,
  FROG_POND,
  CAT_FISH,
  PONG_RALLY,
];

/** Rotate through examples in mock mode so repeat generations feel alive. */
export function pickExampleGame(seed: number): GameSpec {
  const game = EXAMPLE_GAMES[Math.abs(seed) % EXAMPLE_GAMES.length];
  return structuredClone(game ?? ASTRONAUT_STARS);
}

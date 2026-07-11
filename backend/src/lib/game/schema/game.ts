import { z } from "zod";

export const GAME_WORLD = {
  width: 960,
  height: 540,
} as const;

export const supportedGameTypes = [
  "dodge",
  "collect",
  "pong",
  "snake",
  "maze",
  "clicker",
  "simple-shooter",
  "platform-jumper",
] as const;

const color = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Use a six-digit hex color such as #38bdf8");

const position = z.object({
  x: z.number().min(0).max(GAME_WORLD.width),
  y: z.number().min(0).max(GAME_WORLD.height),
});

const size = z.object({
  width: z.number().min(8).max(240),
  height: z.number().min(8).max(240),
});

const rect = position.merge(size);

const movementPattern = z.enum([
  "none",
  "patrol-horizontal",
  "patrol-vertical",
  "chase-player",
  "bounce",
  "fall",
  "snake-grid",
]);

export const controlsSchema = z.object({
  keyboard: z.array(z.enum(["arrows", "wasd", "space"])).max(3),
  mouse: z.array(z.enum(["click", "move", "drag"])).max(3),
  touch: z.array(z.enum(["tap", "drag", "swipe"])).max(3),
  instructions: z.string().min(1).max(180),
});

export const playerSchema = rect.extend({
  label: z.string().min(1).max(40),
  color,
  speed: z.number().min(0).max(900),
  jumpStrength: z.number().min(0).max(900),
  canShoot: z.boolean(),
});

export const enemySchema = rect.extend({
  id: z.string().min(1).max(40),
  label: z.string().max(40),
  color,
  movement: movementPattern,
  speed: z.number().min(0).max(500),
  patrolDistance: z.number().min(0).max(500),
  damage: z.number().int().min(0).max(5),
});

export const obstacleSchema = rect.extend({
  id: z.string().min(1).max(40),
  label: z.string().max(40),
  color,
  kind: z.enum(["wall", "hazard", "bumper"]),
  solid: z.boolean(),
  damage: z.number().int().min(0).max(5),
});

export const collectibleSchema = rect.extend({
  id: z.string().min(1).max(40),
  label: z.string().max(40),
  color,
  points: z.number().int().min(1).max(100),
});

export const projectileSchema = z.object({
  enabled: z.boolean(),
  label: z.string().max(40),
  color,
  width: z.number().min(4).max(60),
  height: z.number().min(4).max(60),
  speed: z.number().min(0).max(900),
  cooldownMs: z.number().int().min(120).max(2000),
  direction: z.enum(["up", "down", "left", "right", "toward-pointer"]),
});

export const platformSchema = rect.extend({
  id: z.string().min(1).max(40),
  label: z.string().max(40),
  color,
  kind: z.enum(["static", "moving"]),
  movement: z.enum(["none", "patrol-horizontal", "patrol-vertical"]),
  patrolDistance: z.number().min(0).max(500),
});

export const collisionRulesSchema = z.object({
  playerHitsEnemy: z.enum(["lose-life", "lose-game", "bounce", "ignore"]),
  playerHitsObstacle: z.enum(["block", "lose-life", "lose-game", "bounce", "ignore"]),
  playerCollectsCollectible: z.enum(["score", "score-and-remove", "win", "ignore"]),
  projectileHitsEnemy: z.enum(["remove-enemy", "score-and-remove", "ignore"]),
  outOfBounds: z.enum(["wrap", "block", "lose-life", "lose-game"]),
});

export const scoringSchema = z.object({
  start: z.number().int().min(0).max(9999),
  perCollectible: z.number().int().min(0).max(100),
  perEnemy: z.number().int().min(0).max(200),
  target: z.number().int().min(0).max(9999),
});

export const timerSchema = z.object({
  enabled: z.boolean(),
  seconds: z.number().int().min(5).max(300),
  countsDown: z.boolean(),
});

export const visualThemeSchema = z.object({
  style: z.enum(["arcade", "neon", "pastel", "paper", "space", "garden", "dungeon", "beach"]),
  background: z.object({
    color,
    pattern: z.enum(["solid", "grid", "stars", "dots", "stripes"]),
  }),
  accentColor: color,
});

export const gameSpecSchema = z.object({
  title: z.string().min(1).max(70),
  gameType: z.enum(supportedGameTypes),
  objective: z.string().min(1).max(220),
  controls: controlsSchema,
  movementRules: z.string().min(1).max(300),
  player: playerSchema,
  enemies: z.array(enemySchema).max(12),
  obstacles: z.array(obstacleSchema).max(40),
  collectibles: z.array(collectibleSchema).max(30),
  projectiles: projectileSchema,
  platforms: z.array(platformSchema).max(24),
  collisionRules: collisionRulesSchema,
  scoring: scoringSchema,
  lives: z.number().int().min(1).max(9),
  timer: timerSchema,
  winCondition: z.string().min(1).max(200),
  loseCondition: z.string().min(1).max(200),
  visualTheme: visualThemeSchema,
  soundSettings: z.object({
    enabled: z.boolean(),
    music: z.enum(["none", "chiptune", "ambient"]),
    effects: z.boolean(),
  }),
  difficulty: z.enum(["easy", "medium", "hard"]),
  entityPositionsAndSizes: z.string().min(1).max(500),
});

export type SupportedGameType = (typeof supportedGameTypes)[number];
export type GameSpec = z.infer<typeof gameSpecSchema>;

function toGeminiSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toGeminiSchema);
  if (!node || typeof node !== "object") return node;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (
      key === "$schema" ||
      key === "exclusiveMinimum" ||
      key === "exclusiveMaximum" ||
      key === "maxItems" ||
      (key === "pattern" && typeof value === "string")
    ) {
      continue;
    }
    if (key === "type" && value === "integer") {
      out.type = "number";
      continue;
    }
    out[key] = toGeminiSchema(value);
  }
  return out;
}

export const gameSpecJsonSchema = toGeminiSchema(
  z.toJSONSchema(gameSpecSchema)
) as Record<string, unknown>;

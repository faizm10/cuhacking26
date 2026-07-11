import {
  GAME_WORLD,
  supportedGameTypes,
  type GameRect,
  type GameSpec,
  type SupportedGameType,
} from "./schema";

/**
 * Local, deterministic fixes for minor problems in a model-generated spec.
 * Anything safe to repair is repaired (with a warning); anything structural
 * is left for Zod to reject so the API can retry.
 */

export interface RepairResult {
  game: GameSpec;
  warnings: string[];
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function intersects(a: GameRect, b: GameRect): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Clamp raw numbers BEFORE Zod validation so slightly-out-of-range values
 * (x: -4, width: 260) become valid instead of triggering a full retry.
 * Operates on unknown JSON defensively — non-objects pass through untouched.
 */
export function clampRawSpec(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const spec = structuredClone(raw) as Record<string, unknown>;
  const game = (spec.game ?? spec) as Record<string, unknown>;

  const clampRect = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    const rect = value as Record<string, unknown>;
    if (typeof rect.width === "number")
      rect.width = clamp(rect.width, 8, 240);
    if (typeof rect.height === "number")
      rect.height = clamp(rect.height, 8, 240);
    if (typeof rect.x === "number")
      rect.x = clamp(rect.x, 0, GAME_WORLD.width);
    if (typeof rect.y === "number")
      rect.y = clamp(rect.y, 0, GAME_WORLD.height);
  };

  clampRect(game.player);
  for (const key of ["enemies", "obstacles", "collectibles", "platforms"]) {
    const list = game[key];
    if (Array.isArray(list)) list.forEach(clampRect);
  }
  return spec;
}

/** Keep an entity fully inside the world (position clamp accounts for size). */
function keepInWorld(rect: GameRect, warnings: string[], label: string): void {
  const maxX = GAME_WORLD.width - rect.width;
  const maxY = GAME_WORLD.height - rect.height;
  if (rect.x > maxX || rect.y > maxY || rect.x < 0 || rect.y < 0) {
    rect.x = clamp(rect.x, 0, Math.max(0, maxX));
    rect.y = clamp(rect.y, 0, Math.max(0, maxY));
    warnings.push(`Moved ${label} back inside the play area`);
  }
}

/** Nudge the player spawn out of hazards and solid walls. */
function fixPlayerSpawn(game: GameSpec, warnings: string[]): void {
  const dangerous: GameRect[] = [
    ...game.obstacles.filter((o) => o.kind === "hazard" || o.solid),
    ...game.enemies,
  ];
  const collides = () => dangerous.some((r) => intersects(game.player, r));
  if (!collides()) return;

  // Try a spiral of safe spots: above, left, right, then screen corners.
  const candidates = [
    { x: game.player.x, y: Math.max(0, game.player.y - 120) },
    { x: Math.max(0, game.player.x - 140), y: game.player.y },
    {
      x: Math.min(GAME_WORLD.width - game.player.width, game.player.x + 140),
      y: game.player.y,
    },
    { x: 32, y: GAME_WORLD.height - game.player.height - 32 },
    { x: 32, y: 32 },
  ];
  for (const spot of candidates) {
    const previous = { x: game.player.x, y: game.player.y };
    game.player.x = spot.x;
    game.player.y = spot.y;
    if (!collides()) {
      warnings.push("Moved the player start out of a hazard");
      return;
    }
    game.player.x = previous.x;
    game.player.y = previous.y;
  }
  warnings.push("Player start overlaps a hazard and no safe spot was found");
}

/** Deduplicate entity ids so runtime lookups stay unambiguous. */
function dedupeIds(game: GameSpec, warnings: string[]): void {
  const seen = new Set<string>();
  let renamed = 0;
  for (const list of [
    game.enemies,
    game.obstacles,
    game.collectibles,
    game.platforms,
  ]) {
    for (const entity of list) {
      if (seen.has(entity.id)) {
        entity.id = `${entity.id}-${seen.size}`;
        renamed += 1;
      }
      seen.add(entity.id);
    }
  }
  if (renamed > 0) warnings.push(`Renamed ${renamed} duplicate entity ids`);
}

/** Make sure the declared win is actually reachable in the runtime. */
function ensureWinnable(game: GameSpec, warnings: string[]): void {
  const hasCollectibles = game.collectibles.length > 0;
  const hasTarget = game.scoring.target > 0;
  const survivalWin = game.timer.enabled && game.gameType === "dodge";
  const shooterWin =
    game.gameType === "simple-shooter" && game.enemies.length > 0;

  if (!hasCollectibles && !hasTarget && !survivalWin && !shooterWin) {
    // Fall back to a survive-the-timer win so every game can end.
    game.timer.enabled = true;
    game.timer.countsDown = true;
    game.timer.seconds = clamp(game.timer.seconds, 20, 90);
    warnings.push("No win path found — added a survival timer win");
  }

  if (hasTarget && hasCollectibles) {
    const available =
      game.scoring.start +
      game.collectibles.reduce((sum, item) => sum + item.points, 0) +
      game.enemies.length * game.scoring.perEnemy;
    if (game.scoring.target > available) {
      game.scoring.target = Math.max(1, available);
      warnings.push("Lowered the score target so the game is winnable");
    }
  }
}

/** Coerce an arbitrary requested type onto a supported template. */
export function resolveGameType(
  requested: string | undefined | null
): SupportedGameType | "auto" {
  if (!requested || requested === "auto") return "auto";
  const match = supportedGameTypes.find((type) => type === requested);
  return match ?? "auto";
}

/**
 * Post-validation repair: geometric and rules fixes on a spec that already
 * passed the schema. Returns a new object; the input is not mutated.
 */
export function repairGameSpec(spec: GameSpec): RepairResult {
  const game = structuredClone(spec);
  const warnings: string[] = [];

  keepInWorld(game.player, warnings, "the player");
  game.enemies.forEach((e) => keepInWorld(e, warnings, e.label || "an enemy"));
  game.obstacles.forEach((o) =>
    keepInWorld(o, warnings, o.label || "an obstacle")
  );
  game.collectibles.forEach((c) =>
    keepInWorld(c, warnings, c.label || "a collectible")
  );
  game.platforms.forEach((p) =>
    keepInWorld(p, warnings, p.label || "a platform")
  );

  fixPlayerSpawn(game, warnings);
  dedupeIds(game, warnings);
  ensureWinnable(game, warnings);

  return { game, warnings };
}

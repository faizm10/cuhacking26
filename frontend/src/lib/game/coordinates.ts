import { z } from "zod";

import {
  GAME_WORLD,
  collectibleSchema,
  enemySchema,
  gameSpecSchema,
  obstacleSchema,
  platformSchema,
  playerSchema,
  type GameSpec,
} from "./schema";

/**
 * One coordinate convention, enforced at the model boundary:
 *
 * - The model receives AND returns NORMALIZED coordinates — x, y, width,
 *   height all in 0–1, where (x, y) is the TOP-LEFT corner and the origin is
 *   the top-left of the drawing area. y grows downward. No flipping, ever.
 * - This module performs the only normalized→pixel conversion in the app:
 *   worldX = normX * GAME_WORLD.width, worldY = normY * GAME_WORLD.height.
 * - Everything downstream (repair, layout validation, renderer, fixtures)
 *   speaks world pixels.
 *
 * Models sometimes ignore instructions and emit pixels anyway. Any geometry
 * value > 1.5 is unambiguously not a normalized coordinate, so the whole
 * rect is treated as pixels and divided back down before validation.
 */

const norm = z.number().min(0).max(1);
const normSize = z.number().min(0.004).max(1);

const normalizedGeometry = z.object({
  x: norm,
  y: norm,
  width: normSize,
  height: normSize,
});

const GEOMETRY_KEYS = {
  x: true,
  y: true,
  width: true,
  height: true,
} as const;

export const normalizedPlayerSchema = playerSchema
  .omit(GEOMETRY_KEYS)
  .extend(normalizedGeometry.shape);
export const normalizedEnemySchema = enemySchema
  .omit(GEOMETRY_KEYS)
  .extend(normalizedGeometry.shape);
export const normalizedObstacleSchema = obstacleSchema
  .omit(GEOMETRY_KEYS)
  .extend(normalizedGeometry.shape);
export const normalizedCollectibleSchema = collectibleSchema
  .omit(GEOMETRY_KEYS)
  .extend(normalizedGeometry.shape);
export const normalizedPlatformSchema = platformSchema
  .omit(GEOMETRY_KEYS)
  .extend(normalizedGeometry.shape);

/** GameSpec as the model must produce it: all layout in normalized 0–1. */
export const normalizedGameSpecSchema = gameSpecSchema.extend({
  player: normalizedPlayerSchema,
  enemies: z.array(normalizedEnemySchema).max(12),
  obstacles: z.array(normalizedObstacleSchema).max(40),
  collectibles: z.array(normalizedCollectibleSchema).max(30),
  platforms: z.array(normalizedPlatformSchema).max(24),
});

export const modelGenerationResultSchema = z.object({
  interpretationSummary: z.string().min(1).max(300),
  game: normalizedGameSpecSchema,
});

export type NormalizedGameSpec = z.infer<typeof normalizedGameSpecSchema>;
export type ModelGenerationResult = z.infer<typeof modelGenerationResultSchema>;

/** Strip keys OpenAI structured output chokes on (same policy as schema.ts). */
function toOpenAiSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toOpenAiSchema);
  if (!node || typeof node !== "object") return node;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === "$schema" || (key === "pattern" && typeof value === "string")) {
      continue;
    }
    out[key] = toOpenAiSchema(value);
  }
  return out;
}

export const modelGenerationJsonSchema = toOpenAiSchema(
  z.toJSONSchema(modelGenerationResultSchema)
) as Record<string, unknown>;

const clampNum = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/**
 * Pre-validation unit repair on raw model JSON (mutating a clone):
 * pixel-emitting rects are divided down to 0–1, then everything is clamped
 * into the normalized range so borderline values don't force a retry.
 */
export function coerceNormalizedGeometry(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const root = structuredClone(raw) as Record<string, unknown>;
  const game = (root.game ?? root) as Record<string, unknown>;

  const fixRect = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    const rect = value as Record<string, unknown>;
    const overOne = (["x", "y", "width", "height"] as const).some(
      (key) => typeof rect[key] === "number" && (rect[key] as number) > 1.5
    );
    if (overOne) {
      // The model emitted pixels — convert the whole rect back to normalized.
      if (typeof rect.x === "number") rect.x /= GAME_WORLD.width;
      if (typeof rect.y === "number") rect.y /= GAME_WORLD.height;
      if (typeof rect.width === "number") rect.width /= GAME_WORLD.width;
      if (typeof rect.height === "number") rect.height /= GAME_WORLD.height;
    }
    if (typeof rect.x === "number") rect.x = clampNum(rect.x, 0, 1);
    if (typeof rect.y === "number") rect.y = clampNum(rect.y, 0, 1);
    if (typeof rect.width === "number")
      rect.width = clampNum(rect.width, 0.004, 1);
    if (typeof rect.height === "number")
      rect.height = clampNum(rect.height, 0.004, 1);
  };

  fixRect(game.player);
  for (const key of ["enemies", "obstacles", "collectibles", "platforms"]) {
    const list = game[key];
    if (Array.isArray(list)) list.forEach(fixRect);
  }
  return root;
}

interface PixelBounds {
  maxWidth: number;
}

function rectToPixels<T extends { x: number; y: number; width: number; height: number }>(
  entity: T,
  { maxWidth }: PixelBounds
): T {
  const width = clampNum(Math.round(entity.width * GAME_WORLD.width), 8, maxWidth);
  const height = clampNum(Math.round(entity.height * GAME_WORLD.height), 8, 240);
  return {
    ...entity,
    width,
    height,
    x: clampNum(Math.round(entity.x * GAME_WORLD.width), 0, GAME_WORLD.width),
    y: clampNum(Math.round(entity.y * GAME_WORLD.height), 0, GAME_WORLD.height),
  };
}

/**
 * The single normalized→world conversion. Top-left in, top-left out, no axis
 * flips. Pixel sizes are clamped into the world-schema ranges so the result
 * always satisfies gameSpecSchema.
 */
export function denormalizeGameSpec(spec: NormalizedGameSpec): GameSpec {
  const entityBounds: PixelBounds = { maxWidth: 240 };
  const wideBounds: PixelBounds = { maxWidth: GAME_WORLD.width };
  return {
    ...spec,
    player: rectToPixels(spec.player, entityBounds),
    enemies: spec.enemies.map((e) => rectToPixels(e, entityBounds)),
    collectibles: spec.collectibles.map((c) => rectToPixels(c, entityBounds)),
    obstacles: spec.obstacles.map((o) => rectToPixels(o, wideBounds)),
    platforms: spec.platforms.map((p) => rectToPixels(p, wideBounds)),
  };
}

export interface CoordinateDebugRow {
  id: string;
  role: string;
  normX: number;
  normY: number;
  worldX: number;
  worldY: number;
}

/** Compact per-entity table for development logging. */
export function coordinateDebugTable(
  normalized: NormalizedGameSpec,
  world: GameSpec
): CoordinateDebugRow[] {
  const rows: CoordinateDebugRow[] = [];
  const push = (
    id: string,
    role: string,
    n: { x: number; y: number },
    w: { x: number; y: number }
  ) =>
    rows.push({
      id,
      role,
      normX: Number(n.x.toFixed(3)),
      normY: Number(n.y.toFixed(3)),
      worldX: Math.round(w.x),
      worldY: Math.round(w.y),
    });

  push("player", "player", normalized.player, world.player);
  normalized.platforms.forEach((p, i) =>
    push(p.id, "platform", p, world.platforms[i] ?? p)
  );
  normalized.obstacles.forEach((o, i) =>
    push(o.id, o.kind, o, world.obstacles[i] ?? o)
  );
  normalized.collectibles.forEach((c, i) =>
    push(c.id, "collectible", c, world.collectibles[i] ?? c)
  );
  normalized.enemies.forEach((e, i) =>
    push(e.id, "enemy", e, world.enemies[i] ?? e)
  );
  return rows;
}

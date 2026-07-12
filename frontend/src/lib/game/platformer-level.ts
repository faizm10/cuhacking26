import { z } from "zod";

import {
  gravityForJump,
  PLAYABLE_PLATFORMER_DEFAULTS,
} from "@/lib/game/platformer-physics";
import { SAMPLE_LEVEL } from "@/lib/game/sample-level";
import type { Level, LevelPlatform } from "@/types";

/**
 * Platformer LEVEL contract for AI generation and chat refine.
 *
 * Unlike the config-only dedicated modes (tic-tac-toe, flappy), the whole
 * point of the platformer is that the sketch's LAYOUT becomes the level, so
 * the model emits real geometry. `repairLevel` then guarantees the result is
 * always playable: everything clamped into the world, spawn and goal on solid
 * ground, coins reachable and never inside hazards.
 */

export const DEFAULT_PLATFORMER_LEVEL: Level = SAMPLE_LEVEL;

const positionSchema = z.object({ x: z.number(), y: z.number() });

const rectSchema = positionSchema.extend({
  width: z.number().min(1),
  height: z.number().min(1),
});

export const levelZodSchema = z.object({
  name: z.string().min(1).max(60),
  theme: z.enum(["grass", "desert", "ice", "lava", "space", "cave"]),
  world: z.object({
    width: z.number().min(800).max(4800),
    height: z.number().min(600).max(1800),
    gravity: z.number().min(200).max(3000),
  }),
  player: positionSchema,
  goal: positionSchema,
  platforms: z
    .array(rectSchema.extend({ kind: z.enum(["static", "moving", "crumbling"]) }))
    .min(1)
    .max(80),
  hazards: z
    .array(rectSchema.extend({ type: z.enum(["spikes", "lava", "water"]) }))
    .max(40),
  coins: z.array(positionSchema).max(60),
  enemies: z
    .array(
      positionSchema.extend({
        type: z.enum(["walker", "flyer"]),
        patrolDistance: z.number().min(0).max(800),
      })
    )
    .max(20),
});

/** Model output contract for platformer generation. */
export const platformerGenerationSchema = z.object({
  interpretationSummary: z.string().min(1).max(300),
  game: levelZodSchema,
});

/** Strip keys the OpenAI json_schema format rejects ($schema, regex patterns). */
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

export const platformerGenerationJsonSchema = toOpenAiSchema(
  z.toJSONSchema(platformerGenerationSchema)
) as Record<string, unknown>;

export const platformerRefineJsonSchema = toOpenAiSchema(
  z.toJSONSchema(
    z.object({
      assistantMessage: z.string(),
      game: levelZodSchema,
    })
  )
) as Record<string, unknown>;

// ---------------------------------------------------------------- repair

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const num = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

/** Player jump apex height in px, from the shared feel module. */
function jumpHeight(): number {
  const impulse = PLAYABLE_PLATFORMER_DEFAULTS.jumpStrength;
  return (impulse * impulse) / (2 * gravityForJump(impulse));
}

function platformTopUnder(
  platforms: LevelPlatform[],
  x: number,
  slack = 60
): LevelPlatform | null {
  let best: LevelPlatform | null = null;
  for (const platform of platforms) {
    if (x < platform.x - slack || x > platform.x + platform.width + slack) {
      continue;
    }
    // Prefer the highest platform (smallest y) the x roughly overlaps.
    if (!best || platform.y < best.y) best = platform;
  }
  return best;
}

export interface RepairedLevel {
  level: Level;
  warnings: string[];
}

/**
 * Coerce arbitrary model JSON into a playable Level. Never throws; on
 * hopeless input it falls back to the demo meadow with a warning.
 */
export function repairLevel(raw: unknown): RepairedLevel {
  const warnings = new Set<string>();
  const fallback = (): RepairedLevel => ({
    level: structuredClone(DEFAULT_PLATFORMER_LEVEL),
    warnings: ["Used the demo meadow — the AI level didn't land this time"],
  });

  if (!raw || typeof raw !== "object") return fallback();
  const input = raw as Record<string, unknown>;

  const worldIn = (input.world ?? {}) as Record<string, unknown>;
  const world = {
    width: Math.round(clamp(num(worldIn.width, 1600), 800, 4800)),
    height: Math.round(clamp(num(worldIn.height, 900), 600, 1800)),
    gravity: Math.round(clamp(num(worldIn.gravity, 1200), 200, 3000)),
  };

  // Platforms first — everything else anchors to them.
  const platformsIn = Array.isArray(input.platforms) ? input.platforms : [];
  let platforms: LevelPlatform[] = [];
  for (const entry of platformsIn.slice(0, 80)) {
    if (!entry || typeof entry !== "object") continue;
    const p = entry as Record<string, unknown>;
    const width = clamp(num(p.width, 0), 40, world.width);
    const height = clamp(num(p.height, 0), 16, 400);
    if (!num(p.width, 0) || !num(p.height, 0)) continue;
    const x = clamp(num(p.x, 0), 0, world.width - width);
    const y = clamp(num(p.y, 0), 40, world.height - 20);
    const kind =
      p.kind === "moving" || p.kind === "crumbling" ? p.kind : "static";
    platforms.push({ x, y, width, height, kind });
  }
  if (platforms.length === 0) {
    if (platformsIn.length > 0) {
      warnings.add("Rebuilt the ground — the AI platforms were unusable");
    } else {
      return fallback();
    }
    platforms = [
      {
        x: 0,
        y: Math.round(world.height * 0.87),
        width: world.width,
        height: Math.round(world.height * 0.13),
        kind: "static",
      },
    ];
  }

  // Hazards clamped inside the world.
  const hazardsIn = Array.isArray(input.hazards) ? input.hazards : [];
  const hazards: Level["hazards"] = [];
  for (const entry of hazardsIn.slice(0, 40)) {
    if (!entry || typeof entry !== "object") continue;
    const h = entry as Record<string, unknown>;
    const width = clamp(num(h.width, 0), 10, world.width);
    const height = clamp(num(h.height, 0), 10, world.height);
    if (!num(h.width, 0) || !num(h.height, 0)) continue;
    const type =
      h.type === "lava" || h.type === "water" ? h.type : "spikes";
    hazards.push({
      x: clamp(num(h.x, 0), 0, world.width - width),
      y: clamp(num(h.y, 0), 0, world.height - 10),
      width,
      height,
      type,
    });
  }

  // Spawn on solid ground, near the left.
  const playerIn = (input.player ?? {}) as Record<string, unknown>;
  const player = {
    x: clamp(num(playerIn.x, 90), 20, world.width - 20),
    y: clamp(num(playerIn.y, 0), 20, world.height - 20),
  };
  const leftmost = [...platforms].sort((a, b) => a.x - b.x)[0]!;
  const spawnSupport = platformTopUnder(platforms, player.x);
  if (!spawnSupport || spawnSupport.y < player.y) {
    // No platform below the spawn (or spawn is under the ground line).
    player.x = clamp(leftmost.x + 60, 20, world.width - 20);
    player.y = leftmost.y - 50;
    warnings.add("Moved the spawn onto solid ground");
  }

  // Goal snapped to a platform top, near the right.
  const goalIn = (input.goal ?? {}) as Record<string, unknown>;
  const goal = {
    x: clamp(num(goalIn.x, world.width - 100), 40, world.width - 40),
    y: clamp(num(goalIn.y, 0), 40, world.height),
  };
  const goalSupport = platformTopUnder(platforms, goal.x);
  if (goalSupport) {
    // The flag base always sits exactly on its platform top.
    goal.y = goalSupport.y;
  } else {
    const rightmost = [...platforms].sort(
      (a, b) => b.x + b.width - (a.x + a.width)
    )[0]!;
    goal.x = clamp(rightmost.x + rightmost.width - 80, 40, world.width - 40);
    goal.y = rightmost.y;
    warnings.add("Moved the flag onto solid ground");
  }

  // Coins: inside the world, out of hazards, within jump reach of a platform.
  const reach = jumpHeight();
  const coinsIn = Array.isArray(input.coins) ? input.coins : [];
  const coins: Level["coins"] = [];
  for (const entry of coinsIn.slice(0, 60)) {
    if (!entry || typeof entry !== "object") continue;
    const c = entry as Record<string, unknown>;
    if (typeof c.x !== "number" || typeof c.y !== "number") continue;
    const coin = {
      x: clamp(num(c.x, 0), 20, world.width - 20),
      y: clamp(num(c.y, 0), 30, world.height - 30),
    };
    for (const hazard of hazards) {
      const inside =
        coin.x >= hazard.x - 10 &&
        coin.x <= hazard.x + hazard.width + 10 &&
        coin.y >= hazard.y - 10 &&
        coin.y <= hazard.y + hazard.height + 10;
      if (inside) {
        coin.y = hazard.y - 40;
        warnings.add("Lifted coins out of hazards");
      }
    }
    const support = platformTopUnder(platforms, coin.x, 80);
    if (support && coin.y < support.y - (reach + 45)) {
      // Higher than a full jump from its platform — pull it within reach.
      coin.y = support.y - Math.round(reach);
      warnings.add("Lowered floating coins into jump reach");
    }
    coins.push(coin);
  }

  // Enemies clamped, patrols capped.
  const enemiesIn = Array.isArray(input.enemies) ? input.enemies : [];
  const enemies: Level["enemies"] = [];
  for (const entry of enemiesIn.slice(0, 20)) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.x !== "number" || typeof e.y !== "number") continue;
    enemies.push({
      x: clamp(num(e.x, 0), 20, world.width - 20),
      y: clamp(num(e.y, 0), 20, world.height - 20),
      type: e.type === "flyer" ? "flyer" : "walker",
      patrolDistance: clamp(num(e.patrolDistance, 120), 0, 800),
    });
  }

  const name =
    typeof input.name === "string" && input.name.trim()
      ? input.name.trim().slice(0, 60)
      : "Sketch Level";
  const themeIn = input.theme;
  const theme =
    themeIn === "desert" ||
    themeIn === "ice" ||
    themeIn === "lava" ||
    themeIn === "space" ||
    themeIn === "cave"
      ? themeIn
      : "grass";

  return {
    level: { name, theme, world, player, goal, platforms, hazards, coins, enemies },
    warnings: [...warnings],
  };
}

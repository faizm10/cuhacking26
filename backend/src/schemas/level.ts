import { z } from "zod";

/**
 * The logical coordinate space for generated levels. The origin is the
 * top-left corner and y increases downward, matching both tldraw and Phaser.
 */
export const DEFAULT_WORLD = {
  width: 1600,
  height: 900,
  gravity: 1200,
} as const;

const position = z.object({
  x: z.number(),
  y: z.number(),
});

const rect = position.extend({
  // Use min(1) instead of positive() — Gemini rejects exclusiveMinimum.
  width: z.number().min(1),
  height: z.number().min(1),
});

export const platformSchema = rect.extend({
  kind: z.enum(["static", "moving", "crumbling"]),
});

export const hazardSchema = rect.extend({
  type: z.enum(["spikes", "lava", "water"]),
});

export const enemySchema = position.extend({
  type: z.enum(["walker", "flyer"]),
  /** How far the enemy patrols from its spawn point, in world units. */
  patrolDistance: z.number().min(0).max(800),
});

export const levelSchema = z.object({
  name: z.string().min(1).max(60),
  theme: z.enum(["grass", "desert", "ice", "lava", "space", "cave"]),
  world: z.object({
    width: z.number().int().min(800).max(4800),
    height: z.number().int().min(600).max(1800),
    gravity: z.number().min(200).max(3000),
  }),
  player: position,
  goal: position,
  platforms: z.array(platformSchema).min(1).max(80),
  hazards: z.array(hazardSchema).max(40),
  coins: z.array(position).max(60),
  enemies: z.array(enemySchema).max(20),
});

export type Level = z.infer<typeof levelSchema>;
export type Platform = z.infer<typeof platformSchema>;
export type Hazard = z.infer<typeof hazardSchema>;
export type Enemy = z.infer<typeof enemySchema>;

/**
 * Gemini's responseSchema rejects some JSON Schema keywords Zod emits
 * (exclusiveMinimum, maxItems, $schema). Strip those before sending.
 */
function toGeminiSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toGeminiSchema);
  if (!node || typeof node !== "object") return node;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (
      key === "$schema" ||
      key === "exclusiveMinimum" ||
      key === "exclusiveMaximum" ||
      key === "maxItems"
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

/** JSON Schema for Gemini structured output. */
export const levelJsonSchema = toGeminiSchema(
  z.toJSONSchema(levelSchema)
) as Record<string, unknown>;

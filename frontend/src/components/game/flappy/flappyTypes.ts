import { z } from "zod";

/**
 * The Flappy Bird game specification — a small, strict CONFIG schema.
 *
 * OpenAI never writes physics, movement, collision, rendering, or level
 * layout. It only returns these tuning values; the dedicated engine builds
 * the playable level from them. Every numeric field is clamped to a safe,
 * always-playable range so bad model output can never produce a broken game.
 */

export const FLAPPY_THEMES = [
  "cartoon",
  "pixel",
  "retro",
  "minimal",
] as const;

export const FLAPPY_BIRD_COLORS = [
  "yellow",
  "red",
  "blue",
  "green",
  "orange",
  "pink",
  "white",
  "mint",
] as const;

export const FLAPPY_PIPE_COLORS = [
  "green",
  "emerald",
  "teal",
  "red",
  "orange",
  "purple",
  "blue",
  "slate",
] as const;

export const FLAPPY_BACKGROUNDS = ["day", "night", "sunset", "dawn"] as const;

export const FLAPPY_WEATHER = ["none", "snow", "rain"] as const;

/**
 * Safe ranges for every numeric knob. `clampFlappySpec` guarantees the stored
 * spec always lands inside these bounds, so the engine never has to defend
 * against absurd input. Values are expressed at a 600px reference height; the
 * engine scales them to the actual canvas.
 */
export const FLAPPY_LIMITS = {
  pipeGap: { min: 120, max: 250, fallback: 170 },
  pipeSpacing: { min: 200, max: 460, fallback: 320 },
  scrollSpeed: { min: 110, max: 340, fallback: 220 },
  gravity: { min: 650, max: 1300, fallback: 950 },
  flapStrength: { min: -460, max: -240, fallback: -330 },
} as const;

export type FlappyLimitKey = keyof typeof FLAPPY_LIMITS;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Coerce any input into a finite number inside a limit, else the fallback. */
export function clampLimit(value: unknown, key: FlappyLimitKey): number {
  const limit = FLAPPY_LIMITS[key];
  const n =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : limit.fallback;
  return clamp(n, limit.min, limit.max);
}

export const flappyFeaturesSchema = z.object({
  /** Small WebAudio blips on flap / score / crash. */
  sound: z.boolean(),
  /** Animated clouds drifting across the sky. */
  clouds: z.boolean(),
  /** Multi-layer parallax (clouds + hills move slower than pipes). */
  parallax: z.boolean(),
  /** Pipes gently bob up and down — adds challenge without breaking fairness. */
  movingPipes: z.boolean(),
});

export const flappySpecSchema = z.object({
  gameType: z.literal("flappy-bird"),
  title: z.string().min(1).max(60),
  theme: z.enum(FLAPPY_THEMES),
  birdColor: z.enum(FLAPPY_BIRD_COLORS),
  pipeColor: z.enum(FLAPPY_PIPE_COLORS),
  background: z.enum(FLAPPY_BACKGROUNDS),
  weather: z.enum(FLAPPY_WEATHER),
  /** Vertical opening between the top and bottom pipe (px @ 600h). */
  pipeGap: z
    .number()
    .min(FLAPPY_LIMITS.pipeGap.min)
    .max(FLAPPY_LIMITS.pipeGap.max),
  /** Horizontal distance between consecutive pipes (px @ 600h). */
  pipeSpacing: z
    .number()
    .min(FLAPPY_LIMITS.pipeSpacing.min)
    .max(FLAPPY_LIMITS.pipeSpacing.max),
  /** World scroll speed, pipes move right→left (px/s @ 600h). */
  scrollSpeed: z
    .number()
    .min(FLAPPY_LIMITS.scrollSpeed.min)
    .max(FLAPPY_LIMITS.scrollSpeed.max),
  /** Downward acceleration (px/s² @ 600h). */
  gravity: z
    .number()
    .min(FLAPPY_LIMITS.gravity.min)
    .max(FLAPPY_LIMITS.gravity.max),
  /** Upward impulse applied on flap — negative is up (px/s @ 600h). */
  flapStrength: z
    .number()
    .min(FLAPPY_LIMITS.flapStrength.min)
    .max(FLAPPY_LIMITS.flapStrength.max),
  features: flappyFeaturesSchema,
});

export type FlappyTheme = (typeof FLAPPY_THEMES)[number];
export type FlappyBirdColor = (typeof FLAPPY_BIRD_COLORS)[number];
export type FlappyPipeColor = (typeof FLAPPY_PIPE_COLORS)[number];
export type FlappyBackground = (typeof FLAPPY_BACKGROUNDS)[number];
export type FlappyWeather = (typeof FLAPPY_WEATHER)[number];
export type FlappyFeatures = z.infer<typeof flappyFeaturesSchema>;
export type FlappySpec = z.infer<typeof flappySpecSchema>;

export const DEFAULT_FLAPPY_SPEC: FlappySpec = {
  gameType: "flappy-bird",
  title: "Flappy Bird",
  theme: "cartoon",
  birdColor: "yellow",
  pipeColor: "green",
  background: "day",
  weather: "none",
  pipeGap: 170,
  pipeSpacing: 320,
  scrollSpeed: 220,
  gravity: 950,
  flapStrength: -330,
  features: {
    sound: false,
    clouds: true,
    parallax: true,
    movingPipes: false,
  },
};

/** Clamp every numeric field of a spec into its safe range (in place-safe). */
export function clampFlappySpec(spec: FlappySpec): FlappySpec {
  return {
    ...spec,
    pipeGap: clampLimit(spec.pipeGap, "pipeGap"),
    pipeSpacing: clampLimit(spec.pipeSpacing, "pipeSpacing"),
    scrollSpeed: clampLimit(spec.scrollSpeed, "scrollSpeed"),
    gravity: clampLimit(spec.gravity, "gravity"),
    flapStrength: clampLimit(spec.flapStrength, "flapStrength"),
  };
}

/**
 * Build a valid spec from arbitrary model JSON. Every recognized, valid field
 * overrides the base (defaults for generation, the live spec for chat edits);
 * anything else — physics code, movement, collision, level geometry, arcade
 * junk — is dropped. Numbers are clamped. This can never throw.
 */
export function coerceFlappySpec(
  raw: unknown,
  base: FlappySpec = DEFAULT_FLAPPY_SPEC
): FlappySpec {
  const spec = structuredClone(base);
  if (!raw || typeof raw !== "object") return clampFlappySpec(spec);
  const input = raw as Record<string, unknown>;

  const pickEnum = <T extends string>(
    schema: z.ZodType<T>,
    value: unknown,
    fallback: T
  ): T => {
    const result = schema.safeParse(value);
    return result.success ? result.data : fallback;
  };

  if (typeof input.title === "string" && input.title.trim()) {
    spec.title = input.title.trim().slice(0, 60);
  }
  spec.theme = pickEnum(flappySpecSchema.shape.theme, input.theme, spec.theme);
  spec.birdColor = pickEnum(
    flappySpecSchema.shape.birdColor,
    input.birdColor,
    spec.birdColor
  );
  spec.pipeColor = pickEnum(
    flappySpecSchema.shape.pipeColor,
    input.pipeColor,
    spec.pipeColor
  );
  spec.background = pickEnum(
    flappySpecSchema.shape.background,
    input.background,
    spec.background
  );
  spec.weather = pickEnum(
    flappySpecSchema.shape.weather,
    input.weather,
    spec.weather
  );

  spec.pipeGap =
    typeof input.pipeGap === "number"
      ? clampLimit(input.pipeGap, "pipeGap")
      : clampLimit(spec.pipeGap, "pipeGap");
  spec.pipeSpacing =
    typeof input.pipeSpacing === "number"
      ? clampLimit(input.pipeSpacing, "pipeSpacing")
      : clampLimit(spec.pipeSpacing, "pipeSpacing");
  spec.scrollSpeed =
    typeof input.scrollSpeed === "number"
      ? clampLimit(input.scrollSpeed, "scrollSpeed")
      : clampLimit(spec.scrollSpeed, "scrollSpeed");
  spec.gravity =
    typeof input.gravity === "number"
      ? clampLimit(input.gravity, "gravity")
      : clampLimit(spec.gravity, "gravity");
  spec.flapStrength =
    typeof input.flapStrength === "number"
      ? clampLimit(input.flapStrength, "flapStrength")
      : clampLimit(spec.flapStrength, "flapStrength");

  if (input.features && typeof input.features === "object") {
    const features = input.features as Record<string, unknown>;
    for (const key of Object.keys(
      flappyFeaturesSchema.shape
    ) as (keyof FlappyFeatures)[]) {
      const parsed = flappyFeaturesSchema.shape[key].safeParse(features[key]);
      if (parsed.success) spec.features[key] = parsed.data;
    }
  }

  return clampFlappySpec(spec);
}

/** Model output contract for Flappy Bird generation. */
export const flappyGenerationSchema = z.object({
  interpretationSummary: z.string().min(1).max(300),
  game: flappySpecSchema,
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

export const flappyGenerationJsonSchema = toOpenAiSchema(
  z.toJSONSchema(flappyGenerationSchema)
) as Record<string, unknown>;

export const flappyRefineJsonSchema = toOpenAiSchema(
  z.toJSONSchema(
    z.object({
      assistantMessage: z.string(),
      game: flappySpecSchema,
    })
  )
) as Record<string, unknown>;

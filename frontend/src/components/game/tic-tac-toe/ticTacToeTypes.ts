import { z } from "zod";

/**
 * The tic-tac-toe game specification — a small, strict config schema.
 * The board geometry is NEVER model-generated: the renderer always builds a
 * correct centered 3×3 grid. The model only configures rules and looks.
 */

export const ticTacToeVisualThemeSchema = z.object({
  style: z.enum(["playful-cartoon", "hand-drawn", "minimal"]),
  boardBackground: z.enum(["warm-white", "cream", "mint", "sky", "blush"]),
  xColor: z.enum([
    "blue",
    "orange",
    "red",
    "green",
    "purple",
    "pink",
    "teal",
    "yellow",
  ]),
  oColor: z.enum([
    "blue",
    "orange",
    "red",
    "green",
    "purple",
    "pink",
    "teal",
    "yellow",
  ]),
  containerStyle: z.enum(["dark-navy", "plum", "forest", "charcoal"]),
  roundedCells: z.boolean(),
  shadows: z.boolean(),
  /** "large" scales the board up — the chat's "make the board larger". */
  boardScale: z.enum(["normal", "large"]),
});

export const ticTacToeFeaturesSchema = z.object({
  showTurnIndicator: z.boolean(),
  highlightWinningLine: z.boolean(),
  enableConfetti: z.boolean(),
  enableSound: z.boolean(),
  allowRestart: z.boolean(),
});

export const ticTacToeSpecSchema = z.object({
  gameType: z.literal("tic-tac-toe"),
  title: z.string().min(1).max(60),
  playerMode: z.enum(["vs-ai", "local-2p"]),
  playerSymbol: z.enum(["X", "O"]),
  opponentSymbol: z.enum(["X", "O"]),
  startingPlayer: z.enum(["player", "opponent"]),
  aiDifficulty: z.enum(["easy", "normal", "hard"]),
  /** Board geometry is fixed — the sketch never controls it. */
  boardSize: z.literal(3),
  visualTheme: ticTacToeVisualThemeSchema,
  features: ticTacToeFeaturesSchema,
});

export type TicTacToeVisualTheme = z.infer<typeof ticTacToeVisualThemeSchema>;
export type TicTacToeFeatures = z.infer<typeof ticTacToeFeaturesSchema>;
export type TicTacToeSpec = z.infer<typeof ticTacToeSpecSchema>;
export type TicTacToeSymbol = "X" | "O";

export const DEFAULT_TIC_TAC_TOE_SPEC: TicTacToeSpec = {
  gameType: "tic-tac-toe",
  title: "Classic Tic-Tac-Toe",
  playerMode: "vs-ai",
  playerSymbol: "X",
  opponentSymbol: "O",
  startingPlayer: "player",
  aiDifficulty: "normal",
  boardSize: 3,
  visualTheme: {
    style: "playful-cartoon",
    boardBackground: "warm-white",
    xColor: "blue",
    oColor: "orange",
    containerStyle: "dark-navy",
    roundedCells: true,
    shadows: true,
    boardScale: "normal",
  },
  features: {
    showTurnIndicator: true,
    highlightWinningLine: true,
    enableConfetti: true,
    enableSound: false,
    allowRestart: true,
  },
};

/**
 * Build a valid spec from arbitrary model JSON: every recognized, valid
 * field overrides the base (defaults for generation, the live spec for chat
 * edits); everything else — including junk like scripts, timers, lives, or
 * arcade mechanics — is dropped. This can never fail.
 */
export function coerceTicTacToeSpec(
  raw: unknown,
  base: TicTacToeSpec = DEFAULT_TIC_TAC_TOE_SPEC
): TicTacToeSpec {
  const spec = structuredClone(base);
  if (!raw || typeof raw !== "object") return spec;
  const input = raw as Record<string, unknown>;

  const pick = <T>(schema: z.ZodType<T>, value: unknown, fallback: T): T => {
    const result = schema.safeParse(value);
    return result.success ? result.data : fallback;
  };

  spec.title = pick(ticTacToeSpecSchema.shape.title, input.title, spec.title);
  spec.playerMode = pick(
    ticTacToeSpecSchema.shape.playerMode,
    input.playerMode,
    spec.playerMode
  );
  spec.playerSymbol = pick(
    ticTacToeSpecSchema.shape.playerSymbol,
    input.playerSymbol,
    spec.playerSymbol
  );
  spec.startingPlayer = pick(
    ticTacToeSpecSchema.shape.startingPlayer,
    input.startingPlayer,
    spec.startingPlayer
  );
  spec.aiDifficulty = pick(
    ticTacToeSpecSchema.shape.aiDifficulty,
    input.aiDifficulty,
    spec.aiDifficulty
  );
  // Opponent symbol is always derived — the two sides can never match.
  spec.opponentSymbol = spec.playerSymbol === "X" ? "O" : "X";

  if (input.visualTheme && typeof input.visualTheme === "object") {
    const theme = input.visualTheme as Record<string, unknown>;
    for (const key of Object.keys(
      ticTacToeVisualThemeSchema.shape
    ) as (keyof TicTacToeVisualTheme)[]) {
      const parsed = ticTacToeVisualThemeSchema.shape[key].safeParse(
        theme[key]
      );
      if (parsed.success) {
        (spec.visualTheme[key] as unknown) = parsed.data;
      }
    }
  }
  if (input.features && typeof input.features === "object") {
    const features = input.features as Record<string, unknown>;
    for (const key of Object.keys(
      ticTacToeFeaturesSchema.shape
    ) as (keyof TicTacToeFeatures)[]) {
      const parsed = ticTacToeFeaturesSchema.shape[key].safeParse(
        features[key]
      );
      if (parsed.success) spec.features[key] = parsed.data;
    }
  }

  // Same-color symbols are unreadable — nudge O off X's color.
  if (spec.visualTheme.xColor === spec.visualTheme.oColor) {
    spec.visualTheme.oColor =
      spec.visualTheme.xColor === "orange" ? "blue" : "orange";
  }

  return spec;
}

/** Model output contract for TTT generation. */
export const ticTacToeGenerationSchema = z.object({
  interpretationSummary: z.string().min(1).max(300),
  game: ticTacToeSpecSchema,
});

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

export const ticTacToeGenerationJsonSchema = toOpenAiSchema(
  z.toJSONSchema(ticTacToeGenerationSchema)
) as Record<string, unknown>;

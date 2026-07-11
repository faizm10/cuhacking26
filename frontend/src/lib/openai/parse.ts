import { normalizeColorsInPlace } from "@/lib/game/colors";
import {
  coerceNormalizedGeometry,
  coordinateDebugTable,
  denormalizeGameSpec,
  modelGenerationResultSchema,
  type CoordinateDebugRow,
} from "@/lib/game/coordinates";
import { gameSpecSchema, type GenerationResult } from "@/lib/game/schema";

export type ParsedModelOutput =
  | { ok: true; value: GenerationResult; debugTable: CoordinateDebugRow[] }
  | { ok: false; issues: string };

/**
 * Parse and validate raw model output text.
 *
 * Pipeline: JSON → unit coercion (pixel-emitting models are divided back to
 * 0–1) → normalized schema validation → the single denormalize step into
 * world pixels → final world-schema validation.
 */
export function parseModelOutput(text: string): ParsedModelOutput {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, issues: "Response was not valid JSON." };
  }

  const coerced = coerceNormalizedGeometry(json) as Record<string, unknown>;
  const game = (coerced.game ?? coerced) as Record<string, unknown>;
  normalizeColorsInPlace(game);

  const normalized = modelGenerationResultSchema.safeParse(coerced);
  if (!normalized.success) {
    return {
      ok: false,
      issues: normalized.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("\n"),
    };
  }

  const world = denormalizeGameSpec(normalized.data.game);
  const final = gameSpecSchema.safeParse(world);
  if (!final.success) {
    return {
      ok: false,
      issues: final.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("\n"),
    };
  }

  return {
    ok: true,
    value: {
      interpretationSummary: normalized.data.interpretationSummary,
      game: final.data,
    },
    debugTable: coordinateDebugTable(normalized.data.game, final.data),
  };
}

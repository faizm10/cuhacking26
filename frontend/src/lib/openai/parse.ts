import { clampRawSpec } from "@/lib/game/repair";
import {
  generationResultSchema,
  type GenerationResult,
} from "@/lib/game/schema";

export type ParsedModelOutput =
  | { ok: true; value: GenerationResult }
  | { ok: false; issues: string };

/**
 * Parse and validate raw model output text. Numeric values slightly outside
 * range are clamped before validation so trivia doesn't force a retry.
 */
export function parseModelOutput(text: string): ParsedModelOutput {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, issues: "Response was not valid JSON." };
  }
  const result = generationResultSchema.safeParse(clampRawSpec(json));
  if (!result.success) {
    return {
      ok: false,
      issues: result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("\n"),
    };
  }
  return { ok: true, value: result.data };
}

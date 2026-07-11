import { clampRawSpec } from "@/lib/game/repair";
import {
  refineResultSchema,
  type RefineResult,
} from "@/lib/game/refine-request";

export type ParsedRefineOutput =
  | { ok: true; value: RefineResult }
  | { ok: false; issues: string };

/**
 * Parse and validate refine-game model output. Numbers slightly out of range
 * are clamped before Zod so trivia doesn't force a retry.
 */
export function parseRefineOutput(text: string): ParsedRefineOutput {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, issues: "Response was not valid JSON." };
  }

  if (!json || typeof json !== "object") {
    return { ok: false, issues: "Response was not a JSON object." };
  }

  const raw = json as Record<string, unknown>;
  const clampedRoot = clampRawSpec({ game: raw.game ?? raw }) as {
    game?: unknown;
  };

  const result = refineResultSchema.safeParse({
    assistantMessage: raw.assistantMessage,
    game: clampedRoot.game,
  });

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

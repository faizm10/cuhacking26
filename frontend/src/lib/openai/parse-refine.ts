import { clampRawSpec, mergeGamePatch } from "@/lib/game/repair";
import {
  refineResultSchema,
  type RefineResult,
} from "@/lib/game/refine-request";
import type { GameSpec } from "@/lib/game/schema";

export type ParsedRefineOutput =
  | { ok: true; value: RefineResult }
  | { ok: false; issues: string };

/**
 * Parse and validate refine-game model output.
 * - Merges the AI draft onto the current GameSpec so required structure is kept
 * - Normalizes colors / clamps numbers before Zod
 * so trivia (like `#eee` colors) doesn't discard a good AI edit.
 */
export function parseRefineOutput(
  text: string,
  baseGame?: GameSpec
): ParsedRefineOutput {
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
  const patch = raw.game ?? raw;
  const mergedGame = baseGame
    ? mergeGamePatch(baseGame, patch)
    : patch;

  const clampedRoot = clampRawSpec({ game: mergedGame }) as {
    game?: unknown;
  };

  const assistantMessage =
    typeof raw.assistantMessage === "string" && raw.assistantMessage.trim()
      ? raw.assistantMessage.trim()
      : "Updated the game based on your request.";

  const result = refineResultSchema.safeParse({
    assistantMessage: assistantMessage.slice(0, 400),
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

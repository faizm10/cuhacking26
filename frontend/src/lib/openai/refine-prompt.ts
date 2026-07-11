import type { RefineGameRequest } from "@/lib/game/refine-request";
import { supportedGameTypes } from "@/lib/game/schema";

/**
 * Prompt for the post-generate game tuner. Output shape is enforced via
 * response JSON schema; this text steers small, targeted GameSpec edits.
 */

export const GAME_TUNER_SYSTEM_PROMPT = `You are a PlayBox game tuner. The player already has a working game JSON spec and wants a small change via chat.

YOUR JOB
- Apply the user's latest request to the current GameSpec.
- Prefer small, targeted edits over redesigning the whole game.
- Stay inside the supported templates: ${supportedGameTypes.join(", ")}.
- Keep the game playable: do not place the player inside walls/hazards; keep entity counts within schema limits; preserve win/lose conditions unless the user asks to change them.
- If the request is unclear, make the most reasonable small improvement and explain it in assistantMessage.
- If the user asks for something impossible in the schema (e.g. multiplayer, 3D), keep the game intact and explain the limitation in assistantMessage.

OUTPUT
- Return only structured data matching the schema: assistantMessage + game.
- assistantMessage: one or two friendly sentences describing what you changed (or why you couldn't).
- game: the full updated GameSpec (not a patch/diff).`;

export function buildRefineUserMessage(request: RefineGameRequest): string {
  const sections: string[] = [];

  if (request.interpretationSummary?.trim()) {
    sections.push(
      `ORIGINAL INTERPRETATION:\n${request.interpretationSummary.trim()}`
    );
  }

  sections.push(
    `CURRENT GAME SPEC (JSON):\n${JSON.stringify(request.gameSpec)}`
  );

  if (request.history.length > 0) {
    const transcript = request.history
      .map((turn) => `${turn.role.toUpperCase()}: ${turn.content}`)
      .join("\n");
    sections.push(`RECENT CHAT:\n${transcript}`);
  }

  sections.push(`USER REQUEST:\n"${request.message.trim()}"`);

  if (request.canvasImage) {
    sections.push(
      "A screenshot of the player's current sketch is attached for optional layout context. Do not redesign from the sketch unless the user asks — apply their chat request to the GameSpec."
    );
  }

  return sections.join("\n\n");
}

export function buildRefineRepairMessage(issues: string): string {
  return `Your previous response failed validation:\n${issues}\n\nReturn the corrected structured data only (assistantMessage + full game). Keep the same intent, fix every issue, and use only schema-supported values.`;
}

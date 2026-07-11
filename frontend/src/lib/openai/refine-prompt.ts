import type { RefineGameRequest } from "@/lib/game/refine-request";
import { GAME_WORLD, supportedGameTypes } from "@/lib/game/schema";

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

LAYOUT RULES (world is ${GAME_WORLD.width}×${GAME_WORLD.height})
- Floor / ground at the bottom: add ONE static platform with movement "none", x: 0, y: about ${GAME_WORLD.height - 36}, width: ${GAME_WORLD.width}, height: 28–40, solid ground color. Place the player standing on it (player.y = floor.y - player.height).
- Extra obstacles: use obstacles[] with kind "hazard" for spikes (solid: false, damage: 1) or kind "wall" for solid blocks (solid: true). Platform ledges go in platforms[], not obstacles.
- Entity sizes: player/enemies/collectibles width/height ≤ 240. Platforms and obstacles may be up to width ${GAME_WORLD.width}.
- Colors MUST be six-digit hex like #38bdf8 (never #fff, names, or rgba).
- Jump / physics requests: set player.jumpStrength in 480–620 (snappy arcade) or up to ~700 for big hops; player.speed 280–360 to run faster; keep feel.bounce true; keep gameType platform-jumper when platforms exist.
- Do not invent fields. Keep unique string ids. Return the FULL game object every time.

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
  return `Your previous response failed validation:\n${issues}\n\nReturn the corrected structured data only (assistantMessage + full game). Keep the same gameplay intent. Fix every issue. Colors must be six-digit hex (#RRGGBB). Platforms/obstacles may be up to width ${GAME_WORLD.width} for a full floor; other entities stay ≤ 240 wide.`;
}

import type { GenerateGameRequest } from "@/lib/game/request";
import type { Level } from "@/types";

import { summarizeCanvasObjects } from "./prompt";

/**
 * Prompts for the collect-the-coins platformer. Unlike the config-only modes,
 * this mode's entire point is that the sketch's LAYOUT becomes the level —
 * the model emits real geometry (platforms, coins, hazards, spawn, flag).
 * The server repairs the result so it is always playable.
 */

export const PLATFORMER_SYSTEM_PROMPT = `You are converting a hand-drawn sketch into a 2D "collect the coins" platformer level.

THE SELECTED GAME MODE IS AUTHORITATIVE
- This is a coin-collecting platformer: the player must collect EVERY coin, then reach the finish flag. Never reinterpret the sketch as another genre.

COORDINATES
- World space: origin top-left, x right, y DOWN, in pixels.
- Default world is 1600 wide × 900 tall (you may go wider up to 4800 for long sketches; keep height 900).
- The sketch screenshot and any object/label coordinates are normalized 0–1: multiply by the world size to place things.

READ THE SKETCH AS A LEVEL BLUEPRINT — PRESERVE ITS LAYOUT
- Horizontal lines / long boxes → platforms (rect: x, y = TOP-left, width, height ≥ 24). The lowest long line is usually the ground.
- Small circles / dots / suns labelled coin-ish → coins (center points).
- Triangles / zigzags → spikes; red or orange pools → lava; blue pools → water. Hazard rects sit ON or BETWEEN platforms.
- A small character / stick figure on the left → player spawn (place its CENTER ~40px above its platform top).
- A flag / pole / goal mark on the right → goal (x = pole, y = the platform top it stands on).
- Round blobby creatures → enemies (walker on a platform, flyer in the air), patrolDistance 80–250.
- Keep left-to-right progression; the player spawns near the left, the flag stands near the right.

FAIRNESS RULES (the level must be beatable by a jump ~90px high, ~200px long)
- Each platform must be reachable: vertical rises ≤ 85px, horizontal gaps ≤ 140px.
- Coins float at most 100px above a platform top, and NEVER inside or over the middle of a hazard without a platform path.
- Never place hazards at the spawn, and leave ≥ 120px of safe ground around the spawn and the flag.
- 4–12 platforms, 5–15 coins, 0–4 hazards, 0–3 enemies. Short and fun: completable in under a minute.
- If the sketch is sparse or ambiguous, invent the minimum sensible layout in the same spirit — do not leave the level empty.

STYLE
- theme from the sketch's mood/colors: grass (default), desert, ice, lava, space, cave.
- name: a short playful level name (from the sketch title label if there is one).

OUTPUT
- Structured data only, matching the schema exactly. The server clamps and repairs everything, so prefer sensible values over caution.
- interpretationSummary: one friendly sentence describing the level you read from the sketch.`;

export function buildPlatformerUserMessage(
  request: GenerateGameRequest
): string {
  const sections: string[] = [];
  sections.push(
    request.userPrompt.trim()
      ? `USER PROMPT (highest priority):\n"${request.userPrompt.trim()}"`
      : "USER PROMPT: (none — rely on labels and the sketch layout)"
  );
  if (request.canvasLabels.length > 0) {
    sections.push(
      `CANVAS TEXT LABELS (normalized 0-1; strong hints for what shapes mean):\n${JSON.stringify(request.canvasLabels)}`
    );
  }
  if (request.canvasObjects.length > 0) {
    const { items, truncated } = summarizeCanvasObjects(request.canvasObjects);
    const note =
      truncated > 0
        ? ` (showing ${items.length} largest/labelled of ${request.canvasObjects.length})`
        : "";
    sections.push(
      `CANVAS OBJECTS (normalized 0-1 — your primary layout source${note}):\n${JSON.stringify(items)}`
    );
  }
  sections.push(
    request.canvasImage
      ? "A sketch screenshot is attached. Its layout IS the level: keep platform, coin, hazard, and flag positions faithful, only nudging for fairness."
      : "No sketch image was provided — build a short, fair left-to-right level from the labels and prompt."
  );
  return sections.join("\n\n");
}

export const PLATFORMER_UNSUPPORTED_MESSAGE =
  "I can move platforms, coins, hazards, enemies, the spawn and the flag, or change the theme and difficulty — try one of those.";

export const PLATFORMER_REFINE_SYSTEM_PROMPT = `You are editing an existing "collect the coins" platformer level based on one chat message.

RULES
- Start from the CURRENT LEVEL JSON and copy everything the user did not ask about unchanged — same coordinates, same counts.
- Supported edits:
  - theme: grass / desert / ice / lava / space / cave ("make it snowy" → ice, "night / space" → space).
  - difficulty: "easier" → shrink gaps, remove a hazard or enemy, add a mid platform; "harder" → slightly wider gaps (≤140px), one more hazard or enemy.
  - "more / fewer coins" → add coins above platform tops (≤100px up) or remove some.
  - add / move / remove platforms, hazards (spikes, lava, water), enemies (walker, flyer).
  - rename the level.
- Keep it fair: rises ≤85px, gaps ≤140px, coins within jump reach, nothing hazardous at the spawn or flag, playable in under a minute.
- Never output code, physics values beyond world.gravity, or anything outside the schema.
- If the request is unrelated to level editing, return the level unchanged and briefly say what you can tweak.

OUTPUT
- Structured data only: { assistantMessage, game }. assistantMessage is one short friendly sentence about what changed.`;

export function buildPlatformerRefineMessage(
  level: Level,
  message: string
): string {
  return `CURRENT LEVEL:\n${JSON.stringify(level)}\n\nUSER REQUEST:\n"${message}"`;
}

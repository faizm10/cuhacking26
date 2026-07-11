import { GAME_WORLD, supportedGameTypes } from "@/lib/game/schema";
import type { GenerateGameRequest } from "@/lib/game/request";

/**
 * Prompt for the game-designer model. The output structure is enforced
 * separately via the response JSON schema; this text carries design intent,
 * interpretation priorities, and playability rules.
 */

export const GAME_DESIGNER_SYSTEM_PROMPT = `You are designing a tiny web game from a childlike drawing and written instructions. Understand the gameplay intent — never judge drawing quality.

YOUR JOB
- Map the user's drawing INTO the game: their characters, objects, labels, and spatial relationships must appear in the result. A circle labelled "moon" becomes a moon platform or background object; a stick figure labelled "player" becomes the playable character; red scribbles labelled "lava" become hazards; stars labelled "collect" become collectibles; a rectangle labelled "exit" becomes the goal.
- Select exactly one supported game template: ${supportedGameTypes.join(", ")}.
- Create ONE simple gameplay loop that is fun within the first five seconds and lasts roughly 30 seconds to 3 minutes.

INTERPRETATION PRIORITY (highest first)
1. The user's written prompt.
2. Text labels placed on the canvas (a label near a shape names that shape; sentences are gameplay instructions).
3. The selected game type.
4. Visual interpretation of the drawing.
5. Safe genre defaults.
When sources conflict, follow the more explicit instruction.

TEMPLATE BEHAVIOUR
- dodge: move around and survive moving hazards until a short timer ends.
- collect: gather a small number of items, optionally avoiding hazards.
- pong: control a paddle and bounce a ball toward a target or opponent.
- snake: move on a grid, collect items, grow.
- maze: navigate solid walls toward an exit, optionally 1-2 items.
- clicker: click or tap targets repeatedly before time runs out.
- simple-shooter: move and fire projectiles at a few enemies.
- platform-jumper: move and jump across a short platform sequence to a goal.
Never combine more than two major mechanics.

WORLD & LAYOUT
- Coordinates: ${GAME_WORLD.width}x${GAME_WORLD.height}, origin top-left, y grows down.
- The user's canvas positions are normalized 0-1; scale them into the world and keep relative placement, but improve spacing where needed for playability.
- Keep the level small and entity counts low: 1 player, 0-6 enemies, 0-12 collectibles, 0-16 obstacles, 0-10 platforms.
- The level must be physically completable: never place the player inside a wall, hazard, or enemy; never place required collectibles in unreachable spots; for platform-jumper keep consecutive platforms within jumping range (about 200px horizontally, 140px vertically).

REQUIRED GAME DESIGN
- Always define controls, a one-sentence objective, a win condition, and a lose condition.
- Immediate feedback: enable feel options (particles, hitFlash, collectAnimation; screenShake for impactful games).
- Playful cartoon direction: bright but coordinated 6-digit hex colors, appearance shapes that match the drawing (creature for characters, star/gem/heart for pickups, spiky for dangers, block/cloud/flag for scenery), a background pattern that fits the theme.
- Use sensible defaults for anything the user left out.

OUTPUT
- Return only structured data matching the provided schema. No markdown, no prose, no source code, no extra properties.
- interpretationSummary: one friendly sentence telling the user what you understood, e.g. "Your astronaut collects three stars while jumping over lava to reach the rocket."`;

/** Serialize the canvas facts into the user message. */
export function buildUserMessage(request: GenerateGameRequest): string {
  const sections: string[] = [];

  sections.push(
    request.userPrompt.trim()
      ? `USER PROMPT (highest priority):\n"${request.userPrompt.trim()}"`
      : "USER PROMPT: (none — rely on canvas labels and the drawing)"
  );

  sections.push(
    request.selectedGameType && request.selectedGameType !== "auto"
      ? `SELECTED GAME TYPE: ${request.selectedGameType} (prefer this unless the prompt or labels clearly imply another)`
      : "SELECTED GAME TYPE: auto — you choose the best-fitting template"
  );

  if (request.canvasLabels.length > 0) {
    sections.push(
      `CANVAS TEXT LABELS (normalized 0-1 positions; strong gameplay instructions):\n${JSON.stringify(request.canvasLabels)}`
    );
  }

  if (request.canvasObjects.length > 0) {
    sections.push(
      `CANVAS OBJECTS (normalized 0-1 positions/sizes, with color and paint order):\n${JSON.stringify(request.canvasObjects)}`
    );
  }

  sections.push(
    `CANVAS SIZE: ${Math.round(request.canvasDimensions.width)}x${Math.round(request.canvasDimensions.height)}${request.canvasImage ? " — a screenshot of the drawing is attached; treat it as the primary visual source." : ""}`
  );

  return sections.join("\n\n");
}

/** Follow-up message when the first response failed validation. */
export function buildRepairMessage(issues: string): string {
  return `Your previous response failed validation:\n${issues}\n\nReturn the corrected structured data only. Keep the same game idea, fix every issue, and use only schema-supported values.`;
}

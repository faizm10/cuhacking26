import { GAME_WORLD, supportedGameTypes } from "@/lib/game/schema";
import type {
  CanvasObject,
  GenerateGameRequest,
} from "@/lib/game/request";

/**
 * Prompt for the game-designer model. The output structure is enforced
 * separately via the response JSON schema; this text carries design intent,
 * interpretation priorities, and playability rules.
 */

const MAX_CANVAS_OBJECTS_IN_PROMPT = 48;
const MIN_OBJECT_AREA = 0.0004; // drop tiny strokes (~2%×2% of canvas)

export const GAME_DESIGNER_SYSTEM_PROMPT = `You are designing a tiny web game from a childlike drawing and written instructions. Never judge drawing quality.

YOUR JOB
- Map the drawing INTO the game: labelled shapes become matching entities (player, hazards, collectibles, goal/platforms).
- Pick exactly one template: ${supportedGameTypes.join(", ")}.
- One simple loop that is fun in five seconds and lasts ~30s–3min.

INTERPRETATION PRIORITY (highest first)
1. Written prompt  2. Canvas text labels  3. Selected game type  4. Drawing  5. Genre defaults

TEMPLATES (pick one; do not mash more than two mechanics)
dodge=survive hazards · collect=gather items · pong=paddle+ball · snake=grid grow · maze=walls to exit · clicker=tap targets · simple-shooter=move+shoot · platform-jumper=jump to goal

COORDINATES (critical)
- Output NORMALIZED coordinates ONLY: every x, y, width, height is 0–1. Never output pixel values.
- (x, y) is ALWAYS the top-left corner of the object. Origin is the top-left of the drawing; y grows downward. Do not flip any axis: an object drawn near the bottom has y near 1 and must stay near 1.
- Typical sizes as fractions: player ≈ 0.04–0.08 wide, a platform ≈ 0.12–0.35 wide and ≈ 0.04–0.08 tall, a collectible ≈ 0.03.

THE SKETCH LAYOUT IS AUTHORITATIVE
- Each canvas object's normalized position is where its game entity belongs. Keep every entity within ±0.10 of its drawn position; only nudge spacing for playability.
- Never relocate the whole level, mirror it, or move bottom objects to the top.
- Preserve left-to-right progression when the drawing has one.

WORLD
- The renderer scales your 0–1 layout onto a ${GAME_WORLD.width}×${GAME_WORLD.height} screen.
- Small counts: 1 player, ≤6 enemies, ≤12 collectibles, ≤16 obstacles, ≤10 platforms.
- Platform-jumper: only add a floor platform when the drawing clearly shows ground — never replace drawn platforms with a generic floor. Keep jumps short (next platform within ~0.2 horizontally, ~0.2 higher vertically). player.speed 280–360, jumpStrength 480–620 (these two stay in px/s).
- Never spawn the player inside walls/hazards/enemies; the player starts standing ON its drawn platform.

DESIGN
- Controls, one-sentence objective, win + lose conditions.
- Enable feel (particles, hitFlash, collectAnimation; screenShake when impactful).
- Cartoon look: 6-digit hex colors only (#RRGGBB), matching appearances (creature/star/gem/spiky/flag/block…).

OUTPUT
- Structured data only (schema). interpretationSummary = one friendly sentence of what you understood.`;

/** Prefer large labelled shapes; drop microscopic strokes that bloat the prompt. */
export function summarizeCanvasObjects(
  objects: CanvasObject[],
  limit = MAX_CANVAS_OBJECTS_IN_PROMPT
): { items: CanvasObject[]; truncated: number } {
  const filtered = objects.filter(
    (obj) => obj.width * obj.height >= MIN_OBJECT_AREA || Boolean(obj.text?.trim())
  );
  const ranked = [...filtered].sort((a, b) => {
    const areaA = a.width * a.height + (a.text ? 0.05 : 0);
    const areaB = b.width * b.height + (b.text ? 0.05 : 0);
    return areaB - areaA;
  });
  const items = ranked.slice(0, limit);
  return { items, truncated: Math.max(0, objects.length - items.length) };
}

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
      `CANVAS TEXT LABELS (normalized 0-1; strong gameplay instructions):\n${JSON.stringify(request.canvasLabels)}`
    );
  }

  if (request.canvasObjects.length > 0) {
    const { items, truncated } = summarizeCanvasObjects(request.canvasObjects);
    const note =
      truncated > 0
        ? ` (showing ${items.length} largest/labelled of ${request.canvasObjects.length}; screenshot is the visual source)`
        : " (screenshot is the primary visual source; this list is compact layout hints)";
    sections.push(
      `CANVAS OBJECTS${note}:\n${JSON.stringify(items)}`
    );
  }

  sections.push(
    `CANVAS SIZE: ${Math.round(request.canvasDimensions.width)}x${Math.round(request.canvasDimensions.height)}${request.canvasImage ? " — a low-detail screenshot is attached." : ""}`
  );

  return sections.join("\n\n");
}

/** Follow-up message when the first response failed validation. */
export function buildRepairMessage(issues: string): string {
  return `Your previous response failed validation:\n${issues}\n\nReturn the corrected structured data only. Keep the same game idea, fix every issue, and use only schema-supported values. Colors must be six-digit hex (#RRGGBB).`;
}

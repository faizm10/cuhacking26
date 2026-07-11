import { GAME_WORLD, supportedGameTypes, type SupportedGameType } from "../schema/game.js";
import { extractAnnotations, summarizeShapes } from "../../../utils/shapes.js";

interface GamePromptInput {
  prompt: string;
  shapes: Record<string, unknown>[];
  hasScreenshot: boolean;
  selectedGameType?: SupportedGameType;
}

export function buildGamePrompt({
  prompt,
  shapes,
  hasScreenshot,
  selectedGameType,
}: GamePromptInput): string {
  const annotations = extractAnnotations(shapes);
  const sections: string[] = [];

  sections.push(`You are PlayBox's game designer. Convert a user's rough sketch, text labels, and written description into one small polished playable game specification.

SUPPORTED GAME TYPES
${supportedGameTypes.map((type) => `- ${type}`).join("\n")}

SUPPORTED SYSTEMS ONLY
- player movement
- keyboard controls
- mouse controls
- touch controls
- collision detection
- enemy movement
- collectible handling
- projectiles
- score tracking
- lives
- timer
- win and lose screens
- restart
- pause
- basic particles
- simple animations

STRICT OUTPUT RULES
- Return valid JSON only. No markdown, comments, code fences, or prose.
- Never return JavaScript, HTML, CSS, JSX, or instructions to execute code.
- Use the provided schema exactly.
- Keep entity counts low: usually 1 player, 0-6 enemies, 0-12 collectibles, 0-16 obstacles, 0-10 platforms.
- Keep the game minimal and immediately understandable.
- Do not add mechanics the user did not request unless needed for a playable win/lose loop.
- Always include a clear objective, controls, win condition, and lose condition.
- Use polished but simple colors and readable labels.
- Use a ${GAME_WORLD.width}x${GAME_WORLD.height} coordinate system with origin at the top-left.
- Place all entities fully inside the game bounds.`);

  if (selectedGameType) {
    sections.push(`OPTIONAL SELECTED GAME TYPE
The user selected "${selectedGameType}". Prefer this type unless the sketch and description clearly imply another supported type.`);
  }

  if (hasScreenshot) {
    sections.push(
      "A screenshot of the sketch is attached. Use it as the primary visual source of truth, then reconcile it with the text labels and shape data."
    );
  }

  if (annotations.length > 0) {
    sections.push(
      `TEXT LABELS FROM THE CANVAS
Text labels are high-priority gameplay hints. A label near a shape usually names that object or explains its behavior. Honor every meaningful label.
${JSON.stringify(annotations)}`
    );
  }

  if (shapes.length > 0) {
    sections.push(
      `SIMPLIFIED CANVAS SHAPES
Use positions, sizes, colors, and geometry to infer entity placement.
${JSON.stringify(summarizeShapes(shapes))}`
    );
  }

  if (prompt.trim()) {
    sections.push(`USER GAME DESCRIPTION
"${prompt.trim()}"`);
  }

  sections.push(`TEMPLATE GUIDANCE
- dodge: player avoids moving enemies or hazards until timer/score target.
- collect: player gathers collectibles while avoiding hazards.
- pong: two paddles and a ball; use obstacles/enemies only if requested.
- snake: player is a grid-like snake collecting food; avoid walls/body.
- maze: player navigates walls to reach a goal or collect an item.
- clicker: primary action is clicking/tapping collectibles or targets.
- simple-shooter: player shoots enemies/projectiles; include cooldown.
- platform-jumper: player moves and jumps across platforms to a goal.

If the sketch is ambiguous, choose the simplest type that matches the description.`);

  return sections.join("\n\n");
}

export function buildGameRepairPrompt(issues: string): string {
  return `Your previous game JSON failed validation with these issues:\n${issues}\n\nReturn a corrected game specification as valid JSON only. Keep the same intent, use only supported game systems, and satisfy every schema requirement.`;
}

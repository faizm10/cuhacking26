import { DEFAULT_WORLD } from "../schemas/level.js";
import { summarizeShapes } from "../utils/shapes.js";

interface LevelPromptInput {
  prompt: string;
  shapes: Record<string, unknown>[];
  hasScreenshot: boolean;
}

/**
 * Instruction text sent to Gemini alongside the (optional) canvas screenshot.
 * The output shape itself is enforced separately via responseJsonSchema.
 */
export function buildLevelPrompt({
  prompt,
  shapes,
  hasScreenshot,
}: LevelPromptInput): string {
  const sections: string[] = [];

  sections.push(
    `You are a 2D platformer level designer. A player has sketched a game level on a whiteboard canvas. Convert their sketch into a structured level definition.

COORDINATE SYSTEM
- Origin is the top-left corner; x grows right, y grows down (same as the sketch).
- Default world is ${DEFAULT_WORLD.width}x${DEFAULT_WORLD.height} with gravity ${DEFAULT_WORLD.gravity}. Scale the sketch layout proportionally into the world bounds, preserving relative positions and sizes.

HOW TO READ THE SKETCH
- Long/wide rectangles and horizontal strokes are platforms.
- Jagged or spiky marks are spike hazards; red or orange areas are lava; blue areas are water.
- Small circles or dots are coins.
- A stick figure, "P", or a small figure on the left is the player start.
- A flag, star, door, or "G" is the goal.
- Simple creatures or "E" marks are enemies (walker on platforms, flyer in the air).
- Written words on the canvas are design intent — follow them.

PLAYABILITY RULES (must hold)
- player and goal must each stand on or near a platform, not float in a hazard.
- The goal must be reachable: consecutive platforms no more than 260 apart horizontally or 180 vertically.
- Nothing outside world bounds. Hazards go on or between platforms, never covering the player start.
- Coins trace the intended path. Keep the level fun for a 30-60 second run.`
  );

  if (hasScreenshot) {
    sections.push(
      "A screenshot of the sketch is attached. Treat it as the primary source of truth."
    );
  }

  if (shapes.length > 0) {
    sections.push(
      `Structured shape data from the drawing tool (positions in canvas pixels):\n${JSON.stringify(summarizeShapes(shapes))}`
    );
  }

  if (prompt.trim().length > 0) {
    sections.push(`The player also asked for: "${prompt.trim()}"`);
  }

  sections.push(
    "Respond with the level as JSON only, matching the provided schema exactly."
  );

  return sections.join("\n\n");
}

/** Appended when the first response failed validation and we retry once. */
export function buildRepairPrompt(issues: string): string {
  return `Your previous level JSON failed validation with these issues:\n${issues}\n\nFix every issue and respond with the corrected level as JSON only.`;
}

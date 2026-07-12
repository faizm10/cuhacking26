import type { GenerateGameRequest } from "@/lib/game/request";
import type { FlappySpec } from "@/components/game/flappy/flappyTypes";

/**
 * Prompts for Flappy Bird generation and chat-refine. The model ONLY configures
 * the game — it never writes physics, movement, collision, rendering, a game
 * loop, or level geometry. The dedicated engine builds the playable level from
 * these tuning values.
 */

export const FLAPPY_SYSTEM_PROMPT = `You are configuring a polished Flappy Bird game from a hand-drawn sketch and written instructions.

THE SELECTED GAME MODE IS AUTHORITATIVE
- This is Flappy Bird. Never reinterpret the sketch as a platformer, maze, shooter, or any other genre.

WHAT TO INFER FROM THE SKETCH AND PROMPT
- theme (cartoon / pixel / retro / minimal)
- birdColor and pipeColor (pick from the allowed palette)
- background time of day (day / night / sunset / dawn)
- weather decoration (none / snow / rain)
- difficulty, expressed ONLY through the numeric tuning fields:
  - pipeGap: bigger = easier (more room to fly through)
  - pipeSpacing: bigger = easier (more time between pipes)
  - scrollSpeed: bigger = harder (world moves faster)
  - gravity: bigger = harder (falls faster)
  - flapStrength: more negative = stronger flap
- Canvas text labels and the written prompt override guesses from the drawing.

WHAT YOU MUST NOT DO
- Do NOT output pipe coordinates, pipe heights, gap positions, or any level geometry — the engine generates and validates all pipes so the level is always beatable.
- Do NOT output physics code, movement code, collision code, rendering code, a game loop, HTML, URLs, scripts, or any arcade mechanic (lives, timers, enemies, scores).
- Do NOT invent fields or enum values outside the schema.

OUTPUT
- Structured data only, matching the schema exactly. Every numeric value is clamped to a safe, always-playable range on the server, so just choose sensible values.
- interpretationSummary: one friendly sentence, e.g. "A cheerful daytime Flappy Bird with a yellow bird and green pipes at a relaxed pace."`;

export function buildFlappyUserMessage(request: GenerateGameRequest): string {
  const sections: string[] = [];
  sections.push(
    request.userPrompt.trim()
      ? `USER PROMPT (highest priority):\n"${request.userPrompt.trim()}"`
      : "USER PROMPT: (none — rely on labels and the sketch's look)"
  );
  if (request.canvasLabels.length > 0) {
    sections.push(
      `CANVAS TEXT LABELS:\n${JSON.stringify(
        request.canvasLabels.map((label) => label.text)
      )}`
    );
  }
  sections.push(
    request.canvasImage
      ? "A sketch screenshot is attached. Read its bird, pipes, clouds, ground, colors, and mood to choose theme, colors, background, weather, and difficulty. Ignore exact positions — the engine builds the level."
      : "No sketch image was provided — use cheerful daytime defaults."
  );
  return sections.join("\n\n");
}

export const FLAPPY_REFINE_SYSTEM_PROMPT = `You are tweaking the configuration of an existing Flappy Bird game based on one chat message.

RULES
- Only change fields the user asked about; copy everything else from the current config unchanged.
- Supported changes and how to express them:
  - "make the pipes wider" → there is no width field; instead widen the gap is different. Pipe body width is fixed by the engine. If asked to widen pipes, politely note width is automatic and, if they mean easier, increase pipeGap.
  - "make the gaps easier / bigger" → increase pipeGap. "harder / tighter" → decrease pipeGap.
  - "make the bird flap higher / stronger" → make flapStrength more negative. "weaker" → less negative.
  - "speed up / faster" → increase scrollSpeed. "slow down / slower" → decrease scrollSpeed (and optionally gravity).
  - "more / less gravity", "floatier" → decrease gravity, "heavier" → increase gravity.
  - "more space between pipes" → increase pipeSpacing.
  - colors: birdColor, pipeColor (from the allowed palette).
  - "change to sunset / night / dawn / day" → background.
  - "add snow / rain", "remove weather" → weather.
  - theme, title, sound, clouds, parallax, movingPipes toggles.
- Never add lives, timers, enemies, platforms, scores, physics code, or level geometry.
- All numbers are clamped server-side to safe ranges — just move them in the right direction.
- If the request is unrelated to Flappy Bird configuration, return the config unchanged and briefly say what you can tweak.

OUTPUT
- Structured data only: { assistantMessage, game }. assistantMessage is one short friendly sentence about what changed.`;

export function buildFlappyRefineMessage(
  spec: FlappySpec,
  message: string
): string {
  return `CURRENT FLAPPY BIRD CONFIG:\n${JSON.stringify(spec)}\n\nUSER REQUEST:\n"${message}"`;
}

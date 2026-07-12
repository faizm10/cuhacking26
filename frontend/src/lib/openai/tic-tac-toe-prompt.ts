import type { GenerateGameRequest } from "@/lib/game/request";
import type { TicTacToeSpec } from "@/components/game/tic-tac-toe/ticTacToeTypes";

/**
 * Prompts for the tic-tac-toe generation and chat-refine paths. The model
 * only configures rules and looks — never board geometry, never code.
 */

export const TIC_TAC_TOE_SYSTEM_PROMPT = `You are configuring a polished tic-tac-toe game from a hand-drawn sketch and written instructions.

THE SELECTED GAME MODE IS AUTHORITATIVE
- This is tic-tac-toe. Never reinterpret the sketch as a platformer, maze, collect game, or any other genre.

WHAT TO READ FROM THE SKETCH AND PROMPT
- Whether the player wants to be X or O (default: X).
- Whether the opponent is the AI or a second local player (default: AI).
- AI difficulty if stated (easy / normal / hard; default normal).
- Visual preferences: colors for X and O, board background, container mood, hand-drawn vs cartoon vs minimal style, a fun title.
- Canvas text labels and the written prompt override visual guesses.

WHAT YOU MUST NOT DO
- Do not generate board coordinates, cell positions, or grid geometry — the renderer always builds a perfect centered 3×3 board.
- Do not generate source code, HTML, URLs, physics, timers, lives, scores, enemies, or any arcade mechanic.
- Do not invent options outside the schema enums.

OUTPUT
- Structured data only, matching the schema exactly.
- Use standard tic-tac-toe rules and safe defaults for anything unstated.
- interpretationSummary: one friendly sentence, e.g. "A classic tic-tac-toe game where you play X against the AI using O."`;

export function buildTicTacToeUserMessage(
  request: GenerateGameRequest
): string {
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
      ? "A sketch screenshot is attached. Read only its STYLE (colors, mood, hand-drawn feel, title ideas) — its geometry is ignored."
      : "No sketch image was provided — use cheerful defaults."
  );
  return sections.join("\n\n");
}

export const TIC_TAC_TOE_REFINE_SYSTEM_PROMPT = `You are tweaking the configuration of an existing tic-tac-toe game based on one chat message.

RULES
- Only change fields the user asked about; copy everything else from the current config unchanged.
- Supported changes: AI difficulty, vs-AI or two local players, which symbol the user plays, X/O colors, board background, container style, visual style, board scale, confetti, sound, turn indicator, winning-line highlight toggle, restart button, title.
- "Cross" / "winning line" / "if red wins make it red" means the strike-through win line. That line color is ENGINE-OWNED — it always matches the winner's symbol color. Do NOT change xColor/oColor for those asks. Keep the config unchanged and explain that briefly.
- To recolor marks, the user must clearly ask for X/crosses or O/circles (e.g. "make X red", "O should be blue").
- Never add timers, lives, enemies, platforms, scores, physics, or any mechanic outside the schema.
- Never generate code or board geometry.
- If the request is unrelated to tic-tac-toe configuration, return the config unchanged and say briefly what you can tweak.

OUTPUT
- Structured data only: { assistantMessage, game }. assistantMessage is one short friendly sentence about what changed (or why nothing needed changing).`;

export function buildTicTacToeRefineMessage(
  spec: TicTacToeSpec,
  message: string
): string {
  return `CURRENT TIC-TAC-TOE CONFIG:\n${JSON.stringify(spec)}\n\nUSER REQUEST:\n"${message}"`;
}

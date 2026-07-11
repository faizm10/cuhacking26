import type { TicTacToeSpec } from "@/components/game/tic-tac-toe/ticTacToeTypes";
import type { RefineHistoryItem } from "@/lib/game/refine-request";
import type { GameSpec } from "@/lib/game/schema";

/**
 * Clients for POST /api/refine-game (arcade) and POST /api/refine-tic-tac-toe.
 */

export interface RefineGameInput {
  message: string;
  gameSpec: GameSpec;
  interpretationSummary?: string;
  canvasImage?: string | null;
  history?: RefineHistoryItem[];
}

export interface RefineGameResult {
  gameSpec: GameSpec;
  assistantMessage: string;
  warnings: string[];
}

export interface RefineTicTacToeInput {
  message: string;
  spec: TicTacToeSpec;
  history?: RefineHistoryItem[];
}

export interface RefineTicTacToeResult {
  spec: TicTacToeSpec;
  assistantMessage: string;
  warnings: string[];
}

interface ApiFailure {
  success: false;
  error?: { code?: string; message?: string };
}

export async function refineGame(
  input: RefineGameInput
): Promise<RefineGameResult> {
  const response = await fetch("/api/refine-game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: input.message,
      gameSpec: input.gameSpec,
      interpretationSummary: input.interpretationSummary,
      canvasImage: input.canvasImage ?? null,
      history: input.history ?? [],
    }),
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("The game tuner sent back an unreadable response.");
  }

  const result = body as { success?: boolean } & Partial<RefineGameResult> &
    ApiFailure;

  if (!response.ok || !result.success) {
    throw new Error(
      result.error?.message ?? "Could not apply that change. Please try again."
    );
  }

  if (!result.gameSpec) {
    throw new Error("The game tuner returned an empty game.");
  }

  return {
    gameSpec: result.gameSpec,
    assistantMessage: result.assistantMessage ?? "Done — I updated the game.",
    warnings: result.warnings ?? [],
  };
}

/** Chat edits for a live tic-tac-toe game — only supported config fields. */
export async function refineTicTacToe(
  input: RefineTicTacToeInput
): Promise<RefineTicTacToeResult> {
  const response = await fetch("/api/refine-tic-tac-toe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: input.message,
      gameSpec: input.spec,
      history: input.history ?? [],
    }),
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("The tic-tac-toe tuner sent back an unreadable response.");
  }

  const result = body as {
    success?: boolean;
    gameSpec?: TicTacToeSpec;
    assistantMessage?: string;
    warnings?: string[];
  } & ApiFailure;

  if (!response.ok || !result.success) {
    throw new Error(
      result.error?.message ?? "Could not apply that change. Please try again."
    );
  }

  if (!result.gameSpec) {
    throw new Error("The tic-tac-toe tuner returned an empty config.");
  }

  return {
    spec: result.gameSpec,
    assistantMessage: result.assistantMessage ?? "Done — I updated the game.",
    warnings: result.warnings ?? [],
  };
}

import type { CanvasLabel, CanvasObject } from "@/lib/game/request";
import type { GeneratedGame } from "@/lib/game/generated";

/**
 * Client for POST /api/generate-game (same-origin Next.js route). The OpenAI
 * key lives server-side only — nothing secret happens here.
 */

export interface GenerateGameInput {
  canvasImage: string | null;
  canvasObjects: CanvasObject[];
  canvasLabels: CanvasLabel[];
  userPrompt: string;
  selectedGameType: string;
  canvasDimensions: { width: number; height: number };
}

export type GenerateGameResult = GeneratedGame & {
  interpretationSummary: string;
  warnings: string[];
};

interface ApiFailure {
  success: false;
  error?: { code?: string; message?: string };
}

export async function generateGame(
  input: GenerateGameInput
): Promise<GenerateGameResult> {
  const response = await fetch("/api/generate-game", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("The game generator sent back an unreadable response.");
  }

  const result = body as { success?: boolean } & Partial<GenerateGameResult> &
    ApiFailure;

  if (!response.ok || !result.success) {
    throw new Error(
      result.error?.message ?? "Game generation failed. Please try again."
    );
  }

  if (!result.gameSpec) {
    throw new Error("The game generator returned an empty game.");
  }

  return {
    rendererType: result.rendererType ?? "arcade",
    gameSpec: result.gameSpec,
    interpretationSummary: result.interpretationSummary ?? "",
    warnings: result.warnings ?? [],
  } as GenerateGameResult;
}

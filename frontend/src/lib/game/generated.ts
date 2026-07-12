import type { FlappySpec } from "@/components/game/flappy/flappyTypes";
import type { TicTacToeSpec } from "@/components/game/tic-tac-toe/ticTacToeTypes";
import type { Level } from "@/types";
import type { GameSpec } from "./schema";

/**
 * Game-family selection: each renderer type owns its spec shape and its
 * renderer component. The generation API returns `rendererType` so clients
 * never guess from spec contents.
 */

export type RendererType =
  | "arcade"
  | "tic-tac-toe"
  | "flappy-bird"
  | "platformer";

export type GeneratedGame =
  | { rendererType: "arcade"; gameSpec: GameSpec }
  | { rendererType: "tic-tac-toe"; gameSpec: TicTacToeSpec }
  | { rendererType: "flappy-bird"; gameSpec: FlappySpec }
  | { rendererType: "platformer"; gameSpec: Level };

/**
 * An explicit dedicated-mode selection is authoritative: it always maps to
 * that mode's renderer, never to an arcade reinterpretation of the sketch.
 */
export function rendererTypeForMode(
  selected: string | undefined | null
): RendererType {
  if (selected === "tic-tac-toe") return "tic-tac-toe";
  if (selected === "flappy-bird") return "flappy-bird";
  if (selected === "platformer") return "platformer";
  return "arcade";
}

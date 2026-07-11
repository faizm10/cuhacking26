import type { TicTacToeSpec } from "@/components/game/tic-tac-toe/ticTacToeTypes";
import type { GameSpec } from "./schema";

/**
 * Game-family selection: each renderer type owns its spec shape and its
 * renderer component. The generation API returns `rendererType` so clients
 * never guess from spec contents.
 */

export type RendererType = "arcade" | "tic-tac-toe";

export type GeneratedGame =
  | { rendererType: "arcade"; gameSpec: GameSpec }
  | { rendererType: "tic-tac-toe"; gameSpec: TicTacToeSpec };

/**
 * An explicit tic-tac-toe selection is authoritative: it always maps to the
 * dedicated renderer, never to an arcade reinterpretation.
 */
export function rendererTypeForMode(
  selected: string | undefined | null
): RendererType {
  return selected === "tic-tac-toe" ? "tic-tac-toe" : "arcade";
}

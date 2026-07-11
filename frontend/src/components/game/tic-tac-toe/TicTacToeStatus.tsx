"use client";

import type { TicTacToeState } from "./ticTacToeLogic";
import type { TicTacToeSpec } from "./ticTacToeTypes";

interface TicTacToeStatusProps {
  spec: TicTacToeSpec;
  state: TicTacToeState;
  aiThinking: boolean;
  xColor: string;
  oColor: string;
}

export function statusText(
  spec: TicTacToeSpec,
  state: TicTacToeState,
  aiThinking: boolean
): string {
  if (state.phase === "draw") return "It's a draw!";
  if (state.phase === "won") {
    if (spec.playerMode === "local-2p") return `${state.winner} wins!`;
    return state.winner === spec.playerSymbol ? "You win! 🎉" : "The AI wins!";
  }
  if (spec.playerMode === "local-2p") return `${state.turn}'s turn`;
  return aiThinking || state.turn === spec.opponentSymbol
    ? "AI is thinking…"
    : `Your turn (${spec.playerSymbol})`;
}

/** Turn indicator + end-of-game banner, announced to screen readers. */
export function TicTacToeStatus({
  spec,
  state,
  aiThinking,
  xColor,
  oColor,
}: TicTacToeStatusProps) {
  const text = statusText(spec, state, aiThinking);
  const activeColor = state.turn === "X" ? xColor : oColor;
  const showDot = spec.features.showTurnIndicator && state.phase === "playing";

  return (
    <p
      role="status"
      aria-live="polite"
      className="flex min-h-7 items-center justify-center gap-2 text-base font-semibold"
    >
      {showDot && (
        <span
          aria-hidden
          className="ttt-turn-dot inline-block size-3 rounded-full transition-colors duration-300"
          style={{ backgroundColor: activeColor }}
        />
      )}
      <span key={text} className="ttt-status-swap inline-block">
        {text}
      </span>
    </p>
  );
}

"use client";

import { useRef } from "react";

import { TicTacToeCell } from "./TicTacToeCell";
import { TicTacToeWinningLine } from "./TicTacToeWinningLine";
import type { TicTacToeState } from "./ticTacToeLogic";
import type { TicTacToeSpec } from "./ticTacToeTypes";

interface TicTacToeBoardProps {
  spec: TicTacToeSpec;
  state: TicTacToeState;
  boardBackground: string;
  xColor: string;
  oColor: string;
  lineColor: string;
  /** Cell currently shaking from an invalid click, or null. */
  shakeCell: number | null;
  /** Cell that holds keyboard focus (roving tabindex). */
  focusCell: number;
  onFocusCellChange: (index: number) => void;
  onActivate: (index: number) => void;
  restartKey: number;
}

/** The centered 3×3 grid. Geometry is fixed — never taken from the sketch. */
export function TicTacToeBoard({
  spec,
  state,
  boardBackground,
  xColor,
  oColor,
  lineColor,
  shakeCell,
  focusCell,
  onFocusCellChange,
  onActivate,
  restartKey,
}: TicTacToeBoardProps) {
  const cellRefs = useRef<(HTMLButtonElement | null)[]>(Array(9).fill(null));

  const moveFocus = (next: number) => {
    onFocusCellChange(next);
    cellRefs.current[next]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const row = Math.floor(focusCell / 3);
    const col = focusCell % 3;
    let next: number | null = null;
    if (event.key === "ArrowRight") next = row * 3 + ((col + 1) % 3);
    else if (event.key === "ArrowLeft") next = row * 3 + ((col + 2) % 3);
    else if (event.key === "ArrowDown") next = ((row + 1) % 3) * 3 + col;
    else if (event.key === "ArrowUp") next = ((row + 2) % 3) * 3 + col;
    if (next !== null) {
      event.preventDefault();
      moveFocus(next);
    }
  };

  const maxWidth = spec.visualTheme.boardScale === "large" ? 430 : 340;

  return (
    <div
      key={restartKey}
      role="grid"
      aria-label="Tic-tac-toe board"
      onKeyDown={onKeyDown}
      className={[
        "ttt-board-enter relative mx-auto grid w-full grid-cols-3 gap-2.5 p-3.5",
        spec.visualTheme.roundedCells ? "rounded-3xl" : "rounded-lg",
        spec.visualTheme.shadows
          ? "shadow-[0_10px_30px_rgba(0,0,0,0.35),inset_0_2px_0_rgba(255,255,255,0.6)]"
          : "",
      ].join(" ")}
      style={{ backgroundColor: boardBackground, maxWidth }}
    >
      {state.board.map((value, index) => (
        <TicTacToeCell
          key={index}
          index={index}
          value={value}
          xColor={xColor}
          oColor={oColor}
          disabled={state.phase !== "playing"}
          isWinning={
            spec.features.highlightWinningLine &&
            state.winningLine.includes(index)
          }
          shake={shakeCell === index}
          rounded={spec.visualTheme.roundedCells}
          shadows={spec.visualTheme.shadows}
          handDrawn={spec.visualTheme.style === "hand-drawn"}
          focusable={index === focusCell}
          cellRef={(el) => {
            cellRefs.current[index] = el;
          }}
          onActivate={(cell) => {
            onFocusCellChange(cell);
            onActivate(cell);
          }}
        />
      ))}
      {spec.features.highlightWinningLine && state.phase === "won" && (
        <TicTacToeWinningLine line={state.winningLine} color={lineColor} />
      )}
    </div>
  );
}

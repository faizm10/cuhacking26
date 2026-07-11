"use client";

import { handDrawnTilt } from "./ticTacToePalette";
import type { CellValue } from "./ticTacToeLogic";

interface TicTacToeCellProps {
  index: number;
  value: CellValue;
  xColor: string;
  oColor: string;
  disabled: boolean;
  isWinning: boolean;
  shake: boolean;
  rounded: boolean;
  shadows: boolean;
  handDrawn: boolean;
  /** Roving tabindex — only one cell is tabbable at a time. */
  focusable: boolean;
  cellRef: (el: HTMLButtonElement | null) => void;
  onActivate: (index: number) => void;
}

const ROW_NAMES = ["top", "middle", "bottom"];
const COL_NAMES = ["left", "center", "right"];

function cellLabel(index: number, value: CellValue): string {
  const place = `${ROW_NAMES[Math.floor(index / 3)]} ${COL_NAMES[index % 3]} cell`;
  return value ? `${place}, ${value}` : `${place}, empty`;
}

/** One board cell: a real button with a drawn-in SVG symbol. */
export function TicTacToeCell({
  index,
  value,
  xColor,
  oColor,
  disabled,
  isWinning,
  shake,
  rounded,
  shadows,
  handDrawn,
  focusable,
  cellRef,
  onActivate,
}: TicTacToeCellProps) {
  return (
    <button
      ref={cellRef}
      type="button"
      data-cell={index}
      aria-label={cellLabel(index, value)}
      aria-disabled={disabled || value !== null}
      tabIndex={focusable ? 0 : -1}
      onClick={() => onActivate(index)}
      className={[
        "ttt-cell relative flex items-center justify-center select-none",
        "aspect-square w-full border-0 bg-white/85 transition-transform duration-100",
        "hover:scale-[1.04] active:scale-[0.94]",
        "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-500",
        rounded ? "rounded-2xl" : "rounded-md",
        shadows ? "shadow-[0_3px_0_rgba(15,23,42,0.12)]" : "",
        isWinning ? "ttt-win-pulse" : "",
        shake ? "ttt-shake" : "",
      ].join(" ")}
      style={
        handDrawn ? { transform: `rotate(${handDrawnTilt(index)}deg)` } : undefined
      }
    >
      {value === "X" && (
        <svg viewBox="0 0 100 100" className="h-3/5 w-3/5" aria-hidden>
          <path
            d="M 22 22 L 78 78"
            className="ttt-stroke-draw"
            stroke={xColor}
            strokeWidth={14}
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 78 22 L 22 78"
            className="ttt-stroke-draw ttt-stroke-draw-late"
            stroke={xColor}
            strokeWidth={14}
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      )}
      {value === "O" && (
        <svg viewBox="0 0 100 100" className="h-3/5 w-3/5" aria-hidden>
          <circle
            cx="50"
            cy="50"
            r="30"
            className="ttt-circle-draw"
            stroke={oColor}
            strokeWidth={14}
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      )}
    </button>
  );
}

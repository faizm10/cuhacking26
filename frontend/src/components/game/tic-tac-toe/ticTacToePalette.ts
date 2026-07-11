import type { TicTacToeVisualTheme } from "./ticTacToeTypes";

/** Named theme enums → concrete colors. Kept out of the schema so the model
 * can only ever pick from this fixed, readable palette. */

export const SYMBOL_COLORS: Record<TicTacToeVisualTheme["xColor"], string> = {
  blue: "#3b82f6",
  orange: "#f97316",
  red: "#ef4444",
  green: "#22c55e",
  purple: "#a855f7",
  pink: "#ec4899",
  teal: "#14b8a6",
  yellow: "#eab308",
};

export const BOARD_BACKGROUNDS: Record<
  TicTacToeVisualTheme["boardBackground"],
  string
> = {
  "warm-white": "#fdf8f0",
  cream: "#fef3c7",
  mint: "#d1fae5",
  sky: "#e0f2fe",
  blush: "#fce7f3",
};

export const CONTAINER_STYLES: Record<
  TicTacToeVisualTheme["containerStyle"],
  { background: string; text: string }
> = {
  "dark-navy": { background: "#111c34", text: "#e2e8f0" },
  plum: { background: "#2e1065", text: "#ede9fe" },
  forest: { background: "#14352a", text: "#d1fae5" },
  charcoal: { background: "#1c1917", text: "#e7e5e4" },
};

/** Deterministic little tilt per cell for the hand-drawn style. */
export function handDrawnTilt(index: number): number {
  return ((index * 37) % 5) - 2; // -2..2 degrees
}

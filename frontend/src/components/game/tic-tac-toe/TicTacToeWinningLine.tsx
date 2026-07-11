"use client";

/**
 * Animated line drawn across the three winning cells. Rendered as an SVG
 * overlay on the board; coordinates are cell centers in a 0–300 viewBox
 * (100 units per cell), so it scales with the board.
 */

interface TicTacToeWinningLineProps {
  line: number[];
  color: string;
}

function cellCenter(index: number): { x: number; y: number } {
  return {
    x: (index % 3) * 100 + 50,
    y: Math.floor(index / 3) * 100 + 50,
  };
}

export function TicTacToeWinningLine({ line, color }: TicTacToeWinningLineProps) {
  if (line.length < 3) return null;
  const start = cellCenter(line[0]!);
  const end = cellCenter(line[2]!);
  // Extend slightly past the outer cells for a hand-drawn slash feel.
  const dx = Math.sign(end.x - start.x) * 18;
  const dy = Math.sign(end.y - start.y) * 18;

  return (
    <svg
      viewBox="0 0 300 300"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    >
      <line
        x1={start.x - dx}
        y1={start.y - dy}
        x2={end.x + dx}
        y2={end.y + dy}
        stroke={color}
        strokeWidth={12}
        strokeLinecap="round"
        className="ttt-line-draw"
        pathLength={1}
      />
    </svg>
  );
}

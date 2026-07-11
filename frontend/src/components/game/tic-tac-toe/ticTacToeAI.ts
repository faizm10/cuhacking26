import {
  emptyCells,
  findWinningLine,
  isBoardFull,
  type Board,
} from "./ticTacToeLogic";
import type { TicTacToeSpec, TicTacToeSymbol } from "./ticTacToeTypes";

/**
 * The three AI difficulty levels, all pure functions of the board:
 * easy   — any random valid move
 * normal — win now > block now > center > corner > random
 * hard   — minimax with depth-weighted scores (perfect play, never loses)
 */

function withMove(board: Board, cell: number, symbol: TicTacToeSymbol): Board {
  const next = [...board];
  next[cell] = symbol;
  return next;
}

function randomOf(cells: number[], rng: () => number): number {
  return cells[Math.floor(rng() * cells.length) % cells.length]!;
}

/** The cell that completes a line for `symbol` right now, or null. */
function immediateWin(board: Board, symbol: TicTacToeSymbol): number | null {
  for (const cell of emptyCells(board)) {
    if (findWinningLine(withMove(board, cell, symbol))?.winner === symbol) {
      return cell;
    }
  }
  return null;
}

export function easyMove(board: Board, rng: () => number = Math.random): number {
  return randomOf(emptyCells(board), rng);
}

export function normalMove(
  board: Board,
  ai: TicTacToeSymbol,
  rng: () => number = Math.random
): number {
  const opponent: TicTacToeSymbol = ai === "X" ? "O" : "X";

  const winNow = immediateWin(board, ai);
  if (winNow !== null) return winNow;

  const blockNow = immediateWin(board, opponent);
  if (blockNow !== null) return blockNow;

  if (board[4] === null) return 4; // center

  const corners = [0, 2, 6, 8].filter((cell) => board[cell] === null);
  if (corners.length > 0) return randomOf(corners, rng);

  return randomOf(emptyCells(board), rng);
}

/** Minimax score from `ai`'s perspective; depth-weighted to prefer fast wins. */
function minimax(
  board: Board,
  turn: TicTacToeSymbol,
  ai: TicTacToeSymbol,
  depth: number
): number {
  const win = findWinningLine(board);
  if (win) return win.winner === ai ? 10 - depth : depth - 10;
  if (isBoardFull(board)) return 0;

  const scores = emptyCells(board).map((cell) =>
    minimax(withMove(board, cell, turn), turn === "X" ? "O" : "X", ai, depth + 1)
  );
  return turn === ai ? Math.max(...scores) : Math.min(...scores);
}

export function hardMove(board: Board, ai: TicTacToeSymbol): number {
  // Opening on an empty board: every minimax-optimal reply is a draw, so
  // skip the search and take a corner for a livelier game.
  if (emptyCells(board).length === 9) return 0;

  let best = -Infinity;
  let bestCell = emptyCells(board)[0]!;
  for (const cell of emptyCells(board)) {
    const score = minimax(
      withMove(board, cell, ai),
      ai === "X" ? "O" : "X",
      ai,
      0
    );
    if (score > best) {
      best = score;
      bestCell = cell;
    }
  }
  return bestCell;
}

/** Difficulty dispatch used by the renderer. */
export function chooseAiMove(
  spec: TicTacToeSpec,
  board: Board,
  rng: () => number = Math.random
): number {
  const ai = spec.opponentSymbol;
  if (spec.aiDifficulty === "easy") return easyMove(board, rng);
  if (spec.aiDifficulty === "hard") return hardMove(board, ai);
  return normalMove(board, ai, rng);
}

/** Feels intentional: 250–450ms of "thinking" before the AI plays. */
export function aiDelayMs(rng: () => number = Math.random): number {
  return 250 + Math.floor(rng() * 200);
}

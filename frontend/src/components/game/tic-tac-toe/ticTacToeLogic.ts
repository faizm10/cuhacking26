import type { TicTacToeSpec, TicTacToeSymbol } from "./ticTacToeTypes";

/**
 * Pure tic-tac-toe game logic — no React, no DOM, no timers. The UI and the
 * AI both drive the game exclusively through these functions, so every rule
 * lives in exactly one place and is unit-testable.
 */

export type CellValue = TicTacToeSymbol | null;
/** 9 cells, row-major: index = row * 3 + col. */
export type Board = CellValue[];

export type GamePhase = "playing" | "won" | "draw";

export interface TicTacToeState {
  board: Board;
  /** Whose symbol moves next. */
  turn: TicTacToeSymbol;
  phase: GamePhase;
  winner: TicTacToeSymbol | null;
  /** Cell indices of the winning line, empty unless phase === "won". */
  winningLine: number[];
  /** Total moves played — doubles as a restart-reset sanity marker. */
  moves: number;
}

export const WINNING_LINES: readonly number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8], // rows
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8], // columns
  [0, 4, 8],
  [2, 4, 6], // diagonals
];

export function createEmptyBoard(): Board {
  return Array<CellValue>(9).fill(null);
}

/** Fresh game state honoring who the spec says starts. */
export function createTicTacToeState(spec: TicTacToeSpec): TicTacToeState {
  const firstSymbol =
    spec.startingPlayer === "player" ? spec.playerSymbol : spec.opponentSymbol;
  return {
    board: createEmptyBoard(),
    turn: firstSymbol,
    phase: "playing",
    winner: null,
    winningLine: [],
    moves: 0,
  };
}

export function findWinningLine(board: Board): {
  winner: TicTacToeSymbol;
  line: number[];
} | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line as [number, number, number];
    const value = board[a];
    if (value && value === board[b] && value === board[c]) {
      return { winner: value, line: [...line] };
    }
  }
  return null;
}

export function isBoardFull(board: Board): boolean {
  return board.every((cell) => cell !== null);
}

export function emptyCells(board: Board): number[] {
  return board.flatMap((cell, index) => (cell === null ? [index] : []));
}

export type MoveResult =
  | { ok: true; state: TicTacToeState }
  | { ok: false; reason: "occupied" | "game-over" | "out-of-bounds" };

/**
 * Apply the current turn's symbol to a cell. Rejects occupied cells and
 * moves after the game is over. Returns a new state; input is not mutated.
 */
export function applyMove(state: TicTacToeState, cell: number): MoveResult {
  if (state.phase !== "playing") return { ok: false, reason: "game-over" };
  if (cell < 0 || cell > 8 || !Number.isInteger(cell)) {
    return { ok: false, reason: "out-of-bounds" };
  }
  if (state.board[cell] !== null) return { ok: false, reason: "occupied" };

  const board = [...state.board];
  board[cell] = state.turn;

  const win = findWinningLine(board);
  if (win) {
    return {
      ok: true,
      state: {
        board,
        turn: state.turn,
        phase: "won",
        winner: win.winner,
        winningLine: win.line,
        moves: state.moves + 1,
      },
    };
  }
  if (isBoardFull(board)) {
    return {
      ok: true,
      state: {
        board,
        turn: state.turn,
        phase: "draw",
        winner: null,
        winningLine: [],
        moves: state.moves + 1,
      },
    };
  }
  return {
    ok: true,
    state: {
      board,
      turn: state.turn === "X" ? "O" : "X",
      phase: "playing",
      winner: null,
      winningLine: [],
      moves: state.moves + 1,
    },
  };
}

/** In vs-ai mode, is it currently the AI's turn? */
export function isAiTurn(spec: TicTacToeSpec, state: TicTacToeState): boolean {
  return (
    spec.playerMode === "vs-ai" &&
    state.phase === "playing" &&
    state.turn === spec.opponentSymbol
  );
}

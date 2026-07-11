import {
  type TicTacToeSpec,
  type TicTacToeVisualTheme,
} from "./ticTacToeTypes";

/**
 * Deterministic chat edits for tic-tac-toe. Handles the common requests
 * locally (fast, free, and impossible to derail); the model path covers the
 * rest. Only whitelisted config fields can ever change.
 */

export interface TicTacToeRefineResult {
  spec: TicTacToeSpec;
  assistantMessage: string;
  matched: boolean;
}

type SymbolColor = TicTacToeVisualTheme["xColor"];

const COLOR_WORDS: Record<string, SymbolColor> = {
  blue: "blue",
  orange: "orange",
  red: "red",
  green: "green",
  purple: "purple",
  violet: "purple",
  pink: "pink",
  teal: "teal",
  cyan: "teal",
  yellow: "yellow",
  gold: "yellow",
};

const BOARD_BACKGROUNDS: Record<
  string,
  TicTacToeVisualTheme["boardBackground"]
> = {
  white: "warm-white",
  cream: "cream",
  yellow: "cream",
  mint: "mint",
  green: "mint",
  sky: "sky",
  blue: "sky",
  pink: "blush",
  blush: "blush",
};

const CONTAINERS: Record<string, TicTacToeVisualTheme["containerStyle"]> = {
  navy: "dark-navy",
  blue: "dark-navy",
  dark: "dark-navy",
  purple: "plum",
  plum: "plum",
  green: "forest",
  forest: "forest",
  black: "charcoal",
  charcoal: "charcoal",
  gray: "charcoal",
  grey: "charcoal",
};

function findColorWord<T extends string>(
  text: string,
  table: Record<string, T>
): T | null {
  for (const [word, value] of Object.entries(table)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) return value;
  }
  return null;
}

/** Apply a chat message locally. matched:false means "let the model try". */
export function applyTicTacToeRefine(
  source: TicTacToeSpec,
  message: string
): TicTacToeRefineResult {
  const spec = structuredClone(source);
  const text = message.toLowerCase();
  const changes: string[] = [];

  // Difficulty
  if (/\b(easier|too hard)\b/.test(text)) {
    spec.aiDifficulty = spec.aiDifficulty === "hard" ? "normal" : "easy";
    changes.push(`AI difficulty is now ${spec.aiDifficulty}`);
  } else if (/\b(harder|too easy)\b/.test(text)) {
    spec.aiDifficulty = spec.aiDifficulty === "easy" ? "normal" : "hard";
    changes.push(`AI difficulty is now ${spec.aiDifficulty}`);
  } else if (/\b(easy|normal|hard)\s+(ai|mode|difficulty)\b/.test(text)) {
    const match = text.match(/\b(easy|normal|hard)\b/);
    if (match) {
      spec.aiDifficulty = match[1] as TicTacToeSpec["aiDifficulty"];
      changes.push(`AI difficulty is now ${spec.aiDifficulty}`);
    }
  }

  // Player mode
  if (/\b(two|2)\s*player|local|friend|together\b/.test(text)) {
    spec.playerMode = "local-2p";
    changes.push("two local players take turns");
  } else if (/\b(vs|against)\s+(the\s+)?ai\b|\bcomputer\b/.test(text)) {
    spec.playerMode = "vs-ai";
    changes.push("you play against the AI");
  }

  // Symbols
  if (/\b(play|be|as)\s+(as\s+)?o\b/.test(text)) {
    spec.playerSymbol = "O";
    spec.opponentSymbol = "X";
    changes.push("you now play O");
  } else if (/\b(play|be|as)\s+(as\s+)?x\b/.test(text)) {
    spec.playerSymbol = "X";
    spec.opponentSymbol = "O";
    changes.push("you now play X");
  }

  // Symbol colors ("make x blue", "o should be red"): look for a color word
  // in the clause that follows each symbol mention.
  const xIndex = text.search(/\bx\b/);
  if (xIndex >= 0) {
    const clause = text.slice(xIndex).split(/\bo\b/)[0] ?? "";
    const color = findColorWord(clause, COLOR_WORDS);
    if (color) {
      spec.visualTheme.xColor = color;
      changes.push(`X is ${color}`);
    }
  }
  const oIndex = text.search(/\bo\b/);
  if (oIndex >= 0) {
    const clause = text.slice(oIndex).split(/\bx\b/)[0] ?? "";
    const color = findColorWord(clause, COLOR_WORDS);
    if (color) {
      spec.visualTheme.oColor = color;
      changes.push(`O is ${color}`);
    }
  }
  if (spec.visualTheme.xColor === spec.visualTheme.oColor) {
    spec.visualTheme.oColor =
      spec.visualTheme.xColor === "orange" ? "blue" : "orange";
  }

  // Board scale
  if (/\b(board|grid)\b.*\b(bigger|larger)\b|\b(bigger|larger)\b.*\b(board|grid)\b/.test(text)) {
    spec.visualTheme.boardScale = "large";
    changes.push("the board is larger");
  } else if (/\b(board|grid)\b.*\bsmaller\b|\bsmaller\b.*\b(board|grid)\b/.test(text)) {
    spec.visualTheme.boardScale = "normal";
    changes.push("the board is back to normal size");
  }

  // Style
  if (/hand[- ]?drawn|sketchy|doodle/.test(text)) {
    spec.visualTheme.style = "hand-drawn";
    changes.push("hand-drawn style is on");
  } else if (/\bminimal|clean\b/.test(text)) {
    spec.visualTheme.style = "minimal";
    changes.push("minimal style is on");
  } else if (/cartoon|playful/.test(text)) {
    spec.visualTheme.style = "playful-cartoon";
    changes.push("playful cartoon style is on");
  }

  // Background (container or board)
  if (/background|container/.test(text)) {
    const container = findColorWord(text, CONTAINERS);
    if (container) {
      spec.visualTheme.containerStyle = container;
      changes.push(`the background is now ${container}`);
    } else {
      const board = findColorWord(text, BOARD_BACKGROUNDS);
      if (board) {
        spec.visualTheme.boardBackground = board;
        changes.push(`the board background is now ${board}`);
      }
    }
  }

  // Feature toggles
  const wantsOff = /\b(off|no|disable|remove|stop|hide)\b/.test(text);
  if (/confetti/.test(text)) {
    spec.features.enableConfetti = !wantsOff;
    changes.push(`confetti is ${wantsOff ? "off" : "on"}`);
  }
  if (/\bsound|audio|sfx\b/.test(text)) {
    spec.features.enableSound = !wantsOff;
    changes.push(`sound is ${wantsOff ? "off" : "on"}`);
  }
  if (/turn indicator/.test(text)) {
    spec.features.showTurnIndicator = !wantsOff;
    changes.push(`the turn indicator is ${wantsOff ? "hidden" : "shown"}`);
  }

  // Restart: the panel remounts the game on every successful refine, so an
  // unchanged spec is all a restart needs.
  if (/\brestart|reset|new game\b/.test(text) && changes.length === 0) {
    return {
      spec,
      assistantMessage: "Board cleared — new game!",
      matched: true,
    };
  }

  if (changes.length === 0) {
    return { spec: source, assistantMessage: "", matched: false };
  }
  return {
    spec,
    assistantMessage: `Done — ${changes.join(", ")}.`,
    matched: true,
  };
}

/** Fallback reply listing what chat can change, for unsupported asks. */
export const TIC_TAC_TOE_UNSUPPORTED_MESSAGE =
  "For tic-tac-toe I can tweak: AI difficulty, vs AI or 2 players, your symbol, X/O colors, backgrounds, hand-drawn/cartoon/minimal style, board size, confetti, sound, and restarts.";

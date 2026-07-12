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

const COLOR_PATTERN = Object.keys(COLOR_WORDS).join("|");

function findColorWord<T extends string>(
  text: string,
  table: Record<string, T>
): T | null {
  for (const [word, value] of Object.entries(table)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) return value;
  }
  return null;
}

/** True when the user is talking about the strike-through win line, not X. */
function isWinLineRequest(text: string): boolean {
  return (
    /\b(winning\s*line|win\s*line|strike\s*through|strikethrough)\b/.test(
      text
    ) ||
    (/\b(cross|line|stripe|slash)\b/.test(text) &&
      /\b(win|wins|winner|when\s+\w+\s+wins|match(es)?\s+(the\s+)?(player|winner|color))\b/.test(
        text
      )) ||
    /\bif\s+(red|blue|x|o|\w+)\s+wins\b/.test(text) ||
    /\b(winner'?s?|winning)\s+(color|line|cross)\b/.test(text)
  );
}

/**
 * Pull an explicit X or O color from common chat phrasings.
 * Avoids treating "cross" (win line) as the X symbol.
 */
function extractSymbolColor(
  text: string,
  symbol: "x" | "o"
): SymbolColor | null {
  const symbolAlt =
    symbol === "x"
      ? String.raw`(?:\bx(?:es)?\b|crosses|exes)`
      : String.raw`(?:\bo(?:s)?\b|circles|noughts|zeros)`;

  const patterns = [
    // "make X red", "X should be blue", "set O to green"
    new RegExp(
      `${symbolAlt}\\s*(?:color\\s*)?(?:to\\s+|should\\s+be\\s+|is\\s+|as\\s+)?(${COLOR_PATTERN})\\b`
    ),
    // "red X", "blue O", "red crosses"
    new RegExp(`\\b(${COLOR_PATTERN})\\s+${symbolAlt}`),
    // "make the X color red"
    new RegExp(
      `${symbolAlt}\\s*(?:'s)?\\s*color\\s*(?:to\\s+|should\\s+be\\s+|is\\s+)?(${COLOR_PATTERN})\\b`
    ),
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1] && COLOR_WORDS[match[1]]) return COLOR_WORDS[match[1]]!;
  }
  return null;
}

/** Classic "X red, O blue" style paired asks without naming both symbols. */
function extractClassicPair(text: string): {
  x: SymbolColor;
  o: SymbolColor;
} | null {
  if (
    /\b(red\s+(should\s+be\s+)?red|blue\s+(should\s+be\s+)?blue).*(blue\s+(should\s+be\s+)?blue|red\s+(should\s+be\s+)?red)\b/.test(
      text
    ) ||
    /\b(classic|default|normal)\s+colou?rs?\b/.test(text) ||
    /\bx\s+red\b.*\bo\s+blue\b|\bo\s+blue\b.*\bx\s+red\b/.test(text)
  ) {
    return { x: "red", o: "blue" };
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

  // Win-line COLOR is engine-owned (matches the winner). Answer locally so the
  // model does not "fix" it by recoloring X/O. Show/hide is handled below.
  if (
    isWinLineRequest(text) &&
    !/\b(hide|show|off|on|disable|enable|remove|toggle)\b/.test(text)
  ) {
    return {
      spec: source,
      assistantMessage:
        "The win line already matches the winner — blue when blue wins, red when red wins. Want to change the X or O colors themselves instead?",
      matched: true,
    };
  }

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

  // Symbol colors — precise patterns only (no loose "any color near x").
  const classic = extractClassicPair(text);
  if (classic) {
    spec.visualTheme.xColor = classic.x;
    spec.visualTheme.oColor = classic.o;
    changes.push(`X is ${classic.x}`, `O is ${classic.o}`);
  } else {
    const xColor = extractSymbolColor(text, "x");
    const oColor = extractSymbolColor(text, "o");
    if (xColor) {
      spec.visualTheme.xColor = xColor;
      changes.push(`X is ${xColor}`);
    }
    if (oColor) {
      spec.visualTheme.oColor = oColor;
      changes.push(`O is ${oColor}`);
    }
  }
  if (spec.visualTheme.xColor === spec.visualTheme.oColor) {
    spec.visualTheme.oColor =
      spec.visualTheme.xColor === "orange" ? "blue" : "orange";
  }

  // Board scale
  if (
    /\b(board|grid)\b.*\b(bigger|larger)\b|\b(bigger|larger)\b.*\b(board|grid)\b/.test(
      text
    )
  ) {
    spec.visualTheme.boardScale = "large";
    changes.push("the board is larger");
  } else if (
    /\b(board|grid)\b.*\bsmaller\b|\bsmaller\b.*\b(board|grid)\b/.test(text)
  ) {
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
  if (/winning\s*line|win\s*line|highlight\s*win/.test(text)) {
    spec.features.highlightWinningLine = !wantsOff;
    changes.push(
      `the winning-line highlight is ${wantsOff ? "off" : "on"}`
    );
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
  "For tic-tac-toe I can tweak: AI difficulty, vs AI or 2 players, your symbol, X/O colors, backgrounds, hand-drawn/cartoon/minimal style, board size, confetti, sound, and restarts. The win line always matches the winner’s color automatically.";

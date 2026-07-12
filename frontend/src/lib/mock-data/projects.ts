import type { GameModeValue, GameType, Project, ProjectStatus } from "@/types";

// Temporary stand-in for Supabase data. Starts empty so the dashboard shows
// the empty state by default. Replace with a real query once the `projects`
// table exists — the shape mirrors the intended schema.

export const MOCK_PROJECTS: Project[] = [];

export const GAME_TYPE_LABELS: Record<GameType, string> = {
  dodge: "Dodge",
  collect: "Collect",
  pong: "Pong",
  snake: "Snake",
  maze: "Maze",
  clicker: "Clicker",
  "simple-shooter": "Simple shooter",
  "platform-jumper": "Platform jumper",
  "tic-tac-toe": "Tic-tac-toe",
  "flappy-bird": "Flappy Bird",
};

export const GAME_TYPE_OPTIONS = (
  Object.entries(GAME_TYPE_LABELS) as [GameType, string][]
).map(([value, label]) => ({ value, label }));

export interface GameModeOption {
  value: GameModeValue;
  label: string;
  /** Small helper text shown under the label in the selector. */
  hint?: string;
}

/** Modes with a dedicated, first-class engine/renderer (not arcade templates). */
const DEDICATED_MODES: GameType[] = ["tic-tac-toe", "flappy-bird"];

/** Editor game-mode selector: auto (AI decides) plus every explicit mode. */
export const GAME_MODE_OPTIONS: GameModeOption[] = [
  { value: "auto", label: "Auto", hint: "AI picks from your sketch" },
  ...GAME_TYPE_OPTIONS.filter(
    (option) => !DEDICATED_MODES.includes(option.value)
  ),
  {
    value: "tic-tac-toe",
    label: "Tic-tac-toe",
    hint: "Classic 3×3 board game",
  },
  {
    value: "flappy-bird",
    label: "Flappy Bird",
    hint: "Tap-to-flap through pipes",
  },
];

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: "Draft",
  generating: "Generating",
  playable: "Playable",
};

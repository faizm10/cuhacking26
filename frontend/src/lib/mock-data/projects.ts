import type { GameModeValue, GameType, Project, ProjectStatus } from "@/types";

// Temporary empty seed. Real projects are loaded from localStorage
// (`lib/storage/projects.ts`). Keep this export for older call sites / tests.

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
  platformer: "Platformer",
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

/** Editor game-mode selector — Auto plus the dedicated engines only. */
export const GAME_MODE_OPTIONS: GameModeOption[] = [
  { value: "auto", label: "Auto", hint: "AI picks from your sketch" },
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
  {
    value: "platformer",
    label: "Platformer",
    hint: "Collect coins, reach the flag",
  },
];

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: "Draft",
  generating: "Generating",
  playable: "Playable",
};

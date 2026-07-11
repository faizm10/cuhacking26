"use client";

import { RotateCcw } from "lucide-react";

import type { TicTacToeSpec } from "./ticTacToeTypes";

interface TicTacToeControlsProps {
  spec: TicTacToeSpec;
  gameOver: boolean;
  accent: string;
  onModeChange: (mode: TicTacToeSpec["playerMode"]) => void;
  onDifficultyChange: (difficulty: TicTacToeSpec["aiDifficulty"]) => void;
  onRestart: () => void;
}

const MODES: { value: TicTacToeSpec["playerMode"]; label: string }[] = [
  { value: "vs-ai", label: "vs AI" },
  { value: "local-2p", label: "2 players" },
];

const DIFFICULTIES: TicTacToeSpec["aiDifficulty"][] = [
  "easy",
  "normal",
  "hard",
];

function chipClass(active: boolean): string {
  return [
    "rounded-full px-3 py-1 text-xs font-semibold capitalize transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400",
    active
      ? "bg-white/90 text-slate-900"
      : "bg-white/10 text-inherit hover:bg-white/20",
  ].join(" ");
}

/** Mode + difficulty chips and the big play-again button. */
export function TicTacToeControls({
  spec,
  gameOver,
  accent,
  onModeChange,
  onDifficultyChange,
  onRestart,
}: TicTacToeControlsProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <div
          role="radiogroup"
          aria-label="Opponent mode"
          className="flex gap-1 rounded-full bg-black/25 p-1"
        >
          {MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              role="radio"
              aria-checked={spec.playerMode === mode.value}
              className={chipClass(spec.playerMode === mode.value)}
              onClick={() => onModeChange(mode.value)}
            >
              {mode.label}
            </button>
          ))}
        </div>
        {spec.playerMode === "vs-ai" && (
          <div
            role="radiogroup"
            aria-label="AI difficulty"
            className="flex gap-1 rounded-full bg-black/25 p-1"
          >
            {DIFFICULTIES.map((difficulty) => (
              <button
                key={difficulty}
                type="button"
                role="radio"
                aria-checked={spec.aiDifficulty === difficulty}
                className={chipClass(spec.aiDifficulty === difficulty)}
                onClick={() => onDifficultyChange(difficulty)}
              >
                {difficulty}
              </button>
            ))}
          </div>
        )}
      </div>

      {spec.features.allowRestart && (
        <button
          type="button"
          onClick={onRestart}
          className={[
            "flex items-center gap-2 rounded-full px-7 py-3 text-base font-bold text-white",
            "transition-transform hover:scale-105 active:scale-95",
            "shadow-[0_4px_0_rgba(0,0,0,0.25)]",
            "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-400",
            gameOver ? "ttt-pop-in" : "",
          ].join(" ")}
          style={{ backgroundColor: accent }}
        >
          <RotateCcw className="size-5" aria-hidden />
          Play again
        </button>
      )}
    </div>
  );
}

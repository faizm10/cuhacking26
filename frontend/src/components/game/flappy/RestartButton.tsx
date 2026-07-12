"use client";

import { memo } from "react";
import { RotateCcw } from "lucide-react";

/**
 * The big, friendly "Play Again" button on the game-over card. Fades/rises in
 * (see the `.flappy-fade-in` keyframes in FlappyRenderer) a beat after the
 * card appears, so it reads as the clear next action.
 */

interface RestartButtonProps {
  onRestart: () => void;
  label?: string;
}

function RestartButtonImpl({ onRestart, label = "Play Again" }: RestartButtonProps) {
  return (
    <button
      type="button"
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onRestart();
      }}
      className="flappy-fade-in flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 font-heading text-lg font-extrabold text-amber-950 shadow-[0_5px_0_#b45309] transition active:translate-y-[3px] active:shadow-[0_2px_0_#b45309] hover:brightness-105"
    >
      <RotateCcw className="size-5" strokeWidth={2.6} />
      {label}
    </button>
  );
}

export const RestartButton = memo(RestartButtonImpl);

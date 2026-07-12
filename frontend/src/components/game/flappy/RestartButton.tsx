"use client";

import { memo } from "react";
import { RotateCcw } from "lucide-react";

/**
 * Icon-only restart control on the game-over card. Fades in a beat after the
 * card appears so it reads as the clear next action — no button copy.
 */

interface RestartButtonProps {
  onRestart: () => void;
}

function RestartButtonImpl({ onRestart }: RestartButtonProps) {
  return (
    <button
      type="button"
      aria-label="Play again"
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onRestart();
      }}
      className="flappy-fade-in flex size-14 items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow-[0_5px_0_#b45309] transition active:translate-y-[3px] active:shadow-[0_2px_0_#b45309] hover:brightness-105"
    >
      <RotateCcw className="size-6" strokeWidth={2.6} />
    </button>
  );
}

export const RestartButton = memo(RestartButtonImpl);

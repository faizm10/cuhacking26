"use client";

import { memo } from "react";
import { Pause, Play } from "lucide-react";

/**
 * Rounded pause / resume toggle in the top-right of the play area. Stops
 * pointer events from bubbling so tapping it never also flaps the bird.
 */

interface PauseButtonProps {
  paused: boolean;
  onToggle: () => void;
}

function PauseButtonImpl({ paused, onToggle }: PauseButtonProps) {
  return (
    <button
      type="button"
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      aria-label={paused ? "Resume" : "Pause"}
      className="absolute right-3 top-3 z-20 flex size-10 items-center justify-center rounded-full bg-white/85 text-slate-700 shadow-md backdrop-blur transition hover:scale-105 hover:bg-white active:scale-95"
    >
      {paused ? (
        <Play className="size-5 translate-x-[1px]" fill="currentColor" />
      ) : (
        <Pause className="size-5" fill="currentColor" />
      )}
    </button>
  );
}

export const PauseButton = memo(PauseButtonImpl);

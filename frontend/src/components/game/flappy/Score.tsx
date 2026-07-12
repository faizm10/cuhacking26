"use client";

import { memo } from "react";

/**
 * The big in-play score, centered near the top. It pops (a quick scale bump)
 * each time it increases — the renderer bumps `popKey` on every point so the
 * CSS animation re-triggers.
 */

interface ScoreProps {
  score: number;
  popKey: number;
}

function ScoreImpl({ score, popKey }: ScoreProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-6 flex justify-center">
      <span
        key={popKey}
        className="flappy-score-pop font-heading text-5xl font-black tabular-nums text-white sm:text-6xl"
        style={{
          textShadow:
            "0 3px 0 rgba(0,0,0,0.35), 0 0 2px rgba(0,0,0,0.5), 2px 2px 0 rgba(0,0,0,0.25)",
          WebkitTextStroke: "2px rgba(0,0,0,0.35)",
        }}
      >
        {score}
      </span>
    </div>
  );
}

export const Score = memo(ScoreImpl);

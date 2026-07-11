"use client";

import { useReducedMotion } from "framer-motion";

const TICKER_ITEMS = ["CREATE", "SKETCH", "PLAY"] as const;
const SEQUENCE_REPEATS = 8;

function TickerItem({ word }: { word: string }) {
  return (
    <span className="flex shrink-0 items-center">
      <span className="px-4 font-[family-name:var(--font-body)] text-[11px] font-bold tracking-[0.18em] text-landing-muted/40">
        {word}
      </span>
      <span className="px-4 font-[family-name:var(--font-body)] text-[11px] font-bold tracking-[0.18em] text-landing-purple">
        →
      </span>
    </span>
  );
}

function TickerTrack() {
  return (
    <div className="flex shrink-0 items-center">
      {Array.from({ length: SEQUENCE_REPEATS }, (_, repeatIndex) =>
        TICKER_ITEMS.map((word) => (
          <TickerItem key={`${repeatIndex}-${word}`} word={word} />
        ))
      )}
    </div>
  );
}

export function MarqueeTicker() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="group overflow-hidden border-y border-border py-[15px]">
      <div
        className={`flex w-max ${reduceMotion ? "" : "animate-marquee group-hover:[animation-play-state:paused]"}`}
      >
        <TickerTrack />
        <div aria-hidden className="flex shrink-0 items-center">
          <TickerTrack />
        </div>
      </div>
    </div>
  );
}

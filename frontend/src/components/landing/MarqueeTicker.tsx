"use client";

import { motion, useReducedMotion } from "framer-motion";

const TICKER_ITEMS = [
  "SKETCH",
  "PLAY",
  "SHIP",
  "WIN",
  "CREATE",
  "ITERATE",
] as const;

function TickerSequence() {
  const reduceMotion = useReducedMotion();

  return (
    <>
      {TICKER_ITEMS.map((word, index) => (
        <span key={`${word}-${index}`} className="flex items-center">
          <motion.span
            className="px-4 text-[11px] font-bold tracking-[0.18em] text-landing-muted/40"
            whileHover={{ color: "rgba(149, 117, 205, 0.8)", scale: 1.08 }}
          >
            {word}
          </motion.span>
          <motion.span
            className="text-[11px] font-bold tracking-[0.18em] text-landing-purple"
            animate={
              reduceMotion
                ? undefined
                : { x: [0, 3, 0], opacity: [0.7, 1, 0.7] }
            }
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: index * 0.15,
              ease: "easeInOut",
            }}
          >
            →
          </motion.span>
        </span>
      ))}
    </>
  );
}

export function MarqueeTicker() {
  return (
    <div className="group overflow-hidden border-y border-border py-4">
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
        <div className="flex items-center">
          <TickerSequence />
        </div>
        <div className="flex items-center" aria-hidden>
          <TickerSequence />
        </div>
      </div>
    </div>
  );
}

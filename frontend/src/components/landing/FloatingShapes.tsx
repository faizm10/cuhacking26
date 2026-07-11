"use client";

import { motion, useReducedMotion } from "framer-motion";

const SHAPES = [
  { className: "left-[8%] top-[18%] size-3 rounded-full bg-landing-purple/30", delay: 0 },
  { className: "right-[12%] top-[28%] size-2 rounded-full bg-landing-purple/40", delay: 0.4 },
  { className: "left-[18%] bottom-[32%] size-2.5 rotate-45 bg-landing-purple/20", delay: 0.8 },
  { className: "right-[22%] bottom-[24%] size-4 rounded-full border-2 border-landing-purple/25", delay: 1.2 },
  { className: "left-[42%] top-[12%] size-1.5 rounded-full bg-landing-purple/50", delay: 0.6 },
] as const;

export function FloatingShapes() {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {SHAPES.map((shape, index) => (
        <motion.div
          key={index}
          className={`absolute ${shape.className}`}
          animate={{
            y: [0, -12, 0],
            x: [0, index % 2 === 0 ? 6 : -6, 0],
            rotate: index === 2 ? [45, 55, 45] : 0,
          }}
          transition={{
            duration: 4 + index * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: shape.delay,
          }}
        />
      ))}
    </div>
  );
}

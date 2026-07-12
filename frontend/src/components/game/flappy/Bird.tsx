"use client";

import { memo } from "react";

import type { BirdPalette } from "./flappyPalette";
import { squashScale } from "./Physics";
import type { FlappyWorld } from "./PipeGenerator";

/**
 * The cute hero bird. It's fixed at 25% across the screen and only moves
 * vertically — `y`, `rotation`, and `squash` come from the physics sim. The
 * wing flaps on a continuous sine (`wingPhase`) that the renderer speeds up
 * briefly after a flap. Drawn as inline SVG so it scales crisply and casts a
 * soft shadow.
 */

interface BirdProps {
  world: FlappyWorld;
  y: number;
  rotation: number;
  squash: number;
  /** Wing beat phase in radians. */
  wingPhase: number;
  palette: BirdPalette;
}

function BirdImpl({ world, y, rotation, squash, wingPhase, palette }: BirdProps) {
  const { scaleX, scaleY } = squashScale(squash);
  // Wing sweeps between roughly -22° and +26°.
  const wingAngle = Math.sin(wingPhase) * 24 + 2;

  return (
    <div
      className="absolute"
      style={{
        left: world.birdX,
        top: y,
        width: world.birdWidth,
        height: world.birdHeight,
        transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${scaleX}, ${scaleY})`,
        transformOrigin: "center",
        willChange: "transform, top",
        filter: "drop-shadow(0 4px 3px rgba(0,0,0,0.25))",
      }}
      aria-hidden
    >
      <svg viewBox="0 0 48 36" width="100%" height="100%">
        {/* Body */}
        <ellipse cx="23" cy="19" rx="17" ry="14.5" fill={palette.body} />
        <ellipse cx="23" cy="19" rx="17" ry="14.5" fill="none" stroke={palette.bodyDark} strokeWidth="1.6" />
        {/* Belly */}
        <ellipse cx="21" cy="25" rx="11" ry="8" fill={palette.belly} />
        {/* Tail */}
        <path
          d={`M6 16 L-2 12 L2 19 L-2 26 L7 22 Z`}
          fill={palette.wing}
          stroke={palette.bodyDark}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Wing (animated) */}
        <g transform={`rotate(${wingAngle} 20 20)`}>
          <ellipse cx="17" cy="21" rx="9" ry="6" fill={palette.wing} />
          <ellipse cx="17" cy="21" rx="9" ry="6" fill="none" stroke={palette.bodyDark} strokeWidth="1.3" />
        </g>
        {/* Eye */}
        <circle cx="33" cy="13" r="6" fill="#ffffff" />
        <circle cx="33" cy="13" r="6" fill="none" stroke={palette.bodyDark} strokeWidth="1.2" />
        <circle cx="35" cy="13" r="2.6" fill="#20242e" />
        <circle cx="36" cy="12" r="0.9" fill="#ffffff" />
        {/* Beak */}
        <path
          d="M39 18 L48 20 L39 24 Z"
          fill={palette.beak}
          stroke="#c85a10"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path d="M39 21 L47 21" stroke="#c85a10" strokeWidth="1" />
      </svg>
    </div>
  );
}

export const Bird = memo(BirdImpl);

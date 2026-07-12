"use client";

import { memo } from "react";

import type { SkyPalette } from "./flappyPalette";
import type { FlappyWorld } from "./PipeGenerator";

/**
 * The scrolling ground strip along the bottom of the playable area. A grassy
 * top lip sits over a repeating dirt/pebble pattern that slides left at the
 * world scroll speed (`groundOffset`) via `backgroundPositionX`, so it always
 * moves in lockstep with the pipes.
 */

interface GroundProps {
  world: FlappyWorld;
  sky: SkyPalette;
  groundOffset: number;
}

function GroundImpl({ world, sky, groundOffset }: GroundProps) {
  const { groundHeight, playableHeight } = world;
  const grassHeight = Math.max(8, Math.round(groundHeight * 0.32));
  const tile = Math.max(24, Math.round(28 * world.scale));

  return (
    <div
      className="pointer-events-none absolute inset-x-0 overflow-hidden"
      style={{ top: playableHeight, height: groundHeight }}
      aria-hidden
    >
      {/* Grass lip with a scrolling scallop pattern. */}
      <div
        className="absolute inset-x-0 top-0"
        style={{
          height: grassHeight,
          background: sky.groundGrass,
          backgroundImage: `repeating-linear-gradient(90deg, ${sky.groundGrassDark} 0 ${tile / 2}px, ${sky.groundGrass} ${tile / 2}px ${tile}px)`,
          backgroundPositionX: `${-groundOffset}px`,
          boxShadow: "inset 0 3px 0 rgba(255,255,255,0.18)",
        }}
      />
      {/* Dirt body with a repeating pebble texture. */}
      <div
        className="absolute inset-x-0"
        style={{
          top: grassHeight,
          bottom: 0,
          background: sky.groundDirt,
          backgroundImage: `repeating-linear-gradient(45deg, ${sky.groundDirtDark} 0 2px, transparent 2px ${tile}px)`,
          backgroundPositionX: `${-groundOffset}px`,
        }}
      />
    </div>
  );
}

export const Ground = memo(GroundImpl);

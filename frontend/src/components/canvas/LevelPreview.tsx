"use client";

import type { Level, LevelTheme } from "@/types";

const THEME_BG: Record<LevelTheme, string> = {
  grass: "#1a1a2e",
  desert: "#1a1a2e",
  ice: "#1a1a2e",
  lava: "#1a1a2e",
  space: "#1a1a2e",
  cave: "#1a1a2e",
};

interface LevelPreviewProps {
  level: Level;
  className?: string;
}

/** Static minimal map — same geometric language as the Phaser prototype. */
export function LevelPreview({ level, className }: LevelPreviewProps) {
  const { world } = level;
  const marker = Math.max(18, Math.min(world.width, world.height) * 0.028);

  return (
    <svg
      viewBox={`0 0 ${world.width} ${world.height}`}
      className={className}
      role="img"
      aria-label={`Level preview: ${level.name}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width={world.width} height={world.height} fill={THEME_BG[level.theme]} />

      {level.hazards.map((hazard, index) =>
        hazard.type === "spikes" ? (
          <polygon
            key={`hazard-${index}`}
            points={`${hazard.x},${hazard.y + hazard.height} ${hazard.x + hazard.width / 2},${hazard.y} ${hazard.x + hazard.width},${hazard.y + hazard.height}`}
            fill="#ef4444"
          />
        ) : (
          <rect
            key={`hazard-${index}`}
            x={hazard.x}
            y={hazard.y}
            width={hazard.width}
            height={hazard.height}
            fill={hazard.type === "lava" ? "#dc2626" : "#3b82f6"}
            opacity={hazard.type === "water" ? 0.7 : 1}
          />
        )
      )}

      {level.platforms.map((platform, index) => (
        <rect
          key={`platform-${index}`}
          x={platform.x}
          y={platform.y}
          width={platform.width}
          height={platform.height}
          fill="#8b6914"
        />
      ))}

      {level.coins.map((coin, index) => (
        <circle
          key={`coin-${index}`}
          cx={coin.x}
          cy={coin.y}
          r={marker * 0.4}
          fill="#fbbf24"
        />
      ))}

      {level.enemies.map((enemy, index) => (
        <circle
          key={`enemy-${index}`}
          cx={enemy.x}
          cy={enemy.y}
          r={marker * 0.5}
          fill="#ef4444"
        />
      ))}

      <circle
        cx={level.player.x}
        cy={level.player.y}
        r={marker * 0.55}
        fill="#3b82f6"
      />

      <rect
        x={level.goal.x - 3}
        y={level.goal.y - marker * 1.6}
        width={6}
        height={marker * 1.6}
        fill="#d1d5db"
      />
      <polygon
        points={`${level.goal.x + 3},${level.goal.y - marker * 1.6} ${level.goal.x + marker},${level.goal.y - marker * 1.2} ${level.goal.x + 3},${level.goal.y - marker * 0.8}`}
        fill="#fbbf24"
      />
    </svg>
  );
}

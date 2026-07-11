"use client";

import { useEffect, useRef } from "react";
import Phaser from "phaser";

import { createPlatformerScene, GAME_COLORS } from "@/components/game/createPlatformerScene";
import type { Level } from "@/types";

interface PhaserGameProps {
  level: Level;
}

export function PhaserGame({ level }: PhaserGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;

    // Tear down any previous instance (Strict Mode / level change).
    gameRef.current?.destroy(true);
    gameRef.current = null;
    parent.replaceChildren();

    const width = parent.clientWidth || 640;
    const height = parent.clientHeight || 360;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width,
      height,
      backgroundColor: GAME_COLORS.background,
      physics: {
        default: "arcade",
        arcade: {
          gravity: { x: 0, y: level.world.gravity },
          debug: false,
        },
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [createPlatformerScene(level)],
      audio: { noAudio: true },
    });

    gameRef.current = game;

    return () => {
      game.destroy(true);
      if (gameRef.current === game) gameRef.current = null;
    };
  }, [level]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden rounded-lg bg-[#1a1a2e]"
      data-phaser-root
    />
  );
}

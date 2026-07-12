"use client";

import { useEffect, useRef } from "react";
import Phaser from "phaser";

import {
  createPlatformerScene,
  skyColorFor,
} from "@/components/game/createPlatformerScene";
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

    const width = Math.max(320, parent.clientWidth);
    const height = Math.max(240, parent.clientHeight);

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width,
      height,
      backgroundColor: skyColorFor(level.theme),
      physics: {
        default: "arcade",
        arcade: {
          // The scene drives motion via stepPlatformerMotion; world gravity off.
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      input: {
        keyboard: {
          // Stop the browser from scrolling / focusing chrome while playing.
          capture: [
            Phaser.Input.Keyboard.KeyCodes.LEFT,
            Phaser.Input.Keyboard.KeyCodes.RIGHT,
            Phaser.Input.Keyboard.KeyCodes.UP,
            Phaser.Input.Keyboard.KeyCodes.DOWN,
            Phaser.Input.Keyboard.KeyCodes.SPACE,
            Phaser.Input.Keyboard.KeyCodes.W,
            Phaser.Input.Keyboard.KeyCodes.A,
            Phaser.Input.Keyboard.KeyCodes.D,
            Phaser.Input.Keyboard.KeyCodes.P,
            Phaser.Input.Keyboard.KeyCodes.R,
          ],
        },
      },
      scale: {
        // Sized manually below via ResizeObserver — RESIZE mode can boot at
        // 0x0 when the flex parent hasn't been laid out yet.
        mode: Phaser.Scale.NONE,
      },
      scene: [createPlatformerScene(level)],
      // Sound comes from a tiny WebAudio synth inside the scene.
      audio: { noAudio: true },
    });

    gameRef.current = game;
    if (process.env.NODE_ENV === "development") {
      // Handy for QA scripting and debugging from the console.
      (window as unknown as Record<string, unknown>).__playboxGame = game;
    }

    const observer = new ResizeObserver(() => {
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      if (w > 0 && h > 0 && game.isRunning) {
        game.scale.resize(w, h);
      }
    });
    observer.observe(parent);

    return () => {
      observer.disconnect();
      game.destroy(true);
      if (gameRef.current === game) gameRef.current = null;
    };
  }, [level]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden rounded-lg"
      data-phaser-root
    />
  );
}

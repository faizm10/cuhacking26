"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { GameSpec } from "@/types";

const CanvasGame = dynamic(
  () =>
    import("@/components/game/renderers/CanvasGame").then((mod) => mod.CanvasGame),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-slate-950 text-sm text-slate-300">
        Loading game…
      </div>
    ),
  }
);

interface LevelPanelProps {
  isGenerating: boolean;
  game: GameSpec | null;
  source?: "gemini" | "mock" | null;
  error?: string | null;
}

export function LevelPanel({
  isGenerating,
  game,
  source,
  error,
}: LevelPanelProps) {
  return (
    <section className="flex h-full min-h-0 flex-col border-l border-border bg-muted/30">
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
        <h2 className="text-sm font-medium">Play</h2>
        {source && !isGenerating && (
          <Badge variant="secondary" className="capitalize">
            {source}
          </Badge>
        )}
      </div>

      <div className="relative min-h-0 flex-1 p-3">
        {isGenerating && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-[2px]"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="font-heading text-sm font-medium">
              Generating your game…
            </p>
            <p className="max-w-[16rem] text-center text-xs text-muted-foreground">
              Reading your sketch, labels, and description
            </p>
          </div>
        )}

        {error && !isGenerating && (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        {game && !isGenerating && (
          <div className="flex h-full flex-col gap-2">
            <p className="truncate text-xs text-muted-foreground">
              {game.title} · {game.gameType} · validated game spec
            </p>
            <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border shadow-soft">
              <CanvasGame
                key={`${game.title}-${game.gameType}-${game.objective}`}
                game={game}
              />
            </div>
          </div>
        )}

        {!game && !isGenerating && !error && (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
            Sketch, label with text, describe the game, then hit Generate
          </div>
        )}
      </div>
    </section>
  );
}

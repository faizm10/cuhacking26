"use client";

import dynamic from "next/dynamic";
import { Loader2, RefreshCcw, Sparkles } from "lucide-react";

import {
  GameChat,
  type ChatMessage,
} from "@/components/canvas/GameChat";
import { Button } from "@/components/ui/button";
import type { GameSpec } from "@/types";

const CanvasGame = dynamic(
  () =>
    import("@/components/game/renderers/CanvasGame").then(
      (mod) => mod.CanvasGame
    ),
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
  interpretation?: string | null;
  warnings?: string[];
  error?: string | null;
  onRetry?: () => void;
  /** Post-generate AI chat — only shown when a game is loaded. */
  chatMessages?: ChatMessage[];
  isRefining?: boolean;
  onChatSend?: (message: string) => Promise<void> | void;
}

export function LevelPanel({
  isGenerating,
  game,
  interpretation,
  warnings = [],
  error,
  onRetry,
  chatMessages = [],
  isRefining = false,
  onChatSend,
}: LevelPanelProps) {
  const showChat = Boolean(game && !error && onChatSend);

  return (
    <section className="flex h-full min-h-0 flex-col border-l border-border bg-muted/30">
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
        <h2 className="text-sm font-medium">Play</h2>
        {game && !isGenerating && onRetry && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onRetry}
            title="Rebuild from the current sketch and description"
            className="h-7 gap-1.5 text-xs"
          >
            <RefreshCcw className="size-3.5" />
            Regenerate from sketch
          </Button>
        )}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-[3] p-3">
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
            <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
              <p className="text-sm text-destructive">{error}</p>
              {onRetry && (
                <Button size="sm" variant="outline" onClick={onRetry}>
                  <RefreshCcw data-icon="inline-start" className="size-4" />
                  Try again
                </Button>
              )}
            </div>
          )}

          {game && !isGenerating && !error && (
            <div className="flex h-full flex-col gap-2">
              {interpretation && (
                <div className="flex items-start gap-2 rounded-lg border border-border bg-background px-3 py-2">
                  <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {interpretation}
                    {warnings.length > 0 && (
                      <span className="mt-0.5 block text-[11px] opacity-75">
                        Adjusted: {warnings.join("; ")}
                      </span>
                    )}
                  </p>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                Edit the sketch on the left and Regenerate for layout changes,
                or chat below to tweak rules.
              </p>
              <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border shadow-soft">
                <CanvasGame
                  key={`${game.title}-${game.gameType}-${game.objective}-${game.player.speed}-${game.enemies.length}-${game.collectibles.length}`}
                  game={game}
                />
              </div>
            </div>
          )}

          {!game && !isGenerating && !error && (
            <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
              Sketch, upload a drawing, label with text, then hit Generate
            </div>
          )}
        </div>

        {showChat && (
          <div className="min-h-0 flex-[2]">
            <GameChat
              messages={chatMessages}
              isBusy={isRefining}
              disabled={isGenerating}
              onSend={onChatSend!}
            />
          </div>
        )}
      </div>
    </section>
  );
}

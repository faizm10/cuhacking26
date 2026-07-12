"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCcw,
  Sparkles,
} from "lucide-react";

import {
  GameChat,
  type ChatMessage,
} from "@/components/canvas/GameChat";
import { Button } from "@/components/ui/button";
import type { GeneratedGame } from "@/lib/game/generated";
import { cn } from "@/lib/utils";

const gameLoading = () => (
  <div className="flex h-full items-center justify-center bg-slate-950 text-sm text-slate-300">
    Loading game…
  </div>
);

const CanvasGame = dynamic(
  () =>
    import("@/components/game/renderers/CanvasGame").then(
      (mod) => mod.CanvasGame
    ),
  { ssr: false, loading: gameLoading }
);

const TicTacToeRenderer = dynamic(
  () =>
    import("@/components/game/tic-tac-toe/TicTacToeRenderer").then(
      (mod) => mod.TicTacToeRenderer
    ),
  { ssr: false, loading: gameLoading }
);

const FlappyRenderer = dynamic(
  () =>
    import("@/components/game/flappy/FlappyRenderer").then(
      (mod) => mod.FlappyRenderer
    ),
  { ssr: false, loading: gameLoading }
);

const PhaserGame = dynamic(
  () =>
    import("@/components/game/PhaserGame").then((mod) => mod.PhaserGame),
  { ssr: false, loading: gameLoading }
);

const GENERATE_STATUS_LINES = [
  "Reading your sketch…",
  "Picking a game style…",
  "Placing characters and goals…",
  "Building the level…",
  "Tuning controls and win conditions…",
] as const;

const REFINE_STATUS_LINES = [
  "Applying your chat tweak…",
  "Updating the live level…",
  "Checking playability…",
] as const;

function useRotatingStatus(active: boolean, lines: readonly string[]): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % lines.length);
    }, 2800);
    return () => {
      window.clearInterval(id);
      setIndex(0);
    };
  }, [active, lines]);

  return active ? (lines[index] ?? lines[0]!) : lines[0]!;
}

interface LevelPanelProps {
  isGenerating: boolean;
  game: GeneratedGame | null;
  gameRevision?: number;
  autoPlay?: boolean;
  interpretation?: string | null;
  warnings?: string[];
  error?: string | null;
  onRetry?: () => void;
  chatMessages?: ChatMessage[];
  isRefining?: boolean;
  onChatSend?: (message: string) => Promise<void> | void;
}

export function LevelPanel({
  isGenerating,
  game,
  gameRevision = 0,
  autoPlay = false,
  interpretation,
  warnings = [],
  error,
  onRetry,
  chatMessages = [],
  isRefining = false,
  onChatSend,
}: LevelPanelProps) {
  const showChat = Boolean(game && !error && onChatSend);
  const generateStatus = useRotatingStatus(
    isGenerating && !isRefining,
    GENERATE_STATUS_LINES
  );
  const refineStatus = useRotatingStatus(isRefining, REFINE_STATUS_LINES);

  const gameStageRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(document.fullscreenElement === gameStageRef.current);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const stage = gameStageRef.current;
    if (!stage) return;
    try {
      if (document.fullscreenElement === stage) {
        await document.exitFullscreen();
      } else {
        await stage.requestFullscreen();
      }
    } catch {
      // Browser may deny fullscreen without a gesture or in iframe contexts.
    }
  }, []);

  return (
    <section className="flex h-full min-h-0 flex-col border-l border-border bg-muted/30">
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
        <h2 className="text-sm font-medium">Play</h2>
        {game && !isGenerating && !error && (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void toggleFullscreen()}
              title={isFullscreen ? "Exit full screen" : "Full screen"}
              aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
              className="h-7 gap-1.5 text-xs"
            >
              {isFullscreen ? (
                <Minimize2 className="size-3.5" />
              ) : (
                <Maximize2 className="size-3.5" />
              )}
              <span className="hidden sm:inline">
                {isFullscreen ? "Exit" : "Full screen"}
              </span>
            </Button>
            {onRetry && (
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
        )}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-[3] p-3">
          {(isGenerating || isRefining) && (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-[2px]"
              role="status"
              aria-live="polite"
              aria-busy="true"
            >
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="font-heading text-sm font-medium">
                {isRefining ? "Updating your game…" : "Generating your game…"}
              </p>
              <p className="max-w-[16rem] text-center text-xs text-muted-foreground transition-opacity">
                {isRefining ? refineStatus : generateStatus}
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
              {interpretation && !isFullscreen && (
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
              {!isFullscreen && (
                <p className="text-[11px] text-muted-foreground">
                  Edit the sketch on the left and Regenerate for layout changes,
                  or chat below to tweak rules.
                </p>
              )}
              <div
                ref={gameStageRef}
                className={cn(
                  "relative min-h-0 flex-1 overflow-hidden rounded-lg border border-border shadow-soft",
                  isFullscreen && "rounded-none border-0 bg-background"
                )}
              >
                {isFullscreen && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void toggleFullscreen()}
                    className="absolute right-3 top-3 z-20 gap-1.5 shadow-soft"
                    aria-label="Exit full screen"
                  >
                    <Minimize2 className="size-3.5" />
                    Exit
                  </Button>
                )}
                {game.rendererType === "tic-tac-toe" ? (
                  <TicTacToeRenderer
                    key={`play-${gameRevision}`}
                    spec={game.gameSpec}
                  />
                ) : game.rendererType === "flappy-bird" ? (
                  <FlappyRenderer
                    key={`play-${gameRevision}`}
                    spec={game.gameSpec}
                  />
                ) : game.rendererType === "platformer" ? (
                  <PhaserGame
                    key={`play-${gameRevision}`}
                    level={game.gameSpec}
                  />
                ) : (
                  <CanvasGame
                    key={`play-${gameRevision}`}
                    game={game.gameSpec}
                    autoPlay={autoPlay}
                  />
                )}
              </div>
            </div>
          )}

          {!game && !isGenerating && !error && (
            <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
              Sketch, upload a drawing, label with text, then hit Generate
            </div>
          )}
        </div>

        {showChat && !isFullscreen && (
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

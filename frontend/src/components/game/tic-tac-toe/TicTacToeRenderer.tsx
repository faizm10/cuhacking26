"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { TicTacToeBoard } from "./TicTacToeBoard";
import { TicTacToeControls } from "./TicTacToeControls";
import { TicTacToeStatus } from "./TicTacToeStatus";
import { aiDelayMs, chooseAiMove } from "./ticTacToeAI";
import {
  applyMove,
  createTicTacToeState,
  isAiTurn,
  type TicTacToeState,
} from "./ticTacToeLogic";
import {
  BOARD_BACKGROUNDS,
  CONTAINER_STYLES,
  SYMBOL_COLORS,
} from "./ticTacToePalette";
import type { TicTacToeSpec } from "./ticTacToeTypes";

/**
 * The dedicated tic-tac-toe renderer. Deliberately shares nothing with the
 * arcade CanvasGame: no HUD, lives, timers, physics, or world bounds — just
 * a friendly board game.
 */

interface TicTacToeRendererProps {
  spec: TicTacToeSpec;
}

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  color: string;
  drift: number;
}

function makeConfetti(colors: string[]): ConfettiPiece[] {
  return Array.from({ length: 26 }, (_, id) => ({
    id,
    left: Math.random() * 100,
    delay: Math.random() * 0.4,
    color: colors[id % colors.length]!,
    drift: (Math.random() - 0.5) * 120,
  }));
}

/** Tiny two-tone WebAudio blip; used only when features.enableSound is on. */
function playBlip(frequency: number): void {
  try {
    const AudioCtx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
    osc.onended = () => void ctx.close();
  } catch {
    // Sound is decorative — never let audio errors break the game.
  }
}

export function TicTacToeRenderer({ spec: initialSpec }: TicTacToeRendererProps) {
  // In-game mode/difficulty chips adjust a local copy; chat edits arrive as
  // a new `spec` prop via remount (key on the panel side).
  const [spec, setSpec] = useState<TicTacToeSpec>(initialSpec);
  const [state, setState] = useState<TicTacToeState>(() =>
    createTicTacToeState(initialSpec)
  );
  const [shakeCell, setShakeCell] = useState<number | null>(null);
  const [focusCell, setFocusCell] = useState(4);
  const [restartKey, setRestartKey] = useState(0);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const aiTimerRef = useRef<number | null>(null);
  const shakeTimerRef = useRef<number | null>(null);

  const xColor = SYMBOL_COLORS[spec.visualTheme.xColor];
  const oColor = SYMBOL_COLORS[spec.visualTheme.oColor];
  const container = CONTAINER_STYLES[spec.visualTheme.containerStyle];
  const boardBackground = BOARD_BACKGROUNDS[spec.visualTheme.boardBackground];
  const playerColor = spec.playerSymbol === "X" ? xColor : oColor;

  const clearTimers = useCallback(() => {
    if (aiTimerRef.current !== null) window.clearTimeout(aiTimerRef.current);
    if (shakeTimerRef.current !== null)
      window.clearTimeout(shakeTimerRef.current);
    aiTimerRef.current = null;
    shakeTimerRef.current = null;
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const restart = useCallback(
    (nextSpec: TicTacToeSpec) => {
      clearTimers();
      setState(createTicTacToeState(nextSpec));
      setConfetti([]);
      setShakeCell(null);
      setRestartKey((n) => n + 1);
    },
    [clearTimers]
  );

  const finishMove = useCallback(
    (next: TicTacToeState, activeSpec: TicTacToeSpec) => {
      setState(next);
      if (activeSpec.features.enableSound) {
        playBlip(next.phase === "won" ? 660 : 440);
      }
      if (next.phase === "won" && activeSpec.features.enableConfetti) {
        const humanWon =
          activeSpec.playerMode === "local-2p" ||
          next.winner === activeSpec.playerSymbol;
        if (humanWon) setConfetti(makeConfetti([xColor, oColor, "#facc15"]));
      }
    },
    [oColor, xColor]
  );

  const handleActivate = useCallback(
    (cell: number) => {
      // Ignore human clicks while the AI is due to move.
      if (isAiTurn(spec, state)) return;
      const result = applyMove(state, cell);
      if (!result.ok) {
        if (result.reason === "occupied") {
          setShakeCell(cell);
          if (shakeTimerRef.current !== null)
            window.clearTimeout(shakeTimerRef.current);
          shakeTimerRef.current = window.setTimeout(
            () => setShakeCell(null),
            360
          );
        }
        return;
      }
      finishMove(result.state, spec);
    },
    [finishMove, spec, state]
  );

  // AI turn: think briefly, then move.
  useEffect(() => {
    if (!isAiTurn(spec, state)) return;
    const timer = window.setTimeout(() => {
      const cell = chooseAiMove(spec, state.board);
      const result = applyMove(state, cell);
      if (result.ok) finishMove(result.state, spec);
    }, aiDelayMs());
    aiTimerRef.current = timer;
    return () => window.clearTimeout(timer);
  }, [finishMove, spec, state]);

  const aiThinking = isAiTurn(spec, state);
  const gameOver = state.phase !== "playing";

  const styleTag = useMemo(
    () => `
      @keyframes ttt-stroke { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
      .ttt-stroke-draw { stroke-dasharray: 1; stroke-dashoffset: 1; pathLength: 1; animation: ttt-stroke 0.22s ease-out forwards; }
      .ttt-stroke-draw { stroke-dasharray: 1; }
      .ttt-stroke-draw-late { animation-delay: 0.12s; }
      .ttt-circle-draw { stroke-dasharray: 1; stroke-dashoffset: 1; animation: ttt-stroke 0.3s ease-out forwards; }
      .ttt-line-draw { stroke-dasharray: 1; stroke-dashoffset: 1; animation: ttt-stroke 0.45s ease-in-out 0.1s forwards; }
      @keyframes ttt-shake-kf { 0%,100% { translate: 0 0; } 25% { translate: -5px 0; } 50% { translate: 5px 0; } 75% { translate: -3px 0; } }
      .ttt-shake { animation: ttt-shake-kf 0.32s ease-in-out; }
      @keyframes ttt-pulse-kf { 0%,100% { scale: 1; } 50% { scale: 1.08; } }
      .ttt-win-pulse { animation: ttt-pulse-kf 0.7s ease-in-out 2; }
      @keyframes ttt-enter-kf { from { opacity: 0; scale: 0.92; } to { opacity: 1; scale: 1; } }
      .ttt-board-enter { animation: ttt-enter-kf 0.28s ease-out; }
      .ttt-pop-in { animation: ttt-enter-kf 0.25s ease-out; }
      @keyframes ttt-status-kf { from { opacity: 0; translate: 0 4px; } to { opacity: 1; translate: 0 0; } }
      .ttt-status-swap { animation: ttt-status-kf 0.22s ease-out; }
      @keyframes ttt-dot-kf { 0%,100% { scale: 1; } 50% { scale: 1.35; } }
      .ttt-turn-dot { animation: ttt-dot-kf 1.4s ease-in-out infinite; }
      @keyframes ttt-confetti-kf {
        from { transform: translate(0, -10px) rotate(0deg); opacity: 1; }
        to { transform: translate(var(--drift), 320px) rotate(540deg); opacity: 0; }
      }
      .ttt-confetti { animation: ttt-confetti-kf 1.5s ease-in forwards; }
    `,
    []
  );

  return (
    <div
      className="relative flex h-full min-h-0 flex-col items-center justify-center gap-4 overflow-auto px-4 py-6"
      style={{ backgroundColor: container.background, color: container.text }}
      data-testid="tic-tac-toe-renderer"
    >
      <style>{styleTag}</style>

      <h2
        className="text-center font-heading text-2xl font-extrabold tracking-tight sm:text-3xl"
        style={
          spec.visualTheme.style === "hand-drawn"
            ? { transform: "rotate(-1.2deg)" }
            : undefined
        }
      >
        {spec.title}
      </h2>

      <TicTacToeStatus
        spec={spec}
        state={state}
        aiThinking={aiThinking}
        xColor={xColor}
        oColor={oColor}
      />

      <TicTacToeBoard
        spec={spec}
        state={state}
        boardBackground={boardBackground}
        xColor={xColor}
        oColor={oColor}
        lineColor={playerColor}
        shakeCell={shakeCell}
        focusCell={focusCell}
        onFocusCellChange={setFocusCell}
        onActivate={handleActivate}
        restartKey={restartKey}
      />

      <TicTacToeControls
        spec={spec}
        gameOver={gameOver}
        accent={playerColor}
        onModeChange={(playerMode) => {
          const next = { ...spec, playerMode };
          setSpec(next);
          restart(next);
        }}
        onDifficultyChange={(aiDifficulty) => {
          const next = { ...spec, aiDifficulty };
          setSpec(next);
          restart(next);
        }}
        onRestart={() => restart(spec)}
      />

      {confetti.length > 0 && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {confetti.map((piece) => (
            <span
              key={piece.id}
              className="ttt-confetti absolute top-0 block size-2.5 rounded-sm"
              style={{
                left: `${piece.left}%`,
                backgroundColor: piece.color,
                animationDelay: `${piece.delay}s`,
                ["--drift" as string]: `${piece.drift}px`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

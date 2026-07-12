"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Background } from "./Background";
import { Bird } from "./Bird";
import {
  BIRD_PALETTES,
  PIPE_PALETTES,
  SKY_PALETTES,
} from "./flappyPalette";
import type { FlappySpec } from "./flappyTypes";
import { createGameLoop, type GameLoopHandle } from "./GameLoop";
import {
  createSimForWorld,
  flap as flapSim,
  loadBestScore,
  pause as pauseSim,
  resume as resumeSim,
  saveBestScore,
  stepSim,
  type FlappySim,
} from "./GameState";
import { Ground } from "./Ground";
import { PauseButton } from "./PauseButton";
import { Pipe } from "./Pipe";
import {
  deriveWorld,
  validateStartConditions,
} from "./PipeGenerator";
import { RestartButton } from "./RestartButton";
import { Score } from "./Score";

/**
 * The dedicated Flappy Bird renderer. Owns the fixed-timestep loop, input, and
 * the polished DOM/SVG presentation. It deliberately shares nothing with the
 * arcade CanvasGame — no HUD, no world objects, no generic physics. OpenAI only
 * supplies the `spec` (a validated config); this engine builds and runs the
 * playable level.
 */

/** Portrait cap so the play area looks like a Flappy Bird cabinet on wide panels. */
const MAX_ASPECT = 0.8;

interface FlappyRendererProps {
  spec: FlappySpec;
}

interface ParticleView {
  id: number;
  x: number;
  y: number;
  life: number;
  size: number;
  color: string;
}

interface FlappyView {
  phase: FlappySim["phase"];
  score: number;
  birdY: number;
  birdRotation: number;
  birdSquash: number;
  wingPhase: number;
  pipes: { id: number; x: number; gapCenter: number; gapHalf: number }[];
  groundOffset: number;
  parallaxOffset: number;
  particles: ParticleView[];
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface Stage {
  width: number;
  height: number;
  left: number;
}

function medalFor(score: number): { label: string; color: string } | null {
  if (score >= 30) return { label: "Gold", color: "#facc15" };
  if (score >= 15) return { label: "Silver", color: "#cbd5e1" };
  if (score >= 5) return { label: "Bronze", color: "#d98c5f" };
  return null;
}

export function FlappyRenderer({ spec }: FlappyRendererProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<FlappySim | null>(null);
  const loopRef = useRef<GameLoopHandle | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const particleIdRef = useRef(0);
  const wingClockRef = useRef(0);
  const flapBoostRef = useRef(0);
  const audioRef = useRef<AudioContext | null>(null);

  const [stage, setStage] = useState<Stage | null>(null);
  const [view, setView] = useState<FlappyView | null>(null);
  const [best, setBest] = useState(() => loadBestScore());
  const [popKey, setPopKey] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);

  const birdPalette = BIRD_PALETTES[spec.birdColor];
  const pipePalette = PIPE_PALETTES[spec.pipeColor];
  const sky = SKY_PALETTES[spec.background];

  // The derived world (geometry + scaled physics) for the current stage size.
  // Children read it directly; the sim is built from this exact instance.
  const world = useMemo(
    () =>
      stage && stage.height >= 40 && stage.width >= 40
        ? deriveWorld(stage.width, stage.height, spec)
        : null,
    [stage, spec]
  );

  /* --- Sound: tiny WebAudio blips, only when features.sound is on. --- */
  const playTone = useCallback(
    (frequency: number, duration = 0.12, type: OscillatorType = "square") => {
      if (!spec.features.sound || typeof window === "undefined") return;
      try {
        const Ctx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!Ctx) return;
        const ctx = audioRef.current ?? new Ctx();
        audioRef.current = ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration + 0.02);
      } catch {
        // Audio is decorative — never let it break gameplay.
      }
    },
    [spec.features.sound]
  );

  const spawnScoreParticles = useCallback(
    (sim: FlappySim) => {
      const { birdX } = sim.world;
      const y = sim.bird.y;
      const colors = [birdPalette.body, birdPalette.belly, "#ffffff"];
      for (let i = 0; i < 9; i += 1) {
        const angle = (Math.PI * 2 * i) / 9 + Math.random() * 0.5;
        const speed = 60 + Math.random() * 90;
        particlesRef.current.push({
          id: particleIdRef.current++,
          x: birdX,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 40,
          life: 0.5 + Math.random() * 0.25,
          maxLife: 0.7,
          size: 4 + Math.random() * 4,
          color: colors[i % colors.length]!,
        });
      }
      if (particlesRef.current.length > 80) {
        particlesRef.current.splice(0, particlesRef.current.length - 80);
      }
    },
    [birdPalette]
  );

  /* --- Build (or rebuild) the sim whenever the derived world changes. --- */
  useEffect(() => {
    if (!world) return;

    const sim = createSimForWorld(world);
    simRef.current = sim;
    particlesRef.current = [];
    wingClockRef.current = 0;

    if (process.env.NODE_ENV !== "production") {
      const validation = validateStartConditions(sim.world);
      if (!validation.ok) {
        console.warn("[flappy] start validation failed:", validation.issues);
      }
    }

    const updateParticles = (dt: number) => {
      const alive: Particle[] = [];
      for (const p of particlesRef.current) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += sim.world.gravity * 0.35 * dt;
        p.life -= dt;
        if (p.life > 0) alive.push(p);
      }
      particlesRef.current = alive;
    };

    const update = (dt: number) => {
      const result = stepSim(sim, dt);

      flapBoostRef.current = Math.max(0, flapBoostRef.current - dt * 26);
      const wingSpeed =
        sim.phase === "running"
          ? 7 + flapBoostRef.current
          : sim.phase === "ready"
            ? 5
            : 0;
      wingClockRef.current += wingSpeed * dt;

      updateParticles(dt);

      if (result.scored > 0) {
        setPopKey((k) => k + 1);
        spawnScoreParticles(sim);
        playTone(720, 0.09, "sine");
      }
      if (result.justDied) {
        setBest(saveBestScore(sim.score));
        setShakeKey((k) => k + 1);
        playTone(180, 0.25, "sawtooth");
      }
    };

    const render = () => {
      setView({
        phase: sim.phase,
        score: sim.score,
        birdY: sim.bird.y,
        birdRotation: sim.bird.rotation,
        birdSquash: sim.bird.squash,
        wingPhase: wingClockRef.current,
        pipes: sim.field.pipes.map((p) => ({
          id: p.id,
          x: p.x,
          gapCenter: p.gapCenter,
          gapHalf: p.gapHalf,
        })),
        groundOffset: sim.groundOffset,
        parallaxOffset: sim.parallaxOffset,
        particles: particlesRef.current.map((p) => ({
          id: p.id,
          x: p.x,
          y: p.y,
          life: Math.max(0, p.life / p.maxLife),
          size: p.size,
          color: p.color,
        })),
      });
    };

    const loop = createGameLoop({ update, render });
    loopRef.current = loop;
    loop.start();

    return () => {
      loop.stop();
      loopRef.current = null;
    };
  }, [world, playTone, spawnScoreParticles]);

  /* --- Measure the container and derive a centered, portrait-capped stage. --- */
  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const height = Math.round(rect.height);
      const width = Math.round(rect.width);
      if (height < 40 || width < 40) return;
      const stageWidth = Math.min(width, Math.round(height * MAX_ASPECT));
      const left = Math.round((width - stageWidth) / 2);
      setStage((prev) =>
        prev &&
        prev.width === stageWidth &&
        prev.height === height &&
        prev.left === left
          ? prev
          : { width: stageWidth, height, left }
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* --- Input --- */
  const doFlap = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    if (flapSim(sim)) {
      flapBoostRef.current = 16;
      playTone(520, 0.07, "square");
    }
  }, [playTone]);

  const restart = useCallback(() => {
    if (!world) return;
    const sim = createSimForWorld(world);
    simRef.current = sim;
    particlesRef.current = [];
    wingClockRef.current = 0;
    flapBoostRef.current = 0;
    setPopKey(0);
  }, [world]);

  const togglePause = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    if (sim.phase === "running") pauseSim(sim);
    else if (sim.phase === "paused") resumeSim(sim);
  }, []);

  const handlePointerDown = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    if (sim.phase === "gameover") {
      restart();
      return;
    }
    if (sim.phase === "paused") {
      resumeSim(sim);
      return;
    }
    doFlap();
  }, [doFlap, restart]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const sim = simRef.current;
      if (!sim) return;
      if (
        event.code === "Space" ||
        event.code === "ArrowUp" ||
        event.code === "KeyW"
      ) {
        event.preventDefault();
        if (sim.phase === "gameover") restart();
        else if (sim.phase === "paused") resumeSim(sim);
        else doFlap();
      } else if (event.code === "KeyP" || event.code === "Escape") {
        event.preventDefault();
        togglePause();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [doFlap, restart, togglePause]);

  const weather = useMemo(() => {
    if (spec.weather === "none") return null;
    const count = spec.weather === "snow" ? 26 : 34;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: (i * 37) % 100,
      delay: ((i * 13) % 100) / 100,
      duration: spec.weather === "snow" ? 4 + (i % 5) * 0.7 : 0.7 + (i % 4) * 0.2,
      size: spec.weather === "snow" ? 3 + (i % 3) * 2 : 1,
      drift: ((i % 5) - 2) * 12,
    }));
  }, [spec.weather]);

  const styleTag = useMemo(
    () => `
      @keyframes flappy-pop-kf { 0% { transform: scale(1); } 40% { transform: scale(1.35); } 100% { transform: scale(1); } }
      .flappy-score-pop { display: inline-block; animation: flappy-pop-kf 0.28s ease-out; }
      @keyframes flappy-fade-in-kf { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      .flappy-fade-in { animation: flappy-fade-in-kf 0.4s ease-out 0.35s both; }
      @keyframes flappy-card-kf { from { opacity: 0; transform: scale(0.9) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      .flappy-card-in { animation: flappy-card-kf 0.32s cubic-bezier(0.34,1.56,0.64,1); }
      @keyframes flappy-shake-kf { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(3px); } }
      .flappy-shake { animation: flappy-shake-kf 0.4s ease-in-out; }
      @keyframes flappy-bob-kf { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
      .flappy-bob { animation: flappy-bob-kf 1.6s ease-in-out infinite; }
      @keyframes flappy-snow-kf { to { transform: translateY(110%); } }
      @keyframes flappy-rain-kf { to { transform: translateY(110%); } }
    `,
    []
  );

  const showStage = stage && world && view;
  const phase = view?.phase ?? "ready";
  const medal = phase === "gameover" ? medalFor(view?.score ?? 0) : null;

  return (
    <div
      ref={outerRef}
      className="relative h-full w-full touch-none overflow-hidden select-none"
      style={{
        background: `linear-gradient(180deg, ${sky.skyTop} 0%, ${sky.skyBottom} 100%)`,
      }}
      data-testid="flappy-renderer"
    >
      <style>{styleTag}</style>

      {showStage && (
        <div
          className="absolute top-0 h-full overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.25)]"
          style={{ left: stage.left, width: stage.width }}
          onPointerDown={handlePointerDown}
          role="application"
          aria-label={`${spec.title} — tap or press space to flap`}
        >
          <Background
            world={world}
            sky={sky}
            parallaxOffset={view.parallaxOffset}
            showClouds={spec.features.clouds}
          />

          {view.pipes.map((pipe) => (
            <Pipe key={pipe.id} pipe={pipe} world={world} palette={pipePalette} />
          ))}

          <Ground world={world} sky={sky} groundOffset={view.groundOffset} />

          {/* Score particle burst */}
          {view.particles.map((p) => (
            <span
              key={p.id}
              className="pointer-events-none absolute rounded-full"
              style={{
                left: p.x,
                top: p.y,
                width: p.size,
                height: p.size,
                background: p.color,
                opacity: p.life,
                transform: "translate(-50%, -50%)",
              }}
              aria-hidden
            />
          ))}

          <Bird
            world={world}
            y={view.birdY}
            rotation={view.birdRotation}
            squash={view.birdSquash}
            wingPhase={view.wingPhase}
            palette={birdPalette}
          />

          {/* Weather overlay */}
          {weather && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
              {weather.map((flake) => (
                <span
                  key={flake.id}
                  className="absolute top-[-8%] block"
                  style={{
                    left: `${flake.left}%`,
                    width: spec.weather === "snow" ? flake.size : 1.5,
                    height: spec.weather === "snow" ? flake.size : 14,
                    borderRadius: spec.weather === "snow" ? 999 : 2,
                    background:
                      spec.weather === "snow"
                        ? "rgba(255,255,255,0.9)"
                        : "rgba(200,225,255,0.7)",
                    transform: `translateX(${flake.drift}px) rotate(${spec.weather === "rain" ? 12 : 0}deg)`,
                    animation: `${spec.weather === "snow" ? "flappy-snow-kf" : "flappy-rain-kf"} ${flake.duration}s linear ${flake.delay}s infinite`,
                  }}
                />
              ))}
            </div>
          )}

          {phase !== "gameover" && <Score score={view.score} popKey={popKey} />}

          {(phase === "running" || phase === "paused") && (
            <PauseButton paused={phase === "paused"} onToggle={togglePause} />
          )}

          {/* Ready overlay */}
          {phase === "ready" && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <h2
                className="font-heading text-3xl font-black text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.35)]"
                style={{ WebkitTextStroke: "1.5px rgba(0,0,0,0.3)" }}
              >
                {spec.title}
              </h2>
              <div className="flappy-bob mt-2 rounded-full bg-white/85 px-4 py-2 text-sm font-bold text-slate-700 shadow-md backdrop-blur">
                Tap or press Space to flap
              </div>
            </div>
          )}

          {/* Paused overlay */}
          {phase === "paused" && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/35 backdrop-blur-[1px]">
              <span className="font-heading text-3xl font-black text-white drop-shadow">
                Paused
              </span>
            </div>
          )}

          {/* Game over card */}
          {phase === "gameover" && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/35 px-6">
              <div
                key={shakeKey}
                className="flappy-card-in flappy-shake w-full max-w-[18rem] rounded-3xl bg-white/95 p-6 text-center shadow-2xl backdrop-blur"
              >
                <h2 className="font-heading text-2xl font-black text-slate-800">
                  Game Over
                </h2>
                {medal && (
                  <div
                    className="mx-auto mt-3 flex size-14 items-center justify-center rounded-full text-xs font-bold text-slate-800 shadow-inner"
                    style={{
                      background: `radial-gradient(circle at 35% 30%, #ffffff, ${medal.color})`,
                    }}
                  >
                    {medal.label}
                  </div>
                )}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-slate-100 py-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Score
                    </div>
                    <div className="font-heading text-2xl font-black text-slate-800">
                      {view.score}
                    </div>
                  </div>
                  <div className="rounded-xl bg-amber-100 py-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                      Best
                    </div>
                    <div className="font-heading text-2xl font-black text-amber-800">
                      {best}
                    </div>
                  </div>
                </div>
                <div className="mt-5 flex justify-center">
                  <RestartButton onRestart={restart} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

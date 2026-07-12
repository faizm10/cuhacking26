import { birdCollides, type BirdCollisionInfo } from "./Collision";
import {
  createBird,
  flapBird,
  stepBird,
  type BirdBody,
  type PhysicsConfig,
} from "./Physics";
import {
  advancePipes,
  createPipeField,
  deriveWorld,
  type FlappyWorld,
  type PipeField,
  type RandomFn,
} from "./PipeGenerator";
import type { FlappySpec } from "./flappyTypes";

/**
 * The Flappy Bird game state machine + simulation container. Holds the world
 * geometry, the bird, the pipe field, the score, and the phase. Stepping is
 * deterministic given an injectable RNG, so it can be unit-tested frame by
 * frame with no DOM.
 */

export type FlappyPhase = "ready" | "running" | "paused" | "gameover";

export interface FlappySim {
  world: FlappyWorld;
  bird: BirdBody;
  field: PipeField;
  physics: PhysicsConfig;
  collision: BirdCollisionInfo;
  phase: FlappyPhase;
  score: number;
  /** Seconds since the round started running — drives moving pipes. */
  elapsed: number;
  /** Total ground scroll offset, world px — for the seamless ground tile. */
  groundOffset: number;
  /** Total background scroll offset, world px — for parallax clouds. */
  parallaxOffset: number;
  rand: RandomFn;
}

/** Vertical center the bird starts at — middle of the playable area. */
export function spawnY(world: FlappyWorld): number {
  return world.playableHeight / 2;
}

/** Build a fresh, ready-to-play simulation for an already-derived world. */
export function createSimForWorld(
  world: FlappyWorld,
  rand: RandomFn = Math.random
): FlappySim {
  const physics: PhysicsConfig = {
    gravity: world.gravity,
    flapStrength: world.flapStrength,
    terminalVelocity: world.terminalVelocity,
  };
  const collision: BirdCollisionInfo = {
    birdX: world.birdX,
    birdWidth: world.birdWidth,
    birdHeight: world.birdHeight,
    pipeWidth: world.pipeWidth,
    playableHeight: world.playableHeight,
  };
  return {
    world,
    bird: createBird(spawnY(world)),
    field: createPipeField(world, rand),
    physics,
    collision,
    phase: "ready",
    score: 0,
    elapsed: 0,
    groundOffset: 0,
    parallaxOffset: 0,
    rand,
  };
}

/** Build a fresh, ready-to-play simulation for a canvas size + spec. */
export function createSim(
  width: number,
  height: number,
  spec: FlappySpec,
  rand: RandomFn = Math.random
): FlappySim {
  return createSimForWorld(deriveWorld(width, height, spec), rand);
}

/** Result of a single simulation step, for the renderer to react to. */
export interface StepResult {
  /** True on the exact frame the bird died. */
  justDied: boolean;
  /** Points scored on this frame (0 or 1 per passed pipe). */
  scored: number;
}

/**
 * Flap: starts the round from "ready", applies the impulse while "running",
 * and does nothing while paused or after game over.
 */
export function flap(sim: FlappySim): boolean {
  if (sim.phase === "ready") {
    sim.phase = "running";
    sim.bird = flapBird(sim.bird, sim.physics.flapStrength);
    return true;
  }
  if (sim.phase === "running") {
    sim.bird = flapBird(sim.bird, sim.physics.flapStrength);
    return true;
  }
  return false;
}

export function pause(sim: FlappySim): void {
  if (sim.phase === "running") sim.phase = "paused";
}

export function resume(sim: FlappySim): void {
  if (sim.phase === "paused") sim.phase = "running";
}

/**
 * Advance the simulation by `dt` seconds. Before the first flap the bird hovers
 * (a gentle idle bob) and the world is still. While running it applies physics,
 * scrolls pipes/ground, scores passed pipes, and detects death. Mutates `sim`.
 */
export function stepSim(sim: FlappySim, dt: number): StepResult {
  if (sim.phase === "ready") {
    // Idle hover — a soft sine bob so the ready screen feels alive.
    sim.elapsed += dt;
    const rest = spawnY(sim.world);
    sim.bird = {
      ...sim.bird,
      y: rest + Math.sin(sim.elapsed * 2.2) * sim.world.birdHeight * 0.28,
      rotation: 0,
    };
    return { justDied: false, scored: 0 };
  }

  if (sim.phase !== "running") {
    return { justDied: false, scored: 0 };
  }

  sim.elapsed += dt;
  sim.groundOffset += sim.world.scrollSpeed * dt;
  sim.parallaxOffset += sim.world.scrollSpeed * 0.35 * dt;

  sim.bird = stepBird(sim.bird, dt, sim.physics);
  advancePipes(sim.field, sim.world, dt, sim.elapsed, sim.rand);

  // Scoring: a pipe is cleared when its right edge passes the bird's center.
  let scored = 0;
  const clearX = sim.world.birdX;
  for (const pipe of sim.field.pipes) {
    if (!pipe.passed && pipe.x + sim.world.pipeWidth < clearX) {
      pipe.passed = true;
      scored += 1;
    }
  }
  sim.score += scored;

  const dead = birdCollides(sim.bird.y, sim.field.pipes, sim.collision);
  if (dead) {
    sim.phase = "gameover";
    // Pin the bird to the ground if it fell through.
    const maxY = sim.world.playableHeight - sim.world.birdHeight / 2;
    if (sim.bird.y > maxY) sim.bird = { ...sim.bird, y: maxY, vy: 0 };
    return { justDied: true, scored };
  }

  return { justDied: false, scored };
}

/* ------------------------------------------------------------------ */
/* Best-score persistence                                              */
/* ------------------------------------------------------------------ */

export const FLAPPY_BEST_KEY = "playbox-flappy-best";

export function loadBestScore(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(FLAPPY_BEST_KEY);
    const n = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Persist `score` if it beats the stored best. Returns the new best. */
export function saveBestScore(score: number): number {
  const best = Math.max(loadBestScore(), Math.max(0, Math.floor(score)));
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(FLAPPY_BEST_KEY, String(best));
    } catch {
      // Storage may be unavailable (private mode) — best stays in memory.
    }
  }
  return best;
}

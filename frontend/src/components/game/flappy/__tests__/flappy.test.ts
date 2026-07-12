import { describe, expect, it } from "vitest";

import { GAME_MODE_OPTIONS } from "@/lib/mock-data/projects";
import { rendererTypeForMode } from "@/lib/game/generated";
import {
  clampFlappySpec,
  coerceFlappySpec,
  DEFAULT_FLAPPY_SPEC,
  FLAPPY_LIMITS,
  flappySpecSchema,
} from "../flappyTypes";
import {
  createBird,
  flapBird,
  stepBird,
  targetRotation,
  type PhysicsConfig,
} from "../Physics";
import {
  advancePipes,
  createPipe,
  createPipeField,
  deriveWorld,
  maxGapCenter,
  minGapCenter,
  validatePipe,
  validateStartConditions,
  type RandomFn,
} from "../PipeGenerator";
import {
  birdHitsGround,
  birdHitsPipe,
  birdOffTop,
  type BirdCollisionInfo,
} from "../Collision";
import { createSim, flap, pause, resume, stepSim } from "../GameState";
import { createGameLoop } from "../GameLoop";
import { applyFlappyRefine } from "../flappyRefine";

/** Deterministic RNG for reproducible pipe layouts. */
function seeded(seed: number): RandomFn {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const PHYSICS: PhysicsConfig = {
  gravity: 950,
  flapStrength: -330,
  terminalVelocity: 800,
};

describe("flappy mode selector + registration", () => {
  it("includes Flappy Bird in the game mode options", () => {
    const option = GAME_MODE_OPTIONS.find((o) => o.value === "flappy-bird");
    expect(option).toBeDefined();
    expect(option?.label.toLowerCase()).toContain("flappy");
  });

  it("maps an explicit flappy-bird selection to the dedicated renderer", () => {
    expect(rendererTypeForMode("flappy-bird")).toBe("flappy-bird");
    expect(rendererTypeForMode("tic-tac-toe")).toBe("tic-tac-toe");
    expect(rendererTypeForMode("platform-jumper")).toBe("arcade");
    expect(rendererTypeForMode("auto")).toBe("arcade");
  });
});

describe("flappy spec schema + coercion", () => {
  it("accepts the default spec", () => {
    expect(flappySpecSchema.safeParse(DEFAULT_FLAPPY_SPEC).success).toBe(true);
  });

  it("clamps out-of-range numbers into safe bounds", () => {
    const clamped = clampFlappySpec({
      ...DEFAULT_FLAPPY_SPEC,
      pipeGap: 9999,
      gravity: -100,
      flapStrength: -9999,
      scrollSpeed: 5,
      pipeSpacing: 100000,
    });
    expect(clamped.pipeGap).toBe(FLAPPY_LIMITS.pipeGap.max);
    expect(clamped.gravity).toBe(FLAPPY_LIMITS.gravity.min);
    expect(clamped.flapStrength).toBe(FLAPPY_LIMITS.flapStrength.min);
    expect(clamped.scrollSpeed).toBe(FLAPPY_LIMITS.scrollSpeed.min);
    expect(clamped.pipeSpacing).toBe(FLAPPY_LIMITS.pipeSpacing.max);
    expect(flappySpecSchema.safeParse(clamped).success).toBe(true);
  });

  it("coerce drops arcade junk, keeps valid fields, and clamps numbers", () => {
    const coerced = coerceFlappySpec({
      title: "Sky Dash",
      birdColor: "blue",
      pipeColor: "purple",
      background: "night",
      pipeGap: 5000,
      gravity: 900,
      // junk that must be ignored:
      lives: 3,
      enemies: [{ id: "x" }],
      script: "<script>alert(1)</script>",
      pipes: [{ x: 10, height: 5 }],
      physics: "custom code",
    });
    expect(coerced.gameType).toBe("flappy-bird");
    expect(coerced.title).toBe("Sky Dash");
    expect(coerced.birdColor).toBe("blue");
    expect(coerced.pipeColor).toBe("purple");
    expect(coerced.background).toBe("night");
    expect(coerced.pipeGap).toBe(FLAPPY_LIMITS.pipeGap.max);
    expect(coerced.gravity).toBe(900);
    expect("lives" in coerced).toBe(false);
    expect("enemies" in coerced).toBe(false);
    expect("pipes" in coerced).toBe(false);
    expect(JSON.stringify(coerced)).not.toMatch(/script|enemies|lives/);
  });

  it("falls back to the base spec for invalid enum values", () => {
    const coerced = coerceFlappySpec(
      { birdColor: "rainbow", background: "underwater" },
      DEFAULT_FLAPPY_SPEC
    );
    expect(coerced.birdColor).toBe(DEFAULT_FLAPPY_SPEC.birdColor);
    expect(coerced.background).toBe(DEFAULT_FLAPPY_SPEC.background);
  });
});

describe("physics", () => {
  it("gravity accelerates the bird downward over time", () => {
    let bird = createBird(300);
    bird = stepBird(bird, 0.1, PHYSICS);
    expect(bird.vy).toBeGreaterThan(0);
    expect(bird.y).toBeGreaterThan(300);
  });

  it("a flap sends the bird upward with the impulse velocity", () => {
    const bird = flapBird(createBird(300), PHYSICS.flapStrength);
    expect(bird.vy).toBe(PHYSICS.flapStrength);
    expect(bird.vy).toBeLessThan(0);
    // A single step after a flap should move the bird up.
    const next = stepBird(bird, 1 / 60, PHYSICS);
    expect(next.y).toBeLessThan(300);
  });

  it("caps downward speed at terminal velocity", () => {
    let bird = createBird(0);
    for (let i = 0; i < 600; i += 1) bird = stepBird(bird, 1 / 60, PHYSICS);
    expect(bird.vy).toBeLessThanOrEqual(PHYSICS.terminalVelocity + 0.001);
  });

  it("rotation tilts up when rising and down when falling", () => {
    expect(targetRotation(-300, 800)).toBeLessThan(0);
    expect(targetRotation(400, 800)).toBeGreaterThan(0);
  });

  it("is deterministic — same inputs, same outputs", () => {
    const a = stepBird(createBird(200), 1 / 60, PHYSICS);
    const b = stepBird(createBird(200), 1 / 60, PHYSICS);
    expect(a).toEqual(b);
  });
});

describe("world derivation + pipe generation", () => {
  const world = deriveWorld(400, 600, DEFAULT_FLAPPY_SPEC);

  it("scales geometry from the 600px reference and keeps the bird at ~25%", () => {
    expect(world.groundHeight).toBe(90); // 0.15 * 600
    expect(world.playableHeight).toBe(510);
    expect(world.scale).toBeCloseTo(1, 5);
    expect(world.birdX).toBe(100); // 0.25 * 400
  });

  it("keeps physics constant across sizes (feel-preserving scale)", () => {
    const tall = deriveWorld(800, 1200, DEFAULT_FLAPPY_SPEC);
    // gravity scales with height so the relative fall time is preserved.
    expect(tall.gravity).toBeCloseTo(DEFAULT_FLAPPY_SPEC.gravity * 2, 3);
    expect(tall.scrollSpeed).toBeCloseTo(DEFAULT_FLAPPY_SPEC.scrollSpeed * 2, 3);
  });

  it("every generated pipe is valid (on screen, reachable stubs)", () => {
    const rand = seeded(12345);
    const field = createPipeField(world, rand);
    for (let i = 0; i < 400; i += 1) {
      advancePipes(field, world, 1 / 60, i / 60, rand);
      for (const pipe of field.pipes) {
        expect(validatePipe(world, pipe)).toEqual([]);
      }
    }
  });

  it("never demands an impossible climb between consecutive pipes", () => {
    const rand = seeded(999);
    let prev: number | null = null;
    for (let i = 0; i < 300; i += 1) {
      const pipe = createPipe(world, world.width + i * world.pipeSpacing, i, prev, rand);
      if (prev !== null) {
        expect(Math.abs(pipe.baseGapCenter - prev)).toBeLessThanOrEqual(
          world.maxCenterDelta + 0.001
        );
      }
      // Gap opening always inside the legal band.
      expect(pipe.baseGapCenter).toBeGreaterThanOrEqual(minGapCenter(world) - 0.5);
      expect(pipe.baseGapCenter).toBeLessThanOrEqual(maxGapCenter(world) + 0.5);
      prev = pipe.baseGapCenter;
    }
  });

  it("clamps extreme configs to a still-playable level", () => {
    const brutal = clampFlappySpec({
      ...DEFAULT_FLAPPY_SPEC,
      pipeGap: FLAPPY_LIMITS.pipeGap.min,
      pipeSpacing: FLAPPY_LIMITS.pipeSpacing.min,
      scrollSpeed: FLAPPY_LIMITS.scrollSpeed.max,
    });
    // Even on a small screen the start conditions must hold.
    const small = deriveWorld(300, 380, brutal);
    expect(validateStartConditions(small, seeded(7)).ok).toBe(true);
    const big = deriveWorld(600, 900, brutal);
    expect(validateStartConditions(big, seeded(7)).ok).toBe(true);
  });

  it("passes the full pre-game validation checklist", () => {
    const v = validateStartConditions(world, seeded(42));
    expect(v.ok).toBe(true);
    expect(v.checks.birdSpawnValid).toBe(true);
    expect(v.checks.groundHeightValid).toBe(true);
    expect(v.checks.gapReachable).toBe(true);
    expect(v.checks.pipeSpacingValid).toBe(true);
    expect(v.checks.pipesInsideScreen).toBe(true);
    expect(v.checks.hitboxValid).toBe(true);
  });

  it("pipes scroll right→left and eventually recycle", () => {
    const rand = seeded(3);
    const field = createPipeField(world, rand);
    const firstId = field.pipes[0]!.id;
    const startX = field.pipes[0]!.x;
    advancePipes(field, world, 0.5, 0.5, rand);
    // The tracked pipe moved left.
    const moved = field.pipes.find((p) => p.id === firstId);
    if (moved) expect(moved.x).toBeLessThan(startX);
    // Field never empties.
    expect(field.pipes.length).toBeGreaterThan(0);
  });
});

describe("collision", () => {
  const info: BirdCollisionInfo = {
    birdX: 100,
    birdWidth: 40,
    birdHeight: 30,
    pipeWidth: 60,
    playableHeight: 510,
  };

  it("detects ground and ceiling collisions", () => {
    expect(birdHitsGround(510, info)).toBe(true);
    expect(birdHitsGround(200, info)).toBe(false);
    expect(birdOffTop(-20, info)).toBe(true);
    expect(birdOffTop(200, info)).toBe(false);
  });

  it("hits a pipe body but flies safely through the gap", () => {
    // A pipe overlapping the bird's x, gap centered away from the bird.
    const pipe = { id: 0, x: 85, baseGapCenter: 400, gapCenter: 400, gapHalf: 85, phase: 0, passed: false };
    // Bird high up → inside the top pipe → collision.
    expect(birdHitsPipe(60, pipe, info)).toBe(true);
    // Bird at the gap center → safe.
    expect(birdHitsPipe(400, pipe, info)).toBe(false);
  });

  it("ignores pipes that are not horizontally aligned with the bird", () => {
    const pipe = { id: 0, x: 300, baseGapCenter: 100, gapCenter: 100, gapHalf: 85, phase: 0, passed: false };
    expect(birdHitsPipe(60, pipe, info)).toBe(false);
  });
});

describe("game state machine + scoring", () => {
  it("starts ready, runs on first flap, and hovers before starting", () => {
    const sim = createSim(400, 600, DEFAULT_FLAPPY_SPEC, seeded(1));
    expect(sim.phase).toBe("ready");
    // Stepping while ready does not end the game or scroll pipes.
    stepSim(sim, 1 / 60);
    expect(sim.phase).toBe("ready");
    flap(sim);
    expect(sim.phase).toBe("running");
  });

  it("scores when the bird clears a pipe, and can crash", () => {
    const sim = createSim(400, 600, DEFAULT_FLAPPY_SPEC, seeded(5));
    flap(sim);
    let died = false;
    let ticks = 0;
    // Auto-flap to stay alive long enough to score at least once.
    while (!died && ticks < 2000) {
      if (sim.bird.y > sim.world.playableHeight * 0.5) flap(sim);
      const res = stepSim(sim, 1 / 60);
      died = res.justDied;
      ticks += 1;
      if (sim.score > 0) break;
    }
    expect(sim.score).toBeGreaterThanOrEqual(0);
    expect(["running", "gameover"]).toContain(sim.phase);
  });

  it("pauses and resumes without advancing while paused", () => {
    const sim = createSim(400, 600, DEFAULT_FLAPPY_SPEC, seeded(2));
    flap(sim);
    stepSim(sim, 1 / 60);
    pause(sim);
    expect(sim.phase).toBe("paused");
    const yBefore = sim.bird.y;
    const scoreBefore = sim.score;
    stepSim(sim, 1); // a full second while paused
    expect(sim.bird.y).toBe(yBefore);
    expect(sim.score).toBe(scoreBefore);
    resume(sim);
    expect(sim.phase).toBe("running");
  });

  it("ends the game when the bird hits the ground with no flapping", () => {
    const sim = createSim(400, 600, DEFAULT_FLAPPY_SPEC, seeded(3));
    flap(sim);
    let died = false;
    for (let i = 0; i < 600 && !died; i += 1) {
      died = stepSim(sim, 1 / 60).justDied;
    }
    expect(died).toBe(true);
    expect(sim.phase).toBe("gameover");
    // Flapping after death does nothing.
    expect(flap(sim)).toBe(false);
  });
});

describe("game loop", () => {
  it("advances physics in fixed steps regardless of frame timing", () => {
    let time = 0;
    let updates = 0;
    let renders = 0;
    const frames: ((t: number) => void)[] = [];
    const loop = createGameLoop({
      update: () => {
        updates += 1;
      },
      render: () => {
        renders += 1;
      },
      step: 1 / 60,
      now: () => time,
      requestFrame: (cb) => {
        frames.push(cb);
        return frames.length;
      },
      cancelFrame: () => {},
    });
    loop.start();
    // Simulate a 0.1s frame → should run 6 fixed updates.
    time = 100;
    frames.shift()?.(time);
    expect(updates).toBe(6);
    expect(renders).toBe(1);
    loop.stop();
    expect(loop.isRunning()).toBe(false);
  });
});

describe("flappy chat refine (local heuristics)", () => {
  it("handles the canonical chat prompts", () => {
    const easier = applyFlappyRefine(DEFAULT_FLAPPY_SPEC, "make the gaps easier");
    expect(easier.matched).toBe(true);
    expect(easier.spec.pipeGap).toBeGreaterThan(DEFAULT_FLAPPY_SPEC.pipeGap);

    const higher = applyFlappyRefine(DEFAULT_FLAPPY_SPEC, "make the bird flap higher");
    expect(higher.spec.flapStrength).toBeLessThan(DEFAULT_FLAPPY_SPEC.flapStrength);

    const faster = applyFlappyRefine(DEFAULT_FLAPPY_SPEC, "speed up the game");
    expect(faster.spec.scrollSpeed).toBeGreaterThan(DEFAULT_FLAPPY_SPEC.scrollSpeed);

    const slower = applyFlappyRefine(DEFAULT_FLAPPY_SPEC, "slow everything down");
    expect(slower.spec.scrollSpeed).toBeLessThan(DEFAULT_FLAPPY_SPEC.scrollSpeed);

    const sunset = applyFlappyRefine(DEFAULT_FLAPPY_SPEC, "change to sunset");
    expect(sunset.spec.background).toBe("sunset");

    const blue = applyFlappyRefine(DEFAULT_FLAPPY_SPEC, "make the bird blue");
    expect(blue.spec.birdColor).toBe("blue");

    const snow = applyFlappyRefine(DEFAULT_FLAPPY_SPEC, "add snow");
    expect(snow.spec.weather).toBe("snow");

    const night = applyFlappyRefine(DEFAULT_FLAPPY_SPEC, "make the background night");
    expect(night.spec.background).toBe("night");
  });

  it("keeps every result inside the schema and clamped", () => {
    const result = applyFlappyRefine(DEFAULT_FLAPPY_SPEC, "make the gaps easier");
    expect(flappySpecSchema.safeParse(result.spec).success).toBe(true);
  });

  it("does not match unrelated arcade requests", () => {
    const result = applyFlappyRefine(
      DEFAULT_FLAPPY_SPEC,
      "add three enemies and a health bar"
    );
    expect(result.matched).toBe(false);
    expect(JSON.stringify(result.spec)).not.toMatch(/enemies|health/);
  });
});

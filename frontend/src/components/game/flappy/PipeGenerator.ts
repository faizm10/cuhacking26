import { clamp, type FlappySpec } from "./flappyTypes";

/**
 * Pipe generation + level geometry. This module owns the single most important
 * gameplay guarantee: **the generated level is always beatable.**
 *
 * Design constants (gravity, gap, spacing, scroll speed) arrive tuned for a
 * 600px-tall reference world. `deriveWorld` scales them to the real canvas so
 * the game feels identical at any size, then every pipe is clamped so its
 * opening is reachable from the previous one and both halves stay on screen.
 */

/** Reference height the config values are authored against. */
export const REFERENCE_HEIGHT = 600;

export interface FlappyWorld {
  width: number;
  height: number;
  /** Height of the scrolling ground strip. */
  groundHeight: number;
  /** Vertical span the bird can occupy (height - groundHeight). */
  playableHeight: number;
  /** Scale factor vs. the 600px reference world. */
  scale: number;

  // Bird geometry (bird never moves horizontally).
  birdX: number;
  birdWidth: number;
  birdHeight: number;

  // Scaled physics (px, px/s, px/s²).
  scrollSpeed: number;
  gravity: number;
  flapStrength: number;
  terminalVelocity: number;

  // Pipe geometry (all in real world px).
  pipeWidth: number;
  pipeGap: number;
  pipeSpacing: number;
  /** Smallest pipe stub allowed on either side of the gap. */
  minPipe: number;
  /** Max change in gap-center between consecutive pipes (reachability cap). */
  maxCenterDelta: number;
  /** Vertical bob amplitude for moving pipes (0 when disabled). */
  driftAmplitude: number;
}

export interface Pipe {
  id: number;
  /** Left edge of the pipe, world px. Decreases as the world scrolls. */
  x: number;
  /** Vertical center of the gap (before any bob), world px. */
  baseGapCenter: number;
  /** Current vertical center of the gap including bob, world px. */
  gapCenter: number;
  /** Half the gap opening, world px. */
  gapHalf: number;
  /** Phase offset for the bob animation. */
  phase: number;
  /** Set true once the bird has fully passed it — used for scoring. */
  passed: boolean;
}

export type RandomFn = () => number;

/**
 * Derive all level geometry and scaled physics for a canvas of `width`×
 * `height`, from a validated (already clamped) spec.
 */
export function deriveWorld(
  width: number,
  height: number,
  spec: FlappySpec
): FlappyWorld {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const scale = h / REFERENCE_HEIGHT;

  const groundHeight = clamp(Math.round(h * 0.15), 54, 140);
  const playableHeight = h - groundHeight;

  const birdRadius = clamp(Math.round(h * 0.032), 12, 30);
  const birdWidth = Math.round(birdRadius * 2.3);
  const birdHeight = Math.round(birdRadius * 1.85);
  const birdX = clamp(Math.round(w * 0.25), birdWidth, w * 0.4);

  const scrollSpeed = spec.scrollSpeed * scale;
  const gravity = spec.gravity * scale;
  const flapStrength = spec.flapStrength * scale;
  const terminalVelocity = Math.abs(flapStrength) * 2.4;

  const pipeWidth = clamp(Math.round(w * 0.16), 46, 104);

  // Smallest stub of pipe that must remain on each side of the gap so pipes
  // are never absurdly short and the opening never touches an edge.
  const minPipe = clamp(Math.round(playableHeight * 0.08), 20, 90);

  // Gap: start from the (scaled) request, then constrain so BOTH pipe stubs
  // clear `minPipe`, and so the opening is never tighter than the bird needs.
  const maxGap = playableHeight - minPipe * 2;
  const minGap = Math.min(maxGap, Math.max(birdHeight * 3, 120 * scale));
  const pipeGap = clamp(spec.pipeGap * scale, minGap, Math.max(minGap, maxGap));

  // Spacing scales too, with a floor of ~1.6 pipe widths so pipes never touch.
  const pipeSpacing = Math.max(
    pipeWidth * 1.8 + pipeGap * 0.2,
    spec.pipeSpacing * scale
  );

  // Reachability: over the time between two pipes the bird can only climb or
  // fall so far. Cap the change in gap-center to what a player can actually
  // clear, using a conservative fraction of the achievable travel.
  const timeBetween = pipeSpacing / scrollSpeed;
  const climbReach = Math.abs(flapStrength) * timeBetween * 0.62;
  const fallReach = 0.5 * gravity * timeBetween * timeBetween;
  const physicalReach = Math.min(climbReach, fallReach);
  const maxCenterDelta = clamp(
    physicalReach,
    pipeGap * 0.35,
    playableHeight * 0.5
  );

  const driftAmplitude = spec.features.movingPipes
    ? clamp(pipeGap * 0.18, 0, (playableHeight - pipeGap) / 2 - minPipe)
    : 0;

  return {
    width: w,
    height: h,
    groundHeight,
    playableHeight,
    scale,
    birdX,
    birdWidth,
    birdHeight,
    scrollSpeed,
    gravity,
    flapStrength,
    terminalVelocity,
    pipeWidth,
    pipeGap,
    pipeSpacing,
    minPipe,
    maxCenterDelta,
    driftAmplitude,
  };
}

/** Lowest legal gap-center (keeps the top stub ≥ minPipe). */
export function minGapCenter(world: FlappyWorld): number {
  return world.minPipe + world.pipeGap / 2 + world.driftAmplitude;
}

/** Highest legal gap-center (keeps the bottom stub ≥ minPipe). */
export function maxGapCenter(world: FlappyWorld): number {
  return (
    world.playableHeight - world.minPipe - world.pipeGap / 2 - world.driftAmplitude
  );
}

/**
 * Pick a gap-center for the next pipe. It stays inside the legal band AND
 * within `maxCenterDelta` of the previous center, so the level can never
 * demand an impossible climb. `rand` is injectable for deterministic tests.
 */
export function pickGapCenter(
  world: FlappyWorld,
  previousCenter: number | null,
  rand: RandomFn = Math.random
): number {
  const lo = minGapCenter(world);
  const hi = maxGapCenter(world);
  if (hi <= lo) return (lo + hi) / 2;

  let lowerBound = lo;
  let upperBound = hi;
  if (previousCenter !== null) {
    lowerBound = Math.max(lo, previousCenter - world.maxCenterDelta);
    upperBound = Math.min(hi, previousCenter + world.maxCenterDelta);
    if (upperBound <= lowerBound) {
      // Reachable band collapsed to a point — clamp toward the previous center.
      return clamp(previousCenter, lo, hi);
    }
  }
  return lowerBound + rand() * (upperBound - lowerBound);
}

/** Build a single validated pipe at horizontal position `x`. */
export function createPipe(
  world: FlappyWorld,
  x: number,
  id: number,
  previousCenter: number | null,
  rand: RandomFn = Math.random
): Pipe {
  const baseGapCenter = pickGapCenter(world, previousCenter, rand);
  return {
    id,
    x,
    baseGapCenter,
    gapCenter: baseGapCenter,
    gapHalf: world.pipeGap / 2,
    phase: rand() * Math.PI * 2,
    passed: false,
  };
}

/** Runtime pipe field: the live pipes plus the id counter and last center. */
export interface PipeField {
  pipes: Pipe[];
  nextId: number;
  lastCenter: number | null;
}

/**
 * Seed the initial pipe field. The first pipe spawns a comfortable distance
 * to the right of the bird so the player always gets a beat to react.
 */
export function createPipeField(
  world: FlappyWorld,
  rand: RandomFn = Math.random
): PipeField {
  const field: PipeField = { pipes: [], nextId: 0, lastCenter: null };
  const firstX = world.width + world.pipeWidth;
  const count = Math.ceil(world.width / world.pipeSpacing) + 2;
  for (let i = 0; i < count; i += 1) {
    const x = firstX + i * world.pipeSpacing;
    const pipe = createPipe(world, x, field.nextId, field.lastCenter, rand);
    field.pipes.push(pipe);
    field.lastCenter = pipe.baseGapCenter;
    field.nextId += 1;
  }
  return field;
}

/**
 * Advance every pipe left by `scrollSpeed * dt`, apply the optional bob,
 * cull pipes that have scrolled off the left edge, and spawn new ones on the
 * right so the field never runs dry. Mutates `field` in place for the loop.
 * `elapsed` (seconds) drives the deterministic bob.
 */
export function advancePipes(
  field: PipeField,
  world: FlappyWorld,
  dt: number,
  elapsed: number,
  rand: RandomFn = Math.random
): void {
  const dx = world.scrollSpeed * dt;
  for (const pipe of field.pipes) {
    pipe.x -= dx;
    pipe.gapCenter =
      world.driftAmplitude > 0
        ? pipe.baseGapCenter +
          Math.sin(elapsed * 1.4 + pipe.phase) * world.driftAmplitude
        : pipe.baseGapCenter;
  }

  // Cull fully off-screen pipes from the front.
  while (field.pipes.length > 0 && field.pipes[0]!.x + world.pipeWidth < -8) {
    field.pipes.shift();
  }

  // Spawn on the right until we have coverage past the edge.
  let last = field.pipes[field.pipes.length - 1];
  const spawnEdge = world.width + world.pipeWidth;
  while (!last || last.x <= spawnEdge - world.pipeSpacing) {
    const x = (last?.x ?? spawnEdge - world.pipeSpacing) + world.pipeSpacing;
    const pipe = createPipe(world, x, field.nextId, field.lastCenter, rand);
    field.pipes.push(pipe);
    field.lastCenter = pipe.baseGapCenter;
    field.nextId += 1;
    last = pipe;
  }
}

/**
 * Validate a single pipe against the world. Returns the list of violated
 * invariants (empty = valid). Used by tests and as a dev-time assertion.
 */
export function validatePipe(world: FlappyWorld, pipe: Pipe): string[] {
  const issues: string[] = [];
  const gapTop = pipe.gapCenter - pipe.gapHalf;
  const gapBottom = pipe.gapCenter + pipe.gapHalf;

  if (!Number.isFinite(pipe.x)) issues.push("pipe x is not finite");
  if (pipe.gapHalf * 2 < world.pipeGap - 1) {
    issues.push("gap smaller than configured");
  }
  if (gapTop < world.minPipe - 0.5) {
    issues.push("top pipe shorter than minimum");
  }
  if (gapBottom > world.playableHeight - world.minPipe + 0.5) {
    issues.push("bottom pipe shorter than minimum");
  }
  if (gapTop < 0 || gapBottom > world.playableHeight) {
    issues.push("gap opening outside the playable area");
  }
  return issues;
}

export interface StartValidation {
  ok: boolean;
  checks: {
    birdSpawnValid: boolean;
    groundHeightValid: boolean;
    gapReachable: boolean;
    pipeSpacingValid: boolean;
    pipesInsideScreen: boolean;
    hitboxValid: boolean;
  };
  issues: string[];
}

/**
 * Pre-game validation checklist — run before starting every game. Confirms the
 * bird spawn, ground, gap, spacing, on-screen pipes, and hitboxes are all
 * sane for the derived world. Because `deriveWorld` clamps everything, this
 * should always pass; it exists to catch regressions loudly.
 */
export function validateStartConditions(
  world: FlappyWorld,
  rand: RandomFn = Math.random
): StartValidation {
  const issues: string[] = [];

  const birdSpawnCenter = world.playableHeight / 2;
  const birdSpawnValid =
    world.birdX > world.birdWidth / 2 &&
    world.birdX < world.width &&
    birdSpawnCenter - world.birdHeight / 2 > 0 &&
    birdSpawnCenter + world.birdHeight / 2 < world.playableHeight;
  if (!birdSpawnValid) issues.push("bird spawn is invalid");

  const groundHeightValid =
    world.groundHeight > 0 && world.groundHeight < world.height * 0.4;
  if (!groundHeightValid) issues.push("ground height is invalid");

  const gapReachable =
    world.pipeGap > world.birdHeight * 1.5 &&
    world.pipeGap <= world.playableHeight - world.minPipe * 2 + 0.5 &&
    maxGapCenter(world) >= minGapCenter(world);
  if (!gapReachable) issues.push("pipe gap is not reachable");

  const pipeSpacingValid = world.pipeSpacing > world.pipeWidth * 1.5;
  if (!pipeSpacingValid) issues.push("pipe spacing is too tight");

  // Sample a field and validate every pipe stays inside the screen.
  const field = createPipeField(world, rand);
  const pipeIssues = field.pipes.flatMap((pipe) => validatePipe(world, pipe));
  const pipesInsideScreen = pipeIssues.length === 0;
  if (!pipesInsideScreen) issues.push(...pipeIssues.slice(0, 3));

  const hitboxValid =
    world.birdWidth > 2 &&
    world.birdHeight > 2 &&
    world.birdWidth < world.pipeSpacing;
  if (!hitboxValid) issues.push("bird hitbox is invalid");

  const checks = {
    birdSpawnValid,
    groundHeightValid,
    gapReachable,
    pipeSpacingValid,
    pipesInsideScreen,
    hitboxValid,
  };
  return { ok: Object.values(checks).every(Boolean), checks, issues };
}

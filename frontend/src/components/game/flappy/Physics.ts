/**
 * Deterministic Flappy Bird physics. Pure functions only — no globals, no
 * randomness, no time source. Given the same inputs they always produce the
 * same output, which is what makes the engine testable and reproducible.
 *
 * The bird NEVER moves horizontally. Only its vertical position (`y`) and
 * vertical velocity (`vy`) evolve; the world scrolls past it instead.
 */

export interface BirdBody {
  /** Vertical center of the bird, in world pixels (0 = top). */
  y: number;
  /** Vertical velocity, px/s. Negative is up. */
  vy: number;
  /** Eased render rotation in degrees. Negative tilts the beak up. */
  rotation: number;
  /** 0 → rest, 1 → fully squashed. Decays after a flap for the squash pop. */
  squash: number;
}

export interface PhysicsConfig {
  /** Downward acceleration, px/s². */
  gravity: number;
  /** Upward impulse applied on a flap, px/s (negative = up). */
  flapStrength: number;
  /** Hard cap on downward speed so falls never feel out of control. */
  terminalVelocity: number;
}

const MAX_TILT_UP = -26;
const MAX_TILT_DOWN = 82;
/** How fast the render rotation eases toward its target (per second). */
const ROTATION_EASE = 9;

export function createBird(y: number): BirdBody {
  return { y, vy: 0, rotation: 0, squash: 0 };
}

/**
 * Target beak angle for a given velocity. Rising → tilt up; the faster the
 * fall, the more it noses down toward the terminal-velocity limit.
 */
export function targetRotation(vy: number, terminalVelocity: number): number {
  if (vy < 0) {
    // Rising: scale from 0 up to the flap's peak upward tilt.
    const t = Math.min(1, -vy / 320);
    return MAX_TILT_UP * t;
  }
  const t = Math.min(1, vy / terminalVelocity);
  return MAX_TILT_DOWN * t;
}

/**
 * Advance the bird by `dt` seconds under gravity. Returns a new body; never
 * mutates the input. Rotation eases toward its velocity-derived target and
 * the squash effect decays back to rest.
 */
export function stepBird(
  bird: BirdBody,
  dt: number,
  config: PhysicsConfig
): BirdBody {
  const vy = Math.min(
    config.terminalVelocity,
    bird.vy + config.gravity * dt
  );
  const y = bird.y + vy * dt;

  const target = targetRotation(vy, config.terminalVelocity);
  const easeAmount = Math.min(1, dt * ROTATION_EASE);
  const rotation = bird.rotation + (target - bird.rotation) * easeAmount;

  // Squash relaxes back to rest over ~180ms.
  const squash = Math.max(0, bird.squash - dt * 5.5);

  return { y, vy, rotation, squash };
}

/**
 * Apply a flap: snap the vertical velocity to the (upward) impulse, tilt the
 * beak up immediately, and trigger a squash pop.
 */
export function flapBird(bird: BirdBody, flapStrength: number): BirdBody {
  return {
    y: bird.y,
    vy: flapStrength,
    rotation: MAX_TILT_UP,
    squash: 1,
  };
}

/** Non-linear squash → (scaleX, scaleY) for the render. Volume-preserving-ish. */
export function squashScale(squash: number): { scaleX: number; scaleY: number } {
  const s = Math.max(0, Math.min(1, squash));
  return { scaleX: 1 + 0.12 * s, scaleY: 1 - 0.16 * s };
}

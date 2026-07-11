/**
 * Arcade platformer movement — accel, coyote time, jump buffer, variable
 * jump height, and terminal velocity. Driven by GameSpec player.speed /
 * jumpStrength so AI/chat dials still work without new schema fields.
 */

export const PLATFORMER_FEEL = {
  /** Seconds after leaving ground where a jump still works. */
  coyoteTime: 0.1,
  /** Seconds a jump press is remembered before landing. */
  jumpBuffer: 0.12,
  /** Multiply rising vy when jump is released early (short hop). */
  jumpCut: 0.42,
  /** Ground acceleration as a fraction of max speed per second. */
  groundAccel: 14,
  /** Ground friction when no horizontal input. */
  groundFriction: 16,
  /** Air acceleration multiplier vs ground. */
  airControl: 0.65,
  /** Max fall speed (px/s). */
  terminalVelocity: 980,
  /** Minimum usable jump impulse. */
  minJumpStrength: 320,
  /** Maximum jump impulse. */
  maxJumpStrength: 780,
  /** Minimum usable run speed. */
  minSpeed: 160,
  /** Maximum run speed. */
  maxSpeed: 520,
  /**
   * Target apex time for a full held jump (seconds). Gravity is derived so
   * jumpStrength maps to a readable arc instead of a magic constant.
   */
  jumpApexTime: 0.34,
} as const;

export interface PlatformerMotionInput {
  dt: number;
  left: boolean;
  right: boolean;
  /** Jump is held this frame. */
  jumpHeld: boolean;
  /** Jump was pressed this frame (rising edge). */
  jumpPressed: boolean;
  /** Jump was released this frame (falling edge) — triggers short-hop cut once. */
  jumpReleased: boolean;
  grounded: boolean;
  vx: number;
  vy: number;
  coyote: number;
  jumpBuffer: number;
  /** From GameSpec.player.speed */
  speed: number;
  /** From GameSpec.player.jumpStrength */
  jumpStrength: number;
}

export interface PlatformerMotionResult {
  vx: number;
  vy: number;
  coyote: number;
  jumpBuffer: number;
  /** True when a jump impulse was applied this step. */
  didJump: boolean;
}

function clampSpeed(speed: number): number {
  return Math.min(
    PLATFORMER_FEEL.maxSpeed,
    Math.max(PLATFORMER_FEEL.minSpeed, speed || PLATFORMER_FEEL.minSpeed)
  );
}

function clampJump(jumpStrength: number): number {
  return Math.min(
    PLATFORMER_FEEL.maxJumpStrength,
    Math.max(
      PLATFORMER_FEEL.minJumpStrength,
      jumpStrength || PLATFORMER_FEEL.minJumpStrength
    )
  );
}

/** Gravity that makes a full jump crest near jumpApexTime. */
export function gravityForJump(jumpStrength: number): number {
  const impulse = clampJump(jumpStrength);
  return impulse / PLATFORMER_FEEL.jumpApexTime;
}

/**
 * One simulation step of arcade platformer velocity.
 * Position integration and collisions stay in the renderer.
 */
export function stepPlatformerMotion(
  input: PlatformerMotionInput
): PlatformerMotionResult {
  const dt = Math.max(0, Math.min(0.05, input.dt));
  const maxSpeed = clampSpeed(input.speed);
  const jumpImpulse = clampJump(input.jumpStrength);
  const gravity = gravityForJump(jumpImpulse);

  let { vx, vy } = input;
  let coyote = input.coyote;
  let jumpBuffer = input.jumpBuffer;
  let didJump = false;

  if (input.grounded) {
    coyote = PLATFORMER_FEEL.coyoteTime;
  } else {
    coyote = Math.max(0, coyote - dt);
  }

  if (input.jumpPressed) {
    jumpBuffer = PLATFORMER_FEEL.jumpBuffer;
  } else {
    jumpBuffer = Math.max(0, jumpBuffer - dt);
  }

  // Horizontal accel / friction
  const accelRate =
    PLATFORMER_FEEL.groundAccel * (input.grounded ? 1 : PLATFORMER_FEEL.airControl);
  const frictionRate = PLATFORMER_FEEL.groundFriction;

  if (input.left === input.right) {
    // No net input — friction toward zero (stronger on ground).
    const friction = input.grounded
      ? frictionRate
      : frictionRate * PLATFORMER_FEEL.airControl * 0.35;
    const frictionDelta = friction * maxSpeed * dt;
    if (Math.abs(vx) <= frictionDelta) vx = 0;
    else vx -= Math.sign(vx) * frictionDelta;
  } else {
    const target = input.left ? -maxSpeed : maxSpeed;
    const accel = accelRate * maxSpeed * dt;
    if (vx < target) vx = Math.min(target, vx + accel);
    else if (vx > target) vx = Math.max(target, vx - accel);
  }

  // Jump from buffer + coyote / grounded
  const canJump = input.grounded || coyote > 0;
  if (jumpBuffer > 0 && canJump) {
    vy = -jumpImpulse;
    jumpBuffer = 0;
    coyote = 0;
    didJump = true;
  }

  // Gravity + terminal velocity (skip gravity the frame we jumped so impulse sticks)
  if (!didJump) {
    vy += gravity * dt;
  }
  if (vy > PLATFORMER_FEEL.terminalVelocity) {
    vy = PLATFORMER_FEEL.terminalVelocity;
  }

  // Variable jump height — cut upward velocity once on release (after gravity)
  if (input.jumpReleased && vy < 0 && !didJump) {
    vy *= PLATFORMER_FEEL.jumpCut;
  }

  return { vx, vy, coyote, jumpBuffer, didJump };
}

/** Playable defaults when AI emits near-zero platformer stats. */
export const PLAYABLE_PLATFORMER_DEFAULTS = {
  speed: 320,
  jumpStrength: 560,
} as const;

import { describe, expect, it } from "vitest";

import {
  gravityForJump,
  PLATFORMER_FEEL,
  stepPlatformerMotion,
} from "../platformer-physics";

const base = {
  dt: 1 / 60,
  left: false,
  right: false,
  jumpHeld: false,
  jumpPressed: false,
  jumpReleased: false,
  grounded: false,
  vx: 0,
  vy: 0,
  coyote: 0,
  jumpBuffer: 0,
  speed: 320,
  jumpStrength: 560,
};

describe("gravityForJump", () => {
  it("scales gravity with jump strength", () => {
    expect(gravityForJump(560)).toBeCloseTo(
      560 / PLATFORMER_FEEL.jumpApexTime,
      5
    );
    expect(gravityForJump(700)).toBeGreaterThan(gravityForJump(400));
  });
});

describe("stepPlatformerMotion", () => {
  it("accelerates toward max run speed on the ground", () => {
    let state = { ...base, grounded: true, right: true, vx: 0 };
    for (let i = 0; i < 30; i += 1) {
      const next = stepPlatformerMotion(state);
      state = { ...state, vx: next.vx, vy: next.vy, coyote: next.coyote, jumpBuffer: next.jumpBuffer };
    }
    expect(state.vx).toBeGreaterThan(200);
    expect(state.vx).toBeLessThanOrEqual(320);
  });

  it("allows a coyote jump shortly after leaving the ground", () => {
    const result = stepPlatformerMotion({
      ...base,
      grounded: false,
      coyote: 0.08,
      jumpPressed: true,
      jumpHeld: true,
    });
    expect(result.didJump).toBe(true);
    expect(result.vy).toBeLessThan(0);
    expect(result.coyote).toBe(0);
  });

  it("buffers an early jump until grounded", () => {
    const buffered = stepPlatformerMotion({
      ...base,
      grounded: false,
      coyote: 0,
      jumpPressed: true,
      jumpHeld: true,
    });
    expect(buffered.didJump).toBe(false);
    expect(buffered.jumpBuffer).toBe(PLATFORMER_FEEL.jumpBuffer);

    const landed = stepPlatformerMotion({
      ...base,
      grounded: true,
      coyote: 0,
      jumpPressed: false,
      jumpHeld: true,
      jumpBuffer: buffered.jumpBuffer,
      vy: 100,
    });
    expect(landed.didJump).toBe(true);
    expect(landed.vy).toBeLessThan(0);
  });

  it("cuts upward velocity once on jump release for a short hop", () => {
    const gravity = gravityForJump(560);
    const risingVy = -500 + gravity * (1 / 60);
    const released = stepPlatformerMotion({
      ...base,
      grounded: false,
      jumpHeld: false,
      jumpReleased: true,
      vy: -500,
    });
    expect(released.vy).toBeCloseTo(risingVy * PLATFORMER_FEEL.jumpCut, 5);
  });

  it("caps fall speed at terminal velocity", () => {
    const result = stepPlatformerMotion({
      ...base,
      grounded: false,
      vy: PLATFORMER_FEEL.terminalVelocity + 200,
    });
    expect(result.vy).toBe(PLATFORMER_FEEL.terminalVelocity);
  });
});

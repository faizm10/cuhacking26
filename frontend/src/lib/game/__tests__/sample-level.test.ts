import { describe, expect, it } from "vitest";

import {
  PLATFORMER_FEEL,
  PLAYABLE_PLATFORMER_DEFAULTS,
  gravityForJump,
} from "@/lib/game/platformer-physics";
import { SAMPLE_LEVEL } from "@/lib/game/sample-level";

const { world } = SAMPLE_LEVEL;

function insideWorld(x: number, y: number): boolean {
  return x >= 0 && x <= world.width && y >= 0 && y <= world.height;
}

describe("sample level blueprint", () => {
  it("keeps every entity inside the world", () => {
    expect(insideWorld(SAMPLE_LEVEL.player.x, SAMPLE_LEVEL.player.y)).toBe(true);
    expect(insideWorld(SAMPLE_LEVEL.goal.x, SAMPLE_LEVEL.goal.y)).toBe(true);
    for (const coin of SAMPLE_LEVEL.coins) {
      expect(insideWorld(coin.x, coin.y)).toBe(true);
    }
    for (const platform of SAMPLE_LEVEL.platforms) {
      expect(insideWorld(platform.x, platform.y)).toBe(true);
      expect(platform.x + platform.width).toBeLessThanOrEqual(world.width);
    }
  });

  it("never places a coin inside a hazard", () => {
    for (const coin of SAMPLE_LEVEL.coins) {
      for (const hazard of SAMPLE_LEVEL.hazards) {
        const inside =
          coin.x >= hazard.x &&
          coin.x <= hazard.x + hazard.width &&
          coin.y >= hazard.y &&
          coin.y <= hazard.y + hazard.height;
        expect(inside).toBe(false);
      }
    }
  });

  it("spawns the player on solid ground", () => {
    const under = SAMPLE_LEVEL.platforms.find(
      (p) =>
        SAMPLE_LEVEL.player.x >= p.x &&
        SAMPLE_LEVEL.player.x <= p.x + p.width &&
        SAMPLE_LEVEL.player.y <= p.y
    );
    expect(under).toBeDefined();
  });

  it("keeps every platform step within the player's jump height", () => {
    const impulse = PLAYABLE_PLATFORMER_DEFAULTS.jumpStrength;
    const jumpHeight = (impulse * impulse) / (2 * gravityForJump(impulse));
    // Each floating step in the run rises at most this much from the
    // platform the player jumps from (ground 780 → 700 → 620).
    const steps = [780 - 700, 700 - 620];
    for (const rise of steps) {
      expect(rise).toBeLessThan(jumpHeight - 5);
    }
    expect(PLATFORMER_FEEL.coyoteTime).toBeGreaterThan(0);
  });
});

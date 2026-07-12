import { describe, expect, it } from "vitest";

import {
  DEFAULT_PLATFORMER_LEVEL,
  repairLevel,
} from "@/lib/game/platformer-level";
import type { Level } from "@/types";

const base = (): Level => structuredClone(DEFAULT_PLATFORMER_LEVEL);

describe("repairLevel", () => {
  it("falls back to the demo level on hopeless input", () => {
    for (const raw of [null, 42, "level", []]) {
      const { level, warnings } = repairLevel(raw);
      expect(level).toEqual(DEFAULT_PLATFORMER_LEVEL);
      expect(warnings.length).toBeGreaterThan(0);
    }
  });

  it("passes a valid level through unchanged", () => {
    const input = base();
    const { level, warnings } = repairLevel(input);
    expect(level.platforms).toEqual(input.platforms);
    expect(level.coins).toEqual(input.coins);
    expect(level.goal).toEqual(input.goal);
    expect(warnings).toEqual([]);
  });

  it("clamps out-of-world geometry into bounds", () => {
    const input = base();
    input.coins.push({ x: 99_999, y: -50 });
    input.platforms.push({
      x: -200,
      y: 99_999,
      width: 120,
      height: 40,
      kind: "static",
    });
    const { level } = repairLevel(input);
    for (const coin of level.coins) {
      expect(coin.x).toBeLessThanOrEqual(level.world.width);
      expect(coin.y).toBeGreaterThanOrEqual(0);
    }
    for (const platform of level.platforms) {
      expect(platform.x).toBeGreaterThanOrEqual(0);
      expect(platform.y).toBeLessThanOrEqual(level.world.height - 20);
    }
  });

  it("lifts coins out of hazards", () => {
    const input = base();
    const lava = input.hazards[0]!;
    input.coins.push({
      x: lava.x + lava.width / 2,
      y: lava.y + lava.height / 2,
    });
    const { level, warnings } = repairLevel(input);
    const moved = level.coins.at(-1)!;
    expect(moved.y).toBeLessThan(lava.y);
    expect(warnings).toContain("Lifted coins out of hazards");
  });

  it("moves an airborne spawn onto solid ground", () => {
    const input = base();
    // Directly over the lava pit gap — no platform below.
    input.player = { x: 630, y: 200 };
    const { level, warnings } = repairLevel(input);
    const support = level.platforms.find(
      (p) =>
        level.player.x >= p.x - 60 &&
        level.player.x <= p.x + p.width + 60 &&
        p.y >= level.player.y
    );
    expect(support).toBeDefined();
    expect(warnings).toContain("Moved the spawn onto solid ground");
  });

  it("snaps the flag onto a platform top", () => {
    const input = base();
    input.goal = { x: 1500, y: 300 };
    const { level } = repairLevel(input);
    expect(level.goal.y).toBe(780);
  });

  it("rebuilds ground when platforms are unusable", () => {
    const input = base() as unknown as Record<string, unknown>;
    input.platforms = [{ x: 1, y: 2 }];
    const { level, warnings } = repairLevel(input);
    expect(level.platforms.length).toBeGreaterThan(0);
    expect(warnings).toContain(
      "Rebuilt the ground — the AI platforms were unusable"
    );
  });
});

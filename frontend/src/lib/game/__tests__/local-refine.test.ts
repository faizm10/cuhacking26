import { describe, expect, it } from "vitest";

import { FROG_POND } from "../fixtures";
import { applyLocalRefine } from "../local-refine";
import { gameSpecSchema, GAME_WORLD } from "../schema";

describe("applyLocalRefine", () => {
  it("adds a full-width floor and spikes for obstacle/floor requests", () => {
    const base = structuredClone(FROG_POND);
    // Remove bottom pads so the floor heuristic clearly adds one.
    base.platforms = base.platforms.filter((p) => p.y < 450);

    const result = applyLocalRefine(
      base,
      "can you add more obstackles including the floor at the bottom"
    );

    expect(result.matched).toBe(true);
    expect(gameSpecSchema.safeParse(result.game).success).toBe(true);

    const floor = result.game.platforms.find(
      (p) => p.width === GAME_WORLD.width && p.y >= GAME_WORLD.height - 48
    );
    expect(floor).toBeDefined();
    expect(
      result.game.obstacles.some((o) => o.kind === "hazard")
    ).toBe(true);
    expect(result.assistantMessage.toLowerCase()).toMatch(/floor|spike/);
  });

  it("returns matched:false when the request is unrelated", () => {
    const result = applyLocalRefine(FROG_POND, "tell me a joke");
    expect(result.matched).toBe(false);
  });

  it("improves jump physics for physics/jump requests", () => {
    const base = structuredClone(FROG_POND);
    base.player.jumpStrength = 200;
    const result = applyLocalRefine(
      base,
      "there should be physics behind the blue box jumping"
    );
    expect(result.matched).toBe(true);
    expect(result.game.player.jumpStrength).toBeGreaterThanOrEqual(520);
    expect(result.game.feel.bounce).toBe(true);
  });
});

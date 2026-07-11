import { describe, expect, it } from "vitest";

import {
  coerceNormalizedGeometry,
  denormalizeGameSpec,
  modelGenerationResultSchema,
  type NormalizedGameSpec,
} from "../coordinates";
import { STAR_TRAIL } from "../fixtures";
import { GAME_WORLD, gameSpecSchema } from "../schema";

/** STAR_TRAIL converted to the normalized model contract. */
function normalizedStarTrail(): NormalizedGameSpec {
  const toNorm = <T extends { x: number; y: number; width: number; height: number }>(
    entity: T
  ): T => ({
    ...entity,
    x: entity.x / GAME_WORLD.width,
    y: entity.y / GAME_WORLD.height,
    width: entity.width / GAME_WORLD.width,
    height: entity.height / GAME_WORLD.height,
  });
  const spec = structuredClone(STAR_TRAIL);
  return {
    ...spec,
    player: toNorm(spec.player),
    enemies: spec.enemies.map(toNorm),
    obstacles: spec.obstacles.map(toNorm),
    collectibles: spec.collectibles.map(toNorm),
    platforms: spec.platforms.map(toNorm),
  };
}

describe("denormalizeGameSpec", () => {
  it("maps normalized top-left coordinates straight to world pixels", () => {
    const world = denormalizeGameSpec(normalizedStarTrail());
    expect(world.player.x).toBe(STAR_TRAIL.player.x);
    expect(world.player.y).toBe(STAR_TRAIL.player.y);
    expect(world.platforms[0]!.x).toBe(STAR_TRAIL.platforms[0]!.x);
    expect(world.platforms[0]!.width).toBe(STAR_TRAIL.platforms[0]!.width);
    expect(gameSpecSchema.safeParse(world).success).toBe(true);
  });

  it("never flips the y axis — bottom of the sketch stays at the bottom", () => {
    const norm = normalizedStarTrail();
    norm.player.y = 0.9;
    const world = denormalizeGameSpec(norm);
    expect(world.player.y).toBe(Math.round(0.9 * GAME_WORLD.height));
    expect(world.player.y).toBeGreaterThan(GAME_WORLD.height / 2);
  });

  it("clamps denormalized sizes into the world schema ranges", () => {
    const norm = normalizedStarTrail();
    norm.collectibles[0]!.width = 0.004; // ~4px — below the 8px minimum
    norm.platforms[0]!.width = 1; // full world width is legal for platforms
    const world = denormalizeGameSpec(norm);
    expect(world.collectibles[0]!.width).toBe(8);
    expect(world.platforms[0]!.width).toBe(GAME_WORLD.width);
    expect(gameSpecSchema.safeParse(world).success).toBe(true);
  });
});

describe("coerceNormalizedGeometry", () => {
  it("divides pixel-emitting rects back down to normalized", () => {
    const raw = {
      game: {
        player: { x: 60, y: 396, width: 40, height: 44 },
        platforms: [{ x: 470, y: 424, width: 220, height: 36 }],
      },
    };
    const fixed = coerceNormalizedGeometry(raw) as {
      game: {
        player: { x: number; y: number };
        platforms: { x: number; y: number }[];
      };
    };
    expect(fixed.game.player.x).toBeCloseTo(60 / GAME_WORLD.width, 4);
    expect(fixed.game.player.y).toBeCloseTo(396 / GAME_WORLD.height, 4);
    expect(fixed.game.platforms[0]!.x).toBeCloseTo(470 / GAME_WORLD.width, 4);
  });

  it("clamps slightly-out-of-range normalized values instead of rejecting", () => {
    const raw = { game: { player: { x: 1.05, y: -0.02, width: 0.05, height: 0.08 } } };
    const fixed = coerceNormalizedGeometry(raw) as {
      game: { player: { x: number; y: number } };
    };
    expect(fixed.game.player.x).toBe(1);
    expect(fixed.game.player.y).toBe(0);
  });
});

describe("modelGenerationResultSchema", () => {
  it("accepts a fully normalized game and rejects pixel geometry", () => {
    const good = {
      interpretationSummary: "A star trail platformer.",
      game: normalizedStarTrail(),
    };
    expect(modelGenerationResultSchema.safeParse(good).success).toBe(true);

    const bad = structuredClone(good);
    bad.game.player.x = 60; // pixels — must be caught before coercion
    expect(modelGenerationResultSchema.safeParse(bad).success).toBe(false);
  });
});

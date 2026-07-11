import { describe, expect, it } from "vitest";

import {
  ASTRONAUT_STARS,
  CAT_FISH,
  FROG_POND,
  PONG_RALLY,
} from "../fixtures";
import { gameSpecSchema, generationResultSchema, GAME_WORLD } from "../schema";

describe("gameSpecSchema", () => {
  it("accepts a valid collect-game specification", () => {
    expect(gameSpecSchema.safeParse(ASTRONAUT_STARS).success).toBe(true);
    expect(gameSpecSchema.safeParse(CAT_FISH).success).toBe(true);
  });

  it("accepts a valid platform-jumper specification", () => {
    const result = gameSpecSchema.safeParse(FROG_POND);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gameType).toBe("platform-jumper");
      expect(result.data.platforms.length).toBeGreaterThan(0);
    }
  });

  it("accepts a valid dodge-game specification", () => {
    const dodge = {
      ...structuredClone(ASTRONAUT_STARS),
      gameType: "dodge",
      collectibles: [],
      timer: { enabled: true, seconds: 30, countsDown: true },
    };
    const result = gameSpecSchema.safeParse(dodge);
    expect(result.success).toBe(true);
  });

  it("accepts a valid pong specification with a bouncing ball", () => {
    const result = gameSpecSchema.safeParse(PONG_RALLY);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.gameType).toBe("pong");
      expect(
        result.data.enemies.some((enemy) => enemy.movement === "bounce")
      ).toBe(true);
      expect(result.data.collisionRules.playerHitsEnemy).toBe("bounce");
    }
  });

  it("rejects unsupported game types", () => {
    const bad = { ...structuredClone(ASTRONAUT_STARS), gameType: "battle-royale" };
    expect(gameSpecSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects positions outside the world", () => {
    const bad = structuredClone(ASTRONAUT_STARS);
    bad.player.x = GAME_WORLD.width + 500;
    expect(gameSpecSchema.safeParse(bad).success).toBe(false);
  });

  it("does not permit unsupported properties through parsing", () => {
    const sneaky = {
      ...structuredClone(ASTRONAUT_STARS),
      script: "<script>alert(1)</script>",
      onLoad: "javascript:evil()",
    };
    const result = gameSpecSchema.safeParse(sneaky);
    expect(result.success).toBe(true);
    if (result.success) {
      expect("script" in result.data).toBe(false);
      expect("onLoad" in result.data).toBe(false);
    }
  });

  it("rejects non-hex colors (no url() or javascript: payloads)", () => {
    const bad = structuredClone(ASTRONAUT_STARS);
    bad.player.color = "url(javascript:alert(1))";
    expect(gameSpecSchema.safeParse(bad).success).toBe(false);
  });
});

describe("generationResultSchema", () => {
  it("requires an interpretation summary alongside the game", () => {
    expect(
      generationResultSchema.safeParse({ game: ASTRONAUT_STARS }).success
    ).toBe(false);
    expect(
      generationResultSchema.safeParse({
        interpretationSummary: "A tiny space collector.",
        game: ASTRONAUT_STARS,
      }).success
    ).toBe(true);
  });
});

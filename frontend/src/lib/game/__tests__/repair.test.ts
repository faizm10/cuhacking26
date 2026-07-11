import { describe, expect, it } from "vitest";

import { ASTRONAUT_STARS, FROG_POND } from "../fixtures";
import { clampRawSpec, repairGameSpec, resolveGameType } from "../repair";
import { gameSpecSchema, GAME_WORLD } from "../schema";

describe("clampRawSpec", () => {
  it("clamps slightly out-of-range positions before validation", () => {
    const raw = structuredClone(ASTRONAUT_STARS) as Record<string, unknown> & {
      player: { x: number; width: number };
    };
    raw.player.x = -12;
    raw.player.width = 400;

    const clamped = clampRawSpec({ interpretationSummary: "s", game: raw }) as {
      game: { player: { x: number; width: number } };
    };
    expect(clamped.game.player.x).toBe(0);
    expect(clamped.game.player.width).toBe(240);
    expect(
      gameSpecSchema.safeParse(clamped.game).success
    ).toBe(true);
  });

  it("allows full-width floor platforms", () => {
    const raw = structuredClone(FROG_POND) as Record<string, unknown> & {
      platforms: Array<{ width: number; x: number; y: number }>;
    };
    raw.platforms.push({
      id: "floor",
      label: "Floor",
      color: "#78716c",
      kind: "static",
      movement: "none",
      patrolDistance: 0,
      x: 0,
      y: 504,
      width: GAME_WORLD.width,
      height: 36,
    } as never);

    const clamped = clampRawSpec({ game: raw }) as {
      game: { platforms: Array<{ width: number }> };
    };
    const floor = clamped.game.platforms.at(-1)!;
    expect(floor.width).toBe(GAME_WORLD.width);
    expect(gameSpecSchema.safeParse(clamped.game).success).toBe(true);
  });

  it("passes non-object input through untouched", () => {
    expect(clampRawSpec("nonsense")).toBe("nonsense");
    expect(clampRawSpec(null)).toBe(null);
  });
});

describe("repairGameSpec", () => {
  it("moves entities fully back inside the world", () => {
    const spec = structuredClone(ASTRONAUT_STARS);
    spec.player.x = GAME_WORLD.width; // valid per schema, but fully off-screen
    const { game, warnings } = repairGameSpec(spec);
    expect(game.player.x + game.player.width).toBeLessThanOrEqual(
      GAME_WORLD.width
    );
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("moves the player spawn out of hazards", () => {
    const spec = structuredClone(FROG_POND);
    const hazard = spec.obstacles[0]!;
    spec.player.x = hazard.x + 4;
    spec.player.y = hazard.y + 4;
    const { game, warnings } = repairGameSpec(spec);
    const stillInside =
      game.player.x < hazard.x + hazard.width &&
      game.player.x + game.player.width > hazard.x &&
      game.player.y < hazard.y + hazard.height &&
      game.player.y + game.player.height > hazard.y;
    expect(stillInside).toBe(false);
    expect(warnings.join(" ")).toMatch(/player start/i);
  });

  it("renames duplicate entity ids", () => {
    const spec = structuredClone(ASTRONAUT_STARS);
    spec.collectibles[1]!.id = spec.collectibles[0]!.id;
    const { game } = repairGameSpec(spec);
    const ids = game.collectibles.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("adds a survival-timer win when no win path exists", () => {
    const spec = structuredClone(ASTRONAUT_STARS);
    spec.collectibles = [];
    spec.scoring.target = 0;
    spec.timer.enabled = false;
    spec.gameType = "collect";
    const { game, warnings } = repairGameSpec(spec);
    expect(game.timer.enabled).toBe(true);
    expect(warnings.join(" ")).toMatch(/win/i);
  });

  it("lowers unreachable score targets", () => {
    const spec = structuredClone(ASTRONAUT_STARS);
    spec.scoring.target = 9999;
    const { game, warnings } = repairGameSpec(spec);
    const available = game.collectibles.reduce((sum, c) => sum + c.points, 0);
    expect(game.scoring.target).toBeLessThanOrEqual(available);
    expect(warnings.join(" ")).toMatch(/target/i);
  });

  it("boosts weak platformer jump and speed", () => {
    const spec = structuredClone(FROG_POND);
    spec.player.jumpStrength = 40;
    spec.player.speed = 40;
    const { game, warnings } = repairGameSpec(spec);
    expect(game.player.jumpStrength).toBeGreaterThanOrEqual(200);
    expect(game.player.speed).toBeGreaterThanOrEqual(120);
    expect(warnings.join(" ")).toMatch(/jump|speed/i);
  });

  it("does not mutate its input", () => {
    const spec = structuredClone(ASTRONAUT_STARS);
    const snapshot = JSON.stringify(spec);
    repairGameSpec(spec);
    expect(JSON.stringify(spec)).toBe(snapshot);
  });
});

describe("resolveGameType", () => {
  it("keeps supported types", () => {
    expect(resolveGameType("platform-jumper")).toBe("platform-jumper");
  });

  it("falls back to auto for unsupported or missing types", () => {
    expect(resolveGameType("mmorpg")).toBe("auto");
    expect(resolveGameType(undefined)).toBe("auto");
    expect(resolveGameType("")).toBe("auto");
    expect(resolveGameType("auto")).toBe("auto");
  });
});

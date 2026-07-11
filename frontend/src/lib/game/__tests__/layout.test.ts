import { describe, expect, it } from "vitest";

import { STAR_TRAIL } from "../fixtures";
import {
  applyLayoutPass,
  canTraverse,
  findStartPlatform,
  jumpEnvelope,
  reachablePlatforms,
} from "../layout";
import { GAME_WORLD, type GameSpec } from "../schema";

const W = GAME_WORLD.width;
const H = GAME_WORLD.height;

describe("STAR_TRAIL fixture regions (the collect-the-stars sketch)", () => {
  const g = STAR_TRAIL;
  const start = g.platforms.find((p) => p.id === "start")!;
  const floating = g.platforms.find((p) => p.id === "floating")!;
  const right = g.platforms.find((p) => p.id === "right")!;
  const final = g.platforms.find((p) => p.id === "final")!;
  const spikes = g.obstacles.find((o) => o.id === "spikes")!;
  const star1 = g.collectibles.find((c) => c.id === "star-1")!;
  const star2 = g.collectibles.find((c) => c.id === "star-2")!;
  const flag = g.collectibles.find((c) => c.id === "goal-flag")!;

  it("puts the player standing on the left starting platform", () => {
    expect(g.player.x + g.player.width / 2).toBeLessThan(W * 0.25);
    expect(g.player.y + g.player.height).toBe(start.y);
    const cx = g.player.x + g.player.width / 2;
    expect(cx).toBeGreaterThanOrEqual(start.x);
    expect(cx).toBeLessThanOrEqual(start.x + start.width);
  });

  it("places the spike row after the start platform, low in the world", () => {
    expect(spikes.x).toBeGreaterThanOrEqual(start.x + start.width);
    expect(spikes.x + spikes.width / 2).toBeLessThan(W * 0.5);
    expect(spikes.y).toBeGreaterThan(H * 0.85);
  });

  it("floats a small platform above the spikes with a star beside it", () => {
    expect(floating.y + floating.height).toBeLessThan(spikes.y);
    expect(floating.x + floating.width).toBeGreaterThan(spikes.x);
    expect(floating.x).toBeLessThan(spikes.x + spikes.width);
    // Star sits near/above the floating platform.
    expect(star1.y + star1.height).toBeLessThanOrEqual(floating.y);
    const starCx = star1.x + star1.width / 2;
    expect(starCx).toBeGreaterThan(floating.x - 45);
    expect(starCx).toBeLessThan(floating.x + floating.width + 45);
  });

  it("has the larger platform on the right with a star above it", () => {
    expect(right.width).toBeGreaterThan(floating.width);
    expect(right.x).toBeGreaterThan(W * 0.45);
    expect(star2.y + star2.height).toBeLessThanOrEqual(right.y);
    const starCx = star2.x + star2.width / 2;
    expect(starCx).toBeGreaterThan(right.x);
    expect(starCx).toBeLessThan(right.x + right.width);
  });

  it("raises the final platform and plants the flag on it", () => {
    expect(final.x).toBeGreaterThan(W * 0.75);
    expect(final.y).toBeLessThan(right.y); // raised vs the right platform
    expect(flag.y + flag.height).toBe(final.y); // standing on it
    expect(flag.x).toBeGreaterThanOrEqual(final.x);
  });

  it("progresses left to right", () => {
    const xs = [start.x, floating.x, right.x, final.x];
    expect([...xs].sort((a, b) => a - b)).toEqual(xs);
  });

  it("is fully reachable and passes the layout pass unchanged", () => {
    const env = jumpEnvelope(g.player.speed, g.player.jumpStrength);
    const startIndex = findStartPlatform(g);
    const reached = reachablePlatforms(g.platforms, startIndex, env);
    expect(reached.size).toBe(g.platforms.length);

    const { game, warnings } = applyLayoutPass(g);
    expect(warnings).toEqual([]);
    expect(game).toEqual(g);
  });
});

function makePlatformer(overrides: Partial<GameSpec> = {}): GameSpec {
  return { ...structuredClone(STAR_TRAIL), ...overrides };
}

describe("applyLayoutPass", () => {
  it("snaps a floating player onto its drawn start platform", () => {
    const spec = makePlatformer();
    spec.player.y = 120; // hovering mid-air over the start platform
    const { game, warnings } = applyLayoutPass(spec);
    const start = game.platforms.find((p) => p.id === "start")!;
    expect(game.player.y + game.player.height).toBe(start.y);
    expect(warnings.join(" ")).toMatch(/starting platform/i);
  });

  it("only adds a ground platform when the sketch has no platforms at all", () => {
    const spec = makePlatformer({ platforms: [] });
    const { game, warnings } = applyLayoutPass(spec);
    expect(game.platforms.some((p) => p.id === "ground")).toBe(true);
    expect(warnings.join(" ")).toMatch(/no platforms/i);

    const untouched = applyLayoutPass(makePlatformer());
    expect(untouched.game.platforms.some((p) => p.id === "ground")).toBe(false);
  });

  it("guarantees at least two platforms for a jumper", () => {
    const spec = makePlatformer();
    spec.platforms = [spec.platforms[0]!];
    spec.collectibles = [];
    const { game } = applyLayoutPass(spec);
    expect(game.platforms.length).toBeGreaterThanOrEqual(2);
  });

  it("minimally lowers an unreachable platform instead of redesigning", () => {
    const spec = makePlatformer();
    const final = spec.platforms.find((p) => p.id === "final")!;
    final.y = 300; // climb of 124px — beyond the ~84px jump envelope
    // Keep the flag on the moved platform so the fixture stays coherent.
    const flag = spec.collectibles.find((c) => c.id === "goal-flag")!;
    flag.y = final.y - flag.height;

    const { game, warnings } = applyLayoutPass(spec);
    const fixed = game.platforms.find((p) => p.id === "final")!;
    expect(fixed.y).toBeGreaterThan(300); // lowered, not relocated
    expect(fixed.y - 300).toBeLessThanOrEqual(95); // smallest possible change
    expect(fixed.x).toBe(final.x); // horizontal position preserved
    expect(warnings.join(" ")).toMatch(/lowered|closer|widened|stepping/i);
  });

  it("moves out-of-reach collectibles above a reachable platform", () => {
    const spec = makePlatformer();
    spec.collectibles[0]!.x = 900;
    spec.collectibles[0]!.y = 60; // floating in the sky, unreachable
    const { game, warnings } = applyLayoutPass(spec);
    const moved = game.collectibles.find((c) => c.id === "star-1")!;
    const host = game.platforms.find(
      (p) =>
        moved.x + moved.width / 2 >= p.x - 45 &&
        moved.x + moved.width / 2 <= p.x + p.width + 45 &&
        p.y > moved.y
    );
    expect(host).toBeDefined();
    expect(warnings.join(" ")).toMatch(/reachable platform/i);
  });

  it("adds a goal flag when the objective demands one and none exists", () => {
    const spec = makePlatformer();
    spec.collectibles = spec.collectibles.filter((c) => c.id !== "goal-flag");
    const { game, warnings } = applyLayoutPass(spec);
    expect(
      game.collectibles.some((c) => c.appearance === "flag" || /goal/i.test(c.id))
    ).toBe(true);
    expect(warnings.join(" ")).toMatch(/flag/i);
  });

  it("adds stars when the objective says collect but none exist", () => {
    const spec = makePlatformer();
    spec.collectibles = [];
    const { game, warnings } = applyLayoutPass(spec);
    expect(game.collectibles.length).toBeGreaterThan(0);
    expect(warnings.join(" ")).toMatch(/star|flag/i);
  });

  it("warns (without inventing hazards) when 'avoid' has nothing to avoid", () => {
    const spec = makePlatformer();
    spec.obstacles = [];
    spec.enemies = [];
    const { game, warnings } = applyLayoutPass(spec);
    expect(game.obstacles.length).toBe(0);
    expect(warnings.join(" ")).toMatch(/no hazards/i);
  });

  it("pushes required objects out from under the HUD", () => {
    const spec = makePlatformer();
    spec.collectibles[0]!.y = 4;
    spec.collectibles[0]!.x = 300; // reachable region above floating platform
    const { game } = applyLayoutPass(spec);
    const item = game.collectibles.find((c) => c.id === "star-1")!;
    expect(item.y).toBeGreaterThan(44);
  });

  it("leaves non-platformer templates untouched", () => {
    const spec = makePlatformer({ gameType: "collect" });
    const { game, warnings } = applyLayoutPass(spec);
    expect(game).toEqual(spec);
    expect(warnings).toEqual([]);
  });
});

describe("jump envelope + traversal", () => {
  const env = jumpEnvelope(320, 560);

  it("approximates a sane jump envelope for default stats", () => {
    expect(env.maxRise).toBeGreaterThan(60);
    expect(env.maxRise).toBeLessThan(130);
    expect(env.maxGap).toBeGreaterThan(140);
    expect(env.maxGap).toBeLessThan(260);
  });

  it("allows drops with generous horizontal reach, blocks huge climbs", () => {
    const a = { ...STAR_TRAIL.platforms[0]! };
    const higher = { ...a, x: a.x + a.width + 60, y: a.y - env.maxRise - 60 };
    const lower = { ...a, x: a.x + a.width + 100, y: a.y + 120 };
    expect(canTraverse(a, higher, env)).toBe(false);
    expect(canTraverse(a, lower, env)).toBe(true);
  });
});

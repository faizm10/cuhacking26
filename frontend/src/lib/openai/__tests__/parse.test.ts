import { describe, expect, it } from "vitest";

import { ASTRONAUT_STARS } from "@/lib/game/fixtures";
import { parseModelOutput } from "../parse";

describe("parseModelOutput", () => {
  it("accepts a valid model response", () => {
    const result = parseModelOutput(
      JSON.stringify({
        interpretationSummary: "An astronaut collects stars.",
        game: ASTRONAUT_STARS,
      })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.game.title).toBe(ASTRONAUT_STARS.title);
    }
  });

  it("reports non-JSON responses", () => {
    const result = parseModelOutput("Sure! Here's your game: ```json ...");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues).toMatch(/not valid JSON/i);
  });

  it("reports schema violations with field paths", () => {
    const broken = structuredClone(ASTRONAUT_STARS) as Record<string, unknown>;
    (broken as { gameType: string }).gameType = "open-world-rpg";
    const result = parseModelOutput(
      JSON.stringify({ interpretationSummary: "x", game: broken })
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues).toMatch(/gameType/);
  });

  it("recovers slightly out-of-range values via clamping", () => {
    const wobbly = structuredClone(ASTRONAUT_STARS);
    wobbly.player.x = -6;
    wobbly.collectibles[0]!.width = 300;
    const result = parseModelOutput(
      JSON.stringify({ interpretationSummary: "x", game: wobbly })
    );
    expect(result.ok).toBe(true);
  });
});

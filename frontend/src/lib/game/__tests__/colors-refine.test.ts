import { describe, expect, it } from "vitest";

import { normalizeHexColor } from "../colors";
import { FROG_POND } from "../fixtures";
import { clampRawSpec, mergeGamePatch } from "../repair";
import { gameSpecSchema } from "../schema";
import { parseRefineOutput } from "@/lib/openai/parse-refine";

describe("normalizeHexColor", () => {
  it("expands short hex and strips alpha", () => {
    expect(normalizeHexColor("#fff")).toBe("#ffffff");
    expect(normalizeHexColor("#38bdf880")).toBe("#38bdf8");
    expect(normalizeHexColor("38bdf8")).toBe("#38bdf8");
  });

  it("handles rgb and named colors", () => {
    expect(normalizeHexColor("rgb(56, 189, 248)")).toBe("#38bdf8");
    expect(normalizeHexColor("skyblue")).toBe("#38bdf8");
    expect(normalizeHexColor("white")).toBe("#ffffff");
  });
});

describe("clampRawSpec colors", () => {
  it("salvages invalid background colors before Zod", () => {
    const raw = structuredClone(FROG_POND) as Record<string, unknown> & {
      visualTheme: { background: { color: string } };
    };
    raw.visualTheme.background.color = "#eee";

    const clamped = clampRawSpec({ game: raw }) as {
      game: typeof FROG_POND;
    };
    expect(clamped.game.visualTheme.background.color).toBe("#eeeeee");
    expect(gameSpecSchema.safeParse(clamped.game).success).toBe(true);
  });
});

describe("parseRefineOutput", () => {
  it("accepts an AI draft that only fails on short hex colors", () => {
    const draft = structuredClone(FROG_POND);
    draft.player.jumpStrength = 600;
    draft.feel.bounce = true;
    (draft.visualTheme.background as { color: string }).color = "#eee";

    const text = JSON.stringify({
      assistantMessage: "I boosted jump physics for the blue character.",
      game: draft,
    });

    const parsed = parseRefineOutput(text, FROG_POND);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.game.player.jumpStrength).toBe(600);
      expect(parsed.value.game.visualTheme.background.color).toMatch(
        /^#[0-9a-f]{6}$/
      );
    }
  });

  it("keeps base fields when the patch omits them", () => {
    const patch = {
      assistantMessage: "Tweaked jump.",
      game: {
        player: { ...FROG_POND.player, jumpStrength: 640 },
      },
    };
    const parsed = parseRefineOutput(JSON.stringify(patch), FROG_POND);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.game.player.jumpStrength).toBe(640);
      expect(parsed.value.game.platforms.length).toBe(FROG_POND.platforms.length);
      expect(parsed.value.game.title).toBe(FROG_POND.title);
    }
  });
});

describe("mergeGamePatch", () => {
  it("overlays nested player fields without dropping siblings", () => {
    const merged = mergeGamePatch(FROG_POND, {
      player: { jumpStrength: 700 },
    });
    expect(merged.player).toMatchObject({
      jumpStrength: 700,
      label: FROG_POND.player.label,
      color: FROG_POND.player.color,
    });
  });
});

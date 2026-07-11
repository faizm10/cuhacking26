import { describe, expect, it } from "vitest";

import type { CanvasObject } from "@/lib/game/request";
import {
  buildUserMessage,
  summarizeCanvasObjects,
} from "@/lib/openai/prompt";

function obj(
  partial: Partial<CanvasObject> & Pick<CanvasObject, "type" | "width" | "height">
): CanvasObject {
  return {
    x: 0.1,
    y: 0.1,
    rotation: 0,
    zIndex: 0,
    ...partial,
  };
}

describe("summarizeCanvasObjects", () => {
  it("keeps labelled tiny shapes and drops unlabeled dust", () => {
    const objects = [
      obj({ type: "draw", width: 0.01, height: 0.01 }),
      obj({ type: "text", width: 0.01, height: 0.01, text: "Player" }),
      obj({ type: "geo", width: 0.2, height: 0.2 }),
    ];
    const { items, truncated } = summarizeCanvasObjects(objects, 10);
    expect(items.some((item) => item.text === "Player")).toBe(true);
    expect(items.some((item) => item.width === 0.2)).toBe(true);
    expect(truncated).toBeGreaterThanOrEqual(1);
  });

  it("caps the list at the limit", () => {
    const objects = Array.from({ length: 80 }, (_, i) =>
      obj({ type: "geo", width: 0.1, height: 0.1, x: i / 100, y: 0.2 })
    );
    const { items, truncated } = summarizeCanvasObjects(objects, 48);
    expect(items).toHaveLength(48);
    expect(truncated).toBe(32);
  });
});

describe("buildUserMessage", () => {
  it("mentions truncation when objects are capped", () => {
    const objects = Array.from({ length: 60 }, (_, i) =>
      obj({ type: "geo", width: 0.15, height: 0.15, x: i / 100, y: 0.3 })
    );
    const message = buildUserMessage({
      userPrompt: "collect coins",
      selectedGameType: "auto",
      canvasLabels: [],
      canvasObjects: objects,
      canvasDimensions: { width: 800, height: 600 },
      canvasImage: "data:image/jpeg;base64,abc",
    });
    expect(message).toMatch(/showing 48 largest/);
    expect(message).toMatch(/low-detail screenshot/);
  });
});

import { describe, expect, it } from "vitest";

import { generateGameRequestSchema } from "../request";

const validObject = {
  type: "rectangle",
  x: 0.1,
  y: 0.5,
  width: 0.3,
  height: 0.05,
  rotation: 0,
  color: "green",
  zIndex: 1,
};

describe("generateGameRequestSchema", () => {
  it("rejects an empty canvas with a friendly message", () => {
    const result = generateGameRequestSchema.safeParse({
      canvasObjects: [],
      canvasLabels: [],
      userPrompt: "make a fun game",
      selectedGameType: "auto",
      canvasDimensions: { width: 800, height: 600 },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/empty/i);
    }
  });

  it("accepts labels-only canvases", () => {
    const result = generateGameRequestSchema.safeParse({
      canvasLabels: [{ text: "player", x: 0.2, y: 0.8 }],
      canvasDimensions: { width: 800, height: 600 },
    });
    expect(result.success).toBe(true);
  });

  it("clamps normalized positions into 0..1", () => {
    const result = generateGameRequestSchema.safeParse({
      canvasObjects: [{ ...validObject, x: 1.4, y: -0.2 }],
      canvasDimensions: { width: 800, height: 600 },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.canvasObjects[0]?.x).toBe(1);
      expect(result.data.canvasObjects[0]?.y).toBe(0);
    }
  });

  it("rejects non-image data URLs", () => {
    const result = generateGameRequestSchema.safeParse({
      canvasImage: "data:text/html;base64,PHNjcmlwdD4=",
      canvasObjects: [validObject],
      canvasDimensions: { width: 800, height: 600 },
    });
    expect(result.success).toBe(false);
  });

  it("applies defaults for prompt and game type", () => {
    const result = generateGameRequestSchema.safeParse({
      canvasObjects: [validObject],
      canvasDimensions: { width: 800, height: 600 },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userPrompt).toBe("");
      expect(result.data.selectedGameType).toBe("auto");
    }
  });
});

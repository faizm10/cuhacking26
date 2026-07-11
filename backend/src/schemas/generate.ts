import { z } from "zod";

import { supportedGameTypes, type GameSpec } from "../lib/game/schema/game.js";

const DATA_URL_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;

export const generateRequestSchema = z
  .object({
    /** Dashboard project this generation belongs to, if any. */
    projectId: z.string().min(1).max(128).optional(),
    /** Freeform gameplay prompt from the user. */
    prompt: z.string().max(2000).default(""),
    /** Optional selected template from the project setup. */
    selectedGameType: z.enum(supportedGameTypes).optional(),
    /** Canvas screenshot as a base64 data URL (png, jpeg, or webp). */
    screenshot: z
      .string()
      .max(12 * 1024 * 1024, "Screenshot must be under 12MB")
      .regex(DATA_URL_PATTERN, "Screenshot must be an image data URL")
      .optional(),
    /** Raw tldraw shape records. Passed through to the prompt, not stored. */
    shapes: z.array(z.record(z.string(), z.unknown())).max(1000).default([]),
  })
  .superRefine((body, ctx) => {
    if (!body.screenshot && body.shapes.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Provide a screenshot, shape data, or both",
      });
    }
  });

export type GenerateRequest = z.infer<typeof generateRequestSchema>;

export interface GenerateResponse {
  source: "gemini" | "mock";
  levelId: string | null;
  screenshotUrl: string | null;
  game: GameSpec;
}

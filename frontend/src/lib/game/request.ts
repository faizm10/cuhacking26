import { z } from "zod";

/**
 * Request contract for POST /api/generate-game. Positions arrive normalized
 * to 0–1 (the client divides by canvas dimensions); values slightly outside
 * that range are clamped rather than rejected.
 */

const normalized = z
  .number()
  .transform((value) => Math.min(1, Math.max(0, value)));

export const canvasObjectSchema = z.object({
  type: z.string().max(40),
  x: normalized,
  y: normalized,
  width: normalized,
  height: normalized,
  rotation: z.number().min(-360).max(360).default(0),
  text: z.string().max(300).optional(),
  color: z.string().max(40).optional(),
  /** Paint order — higher is drawn on top. */
  zIndex: z.number().int().min(0).max(2000).default(0),
});

export const canvasLabelSchema = z.object({
  text: z.string().min(1).max(300),
  x: normalized,
  y: normalized,
});

const IMAGE_DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;

export const generateGameRequestSchema = z
  .object({
    canvasImage: z
      .string()
      .max(9_000_000, "Canvas image is too large")
      .regex(IMAGE_DATA_URL, "canvasImage must be a png/jpeg/webp data URL")
      .nullish(),
    canvasObjects: z.array(canvasObjectSchema).max(400).default([]),
    canvasLabels: z.array(canvasLabelSchema).max(150).default([]),
    userPrompt: z.string().max(2000).default(""),
    selectedGameType: z.string().max(40).default("auto"),
    canvasDimensions: z.object({
      width: z.number().positive().max(100_000),
      height: z.number().positive().max(100_000),
    }),
  })
  .superRefine((body, ctx) => {
    const hasDrawing =
      Boolean(body.canvasImage) ||
      body.canvasObjects.length > 0 ||
      body.canvasLabels.length > 0;
    if (!hasDrawing) {
      ctx.addIssue({
        code: "custom",
        message:
          "The canvas looks empty — draw your game idea before generating",
      });
    }
  });

export type GenerateGameRequest = z.infer<typeof generateGameRequestSchema>;
export type CanvasObject = z.infer<typeof canvasObjectSchema>;
export type CanvasLabel = z.infer<typeof canvasLabelSchema>;

import { z } from "zod";

import { gameSpecSchema } from "@/lib/game/schema";

const IMAGE_DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;

export const refineHistoryItemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

/**
 * Request contract for POST /api/refine-game. Chat patches the live GameSpec;
 * canvas image is optional context for layout-aware tweaks.
 */
export const refineGameRequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  gameSpec: gameSpecSchema,
  interpretationSummary: z.string().max(300).optional(),
  canvasImage: z
    .string()
    .max(9_000_000, "Canvas image is too large")
    .regex(IMAGE_DATA_URL, "canvasImage must be a png/jpeg/webp data URL")
    .nullish(),
  /** Prior chat turns — newest last. Capped at 8. */
  history: z.array(refineHistoryItemSchema).max(8).default([]),
});

export type RefineGameRequest = z.infer<typeof refineGameRequestSchema>;
export type RefineHistoryItem = z.infer<typeof refineHistoryItemSchema>;

/** Model output for refine: patched game + short chat reply. */
export const refineResultSchema = z.object({
  assistantMessage: z.string().min(1).max(400),
  game: gameSpecSchema,
});

export type RefineResult = z.infer<typeof refineResultSchema>;

function toOpenAiSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toOpenAiSchema);
  if (!node || typeof node !== "object") return node;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === "$schema" || (key === "pattern" && typeof value === "string")) {
      continue;
    }
    out[key] = toOpenAiSchema(value);
  }
  return out;
}

export const refineResultJsonSchema = toOpenAiSchema(
  z.toJSONSchema(refineResultSchema)
) as Record<string, unknown>;

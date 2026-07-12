import OpenAI, {
  APIConnectionTimeoutError,
  AuthenticationError,
  RateLimitError,
} from "openai";
import type { ResponseInput } from "openai/resources/responses/responses";
import { z } from "zod";

import {
  levelZodSchema,
  platformerRefineJsonSchema,
  repairLevel,
} from "@/lib/game/platformer-level";
import {
  buildPlatformerRefineMessage,
  PLATFORMER_REFINE_SYSTEM_PROMPT,
  PLATFORMER_UNSUPPORTED_MESSAGE,
} from "@/lib/openai/platformer-prompt";
import type { Level } from "@/types";

/**
 * POST /api/refine-platformer — chat tweaks for a live platformer level.
 * The model edits the Level JSON directly; the repair pass keeps the result
 * playable no matter what comes back.
 */

const DEFAULT_MODEL = "gpt-4.1-mini";
const REQUEST_TIMEOUT_MS = 45_000;

const requestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  gameSpec: levelZodSchema,
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      })
    )
    .max(8)
    .default([]),
});

const modelResultSchema = z.object({
  assistantMessage: z.string().min(1).max(400),
  game: z.unknown(),
});

function failure(status: number, code: string, message: string): Response {
  return Response.json(
    { success: false, error: { code, message } },
    { status }
  );
}

function success(
  gameSpec: Level,
  assistantMessage: string,
  warnings: string[] = []
): Response {
  return Response.json({ success: true, gameSpec, assistantMessage, warnings });
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return failure(400, "BAD_JSON", "The request body was not valid JSON.");
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return failure(
      400,
      "BAD_REQUEST",
      parsed.error.issues[0]?.message ?? "Invalid refine request."
    );
  }
  const { message, gameSpec, history } = parsed.data;
  const current = gameSpec as Level;

  if (process.env.USE_MOCK_OPENAI === "true") {
    return success(
      current,
      `${PLATFORMER_UNSUPPORTED_MESSAGE} (mock mode — no change applied.)`
    );
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY;
  if (!apiKey) {
    return success(current, PLATFORMER_UNSUPPORTED_MESSAGE);
  }

  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const client = new OpenAI({
    apiKey,
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: 1,
  });

  const historyText =
    history.length > 0
      ? `\n\nRECENT CHAT:\n${history
          .map((turn) => `${turn.role.toUpperCase()}: ${turn.content}`)
          .join("\n")}`
      : "";

  const input: ResponseInput = [
    {
      role: "user",
      content: buildPlatformerRefineMessage(current, message) + historyText,
    },
  ];

  try {
    const response = await client.responses.create({
      model,
      instructions: PLATFORMER_REFINE_SYSTEM_PROMPT,
      input,
      text: {
        format: {
          type: "json_schema",
          name: "playbox_platformer_refine",
          schema: platformerRefineJsonSchema,
        },
      },
    });

    let json: unknown;
    try {
      json = JSON.parse(response.output_text);
    } catch {
      return success(current, PLATFORMER_UNSUPPORTED_MESSAGE);
    }

    const modelParsed = modelResultSchema.safeParse(json);
    if (!modelParsed.success) {
      return success(current, PLATFORMER_UNSUPPORTED_MESSAGE);
    }

    // Repair keeps whatever came back playable; hopeless output keeps the
    // current level (repairLevel only falls back on non-object input).
    const repaired = repairLevel(modelParsed.data.game);
    return success(
      repaired.level,
      modelParsed.data.assistantMessage,
      repaired.warnings
    );
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return failure(
        503,
        "BAD_API_KEY",
        "The OpenAI API key was rejected. Check OPENAI_API_KEY in .env.local."
      );
    }
    if (error instanceof RateLimitError) {
      return failure(
        429,
        "RATE_LIMITED",
        "The AI service is busy right now. Wait a few seconds and try again."
      );
    }
    if (error instanceof APIConnectionTimeoutError) {
      return failure(
        504,
        "TIMEOUT",
        "That tweak took too long. Try a simpler request."
      );
    }
    // Fall back to a helpful no-op rather than a hard error.
    return success(current, PLATFORMER_UNSUPPORTED_MESSAGE);
  }
}

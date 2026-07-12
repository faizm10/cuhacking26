import OpenAI, {
  APIConnectionTimeoutError,
  AuthenticationError,
  RateLimitError,
} from "openai";
import type { ResponseInput } from "openai/resources/responses/responses";
import { z } from "zod";

import {
  applyFlappyRefine,
  FLAPPY_UNSUPPORTED_MESSAGE,
} from "@/components/game/flappy/flappyRefine";
import {
  coerceFlappySpec,
  flappyRefineJsonSchema,
  flappySpecSchema,
  type FlappySpec,
} from "@/components/game/flappy/flappyTypes";
import {
  buildFlappyRefineMessage,
  FLAPPY_REFINE_SYSTEM_PROMPT,
} from "@/lib/openai/flappy-prompt";

/**
 * POST /api/refine-flappy — chat tweaks for a live Flappy Bird config.
 * Local heuristics handle common requests first (free + instant); OpenAI
 * covers the rest. Only ever changes config values — never geometry or code.
 */

const DEFAULT_MODEL = "gpt-4.1-mini";
const REQUEST_TIMEOUT_MS = 45_000;

const requestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  gameSpec: flappySpecSchema,
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
  gameSpec: FlappySpec,
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

  // Fast path: deterministic local edits for common chat requests.
  const local = applyFlappyRefine(gameSpec, message);
  if (local.matched) {
    return success(local.spec, local.assistantMessage);
  }

  if (process.env.USE_MOCK_OPENAI === "true") {
    return success(
      gameSpec,
      `${FLAPPY_UNSUPPORTED_MESSAGE} (mock mode — no change applied.)`
    );
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY;
  if (!apiKey) {
    return success(gameSpec, FLAPPY_UNSUPPORTED_MESSAGE);
  }

  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const client = new OpenAI({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 });

  const historyText =
    history.length > 0
      ? `\n\nRECENT CHAT:\n${history
          .map((turn) => `${turn.role.toUpperCase()}: ${turn.content}`)
          .join("\n")}`
      : "";

  const input: ResponseInput = [
    {
      role: "user",
      content: buildFlappyRefineMessage(gameSpec, message) + historyText,
    },
  ];

  try {
    const response = await client.responses.create({
      model,
      instructions: FLAPPY_REFINE_SYSTEM_PROMPT,
      input,
      text: {
        format: {
          type: "json_schema",
          name: "playbox_flappy_refine",
          schema: flappyRefineJsonSchema,
        },
      },
    });

    let json: unknown;
    try {
      json = JSON.parse(response.output_text);
    } catch {
      return success(gameSpec, FLAPPY_UNSUPPORTED_MESSAGE);
    }

    const modelParsed = modelResultSchema.safeParse(json);
    if (!modelParsed.success) {
      return success(gameSpec, FLAPPY_UNSUPPORTED_MESSAGE);
    }

    // Coerce over the current spec: only recognized, clamped fields change.
    const next = coerceFlappySpec(modelParsed.data.game, gameSpec);
    return success(next, modelParsed.data.assistantMessage);
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
    return success(gameSpec, FLAPPY_UNSUPPORTED_MESSAGE);
  }
}

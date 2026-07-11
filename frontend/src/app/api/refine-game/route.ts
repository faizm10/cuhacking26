import OpenAI, {
  APIConnectionTimeoutError,
  AuthenticationError,
  RateLimitError,
} from "openai";
import type { ResponseInput } from "openai/resources/responses/responses";

import { applyLocalRefine } from "@/lib/game/local-refine";
import { repairGameSpec } from "@/lib/game/repair";
import {
  refineGameRequestSchema,
  refineResultJsonSchema,
  type RefineGameRequest,
} from "@/lib/game/refine-request";
import type { GameSpec } from "@/lib/game/schema";
import { parseRefineOutput } from "@/lib/openai/parse-refine";
import {
  buildRefineRepairMessage,
  buildRefineUserMessage,
  GAME_TUNER_SYSTEM_PROMPT,
} from "@/lib/openai/refine-prompt";

/**
 * POST /api/refine-game — apply a chat request to an existing GameSpec.
 */

const DEFAULT_MODEL = "gpt-4.1-mini";
const REQUEST_TIMEOUT_MS = 60_000;

interface SuccessBody {
  success: true;
  gameSpec: GameSpec;
  assistantMessage: string;
  warnings: string[];
}

function failure(status: number, code: string, message: string): Response {
  return Response.json(
    { success: false, error: { code, message } },
    { status }
  );
}

function successBody(
  game: GameSpec,
  assistantMessage: string,
  warnings: string[] = []
): SuccessBody {
  const repaired = repairGameSpec(game);
  return {
    success: true,
    gameSpec: repaired.game,
    assistantMessage,
    warnings: [...warnings, ...repaired.warnings],
  };
}

function devLog(entry: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== "production") {
    console.log("[refine-game]", JSON.stringify(entry));
  }
}

async function callTuner(
  client: OpenAI,
  model: string,
  input: ResponseInput
): Promise<string> {
  const response = await client.responses.create({
    model,
    instructions: GAME_TUNER_SYSTEM_PROMPT,
    input,
    text: {
      format: {
        type: "json_schema",
        name: "playbox_refine",
        schema: refineResultJsonSchema,
      },
    },
  });
  return response.output_text;
}

function mockRefine(request: RefineGameRequest): SuccessBody {
  const local = applyLocalRefine(request.gameSpec, request.message);
  if (local.matched) {
    return successBody(
      local.game,
      `${local.assistantMessage} (mock mode — add OPENAI_API_KEY for richer tweaks.)`
    );
  }

  const game = structuredClone(request.gameSpec);
  game.scoring.perCollectible = Math.min(100, game.scoring.perCollectible + 5);
  return successBody(
    game,
    "Mock mode: tweaked scoring slightly. Try asking to add a floor, spikes, or speed changes — or add OPENAI_API_KEY for real chat."
  );
}

export async function POST(req: Request): Promise<Response> {
  const startedAt = Date.now();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return failure(400, "BAD_JSON", "The request body was not valid JSON.");
  }

  const parsed = refineGameRequestSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return failure(
      400,
      "BAD_REQUEST",
      first?.message ?? "The refine request was invalid."
    );
  }
  const request = parsed.data;

  if (process.env.USE_MOCK_OPENAI === "true") {
    devLog({ mode: "mock", messageLen: request.message.length });
    return Response.json(mockRefine(request));
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY;
  if (!apiKey) {
    const local = applyLocalRefine(request.gameSpec, request.message);
    if (local.matched) {
      return Response.json(successBody(local.game, local.assistantMessage));
    }
    return failure(
      503,
      "MISSING_API_KEY",
      "The AI service isn't configured yet. Add OPENAI_API_KEY to frontend/.env.local (or set USE_MOCK_OPENAI=true) and restart the dev server."
    );
  }

  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const client = new OpenAI({
    apiKey,
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: 1,
  });

  const userContent: ResponseInput = [
    {
      role: "user",
      content: [
        ...(request.canvasImage
          ? ([
              {
                type: "input_image",
                image_url: request.canvasImage,
                detail: "low",
              },
            ] as const)
          : []),
        { type: "input_text", text: buildRefineUserMessage(request) },
      ],
    },
  ];

  try {
    const firstText = await callTuner(client, model, userContent);
    let parsedOutput = parseRefineOutput(firstText, request.gameSpec);
    let repaired = false;

    if (!parsedOutput.ok) {
      repaired = true;
      const repairInput: ResponseInput = [
        ...userContent,
        { role: "assistant", content: firstText },
        {
          role: "user",
          content: buildRefineRepairMessage(parsedOutput.issues),
        },
      ];
      const secondText = await callTuner(client, model, repairInput);
      parsedOutput = parseRefineOutput(secondText, request.gameSpec);
    }

    if (!parsedOutput.ok) {
      devLog({
        model,
        durationMs: Date.now() - startedAt,
        valid: false,
        issues: parsedOutput.issues.slice(0, 500),
      });
      return failure(
        502,
        "INVALID_GAME",
        "The AI couldn't apply that change cleanly. Try rephrasing once, or regenerate from the sketch."
      );
    }

    const responseBody = successBody(
      parsedOutput.value.game,
      parsedOutput.value.assistantMessage
    );

    devLog({
      model,
      template: responseBody.gameSpec.gameType,
      durationMs: Date.now() - startedAt,
      valid: true,
      retried: repaired,
      repairWarnings: responseBody.warnings,
    });

    return Response.json(responseBody);
  } catch (error) {
    devLog({
      model,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.name : "unknown",
    });

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
    return failure(
      502,
      "REFINE_FAILED",
      "Something went wrong while updating your game. Please try again."
    );
  }
}

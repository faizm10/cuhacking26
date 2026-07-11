import OpenAI, {
  APIConnectionTimeoutError,
  AuthenticationError,
  RateLimitError,
} from "openai";
import type { ResponseInput } from "openai/resources/responses/responses";

import { EXAMPLE_GAMES, pickExampleGame } from "@/lib/game/fixtures";
import { repairGameSpec, resolveGameType } from "@/lib/game/repair";
import {
  generateGameRequestSchema,
  type GenerateGameRequest,
} from "@/lib/game/request";
import {
  generationResultJsonSchema,
  type GameSpec,
} from "@/lib/game/schema";
import { parseModelOutput } from "@/lib/openai/parse";
import {
  buildRepairMessage,
  buildUserMessage,
  GAME_DESIGNER_SYSTEM_PROMPT,
} from "@/lib/openai/prompt";

/**
 * POST /api/generate-game — turns a canvas drawing + labels + prompt into a
 * validated GameSpec via the OpenAI Responses API. The API key never leaves
 * the server: this route is the only place it is read.
 */

const DEFAULT_MODEL = "gpt-5-mini";
const REQUEST_TIMEOUT_MS = 75_000;

interface SuccessBody {
  success: true;
  gameSpec: GameSpec;
  interpretationSummary: string;
  warnings: string[];
}

function failure(status: number, code: string, message: string): Response {
  return Response.json(
    { success: false, error: { code, message } },
    { status }
  );
}

function devLog(entry: Record<string, unknown>): void {
  if (process.env.NODE_ENV !== "production") {
    // Never log the API key or the base64 canvas image.
    console.log("[generate-game]", JSON.stringify(entry));
  }
}

async function callDesigner(
  client: OpenAI,
  model: string,
  input: ResponseInput
): Promise<string> {
  const response = await client.responses.create({
    model,
    instructions: GAME_DESIGNER_SYSTEM_PROMPT,
    input,
    text: {
      format: {
        type: "json_schema",
        name: "playbox_game",
        schema: generationResultJsonSchema,
      },
    },
  });
  return response.output_text;
}

function mockResponse(request: GenerateGameRequest): SuccessBody {
  const requested = resolveGameType(request.selectedGameType);
  const seed = request.canvasObjects.length + request.userPrompt.length;
  let game = pickExampleGame(seed);
  if (requested !== "auto") {
    // Prefer an example matching the requested template when we have one.
    const match = EXAMPLE_GAMES.find(
      (example) => example.gameType === requested
    );
    if (match) game = structuredClone(match);
  }
  return {
    success: true,
    gameSpec: game,
    interpretationSummary: `Mock mode: here's "${game.title}" — a ${game.gameType} example. Add OPENAI_API_KEY to generate from your drawing.`,
    warnings: [],
  };
}

export async function POST(req: Request): Promise<Response> {
  const startedAt = Date.now();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return failure(400, "BAD_JSON", "The request body was not valid JSON.");
  }

  const parsed = generateGameRequestSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return failure(
      400,
      "BAD_REQUEST",
      first?.message ?? "The generate request was invalid."
    );
  }
  const request = parsed.data;

  if (process.env.USE_MOCK_OPENAI === "true") {
    devLog({ mode: "mock", template: request.selectedGameType });
    return Response.json(mockResponse(request));
  }

  const apiKey =
    process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY;
  if (!apiKey) {
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
                detail: "auto",
              },
            ] as const)
          : []),
        { type: "input_text", text: buildUserMessage(request) },
      ],
    },
  ];

  try {
    const firstText = await callDesigner(client, model, userContent);
    let parsedOutput = parseModelOutput(firstText);
    let repaired = false;

    if (!parsedOutput.ok) {
      // One repair round: show the model its own output and the failures.
      repaired = true;
      const repairInput: ResponseInput = [
        ...userContent,
        { role: "assistant", content: firstText },
        { role: "user", content: buildRepairMessage(parsedOutput.issues) },
      ];
      const secondText = await callDesigner(client, model, repairInput);
      parsedOutput = parseModelOutput(secondText);
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
        "The AI couldn't produce a valid game this time. Try again, or simplify the drawing."
      );
    }

    const { game, warnings } = repairGameSpec(parsedOutput.value.game);

    devLog({
      model,
      template: game.gameType,
      durationMs: Date.now() - startedAt,
      valid: true,
      retried: repaired,
      repairWarnings: warnings,
    });

    const responseBody: SuccessBody = {
      success: true,
      gameSpec: game,
      interpretationSummary: parsedOutput.value.interpretationSummary,
      warnings,
    };
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
        "Generation took too long. Try again with a simpler drawing."
      );
    }
    return failure(
      502,
      "GENERATION_FAILED",
      "Something went wrong while generating your game. Please try again."
    );
  }
}

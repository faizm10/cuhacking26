import OpenAI, {
  APIConnectionTimeoutError,
  AuthenticationError,
  RateLimitError,
} from "openai";
import type { ResponseInput } from "openai/resources/responses/responses";

import {
  coerceFlappySpec,
  DEFAULT_FLAPPY_SPEC,
  flappyGenerationJsonSchema,
  type FlappySpec,
} from "@/components/game/flappy/flappyTypes";
import {
  coerceTicTacToeSpec,
  DEFAULT_TIC_TAC_TOE_SPEC,
  ticTacToeGenerationJsonSchema,
  type TicTacToeSpec,
} from "@/components/game/tic-tac-toe/ticTacToeTypes";
import { modelGenerationJsonSchema } from "@/lib/game/coordinates";
import { EXAMPLE_GAMES, pickExampleGame } from "@/lib/game/fixtures";
import { rendererTypeForMode, type RendererType } from "@/lib/game/generated";
import { applyLayoutPass } from "@/lib/game/layout";
import { repairGameSpec, resolveGameType } from "@/lib/game/repair";
import {
  generateGameRequestSchema,
  type GenerateGameRequest,
} from "@/lib/game/request";
import { type GameSpec } from "@/lib/game/schema";
import {
  buildFlappyUserMessage,
  FLAPPY_SYSTEM_PROMPT,
} from "@/lib/openai/flappy-prompt";
import {
  buildTicTacToeUserMessage,
  TIC_TAC_TOE_SYSTEM_PROMPT,
} from "@/lib/openai/tic-tac-toe-prompt";
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

const DEFAULT_MODEL = "gpt-4.1-mini";
const REQUEST_TIMEOUT_MS = 75_000;

interface SuccessBody {
  success: true;
  rendererType: RendererType;
  gameSpec: GameSpec | TicTacToeSpec | FlappySpec;
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
        schema: modelGenerationJsonSchema,
      },
    },
  });
  return response.output_text;
}

/** Generate a tic-tac-toe config. Coercion means this can never hard-fail:
 * unusable model output degrades to safe defaults with a warning. */
async function generateTicTacToe(
  request: GenerateGameRequest,
  client: OpenAI,
  model: string,
  startedAt: number
): Promise<Response> {
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
        { type: "input_text", text: buildTicTacToeUserMessage(request) },
      ],
    },
  ];

  const warnings: string[] = [];
  let spec = structuredClone(DEFAULT_TIC_TAC_TOE_SPEC);
  let interpretationSummary =
    "A classic tic-tac-toe game where you play X against the AI using O.";

  try {
    const response = await client.responses.create({
      model,
      instructions: TIC_TAC_TOE_SYSTEM_PROMPT,
      input: userContent,
      text: {
        format: {
          type: "json_schema",
          name: "playbox_tic_tac_toe",
          schema: ticTacToeGenerationJsonSchema,
        },
      },
    });
    const json = JSON.parse(response.output_text) as Record<string, unknown>;
    spec = coerceTicTacToeSpec(json.game ?? json);
    if (typeof json.interpretationSummary === "string") {
      interpretationSummary = json.interpretationSummary.slice(0, 300);
    }
  } catch (error) {
    warnings.push("Used classic defaults — the AI styling pass didn't land");
    devLog({
      model,
      template: "tic-tac-toe",
      durationMs: Date.now() - startedAt,
      fallback: true,
      error: error instanceof Error ? error.name : "unknown",
    });
  }

  devLog({
    model,
    template: "tic-tac-toe",
    durationMs: Date.now() - startedAt,
    valid: true,
  });

  const body: SuccessBody = {
    success: true,
    rendererType: "tic-tac-toe",
    gameSpec: spec,
    interpretationSummary,
    warnings,
  };
  return Response.json(body);
}

function mockTicTacToeResponse(): SuccessBody {
  return {
    success: true,
    rendererType: "tic-tac-toe",
    gameSpec: structuredClone(DEFAULT_TIC_TAC_TOE_SPEC),
    interpretationSummary:
      "Mock mode: a classic tic-tac-toe game — you play X against the AI. Add OPENAI_API_KEY to style it from your drawing.",
    warnings: [],
  };
}

/** Generate a Flappy Bird config. Coercion means this can never hard-fail:
 * unusable model output degrades to safe defaults with a warning. */
async function generateFlappy(
  request: GenerateGameRequest,
  client: OpenAI,
  model: string,
  startedAt: number
): Promise<Response> {
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
        { type: "input_text", text: buildFlappyUserMessage(request) },
      ],
    },
  ];

  const warnings: string[] = [];
  let spec = structuredClone(DEFAULT_FLAPPY_SPEC);
  let interpretationSummary =
    "A cheerful Flappy Bird — tap or press space to flap through the pipes.";

  try {
    const response = await client.responses.create({
      model,
      instructions: FLAPPY_SYSTEM_PROMPT,
      input: userContent,
      text: {
        format: {
          type: "json_schema",
          name: "playbox_flappy_bird",
          schema: flappyGenerationJsonSchema,
        },
      },
    });
    const json = JSON.parse(response.output_text) as Record<string, unknown>;
    spec = coerceFlappySpec(json.game ?? json);
    if (typeof json.interpretationSummary === "string") {
      interpretationSummary = json.interpretationSummary.slice(0, 300);
    }
  } catch (error) {
    warnings.push("Used classic defaults — the AI styling pass didn't land");
    devLog({
      model,
      template: "flappy-bird",
      durationMs: Date.now() - startedAt,
      fallback: true,
      error: error instanceof Error ? error.name : "unknown",
    });
  }

  devLog({
    model,
    template: "flappy-bird",
    durationMs: Date.now() - startedAt,
    valid: true,
  });

  const body: SuccessBody = {
    success: true,
    rendererType: "flappy-bird",
    gameSpec: spec,
    interpretationSummary,
    warnings,
  };
  return Response.json(body);
}

function mockFlappyResponse(): SuccessBody {
  return {
    success: true,
    rendererType: "flappy-bird",
    gameSpec: structuredClone(DEFAULT_FLAPPY_SPEC),
    interpretationSummary:
      "Mock mode: a classic daytime Flappy Bird. Add OPENAI_API_KEY to style the bird, pipes, and difficulty from your drawing.",
    warnings: [],
  };
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
    rendererType: "arcade",
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
  // An explicit tic-tac-toe selection is authoritative — it always takes the
  // dedicated path and renderer, never an arcade reinterpretation.
  const rendererType = rendererTypeForMode(request.selectedGameType);

  if (process.env.USE_MOCK_OPENAI === "true") {
    devLog({ mode: "mock", template: request.selectedGameType });
    if (rendererType === "tic-tac-toe") {
      return Response.json(mockTicTacToeResponse());
    }
    if (rendererType === "flappy-bird") {
      return Response.json(mockFlappyResponse());
    }
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

  if (rendererType === "tic-tac-toe") {
    return generateTicTacToe(request, client, model, startedAt);
  }
  if (rendererType === "flappy-bird") {
    return generateFlappy(request, client, model, startedAt);
  }

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

    const repairedSpec = repairGameSpec(parsedOutput.value.game);
    const layout = applyLayoutPass(repairedSpec.game);
    const warnings = [...repairedSpec.warnings, ...layout.warnings];

    devLog({
      model,
      template: layout.game.gameType,
      durationMs: Date.now() - startedAt,
      valid: true,
      retried: repaired,
      repairWarnings: warnings,
    });
    if (process.env.NODE_ENV !== "production") {
      // Compact coordinate table: normalized (model) → world (rendered).
      for (const row of parsedOutput.debugTable) {
        console.log(
          `[coords] ${row.role.padEnd(11)} ${row.id.padEnd(16)} norm(${row.normX}, ${row.normY}) → world(${row.worldX}, ${row.worldY})`
        );
      }
    }

    const responseBody: SuccessBody = {
      success: true,
      rendererType: "arcade",
      gameSpec: layout.game,
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

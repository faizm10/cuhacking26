import OpenAI, {
  APIConnectionTimeoutError,
  AuthenticationError,
  RateLimitError,
} from "openai";
import type { ResponseInput } from "openai/resources/responses/responses";

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

const DEFAULT_MODEL = "gpt-5-mini";
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
  const game = structuredClone(request.gameSpec);
  const lower = request.message.toLowerCase();
  const changes: string[] = [];

  if (/fast|speed|quick/.test(lower)) {
    game.player.speed = Math.min(900, Math.round(game.player.speed * 1.25) || 280);
    for (const enemy of game.enemies) {
      enemy.speed = Math.min(500, Math.round(enemy.speed * 1.2) || 120);
    }
    changes.push("sped things up");
  }
  if (/slow|easier|easy/.test(lower)) {
    game.player.speed = Math.max(80, Math.round(game.player.speed * 0.85));
    game.difficulty = "easy";
    changes.push("made it a bit easier");
  }
  if (/hard|harder|difficult/.test(lower)) {
    game.difficulty = "normal";
    game.lives = Math.max(1, game.lives - 1);
    changes.push("nudged difficulty up");
  }
  if (/coin|collect|star|gem/.test(lower) && game.collectibles.length > 0) {
    const template = game.collectibles[0]!;
    const nextId = `collectible-mock-${game.collectibles.length + 1}`;
    game.collectibles.push({
      ...template,
      id: nextId,
      x: Math.min(920, template.x + 48),
      y: template.y,
    });
    changes.push("added another collectible");
  }
  if (/jump/.test(lower)) {
    game.player.jumpStrength = Math.min(
      900,
      Math.round(game.player.jumpStrength * 1.15) || 420
    );
    changes.push("boosted jump strength");
  }

  if (changes.length === 0) {
    game.scoring.perCollectible = Math.min(
      100,
      game.scoring.perCollectible + 5
    );
    changes.push("tweaked scoring slightly (mock mode)");
  }

  return {
    success: true,
    gameSpec: game,
    assistantMessage: `Mock mode: ${changes.join(", ")}. Add OPENAI_API_KEY for real chat tweaks.`,
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
        { type: "input_text", text: buildRefineUserMessage(request) },
      ],
    },
  ];

  try {
    const firstText = await callTuner(client, model, userContent);
    let parsedOutput = parseRefineOutput(firstText);
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
      parsedOutput = parseRefineOutput(secondText);
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
        "The AI couldn't apply that change cleanly. Try rephrasing, or regenerate from the sketch."
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
      assistantMessage: parsedOutput.value.assistantMessage,
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

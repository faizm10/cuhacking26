import { GoogleGenAI, type Content } from "@google/genai";

import { env } from "../config/env.js";
import {
  buildGamePrompt,
  buildGameRepairPrompt,
} from "../lib/game/prompts/game-prompt.js";
import {
  gameSpecJsonSchema,
  gameSpecSchema,
  supportedGameTypes,
  type GameSpec,
  type SupportedGameType,
} from "../lib/game/schema/game.js";
import { InvalidLevelError, UpstreamError } from "../utils/errors.js";
import { getMockGame } from "../utils/mock-game.js";

export interface GenerateGameInput {
  prompt: string;
  shapes: Record<string, unknown>[];
  /** Base64 image data URL of the canvas, if the client sent one. */
  screenshot?: string;
  selectedGameType?: string;
}

export interface GenerateGameResult {
  game: GameSpec;
  source: "gemini" | "mock";
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return client;
}

function dataUrlToInlinePart(dataUrl: string) {
  const [header, data] = dataUrl.split(",", 2);
  const mimeType = header?.slice("data:".length).replace(";base64", "");
  if (!mimeType || !data) {
    throw new UpstreamError("Malformed screenshot data URL");
  }
  return { inlineData: { mimeType, data } };
}

async function callModel(contents: Content[]): Promise<string> {
  let text: string | undefined;
  try {
    const response = await getClient().models.generateContent({
      model: env.GEMINI_MODEL,
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: gameSpecJsonSchema,
        temperature: 0.6,
      },
    });
    text = response.text;
  } catch (error) {
    throw new UpstreamError("Gemini request failed", {
      cause: error instanceof Error ? error.message : String(error),
    });
  }
  if (!text) {
    throw new UpstreamError("Gemini returned an empty response");
  }
  return text;
}

function parseGame(text: string): GameSpec | { issues: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { issues: "Response was not valid JSON." };
  }
  const result = gameSpecSchema.safeParse(json);
  if (!result.success) {
    return {
      issues: result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("\n"),
    };
  }
  return result.data;
}

function parseSelectedGameType(value: string | undefined): SupportedGameType | undefined {
  if (!value) return undefined;
  return supportedGameTypes.find((type) => type === value);
}

/**
 * Turn a sketch into a validated game specification. Retries once with the
 * validation errors when Gemini's first answer doesn't match the schema.
 */
export async function generateGame(
  input: GenerateGameInput
): Promise<GenerateGameResult> {
  if (env.USE_MOCK_GEMINI) {
    return { game: getMockGame(input.selectedGameType), source: "mock" };
  }

  const instruction = buildGamePrompt({
    prompt: input.prompt,
    shapes: input.shapes,
    hasScreenshot: Boolean(input.screenshot),
    selectedGameType: parseSelectedGameType(input.selectedGameType),
  });

  const userParts = input.screenshot
    ? [dataUrlToInlinePart(input.screenshot), { text: instruction }]
    : [{ text: instruction }];
  const conversation: Content[] = [{ role: "user", parts: userParts }];

  const firstText = await callModel(conversation);
  const first = parseGame(firstText);
  if (!("issues" in first)) {
    return { game: first, source: "gemini" };
  }

  // One repair round: show the model its own output and the exact failures.
  conversation.push(
    { role: "model", parts: [{ text: firstText }] },
    { role: "user", parts: [{ text: buildGameRepairPrompt(first.issues) }] }
  );

  const secondText = await callModel(conversation);
  const second = parseGame(secondText);
  if (!("issues" in second)) {
    return { game: second, source: "gemini" };
  }

  throw new InvalidLevelError({ validationIssues: second.issues });
}

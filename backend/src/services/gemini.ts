import { GoogleGenAI, type Content } from "@google/genai";

import { env } from "../config/env.js";
import { buildLevelPrompt, buildRepairPrompt } from "../prompts/level-prompt.js";
import { levelJsonSchema, levelSchema, type Level } from "../schemas/level.js";
import { InvalidLevelError, UpstreamError } from "../utils/errors.js";
import { getMockLevel } from "../utils/mock-level.js";

export interface GenerateLevelInput {
  prompt: string;
  shapes: Record<string, unknown>[];
  /** Base64 image data URL of the canvas, if the client sent one. */
  screenshot?: string;
}

export interface GenerateLevelResult {
  level: Level;
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
        responseJsonSchema: levelJsonSchema,
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

function parseLevel(text: string): Level | { issues: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { issues: "Response was not valid JSON." };
  }
  const result = levelSchema.safeParse(json);
  if (!result.success) {
    return {
      issues: result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("\n"),
    };
  }
  return result.data;
}

/**
 * Turn a sketch into a validated platformer level. Retries once with the
 * validation errors when Gemini's first answer doesn't match the schema.
 */
export async function generateLevel(
  input: GenerateLevelInput
): Promise<GenerateLevelResult> {
  if (env.USE_MOCK_GEMINI) {
    return { level: getMockLevel(), source: "mock" };
  }

  const instruction = buildLevelPrompt({
    prompt: input.prompt,
    shapes: input.shapes,
    hasScreenshot: Boolean(input.screenshot),
  });

  const userParts = input.screenshot
    ? [dataUrlToInlinePart(input.screenshot), { text: instruction }]
    : [{ text: instruction }];
  const conversation: Content[] = [{ role: "user", parts: userParts }];

  const firstText = await callModel(conversation);
  const first = parseLevel(firstText);
  if (!("issues" in first)) {
    return { level: first, source: "gemini" };
  }

  // One repair round: show the model its own output and the exact failures.
  conversation.push(
    { role: "model", parts: [{ text: firstText }] },
    { role: "user", parts: [{ text: buildRepairPrompt(first.issues) }] }
  );

  const secondText = await callModel(conversation);
  const second = parseLevel(secondText);
  if (!("issues" in second)) {
    return { level: second, source: "gemini" };
  }

  throw new InvalidLevelError({ validationIssues: second.issues });
}

import type { FastifyInstance } from "fastify";

import {
  generateRequestSchema,
  type GenerateResponse,
} from "../schemas/generate.js";
import { saveGeneratedLevel } from "../services/firestore.js";
import { generateLevel } from "../services/gemini.js";
import { uploadScreenshot } from "../services/storage.js";
import { BadRequestError } from "../utils/errors.js";

export function gamesRoutes(app: FastifyInstance): void {
  app.post("/generate", async (request): Promise<GenerateResponse> => {
    const parsed = generateRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new BadRequestError("Invalid request body", parsed.error.issues);
    }
    const { projectId, prompt, screenshot, shapes } = parsed.data;

    // Screenshot upload is best-effort: a storage hiccup shouldn't cost the
    // user their generation.
    let screenshotUrl: string | null = null;
    if (screenshot) {
      try {
        screenshotUrl = await uploadScreenshot(screenshot, projectId ?? null);
      } catch (error) {
        request.log.warn({ err: error }, "Screenshot upload failed, continuing");
      }
    }

    const { level, source } = await generateLevel({
      prompt,
      shapes,
      screenshot,
    });

    // Persistence is best-effort too — the level is already in hand.
    let levelId: string | null = null;
    try {
      levelId = await saveGeneratedLevel({
        projectId: projectId ?? null,
        prompt,
        source,
        screenshotUrl,
        level,
      });
    } catch (error) {
      request.log.warn({ err: error }, "Failed to persist level, continuing");
    }

    return { source, levelId, screenshotUrl, level };
  });
}

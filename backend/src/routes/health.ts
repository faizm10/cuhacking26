import type { FastifyInstance } from "fastify";

import { env } from "../config/env.js";
import { isFirestoreEnabled } from "../services/firestore.js";
import { isStorageEnabled } from "../services/storage.js";

export function healthRoutes(app: FastifyInstance): void {
  app.get("/health", async () => ({
    status: "ok",
    gemini: env.USE_MOCK_GEMINI ? "mock" : "live",
    firestore: isFirestoreEnabled() ? "enabled" : "disabled",
    storage: isStorageEnabled() ? "enabled" : "disabled",
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  }));
}

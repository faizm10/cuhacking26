import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";

import { env } from "./config/env.js";
import { gamesRoutes } from "./routes/games.js";
import { healthRoutes } from "./routes/health.js";
import { errorHandler } from "./utils/errors.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
    },
    // Canvas screenshots arrive as base64 data URLs, so allow large bodies.
    bodyLimit: 16 * 1024 * 1024,
  });

  await app.register(cors, {
    origin:
      env.CORS_ORIGIN === "*"
        ? true
        : env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
  });

  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: {
        code: "NOT_FOUND",
        message: `Route ${request.method} ${request.url} not found`,
      },
    });
  });

  app.register(healthRoutes);
  app.register(gamesRoutes, { prefix: "/api/games" });

  return app;
}

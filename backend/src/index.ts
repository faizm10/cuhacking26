import { buildApp } from "./app.js";
import { env } from "./config/env.js";

const app = await buildApp();

// Cloud Run sends SIGTERM before stopping an instance; drain in-flight
// requests instead of dropping them.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, async () => {
    app.log.info({ signal }, "Shutting down");
    await app.close();
    process.exit(0);
  });
}

try {
  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info(
    `PlayBox backend ready (gemini: ${env.USE_MOCK_GEMINI ? "mock" : "live"})`
  );
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(8080),
    HOST: z.string().default("0.0.0.0"),

    /** When "true", /api/games/generate returns a sample level without calling Gemini. */
    USE_MOCK_GEMINI: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().default("gemini-2.5-flash"),

    /** Enables Firestore persistence. Set automatically on Cloud Run. */
    GOOGLE_CLOUD_PROJECT: z.string().optional(),
    /** Enables screenshot uploads when set. */
    GCS_BUCKET: z.string().optional(),

    /** Comma-separated list of allowed origins, or "*" for any. */
    CORS_ORIGIN: z.string().default("*"),
  })
  .superRefine((config, ctx) => {
    if (!config.USE_MOCK_GEMINI && !config.GEMINI_API_KEY) {
      ctx.addIssue({
        code: "custom",
        path: ["GEMINI_API_KEY"],
        message:
          "GEMINI_API_KEY is required unless USE_MOCK_GEMINI=true. " +
          "Set USE_MOCK_GEMINI=true for local development without a key.",
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

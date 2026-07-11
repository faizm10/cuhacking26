import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";

/** Operational error with an HTTP status. Anything else is treated as a bug. */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, "BAD_REQUEST", message, details);
  }
}

/** Gemini was unreachable or errored. */
export class UpstreamError extends AppError {
  constructor(message: string, details?: unknown) {
    super(502, "GEMINI_UPSTREAM_ERROR", message, details);
  }
}

/** Gemini answered, but the level failed schema validation after retrying. */
export class InvalidLevelError extends AppError {
  constructor(details?: unknown) {
    super(
      502,
      "GEMINI_INVALID_LEVEL",
      "The AI returned a level that failed validation. Try again or simplify the sketch.",
      details
    );
  }
}

export function errorHandler(
  error: FastifyError | AppError | ZodError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  if (error instanceof AppError) {
    request.log.warn({ code: error.code, details: error.details }, error.message);
    reply.status(error.statusCode).send({
      error: { code: error.code, message: error.message, details: error.details },
    });
    return;
  }

  if (error instanceof ZodError) {
    reply.status(400).send({
      error: {
        code: "BAD_REQUEST",
        message: "Request validation failed",
        details: error.issues,
      },
    });
    return;
  }

  // Fastify-generated errors (body too large, malformed JSON, ...) carry a
  // meaningful status code; anything else is an unexpected 500.
  const statusCode = error.statusCode ?? 500;
  if (statusCode >= 500) {
    request.log.error(error);
    reply.status(statusCode).send({
      error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
    });
    return;
  }

  reply.status(statusCode).send({
    error: { code: error.code ?? "REQUEST_ERROR", message: error.message },
  });
}

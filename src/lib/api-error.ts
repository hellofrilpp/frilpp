import { log } from "@/lib/logger";
import { captureException } from "@/lib/telemetry";

const GENERIC_ERROR_MESSAGES: Record<string, string> = {
  AUTH_FAILED: "Authentication failed",
  VALIDATION_FAILED: "Invalid request",
  NOT_FOUND: "Resource not found",
  FORBIDDEN: "Access denied",
  RATE_LIMITED: "Too many requests",
  SERVER_ERROR: "An unexpected error occurred",
  DB_ERROR: "Service temporarily unavailable",
  EXTERNAL_SERVICE_ERROR: "External service error",
};

export function safeErrorMessage(
  err: unknown,
  fallback: string = "An unexpected error occurred",
): string {
  if (process.env.NODE_ENV !== "production") {
    return err instanceof Error ? err.message : fallback;
  }
  return fallback;
}

export function apiErrorResponse(
  err: unknown,
  context: {
    code?: string;
    fallback?: string;
    status?: number;
    logContext?: Record<string, unknown>;
  } = {},
): Response {
  const {
    code = "SERVER_ERROR",
    fallback = GENERIC_ERROR_MESSAGES[code] ?? "An unexpected error occurred",
    status = 500,
    logContext = {},
  } = context;

  log("error", "api error", {
    code,
    error: err instanceof Error ? err.message : "unknown",
    ...logContext,
  });

  if (process.env.NODE_ENV === "production" && status >= 500) {
    captureException(err, { code, ...logContext });
  }

  const message = safeErrorMessage(err, fallback);

  return Response.json(
    { ok: false, error: message, code },
    { status },
  );
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

import * as Sentry from "@sentry/node";
import { log } from "@/lib/logger";

let didInit = false;
function initOnce() {
  if (didInit) return;
  didInit = true;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    enabled: process.env.NODE_ENV === "production",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0.05"),
  });
}

export function captureException(err: unknown, context?: Record<string, unknown>) {
  try {
    initOnce();
    if (process.env.SENTRY_DSN) Sentry.captureException(err, { extra: context });
  } catch {
    // ignore
  }

  log("error", "exception", {
    error: err instanceof Error ? err.message : String(err),
    ...(context ?? {}),
  });
}

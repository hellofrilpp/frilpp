type LogLevel = "debug" | "info" | "warn" | "error";

function shouldLogDebug() {
  return process.env.LOG_LEVEL === "debug";
}

export function log(level: LogLevel, message: string, fields?: Record<string, unknown>) {
  if (level === "debug" && !shouldLogDebug()) return;
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}


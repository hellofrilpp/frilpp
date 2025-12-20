import crypto from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { log } from "@/lib/logger";

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwardedFor.split(",")[0]?.trim();
  return ip || null;
}

export function ipKey(request: Request) {
  const ip = getClientIp(request);
  return ip ? `ip:${sha256Hex(ip)}` : "ip:unknown";
}

export async function rateLimit(params: {
  key: string;
  limit: number;
  windowSeconds: number;
}) {
  const now = new Date();
  const windowMs = Math.max(1, Math.floor(params.windowSeconds * 1000));
  const windowStart = new Date(Math.floor(now.getTime() / windowMs) * windowMs);

  const result = await db.execute(sql`
    INSERT INTO rate_limit_buckets (key, window_start, count)
    VALUES (${params.key}, ${windowStart}, 1)
    ON CONFLICT (key, window_start)
    DO UPDATE SET count = rate_limit_buckets.count + 1
    RETURNING count
  `);

  const count = Number((result.rows?.[0] as { count?: unknown } | undefined)?.count ?? 0);
  const allowed = count <= params.limit;
  if (!allowed) {
    log("warn", "rate limit exceeded", { key: params.key, windowStart: windowStart.toISOString(), count, limit: params.limit });
  }

  return {
    ok: true as const,
    allowed,
    count,
    limit: params.limit,
    windowSeconds: params.windowSeconds,
    windowStart,
  };
}


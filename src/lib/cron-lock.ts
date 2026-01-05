import crypto from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export async function acquireCronLock(params: {
  job: string;
  ttlSeconds?: number;
  holder?: string;
}) {
  const ttlSeconds =
    Number.isFinite(params.ttlSeconds) && (params.ttlSeconds ?? 0) > 0
      ? Math.floor(params.ttlSeconds ?? 0)
      : 15 * 60;

  const holder = params.holder ?? crypto.randomUUID();
  const lockedUntil = new Date(Date.now() + ttlSeconds * 1000);

  const result = await db.execute(sql`
    INSERT INTO cron_locks (job, locked_until, locked_by, updated_at)
    VALUES (${params.job}, ${lockedUntil}, ${holder}, now())
    ON CONFLICT (job) DO UPDATE
      SET locked_until = EXCLUDED.locked_until,
          locked_by = EXCLUDED.locked_by,
          updated_at = now()
      WHERE cron_locks.locked_until < now()
    RETURNING job, locked_until, locked_by
  `);

  const row = (result.rows?.[0] as { locked_by?: unknown; locked_until?: unknown } | undefined) ?? null;
  if (!row) {
    return { ok: false, holder, lockedUntil: null as Date | null };
  }

  const rowHolder = typeof row.locked_by === "string" ? row.locked_by : null;
  const acquired = rowHolder === holder;
  return {
    ok: acquired,
    holder,
    lockedUntil: row.locked_until instanceof Date ? row.locked_until : lockedUntil,
  };
}

export async function releaseCronLock(params: { job: string; holder: string }) {
  await db.execute(sql`
    UPDATE cron_locks
    SET locked_until = now(), updated_at = now()
    WHERE job = ${params.job} AND locked_by = ${params.holder}
  `);
}

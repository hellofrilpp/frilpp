import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/vercel-postgres/migrator";
import { db } from "@/db";

let didMigrate = false;

export async function ensureRuntimeMigrations() {
  if (didMigrate) return;

  const LOCK_KEY = 734112903; // keep aligned with scripts/migrate-on-deploy.mjs

  const lockResult = (await db.execute(
    sql`select pg_try_advisory_lock(${LOCK_KEY}) as locked`,
  )) as unknown as { rows?: Array<{ locked?: boolean }> };
  const locked = Boolean(lockResult?.rows?.[0]?.locked);
  if (!locked) return;

  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    didMigrate = true;
  } finally {
    try {
      await db.execute(sql`select pg_advisory_unlock(${LOCK_KEY})`);
    } catch {
      // ignore
    }
  }
}

export function getDbErrorText(err: unknown) {
  const message = err instanceof Error ? err.message : "";
  const causeMessage =
    err && typeof err === "object" && "cause" in err && err.cause instanceof Error
      ? err.cause.message
      : "";
  return `${message} ${causeMessage}`.trim();
}

export function isMissingRelation(err: unknown) {
  const text = getDbErrorText(err).toLowerCase();
  return text.includes("does not exist") && (text.includes("relation") || text.includes("table"));
}


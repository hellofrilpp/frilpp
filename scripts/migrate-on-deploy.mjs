import { sql } from "@vercel/postgres";
import { drizzle } from "drizzle-orm/vercel-postgres";
import { migrate } from "drizzle-orm/vercel-postgres/migrator";

const shouldRun =
  process.env.MIGRATE_ON_DEPLOY === "true" &&
  process.env.VERCEL === "1" &&
  process.env.VERCEL_ENV === "production";

if (!shouldRun) {
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.log("[migrate] DATABASE_URL missing; skipping");
  process.exit(0);
}

const LOCK_KEY = 734112903; // arbitrary constant for frilpp migrations

try {
  const lock = await sql`select pg_try_advisory_lock(${LOCK_KEY}) as locked`;
  const locked = Boolean(lock.rows?.[0]?.locked);
  if (!locked) {
    console.log("[migrate] another deploy is migrating; skipping");
    process.exit(0);
  }

  console.log("[migrate] running drizzle migrations...");
  const db = drizzle(sql);
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("[migrate] done");

  await sql`select pg_advisory_unlock(${LOCK_KEY})`;
} catch (err) {
  console.log("[migrate] failed");
  console.error(err);
  process.exit(1);
}


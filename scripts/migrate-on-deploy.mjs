async function main() {
  const shouldRun =
    process.env.MIGRATE_ON_DEPLOY === "true" &&
    process.env.VERCEL === "1" &&
    process.env.VERCEL_ENV === "production";

  if (!shouldRun) {
    return { ok: true, exitCode: 0 };
  }

  const looksPooled = (value) => Boolean(value && /(^|-)pooler\./.test(value));

  const pooledConnectionString =
    process.env.POSTGRES_URL ??
    (looksPooled(process.env.DATABASE_URL) ? process.env.DATABASE_URL : undefined);

  const directConnectionString =
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.POSTGRES_PRISMA_URL ??
    (!pooledConnectionString ? process.env.DATABASE_URL : undefined);

  const connectionString = directConnectionString ?? pooledConnectionString;

  if (!connectionString) {
    console.log("[migrate] no database connection string found; skipping");
    return { ok: true, exitCode: 0 };
  }

  const { createClient, createPool } = await import("@vercel/postgres");
  const { drizzle } = await import("drizzle-orm/vercel-postgres");
  const { migrate } = await import("drizzle-orm/vercel-postgres/migrator");

  const client = directConnectionString
    ? createClient({ connectionString })
    : createPool({ connectionString });
  const sql = client.sql.bind(client);

  const LOCK_KEY = 734112903; // arbitrary constant for frilpp migrations
  let locked = false;

  try {
    const lock = await sql`select pg_try_advisory_lock(${LOCK_KEY}) as locked`;
    locked = Boolean(lock.rows?.[0]?.locked);
    if (!locked) {
      console.log("[migrate] another deploy is migrating; skipping");
      return { ok: true, exitCode: 0 };
    }

    console.log("[migrate] running drizzle migrations...");
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("[migrate] done");

    return { ok: true, exitCode: 0 };
  } catch (err) {
    console.log("[migrate] failed");
    console.error(err);
    return { ok: false, exitCode: 1 };
  } finally {
    try {
      if (locked) await sql`select pg_advisory_unlock(${LOCK_KEY})`;
    } catch {
      // ignore
    }
    try {
      if (typeof client?.end === "function") await client.end();
    } catch {
      // ignore
    }
  }
}

const result = await main();
process.exit(result.exitCode);

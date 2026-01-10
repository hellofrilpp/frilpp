async function main() {
  const migrateFlag = process.env.MIGRATE_ON_DEPLOY;
  const shouldRun = migrateFlag !== "false";

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
    if (shouldRun) console.log("[migrate] no database connection string found; skipping");
    return { ok: true, exitCode: 0 };
  }

  if (!shouldRun) {
    console.log("[migrate] MIGRATE_ON_DEPLOY=false; skipping");
    return { ok: true, exitCode: 0 };
  }

  console.log("[migrate] starting", {
    hasDirect: Boolean(directConnectionString),
    hasPooled: Boolean(pooledConnectionString),
  });

  const HARD_TIMEOUT_MS = Number(process.env.MIGRATE_HARD_TIMEOUT_MS ?? 15_000);
  const hardTimeout = setTimeout(() => {
    console.log("[migrate] timed out; skipping (build will continue)");
    process.exit(0);
  }, HARD_TIMEOUT_MS);

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
    try {
      await sql`set lock_timeout = '3s'`;
      await sql`set statement_timeout = '5m'`;
    } catch {
      // ignore; best-effort
    }

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
    clearTimeout(hardTimeout);
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

// Keep the event loop alive while async work runs. Some environments can exit a Node.js
// process even when a Promise is pending (Promises alone do not keep Node alive).
const keepAlive = setInterval(() => {}, 60_000);

main()
  .then((result) => {
    clearInterval(keepAlive);
    process.exit(result.exitCode);
  })
  .catch((err) => {
    clearInterval(keepAlive);
    console.error(err);
    process.exit(1);
  });

let didMigrate = false;
let migrating: Promise<void> | null = null;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function looksPooled(value?: string) {
  return Boolean(value && /(^|-)pooler\./.test(value));
}

function resolveMigrationConnectionString() {
  const pooledConnectionString =
    process.env.POSTGRES_URL ??
    (looksPooled(process.env.DATABASE_URL) ? process.env.DATABASE_URL : undefined);

  const directConnectionString =
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.POSTGRES_PRISMA_URL ??
    (!pooledConnectionString ? process.env.DATABASE_URL : undefined);

  return directConnectionString ?? pooledConnectionString ?? null;
}

export async function ensureRuntimeMigrations(options?: { maxWaitMs?: number; pollMs?: number }) {
  if (didMigrate) return;
  if (migrating) return migrating;

  migrating = (async () => {
    const connectionString = resolveMigrationConnectionString();
    if (!connectionString) {
      throw new Error("Database is not configured. Set POSTGRES_URL / POSTGRES_URL_NON_POOLING or DATABASE_URL.");
    }

    const { createClient } = await import("@vercel/postgres");
    const { drizzle } = await import("drizzle-orm/vercel-postgres");
    const { migrate } = await import("drizzle-orm/vercel-postgres/migrator");

    const client = createClient({ connectionString });
    const sql = client.sql.bind(client);

    const LOCK_KEY = 734112903; // keep aligned with scripts/migrate-on-deploy.mjs
    const maxWaitMs = options?.maxWaitMs ?? 15_000;
    const pollMs = options?.pollMs ?? 250;
    const deadline = Date.now() + maxWaitMs;

    let locked = false;

    try {
      while (!locked && Date.now() < deadline) {
        const res = await sql`select pg_try_advisory_lock(${LOCK_KEY}) as locked`;
        locked = Boolean(res.rows?.[0]?.locked);
        if (!locked) await sleep(pollMs);
      }

      if (!locked) {
        throw new Error("Database migrations are currently running; please retry in a moment.");
      }

      const migrationDb = drizzle(client);
      await migrate(migrationDb, { migrationsFolder: "drizzle" });
      didMigrate = true;
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
      migrating = null;
    }
  })();

  return migrating;
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

export function isMissingColumn(err: unknown) {
  const text = getDbErrorText(err).toLowerCase();
  return text.includes("does not exist") && text.includes("column");
}

export function isMissingType(err: unknown) {
  const text = getDbErrorText(err).toLowerCase();
  return text.includes("does not exist") && text.includes("type");
}

export function isMigrationSchemaError(err: unknown) {
  return isMissingRelation(err) || isMissingColumn(err) || isMissingType(err);
}

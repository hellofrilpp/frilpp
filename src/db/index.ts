import { createRequire } from "node:module";
import { drizzle } from "drizzle-orm/vercel-postgres";

const looksPooled = (value?: string) => Boolean(value && /(^|-)pooler\./.test(value));

// Vercel Postgres provides `POSTGRES_URL` (pooled) and `POSTGRES_URL_NON_POOLING` (direct).
// A lot of routes in this codebase gate on `DATABASE_URL`, so normalize envs to avoid accidental
// production breakage when only the Vercel-provided vars are set.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL ??
    undefined;
}

if (!process.env.POSTGRES_URL && looksPooled(process.env.DATABASE_URL)) {
  process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

const directConnectionString =
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.POSTGRES_PRISMA_URL ??
  (process.env.DATABASE_URL && !looksPooled(process.env.DATABASE_URL)
    ? process.env.DATABASE_URL
    : undefined);

type DrizzleDb = ReturnType<typeof drizzle>;

const require = createRequire(import.meta.url);
let cachedDb: DrizzleDb | null = null;

function createDb(): DrizzleDb {
  if (cachedDb) return cachedDb;

  const connectionConfigured = Boolean(
    process.env.POSTGRES_URL ||
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.DATABASE_URL,
  );
  if (!connectionConfigured) {
    throw new Error(
      "Database is not configured. Set POSTGRES_URL / POSTGRES_URL_NON_POOLING (Vercel Postgres) or DATABASE_URL.",
    );
  }

  // Avoid importing `@vercel/postgres` at module eval time: it throws if env vars are missing,
  // which breaks `next build` in environments that don't provide DB secrets.
  const postgres = require("@vercel/postgres") as typeof import("@vercel/postgres");

  const client =
    process.env.POSTGRES_URL || !directConnectionString
      ? postgres.sql
      : postgres.createClient({ connectionString: directConnectionString });

  cachedDb = drizzle(client as never);
  return cachedDb;
}

export const db = new Proxy(
  {},
  {
    get(_target, prop) {
      const real = createDb() as unknown as Record<PropertyKey, unknown>;
      const value = real[prop];
      if (typeof value === "function") return value.bind(real);
      return value;
    },
  },
) as DrizzleDb;

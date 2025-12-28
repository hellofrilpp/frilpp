import { createClient, sql } from "@vercel/postgres";
import { drizzle } from "drizzle-orm/vercel-postgres";

const looksPooled = (value?: string) => Boolean(value && /(^|-)pooler\./.test(value));

if (!process.env.POSTGRES_URL && looksPooled(process.env.DATABASE_URL)) {
  process.env.POSTGRES_URL = process.env.DATABASE_URL;
}

const directConnectionString =
  process.env.POSTGRES_URL_NON_POOLING ??
  (process.env.DATABASE_URL && !looksPooled(process.env.DATABASE_URL)
    ? process.env.DATABASE_URL
    : undefined);

const client =
  process.env.POSTGRES_URL || !directConnectionString
    ? sql
    : createClient({ connectionString: directConnectionString });

export const db = drizzle(client);

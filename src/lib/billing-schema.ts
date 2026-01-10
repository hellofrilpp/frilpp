let ensured = false;

function looksPooled(value?: string) {
  return Boolean(value && /(^|-)pooler\./.test(value));
}

function resolveDirectConnectionString() {
  const direct =
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.POSTGRES_PRISMA_URL ??
    (process.env.DATABASE_URL && !looksPooled(process.env.DATABASE_URL) ? process.env.DATABASE_URL : null);
  return direct ?? null;
}

export async function ensureBillingSchema() {
  if (ensured) return;

  const connectionString = resolveDirectConnectionString();
  if (!connectionString) {
    throw new Error(
      "Billing schema setup requires a direct Postgres connection. Set POSTGRES_URL_NON_POOLING (recommended) or a non-pooled DATABASE_URL.",
    );
  }

  const { createClient } = await import("@vercel/postgres");
  const client = createClient({ connectionString });
  const sql = client.sql.bind(client);

  try {
    await sql`
    DO $$ BEGIN
      CREATE TYPE "billing_provider" AS ENUM ('STRIPE', 'RAZORPAY');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
    `;

    await sql`
    DO $$ BEGIN
      CREATE TYPE "billing_subject_type" AS ENUM ('BRAND', 'CREATOR');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
    `;

    await sql`
    DO $$ BEGIN
      CREATE TYPE "billing_subscription_status" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'INACTIVE');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
    `;

    await sql`
    CREATE TABLE IF NOT EXISTS "billing_subscriptions" (
      "id" text PRIMARY KEY,
      "subject_type" "billing_subject_type" NOT NULL,
      "subject_id" text NOT NULL,
      "provider" "billing_provider" NOT NULL,
      "provider_customer_id" text,
      "provider_subscription_id" text NOT NULL,
      "status" "billing_subscription_status" NOT NULL DEFAULT 'INACTIVE',
      "market" text NOT NULL DEFAULT 'US',
      "plan_key" text NOT NULL,
      "cancel_at_period_end" boolean NOT NULL DEFAULT false,
      "current_period_end" timestamp with time zone,
      "created_at" timestamp with time zone NOT NULL DEFAULT now(),
      "updated_at" timestamp with time zone NOT NULL DEFAULT now()
    );
    `;

    await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "billing_subscriptions_provider_sub_id_unique"
    ON "billing_subscriptions" ("provider", "provider_subscription_id");
    `;

    await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "billing_subscriptions_subject_unique"
    ON "billing_subscriptions" ("subject_type", "subject_id");
    `;

    await sql`
    CREATE INDEX IF NOT EXISTS "billing_subscriptions_status_idx"
    ON "billing_subscriptions" ("status");
    `;

    ensured = true;
  } finally {
    try {
      if (typeof client?.end === "function") await client.end();
    } catch {
      // ignore
    }
  }
}

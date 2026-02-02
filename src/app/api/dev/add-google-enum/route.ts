import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const runtime = "nodejs";
export const maxDuration = 60;

const querySchema = z.object({
  secret: z.string().min(1),
});

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json({ ok: false, error: "DATABASE_URL is not configured" }, { status: 500 });
  }

  const secret = process.env.DEV_IMPERSONATE_SECRET;
  if (!secret) {
    return Response.json(
      { ok: false, error: "DEV_IMPERSONATE_SECRET is not configured" },
      { status: 404 },
    );
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ secret: url.searchParams.get("secret") });
  if (!parsed.success || parsed.data.secret !== secret) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if GOOGLE already exists in the enum
    const checkResult = await db.execute(sql`
      SELECT 1 FROM pg_enum
      WHERE enumlabel = 'GOOGLE'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'social_provider')
    `);

    if (checkResult.rows.length > 0) {
      return Response.json({ ok: true, message: "GOOGLE already exists in social_provider enum" });
    }

    // Add GOOGLE to the enum
    await db.execute(sql`ALTER TYPE "public"."social_provider" ADD VALUE 'GOOGLE'`);

    return Response.json({ ok: true, message: "Successfully added GOOGLE to social_provider enum" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

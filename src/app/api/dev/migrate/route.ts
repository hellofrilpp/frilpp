import { z } from "zod";
import { ensureRuntimeMigrations } from "@/lib/runtime-migrations";

export const runtime = "nodejs";
export const maxDuration = 300;

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

  const result = await ensureRuntimeMigrations({ maxWaitMs: 30_000 });
  if (!result.ok) {
    return Response.json(
      { ok: false, error: "Migrate failed", code: result.code, details: result.error ?? null },
      { status: 500 },
    );
  }
  return Response.json({ ok: true, migrated: result.migrated });
}

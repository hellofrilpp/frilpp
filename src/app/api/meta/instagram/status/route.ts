import { eq } from "drizzle-orm";
import { db } from "@/db";
import { creatorMeta } from "@/db/schema";
import { requireCreatorContext } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const ctx = await requireCreatorContext(request);
  if (ctx instanceof Response) return ctx;

  const rows = await db
    .select({
      igUserId: creatorMeta.igUserId,
      expiresAt: creatorMeta.expiresAt,
      accountType: creatorMeta.accountType,
      profileSyncedAt: creatorMeta.profileSyncedAt,
      profileError: creatorMeta.profileError,
    })
    .from(creatorMeta)
    .where(eq(creatorMeta.creatorId, ctx.creator.id))
    .limit(1);
  const row = rows[0];

  return Response.json({
    ok: true,
    connected: Boolean(row?.igUserId),
    igUserId: row?.igUserId ?? null,
    expiresAt: row?.expiresAt?.toISOString() ?? null,
    accountType: row?.accountType ?? null,
    profileSyncedAt: row?.profileSyncedAt?.toISOString() ?? null,
    profileError: row?.profileError ?? null,
  });
}

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { creatorMeta, creators } from "@/db/schema";
import { requireCreatorContext } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { fetchInstagramProfile } from "@/lib/meta";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const ctx = await requireCreatorContext(request);
  if (ctx instanceof Response) return ctx;

  const metaRows = await db
    .select()
    .from(creatorMeta)
    .where(eq(creatorMeta.creatorId, ctx.creator.id))
    .limit(1);
  const meta = metaRows[0];
  if (!meta?.igUserId) {
    return Response.json({ ok: false, error: "Instagram not connected" }, { status: 409 });
  }

  try {
    const accessToken = decryptSecret(meta.accessTokenEncrypted);
    const profile = await fetchInstagramProfile({ accessToken, igUserId: meta.igUserId });

    const now = new Date();
    await db.transaction(async (tx) => {
      await tx
        .update(creators)
        .set({
          igUserId: profile.igUserId,
          username: profile.username,
          followersCount: profile.followersCount,
          updatedAt: now,
        })
        .where(eq(creators.id, ctx.creator.id));
      await tx
        .update(creatorMeta)
        .set({
          accountType: profile.accountType,
          profileSyncedAt: now,
          profileError: null,
          updatedAt: now,
        })
        .where(eq(creatorMeta.id, meta.id));
    });

    return Response.json({ ok: true });
  } catch (err) {
    const now = new Date();
    await db
      .update(creatorMeta)
      .set({
        profileSyncedAt: now,
        profileError: err instanceof Error ? err.message : "Failed to sync Instagram profile",
        updatedAt: now,
      })
      .where(eq(creatorMeta.id, meta.id));
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to sync Instagram profile" },
      { status: 400 },
    );
  }
}


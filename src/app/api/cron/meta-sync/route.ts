import { and, eq, isNotNull, isNull, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { creatorMeta, creators } from "@/db/schema";
import { decryptSecret } from "@/lib/crypto";
import { fetchInstagramProfile } from "@/lib/meta";
import { sendAlert } from "@/lib/alerts";
import { log } from "@/lib/logger";
import { captureException } from "@/lib/telemetry";
import { requireCronAuth } from "@/lib/cron-auth";

export const runtime = "nodejs";

function getStaleDays() {
  const days = Number(process.env.META_PROFILE_STALE_DAYS ?? "7");
  return Number.isFinite(days) && days > 0 ? days : 7;
}

export async function GET(request: Request) {
  try {
    const auth = requireCronAuth(request);
    if (auth) return auth;

    if (!process.env.DATABASE_URL) {
      return Response.json(
        { ok: false, error: "DATABASE_URL is not configured" },
        { status: 500 },
      );
    }

  const now = new Date();
  const staleDays = getStaleDays();
  const staleBefore = new Date(now.getTime() - staleDays * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      creatorId: creatorMeta.creatorId,
      metaId: creatorMeta.id,
      igUserId: creatorMeta.igUserId,
      accessTokenEncrypted: creatorMeta.accessTokenEncrypted,
    })
    .from(creatorMeta)
    .where(
      and(
        isNotNull(creatorMeta.igUserId),
        or(isNull(creatorMeta.profileSyncedAt), lt(creatorMeta.profileSyncedAt, staleBefore)),
      ),
    )
    .limit(25);

  let synced = 0;
  let errored = 0;

  for (const row of rows) {
    try {
      const accessToken = decryptSecret(row.accessTokenEncrypted);
      const profile = await fetchInstagramProfile({
        accessToken,
        igUserId: row.igUserId ?? "",
      });

      await db.transaction(async (tx) => {
        await tx
          .update(creators)
          .set({
            igUserId: profile.igUserId,
            username: profile.username,
            followersCount: profile.followersCount,
            updatedAt: now,
          })
          .where(eq(creators.id, row.creatorId));

        await tx
          .update(creatorMeta)
          .set({
            accountType: profile.accountType,
            profileSyncedAt: now,
            profileError: null,
            updatedAt: now,
          })
          .where(eq(creatorMeta.id, row.metaId));
      });

      synced += 1;
    } catch (err) {
      errored += 1;
      await db
        .update(creatorMeta)
        .set({
          profileSyncedAt: now,
          profileError: err instanceof Error ? err.message : "Meta sync failed",
          updatedAt: now,
        })
        .where(eq(creatorMeta.id, row.metaId));
    }
  }

    log("info", "cron meta-sync finished", { processed: rows.length, synced, errored, staleDays });
    return Response.json({ ok: true, staleDays, processed: rows.length, synced, errored });
  } catch (err) {
    log("error", "cron meta-sync failed", { error: err instanceof Error ? err.message : "unknown" });
    captureException(err, { job: "meta-sync" });
    void sendAlert({
      subject: "Cron meta-sync failed",
      text: err instanceof Error ? err.stack ?? err.message : "Unknown error",
    });
    return Response.json({ ok: false, error: "Cron failed" }, { status: 500 });
  }
}

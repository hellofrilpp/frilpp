import crypto from "node:crypto";
import { sendAlert } from "@/lib/alerts";
import { log } from "@/lib/logger";
import { captureException } from "@/lib/telemetry";
import { requireCronAuth } from "@/lib/cron-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = requireCronAuth(request);
    if (auth) return auth;

    const { db } = await import("@/db");
    const { brands, creatorMeta, creators, deliverables, matches, notifications, offers, strikes, userSocialAccounts } = await import(
      "@/db/schema"
    );
    const { and, eq, gt, inArray, isNotNull, isNull, lt } = await import("drizzle-orm");
    const { fetchRecentMedia } = await import("@/lib/meta");
    const { fetchRecentTikTokVideos } = await import("@/lib/tiktok");

    if (!process.env.DATABASE_URL) {
      return Response.json(
        { ok: false, error: "DATABASE_URL is not configured" },
        { status: 500 },
      );
    }

    const now = new Date();
    const soon = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  // 0) Send reminders for deliverables due soon (once).
  const remindRows = await db
    .select({
      deliverableId: deliverables.id,
      creatorEmail: creators.email,
      creatorPhone: creators.phone,
      dueAt: deliverables.dueAt,
      campaignCode: matches.campaignCode,
    })
    .from(deliverables)
    .innerJoin(matches, eq(matches.id, deliverables.matchId))
    .innerJoin(creators, eq(creators.id, matches.creatorId))
    .where(
      and(
        eq(deliverables.status, "DUE"),
        isNull(deliverables.reminderSentAt),
        isNotNull(creators.email),
        gt(deliverables.dueAt, now),
        lt(deliverables.dueAt, soon),
      ),
    )
    .limit(20);

  for (const r of remindRows) {
    await db.transaction(async (tx) => {
      await tx
        .update(deliverables)
        .set({ reminderSentAt: now })
        .where(eq(deliverables.id, r.deliverableId));
      const payload = JSON.stringify({ dueAt: r.dueAt.toISOString(), campaignCode: r.campaignCode });
      if (r.creatorEmail) {
        await tx.insert(notifications).values({
          id: crypto.randomUUID(),
          channel: "EMAIL",
          status: "PENDING",
          to: r.creatorEmail,
          type: "deliverable_due_soon",
          payload,
          createdAt: now,
        });
      }
      if (r.creatorPhone && process.env.TWILIO_FROM_NUMBER) {
        await tx.insert(notifications).values({
          id: crypto.randomUUID(),
          channel: "SMS",
          status: "PENDING",
          to: r.creatorPhone,
          type: "deliverable_due_soon",
          payload,
          createdAt: now,
        });
      }
      if (r.creatorPhone && process.env.TWILIO_WHATSAPP_FROM) {
        await tx.insert(notifications).values({
          id: crypto.randomUUID(),
          channel: "WHATSAPP",
          status: "PENDING",
          to: r.creatorPhone,
          type: "deliverable_due_soon",
          payload,
          createdAt: now,
        });
      }
    });
  }

  // 1) Attempt automated verification for Reels/Feed deliverables when creators connected Meta OAuth.
  const verifyCandidates = await db
    .select({
      deliverableId: deliverables.id,
      matchId: deliverables.matchId,
      expectedType: deliverables.expectedType,
      campaignCode: matches.campaignCode,
      acceptedAt: matches.acceptedAt,
      brandHandle: brands.instagramHandle,
      metadata: offers.metadata,
      metaIgUserId: creatorMeta.igUserId,
      metaAccessTokenEncrypted: creatorMeta.accessTokenEncrypted,
    })
    .from(deliverables)
    .innerJoin(matches, eq(matches.id, deliverables.matchId))
    .innerJoin(offers, eq(offers.id, matches.offerId))
    .innerJoin(brands, eq(brands.id, offers.brandId))
    .innerJoin(creators, eq(creators.id, matches.creatorId))
    .innerJoin(creatorMeta, eq(creatorMeta.creatorId, creators.id))
    .where(
      and(
        eq(deliverables.status, "DUE"),
        inArray(deliverables.expectedType, ["REELS", "FEED"]),
        isNotNull(creatorMeta.igUserId),
      ),
    )
    .limit(20);

  const results: Array<{
    deliverableId: string;
    matchId: string;
    ok: boolean;
    verified: boolean;
    strikeIssued: boolean;
    note?: string;
  }> = [];

  for (const row of verifyCandidates) {
    try {
      const media = await fetchRecentMedia({
        accessTokenEncrypted: row.metaAccessTokenEncrypted,
        igUserId: row.metaIgUserId ?? "",
        limit: 25,
      });

      const expected = row.expectedType;
      const brandHandle = row.brandHandle ? row.brandHandle.replace(/^@/, "") : null;
      const acceptedAt = row.acceptedAt ? new Date(row.acceptedAt) : null;
      const platforms = Array.isArray((row.metadata as { platforms?: string[] } | null)?.platforms)
        ? ((row.metadata as { platforms?: string[] }).platforms ?? []).map((p) => String(p).toUpperCase())
        : [];
      if (platforms.length && !platforms.includes("INSTAGRAM")) {
        results.push({
          deliverableId: row.deliverableId,
          matchId: row.matchId,
          ok: true,
          verified: false,
          strikeIssued: false,
          note: "Instagram not required for this offer",
        });
        continue;
      }

      const found = media.find((m) => {
        const caption = (m.caption ?? "").toLowerCase();
        if (!caption.includes(row.campaignCode.toLowerCase())) return false;
        if (brandHandle && !caption.includes(`@${brandHandle.toLowerCase()}`)) return false;
        if (acceptedAt && m.timestamp) {
          const ts = new Date(m.timestamp);
          if (Number.isFinite(ts.getTime()) && ts.getTime() < acceptedAt.getTime()) return false;
        }
        if (expected === "REELS") return (m.media_type ?? "").toUpperCase() === "REELS";
        if (expected === "FEED") return (m.media_type ?? "").toUpperCase() !== "REELS";
        return false;
      });

      if (found) {
        await db
          .update(deliverables)
          .set({
            status: "VERIFIED",
            verifiedMediaId: found.id ?? null,
            verifiedPermalink: found.permalink ?? null,
            verifiedAt: now,
            failureReason: null,
          })
          .where(and(eq(deliverables.id, row.deliverableId), eq(deliverables.status, "DUE")));

        results.push({
          deliverableId: row.deliverableId,
          matchId: row.matchId,
          ok: true,
          verified: true,
          strikeIssued: false,
        });
      } else {
        results.push({
          deliverableId: row.deliverableId,
          matchId: row.matchId,
          ok: true,
          verified: false,
          strikeIssued: false,
          note: "No matching media found",
        });
      }
    } catch (err) {
      results.push({
        deliverableId: row.deliverableId,
        matchId: row.matchId,
        ok: false,
        verified: false,
        strikeIssued: false,
        note: err instanceof Error ? err.message : "Verification error",
      });
    }
  }

  // 1b) Attempt automated verification for TikTok posts when creators connected TikTok.
  const tiktokCandidates = await db
    .select({
      deliverableId: deliverables.id,
      matchId: deliverables.matchId,
      expectedType: deliverables.expectedType,
      campaignCode: matches.campaignCode,
      acceptedAt: matches.acceptedAt,
      metadata: offers.metadata,
      accessTokenEncrypted: userSocialAccounts.accessTokenEncrypted,
      expiresAt: userSocialAccounts.expiresAt,
    })
    .from(deliverables)
    .innerJoin(matches, eq(matches.id, deliverables.matchId))
    .innerJoin(offers, eq(offers.id, matches.offerId))
    .innerJoin(creators, eq(creators.id, matches.creatorId))
    .innerJoin(
      userSocialAccounts,
      and(
        eq(userSocialAccounts.userId, creators.id),
        eq(userSocialAccounts.provider, "TIKTOK"),
        isNotNull(userSocialAccounts.accessTokenEncrypted),
      ),
    )
    .where(
      and(
        eq(deliverables.status, "DUE"),
        inArray(deliverables.expectedType, ["REELS", "FEED"]),
      ),
    )
    .limit(20);

  for (const row of tiktokCandidates) {
    try {
      const platforms = Array.isArray((row.metadata as { platforms?: string[] } | null)?.platforms)
        ? ((row.metadata as { platforms?: string[] }).platforms ?? []).map((p) => String(p).toUpperCase())
        : [];
      if (platforms.length && !platforms.includes("TIKTOK")) {
        results.push({
          deliverableId: row.deliverableId,
          matchId: row.matchId,
          ok: true,
          verified: false,
          strikeIssued: false,
          note: "TikTok not required for this offer",
        });
        continue;
      }

      if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
        results.push({
          deliverableId: row.deliverableId,
          matchId: row.matchId,
          ok: false,
          verified: false,
          strikeIssued: false,
          note: "TikTok token expired",
        });
        continue;
      }

      if (!row.accessTokenEncrypted) {
        results.push({
          deliverableId: row.deliverableId,
          matchId: row.matchId,
          ok: false,
          verified: false,
          strikeIssued: false,
          note: "TikTok token missing",
        });
        continue;
      }

      const videos = await fetchRecentTikTokVideos({
        accessTokenEncrypted: row.accessTokenEncrypted,
        limit: 25,
      });

      const acceptedAt = row.acceptedAt ? new Date(row.acceptedAt) : null;
      const found = videos.find((video) => {
        const caption = (video.title ?? "").toLowerCase();
        if (!caption.includes(row.campaignCode.toLowerCase())) return false;
        if (acceptedAt && video.createTime) {
          const ts = new Date(video.createTime * 1000);
          if (Number.isFinite(ts.getTime()) && ts.getTime() < acceptedAt.getTime()) return false;
        }
        return true;
      });

      if (found) {
        await db
          .update(deliverables)
          .set({
            status: "VERIFIED",
            verifiedMediaId: found.id ?? null,
            verifiedPermalink: found.shareUrl ?? null,
            verifiedAt: now,
            failureReason: null,
          })
          .where(and(eq(deliverables.id, row.deliverableId), eq(deliverables.status, "DUE")));

        results.push({
          deliverableId: row.deliverableId,
          matchId: row.matchId,
          ok: true,
          verified: true,
          strikeIssued: false,
        });
      } else {
        results.push({
          deliverableId: row.deliverableId,
          matchId: row.matchId,
          ok: true,
          verified: false,
          strikeIssued: false,
          note: "No matching TikTok video found",
        });
      }
    } catch (err) {
      results.push({
        deliverableId: row.deliverableId,
        matchId: row.matchId,
        ok: false,
        verified: false,
        strikeIssued: false,
        note: err instanceof Error ? err.message : "TikTok verification error",
      });
    }
  }

  // 2) Mark overdue deliverables as failed and issue strikes (enforcement).
  const overdue = await db
    .select({
      deliverableId: deliverables.id,
      matchId: deliverables.matchId,
      creatorId: matches.creatorId,
    })
    .from(deliverables)
    .innerJoin(matches, eq(matches.id, deliverables.matchId))
    .where(
      and(
        eq(deliverables.status, "DUE"),
        lt(deliverables.dueAt, now),
        inArray(deliverables.expectedType, ["REELS", "FEED"]),
      ),
    )
    .limit(20);

  for (const row of overdue) {
    try {
      await db.transaction(async (tx) => {
        await tx
          .update(deliverables)
          .set({ status: "FAILED", failureReason: "Missed deadline" })
          .where(and(eq(deliverables.id, row.deliverableId), eq(deliverables.status, "DUE")));

        const existingStrike = await tx
          .select({ id: strikes.id })
          .from(strikes)
          .where(eq(strikes.matchId, row.matchId))
          .limit(1);

        if (!existingStrike[0]) {
          await tx.insert(strikes).values({
            id: crypto.randomUUID(),
            creatorId: row.creatorId,
            matchId: row.matchId,
            reason: "Missed deliverable deadline",
            createdAt: now,
          });

          const creatorRows = await tx
            .select({ email: creators.email, phone: creators.phone })
            .from(creators)
            .where(eq(creators.id, row.creatorId))
            .limit(1);
          const creatorEmail = creatorRows[0]?.email ?? null;
          const creatorPhone = creatorRows[0]?.phone ?? null;
          const payload = JSON.stringify({ reason: "Missed deliverable deadline" });
          if (creatorEmail) {
            await tx.insert(notifications).values({
              id: crypto.randomUUID(),
              channel: "EMAIL",
              status: "PENDING",
              to: creatorEmail,
              type: "strike_issued",
              payload,
              createdAt: now,
            });
          }
          if (creatorPhone && process.env.TWILIO_FROM_NUMBER) {
            await tx.insert(notifications).values({
              id: crypto.randomUUID(),
              channel: "SMS",
              status: "PENDING",
              to: creatorPhone,
              type: "strike_issued",
              payload,
              createdAt: now,
            });
          }
          if (creatorPhone && process.env.TWILIO_WHATSAPP_FROM) {
            await tx.insert(notifications).values({
              id: crypto.randomUUID(),
              channel: "WHATSAPP",
              status: "PENDING",
              to: creatorPhone,
              type: "strike_issued",
              payload,
              createdAt: now,
            });
          }
        }

        results.push({
          deliverableId: row.deliverableId,
          matchId: row.matchId,
          ok: true,
          verified: false,
          strikeIssued: !existingStrike[0],
        });
      });
    } catch {
      results.push({
        deliverableId: row.deliverableId,
        matchId: row.matchId,
        ok: false,
        verified: false,
        strikeIssued: false,
      });
    }
  }

    log("info", "cron verify finished", {
      checked: verifyCandidates.length,
      processed: results.length,
    });

    return Response.json({
      ok: true,
      job: "verify",
      now: now.toISOString(),
      checked: verifyCandidates.length,
      processed: results.length,
      results,
    });
  } catch (err) {
    log("error", "cron verify failed", { error: err instanceof Error ? err.message : "unknown" });
    captureException(err, { job: "verify" });
    void sendAlert({
      subject: "Cron verify failed",
      text: err instanceof Error ? err.stack ?? err.message : "Unknown error",
    });
    return Response.json({ ok: false, error: "Cron failed" }, { status: 500 });
  }
}

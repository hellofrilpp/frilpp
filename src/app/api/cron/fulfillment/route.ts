import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { ensureShopifyOrderForMatch } from "@/lib/shopify-orders";
import { matches, offers, shopifyOrders, shopifyStores } from "@/db/schema";
import { sendAlert } from "@/lib/alerts";
import { log } from "@/lib/logger";
import { captureException } from "@/lib/telemetry";
import { requireCronAuth } from "@/lib/cron-auth";
import { acquireCronLock, releaseCronLock } from "@/lib/cron-lock";

export const runtime = "nodejs";

export async function GET(request: Request) {
  let lockHolder: string | null = null;
  try {
    const auth = requireCronAuth(request);
    if (auth) return auth;

    if (!process.env.DATABASE_URL) {
      return Response.json(
        { ok: false, error: "DATABASE_URL is not configured" },
        { status: 500 },
      );
    }

    const lock = await acquireCronLock({ job: "fulfillment", ttlSeconds: 10 * 60 });
    if (!lock.ok) {
      return Response.json({ ok: true, skipped: true, reason: "locked" });
    }
    lockHolder = lock.holder;

    const candidates = await db
      .select({ matchId: matches.id })
      .from(matches)
      .innerJoin(offers, eq(offers.id, matches.offerId))
      .innerJoin(shopifyStores, eq(shopifyStores.brandId, offers.brandId))
      .leftJoin(shopifyOrders, eq(shopifyOrders.matchId, matches.id))
      .where(
        and(
          eq(matches.status, "ACCEPTED"),
          or(
            isNull(shopifyOrders.id),
            inArray(shopifyOrders.status, ["PENDING", "ERROR", "DRAFT_CREATED"]),
          ),
        ),
      )
      .limit(20);

    const unique = Array.from(new Set(candidates.map((c) => c.matchId))).slice(0, 20);
    const results: Array<{ matchId: string; ok: boolean; error?: string }> = [];

    for (const matchId of unique) {
      try {
        await ensureShopifyOrderForMatch(matchId);
        results.push({ matchId, ok: true });
      } catch (err) {
        results.push({
          matchId,
          ok: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    log("info", "cron fulfillment finished", { processed: results.length });
    return Response.json({ ok: true, processed: results.length, results });
  } catch (err) {
    log("error", "cron fulfillment failed", { error: err instanceof Error ? err.message : "unknown" });
    captureException(err, { job: "fulfillment" });
    void sendAlert({
      subject: "Cron fulfillment failed",
      text: err instanceof Error ? err.stack ?? err.message : "Unknown error",
    });
    return Response.json({ ok: false, error: "Cron failed" }, { status: 500 });
  } finally {
    try {
      if (lockHolder) {
        await releaseCronLock({ job: "fulfillment", holder: lockHolder });
      }
    } catch {
      // ignore
    }
  }
}

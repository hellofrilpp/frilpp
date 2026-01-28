import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { brands, creators, deliverables, matches, offers, users } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const sessionOrResponse = await requireAdmin(request);
  if (sessionOrResponse instanceof Response) return sessionOrResponse;

  const [brandCount, creatorCount, userCount, campaignCount, activeCampaignCount, matchCount, deliverableCount] =
    await Promise.all([
      db.select({ value: count(brands.id) }).from(brands),
      db.select({ value: count(creators.id) }).from(creators),
      db.select({ value: count(users.id) }).from(users),
      db.select({ value: count(offers.id) }).from(offers),
      db.select({ value: count(offers.id) }).from(offers).where(eq(offers.status, "PUBLISHED")),
      db.select({ value: count(matches.id) }).from(matches),
      db.select({ value: count(deliverables.id) }).from(deliverables),
    ]);

  const extract = (rows: Array<{ value: number | null }>) => Number(rows[0]?.value ?? 0);

  return Response.json({
    ok: true,
    totals: {
      brands: extract(brandCount),
      creators: extract(creatorCount),
      users: extract(userCount),
      campaigns: extract(campaignCount),
      campaignsActive: extract(activeCampaignCount),
      matches: extract(matchCount),
      deliverables: extract(deliverableCount),
    },
  });
}

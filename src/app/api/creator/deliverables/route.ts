import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { brands, deliverableReviews, deliverables, matches, offers } from "@/db/schema";
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
      deliverableId: deliverables.id,
      status: deliverables.status,
      expectedType: deliverables.expectedType,
      dueAt: deliverables.dueAt,
      submittedPermalink: deliverables.submittedPermalink,
      submittedNotes: deliverables.submittedNotes,
      submittedAt: deliverables.submittedAt,
      usageRightsGrantedAt: deliverables.usageRightsGrantedAt,
      usageRightsScope: deliverables.usageRightsScope,
      verifiedPermalink: deliverables.verifiedPermalink,
      verifiedAt: deliverables.verifiedAt,
      failureReason: deliverables.failureReason,
      matchId: matches.id,
      campaignCode: matches.campaignCode,
      offerTitle: offers.title,
      offerUsageRightsRequired: offers.usageRightsRequired,
      offerUsageRightsScope: offers.usageRightsScope,
      brandName: brands.name,
    })
    .from(deliverables)
    .innerJoin(matches, eq(matches.id, deliverables.matchId))
    .innerJoin(offers, eq(offers.id, matches.offerId))
    .innerJoin(brands, eq(brands.id, offers.brandId))
    .where(and(eq(matches.creatorId, ctx.creator.id), eq(matches.status, "ACCEPTED")))
    .orderBy(desc(deliverables.dueAt))
    .limit(50);

  const deliverableIds = rows.map((r) => r.deliverableId);
  const reviewRows = deliverableIds.length
    ? await db
        .select({
          deliverableId: deliverableReviews.deliverableId,
          action: deliverableReviews.action,
          reason: deliverableReviews.reason,
          submittedPermalink: deliverableReviews.submittedPermalink,
          submittedNotes: deliverableReviews.submittedNotes,
          reviewedByUserId: deliverableReviews.reviewedByUserId,
          createdAt: deliverableReviews.createdAt,
        })
        .from(deliverableReviews)
        .where(inArray(deliverableReviews.deliverableId, deliverableIds))
        .orderBy(desc(deliverableReviews.createdAt))
    : [];

  const reviewsByDeliverable = new Map<string, typeof reviewRows>();
  for (const review of reviewRows) {
    const existing = reviewsByDeliverable.get(review.deliverableId) ?? [];
    existing.push(review);
    reviewsByDeliverable.set(review.deliverableId, existing);
  }

  return Response.json({
    ok: true,
    deliverables: rows.map((r) => ({
      deliverableId: r.deliverableId,
      status: r.status,
      expectedType: r.expectedType,
      dueAt: r.dueAt.toISOString(),
      submittedPermalink: r.submittedPermalink ?? null,
      submittedNotes: r.submittedNotes ?? null,
      submittedAt: r.submittedAt?.toISOString() ?? null,
      usageRightsGrantedAt: r.usageRightsGrantedAt?.toISOString() ?? null,
      usageRightsScope: r.usageRightsScope ?? null,
      verifiedPermalink: r.verifiedPermalink ?? null,
      verifiedAt: r.verifiedAt?.toISOString() ?? null,
      failureReason: r.failureReason ?? null,
      match: { id: r.matchId, campaignCode: r.campaignCode },
      offer: {
        title: r.offerTitle,
        usageRightsRequired: r.offerUsageRightsRequired,
        usageRightsScope: r.offerUsageRightsScope ?? null,
      },
      brand: { name: r.brandName },
      reviews:
        reviewsByDeliverable.get(r.deliverableId)?.map((review) => ({
          action: review.action,
          reason: review.reason ?? null,
          submittedPermalink: review.submittedPermalink ?? null,
          submittedNotes: review.submittedNotes ?? null,
          reviewedByUserId: review.reviewedByUserId ?? null,
          createdAt: review.createdAt.toISOString(),
        })) ?? [],
    })),
  });
}

import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { deliverableReviews, deliverables, matches, offers, creators } from "@/db/schema";
import { requireBrandContext } from "@/lib/auth";

export const runtime = "nodejs";

const querySchema = z.object({
  status: z.enum(["DUE", "VERIFIED", "FAILED", "REPOST_REQUIRED"]).optional(),
});

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const ctx = await requireBrandContext(request);
  if (ctx instanceof Response) return ctx;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ status: url.searchParams.get("status") ?? undefined });
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid query" }, { status: 400 });
  }

  const status = parsed.data.status ?? "DUE";
  const statusFilter =
    status === "DUE"
      ? inArray(deliverables.status, ["DUE", "REPOST_REQUIRED"])
      : eq(deliverables.status, status);

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
      creatorId: creators.id,
      creatorUsername: creators.username,
      creatorFollowers: creators.followersCount,
      creatorFullName: creators.fullName,
      creatorEmail: creators.email,
    })
    .from(deliverables)
    .innerJoin(matches, eq(matches.id, deliverables.matchId))
    .innerJoin(offers, eq(offers.id, matches.offerId))
    .innerJoin(creators, eq(creators.id, matches.creatorId))
    .where(and(eq(offers.brandId, ctx.brandId), statusFilter))
    .orderBy(desc(deliverables.dueAt))
    .limit(100);

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
      creator: {
        id: r.creatorId,
        username: r.creatorUsername,
        followersCount: r.creatorFollowers ?? null,
        fullName: r.creatorFullName ?? null,
        email: r.creatorEmail ?? null,
      },
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

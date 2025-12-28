import crypto from "node:crypto";
import { and, desc, eq, sum, count } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { creators, matches, offers, redemptions } from "@/db/schema";
import { requireBrandContext } from "@/lib/auth";

export const runtime = "nodejs";

const postSchema = z
  .object({
    code: z.string().trim().min(3).max(64),
    amountCents: z.number().int().min(0).max(1_000_000_000).optional(),
    amount: z.number().min(0).max(10_000_000).optional(),
    currency: z.string().trim().min(3).max(3).optional(),
    channel: z.enum(["IN_STORE", "ONLINE", "OTHER"]).optional(),
    note: z.string().trim().max(240).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.amountCents === undefined && data.amount === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amountCents"],
        message: "amountCents or amount is required",
      });
    }
  });

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json({ ok: false, error: "DATABASE_URL is not configured" }, { status: 500 });
  }

  const ctx = await requireBrandContext(request);
  if (ctx instanceof Response) return ctx;

  const rows = await db
    .select({
      redemptionId: redemptions.id,
      createdAt: redemptions.createdAt,
      channel: redemptions.channel,
      amountCents: redemptions.amountCents,
      currency: redemptions.currency,
      note: redemptions.note,
      matchId: matches.id,
      campaignCode: matches.campaignCode,
      offerId: offers.id,
      offerTitle: offers.title,
      creatorId: creators.id,
      creatorUsername: creators.username,
    })
    .from(redemptions)
    .innerJoin(matches, eq(matches.id, redemptions.matchId))
    .innerJoin(offers, eq(offers.id, matches.offerId))
    .innerJoin(creators, eq(creators.id, matches.creatorId))
    .where(eq(offers.brandId, ctx.brandId))
    .orderBy(desc(redemptions.createdAt))
    .limit(200);

  return Response.json({
    ok: true,
    redemptions: rows.map((r) => ({
      id: r.redemptionId,
      createdAt: r.createdAt.toISOString(),
      channel: r.channel,
      amountCents: r.amountCents,
      currency: r.currency,
      note: r.note ?? null,
      match: { id: r.matchId, campaignCode: r.campaignCode },
      offer: { id: r.offerId, title: r.offerTitle },
      creator: { id: r.creatorId, username: r.creatorUsername ?? null },
    })),
  });
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json({ ok: false, error: "DATABASE_URL is not configured" }, { status: 500 });
  }

  const ctx = await requireBrandContext(request);
  if (ctx instanceof Response) return ctx;

  const json = await request.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const normalizedCode = parsed.data.code.toUpperCase();
  const currency = (parsed.data.currency ?? "USD").toUpperCase();
  const channel = parsed.data.channel ?? "IN_STORE";
  const note = parsed.data.note ? parsed.data.note.trim() : null;

  const amountCents =
    parsed.data.amountCents !== undefined
      ? parsed.data.amountCents
      : Math.round((parsed.data.amount ?? 0) * 100);

  const matchRows = await db
    .select({
      matchId: matches.id,
      campaignCode: matches.campaignCode,
      offerId: offers.id,
      offerTitle: offers.title,
      creatorId: creators.id,
      creatorUsername: creators.username,
    })
    .from(matches)
    .innerJoin(offers, eq(offers.id, matches.offerId))
    .innerJoin(creators, eq(creators.id, matches.creatorId))
    .where(
      and(eq(matches.campaignCode, normalizedCode), eq(offers.brandId, ctx.brandId), eq(matches.status, "ACCEPTED")),
    )
    .limit(1);
  const match = matchRows[0];
  if (!match) {
    return Response.json({ ok: false, error: "Code not found (or not accepted yet)" }, { status: 404 });
  }

  const redemptionId = crypto.randomUUID();
  const now = new Date();
  await db.insert(redemptions).values({
    id: redemptionId,
    matchId: match.matchId,
    channel,
    amountCents,
    currency,
    note,
    createdAt: now,
  });

  const summaryRows = await db
    .select({
      count: count(redemptions.id),
      revenueCents: sum(redemptions.amountCents),
    })
    .from(redemptions)
    .where(eq(redemptions.matchId, match.matchId));

  const summary = summaryRows[0] ?? null;

  return Response.json({
    ok: true,
    redemption: {
      id: redemptionId,
      createdAt: now.toISOString(),
      channel,
      amountCents,
      currency,
      note,
      match: { id: match.matchId, campaignCode: match.campaignCode },
      offer: { id: match.offerId, title: match.offerTitle },
      creator: { id: match.creatorId, username: match.creatorUsername ?? null },
    },
    matchTotals: {
      redemptionCount: Number(summary?.count ?? 0),
      redemptionRevenueCents: Number(summary?.revenueCents ?? 0),
    },
  });
}


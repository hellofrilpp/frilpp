import { eq } from "drizzle-orm";
import { db } from "@/db";
import { creatorOfferRejections, offers } from "@/db/schema";
import { requireCreatorContext } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ offerId: string }> }) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const ctx = await requireCreatorContext(request);
  if (ctx instanceof Response) return ctx;

  const { offerId } = await context.params;
  const offerRows = await db.select({ id: offers.id }).from(offers).where(eq(offers.id, offerId)).limit(1);
  if (!offerRows[0]) {
    return Response.json({ ok: false, error: "Offer not found" }, { status: 404 });
  }

  await db
    .insert(creatorOfferRejections)
    .values({
      id: crypto.randomUUID(),
      creatorId: ctx.creator.id,
      offerId,
      createdAt: new Date(),
    })
    .onConflictDoNothing();

  return Response.json({ ok: true });
}

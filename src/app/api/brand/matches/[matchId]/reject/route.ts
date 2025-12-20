import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { matches, offers } from "@/db/schema";
import { requireBrandContext } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ matchId: string }> }) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const ctx = await requireBrandContext(request);
  if (ctx instanceof Response) return ctx;

  const { matchId } = await context.params;
  const matchRows = await db
    .select({ id: matches.id, status: matches.status })
    .from(matches)
    .innerJoin(offers, eq(offers.id, matches.offerId))
    .where(and(eq(matches.id, matchId), eq(offers.brandId, ctx.brandId)))
    .limit(1);
  const match = matchRows[0];
  if (!match) return Response.json({ ok: false, error: "Match not found" }, { status: 404 });

  if (match.status === "REVOKED" || match.status === "CANCELED") {
    return Response.json({ ok: true, match: { id: matchId, status: match.status } });
  }

  await db.update(matches).set({ status: "REVOKED" }).where(eq(matches.id, matchId));
  return Response.json({ ok: true, match: { id: matchId, status: "REVOKED" } });
}

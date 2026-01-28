import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { brands, creators, matches, offers } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

type Params = { params: { creatorId: string } };

export async function GET(request: Request, { params }: Params) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const sessionOrResponse = await requireAdmin(request);
  if (sessionOrResponse instanceof Response) return sessionOrResponse;

  const creatorRows = await db
    .select({
      id: creators.id,
      username: creators.username,
      fullName: creators.fullName,
      email: creators.email,
      followersCount: creators.followersCount,
      country: creators.country,
      categories: creators.categories,
      categoriesOther: creators.categoriesOther,
      phone: creators.phone,
      address1: creators.address1,
      address2: creators.address2,
      city: creators.city,
      province: creators.province,
      zip: creators.zip,
      createdAt: creators.createdAt,
    })
    .from(creators)
    .where(eq(creators.id, params.creatorId))
    .limit(1);

  const creator = creatorRows[0];
  if (!creator) {
    return Response.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const recentMatches = await db
    .select({
      matchId: matches.id,
      status: matches.status,
      createdAt: matches.createdAt,
      offerId: offers.id,
      offerTitle: offers.title,
      brandId: brands.id,
      brandName: brands.name,
    })
    .from(matches)
    .innerJoin(offers, eq(offers.id, matches.offerId))
    .innerJoin(brands, eq(brands.id, offers.brandId))
    .where(eq(matches.creatorId, params.creatorId))
    .orderBy(desc(matches.createdAt))
    .limit(50);

  return Response.json({
    ok: true,
    creator: {
      id: creator.id,
      username: creator.username,
      fullName: creator.fullName,
      email: creator.email,
      followersCount: creator.followersCount,
      country: creator.country,
      categories: creator.categories,
      categoriesOther: creator.categoriesOther,
      phone: creator.phone,
      address1: creator.address1,
      address2: creator.address2,
      city: creator.city,
      province: creator.province,
      zip: creator.zip,
      createdAt: creator.createdAt.toISOString(),
      matches: recentMatches.map((match) => ({
        matchId: match.matchId,
        status: match.status,
        createdAt: match.createdAt.toISOString(),
        offerId: match.offerId,
        offerTitle: match.offerTitle,
        brandId: match.brandId,
        brandName: match.brandName,
      })),
    },
  });
}

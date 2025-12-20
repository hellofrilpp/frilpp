import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brandMemberships, brands, creators } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const session = await getSessionUser(request);
  if (!session) return Response.json({ ok: true, user: null });

  const memberships = await db
    .select({
      brandId: brandMemberships.brandId,
      role: brandMemberships.role,
      brandName: brands.name,
    })
    .from(brandMemberships)
    .innerJoin(brands, eq(brands.id, brandMemberships.brandId))
    .where(eq(brandMemberships.userId, session.user.id))
    .limit(50);

  const creatorRows = await db.select({ id: creators.id }).from(creators).where(eq(creators.id, session.user.id)).limit(1);

  return Response.json({
    ok: true,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      activeBrandId: session.user.activeBrandId,
      tosAcceptedAt: session.user.tosAcceptedAt?.toISOString() ?? null,
      privacyAcceptedAt: session.user.privacyAcceptedAt?.toISOString() ?? null,
      igDataAccessAcceptedAt: session.user.igDataAccessAcceptedAt?.toISOString() ?? null,
      hasCreatorProfile: Boolean(creatorRows[0]),
      memberships,
    },
  });
}

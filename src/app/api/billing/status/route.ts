import { db } from "@/db";
import { brands, creators, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { billingEnabled, hasActiveSubscription } from "@/lib/billing";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSessionUser(request);
  if (!session) {
    return Response.json({ ok: true, authed: false, brand: null, creator: null });
  }

  const userId = session.user.id;
  const userRows = await db
    .select({ activeBrandId: users.activeBrandId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const activeBrandId = userRows[0]?.activeBrandId ?? null;

  const creatorRows = await db
    .select({ id: creators.id })
    .from(creators)
    .where(eq(creators.id, userId))
    .limit(1);
  const creatorId = creatorRows[0]?.id ?? null;

  const brandActive =
    activeBrandId !== null
      ? await hasActiveSubscription({ subjectType: "BRAND", subjectId: activeBrandId })
      : false;
  const creatorActive =
    creatorId !== null
      ? await hasActiveSubscription({ subjectType: "CREATOR", subjectId: creatorId })
      : false;

  const brandName =
    activeBrandId !== null
      ? (
          await db.select({ name: brands.name }).from(brands).where(eq(brands.id, activeBrandId)).limit(1)
        )[0]?.name ?? null
      : null;

  return Response.json({
    ok: true,
    authed: true,
    billingEnabled: billingEnabled(),
    brand: activeBrandId ? { id: activeBrandId, name: brandName, subscribed: brandActive } : null,
    creator: creatorId ? { id: creatorId, subscribed: creatorActive } : null,
  });
}

import { z } from "zod";
import { db } from "@/db";
import { brandMemberships, brands, users } from "@/db/schema";
import { requireUser, requireBrandMembership } from "@/lib/auth";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

const bodySchema = z.object({
  name: z.string().min(2).max(80),
  countriesDefault: z.array(z.enum(["US", "IN"])).min(1),
});

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const sessionOrResponse = await requireUser(request);
  if (sessionOrResponse instanceof Response) return sessionOrResponse;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const brandId = crypto.randomUUID();
  const now = new Date();

  await db.insert(brands).values({
    id: brandId,
    name: parsed.data.name,
    countriesDefault: parsed.data.countriesDefault,
    acceptanceFollowersThreshold: 5000,
    acceptanceAboveThresholdAutoAccept: true,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(brandMemberships).values({
    id: crypto.randomUUID(),
    brandId,
    userId: sessionOrResponse.user.id,
    role: "OWNER",
    createdAt: now,
  });

  await db.update(users).set({ activeBrandId: brandId, updatedAt: now }).where(eq(users.id, sessionOrResponse.user.id));

  const membership = await requireBrandMembership({ userId: sessionOrResponse.user.id, brandId });

  return Response.json({
    ok: true,
    brand: { id: brandId, name: parsed.data.name },
    membership,
  });
}


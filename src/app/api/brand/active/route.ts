import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { brandMemberships, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

const bodySchema = z.object({
  brandId: z.string().min(1),
});

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const sessionOrResponse = await requireUser(request);
  if (sessionOrResponse instanceof Response) return sessionOrResponse;

  return Response.json({ ok: true, activeBrandId: sessionOrResponse.user.activeBrandId ?? null });
}

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

  const membership = await db
    .select({ id: brandMemberships.id })
    .from(brandMemberships)
    .where(
      and(
        eq(brandMemberships.brandId, parsed.data.brandId),
        eq(brandMemberships.userId, sessionOrResponse.user.id),
      ),
    )
    .limit(1);
  if (!membership[0]) {
    return Response.json({ ok: false, error: "Not a member of this brand" }, { status: 403 });
  }

  await db
    .update(users)
    .set({ activeBrandId: parsed.data.brandId, updatedAt: new Date() })
    .where(eq(users.id, sessionOrResponse.user.id));

  return Response.json({ ok: true });
}

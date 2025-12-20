import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

const bodySchema = z.object({
  acceptTerms: z.boolean(),
  acceptPrivacy: z.boolean(),
  acceptIgDataAccess: z.boolean().optional(),
});

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const session = await requireUser(request);
  if (session instanceof Response) return session;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  if (!parsed.data.acceptTerms || !parsed.data.acceptPrivacy) {
    return Response.json(
      { ok: false, error: "Terms and Privacy must be accepted" },
      { status: 400 },
    );
  }

  const now = new Date();
  const set: Record<string, unknown> = {
    tosAcceptedAt: now,
    privacyAcceptedAt: now,
    updatedAt: now,
  };
  if (parsed.data.acceptIgDataAccess) {
    set.igDataAccessAcceptedAt = now;
  }

  await db.update(users).set(set).where(eq(users.id, session.user.id));

  const jar = await cookies();
  jar.set("frilpp_legal", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return Response.json({ ok: true });
}

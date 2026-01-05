import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, billingSubscriptions, brands, users } from "@/db/schema";
import { requireBrandContext } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const ctxOrResponse = await requireBrandContext(request);
  if (ctxOrResponse instanceof Response) return ctxOrResponse;

  const { membership, brandId } = ctxOrResponse;
  if (membership.role !== "OWNER") {
    return Response.json({ ok: false, error: "Owner access required" }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const confirm = typeof json?.confirm === "string" ? json.confirm.trim() : "";

  const brandRows = await db.select({ name: brands.name }).from(brands).where(eq(brands.id, brandId)).limit(1);
  const brand = brandRows[0];
  if (!brand) {
    return Response.json({ ok: false, error: "Brand not found" }, { status: 404 });
  }

  const confirmTarget = `DELETE ${brand.name}`;
  if (!confirm || confirm.toLowerCase() !== confirmTarget.toLowerCase()) {
    return Response.json({ ok: false, error: `Type "${confirmTarget}" to confirm` }, { status: 400 });
  }

  await db.transaction(async (tx) => {
    await tx.update(users).set({ activeBrandId: null }).where(eq(users.activeBrandId, brandId));
    await tx
      .delete(billingSubscriptions)
      .where(and(eq(billingSubscriptions.subjectType, "BRAND"), eq(billingSubscriptions.subjectId, brandId)));
    await tx.delete(auditLogs).where(eq(auditLogs.brandId, brandId));
    await tx.delete(brands).where(eq(brands.id, brandId));
  });

  return Response.json({ ok: true });
}

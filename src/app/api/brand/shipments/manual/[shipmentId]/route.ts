import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { brands, creators, manualShipments, matches, offers } from "@/db/schema";
import { requireBrandContext } from "@/lib/auth";
import { enqueueNotification } from "@/lib/notifications";

export const runtime = "nodejs";

const bodySchema = z.object({
  status: z.enum(["PENDING", "SHIPPED"]).optional(),
  carrier: z.string().trim().max(64).optional(),
  trackingNumber: z.string().trim().max(64).optional(),
  trackingUrl: z.string().trim().max(500).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ shipmentId: string }> }) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const ctx = await requireBrandContext(request);
  if (ctx instanceof Response) return ctx;

  const { shipmentId } = await context.params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const rows = await db
    .select({
      shipmentId: manualShipments.id,
      matchId: matches.id,
      status: manualShipments.status,
      brandId: offers.brandId,
      brandName: brands.name,
      creatorId: creators.id,
      creatorEmail: creators.email,
      creatorPhone: creators.phone,
    })
    .from(manualShipments)
    .innerJoin(matches, eq(matches.id, manualShipments.matchId))
    .innerJoin(offers, eq(offers.id, matches.offerId))
    .innerJoin(brands, eq(brands.id, offers.brandId))
    .innerJoin(creators, eq(creators.id, matches.creatorId))
    .where(and(eq(manualShipments.id, shipmentId), eq(offers.brandId, ctx.brandId)))
    .limit(1);

  const row = rows[0];
  if (!row) return Response.json({ ok: false, error: "Shipment not found" }, { status: 404 });

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.status) update.status = parsed.data.status;
  if (parsed.data.carrier !== undefined) update.carrier = parsed.data.carrier || null;
  if (parsed.data.trackingNumber !== undefined) {
    update.trackingNumber = parsed.data.trackingNumber || null;
  }
  if (parsed.data.trackingUrl !== undefined) update.trackingUrl = parsed.data.trackingUrl || null;
  if (parsed.data.status === "SHIPPED") update.shippedAt = new Date();

  await db.update(manualShipments).set(update).where(eq(manualShipments.id, shipmentId));

  if (parsed.data.status === "SHIPPED") {
    const payload = {
      brandName: row.brandName ?? "Frilpp",
      trackingNumber: parsed.data.trackingNumber ?? null,
      trackingUrl: parsed.data.trackingUrl ?? null,
    };
    if (row.creatorEmail) {
      await enqueueNotification({
        channel: "EMAIL",
        to: row.creatorEmail,
        type: "shipment_fulfilled",
        payload,
      });
    }
    if (row.creatorPhone && process.env.TWILIO_FROM_NUMBER) {
      await enqueueNotification({
        channel: "SMS",
        to: row.creatorPhone,
        type: "shipment_fulfilled",
        payload,
      });
    }
    if (row.creatorPhone && process.env.TWILIO_WHATSAPP_FROM) {
      await enqueueNotification({
        channel: "WHATSAPP",
        to: row.creatorPhone,
        type: "shipment_fulfilled",
        payload,
      });
    }
  }

  return Response.json({ ok: true });
}

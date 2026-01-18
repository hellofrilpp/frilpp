import { z } from "zod";

export const runtime = "nodejs";

const modeSchema = z.enum(["AUTO", "STRIPE", "RAZORPAY"]);

function billingProviderMode() {
  const raw = (process.env.BILLING_PROVIDER_MODE ?? "").trim().toUpperCase();
  const parsed = modeSchema.safeParse(raw);
  return parsed.success ? parsed.data : "AUTO";
}

export async function GET() {
  return Response.json({ ok: true, mode: billingProviderMode() as "AUTO" | "STRIPE" | "RAZORPAY" });
}


import { requireCronAuth } from "@/lib/cron-auth";
import { log } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = requireCronAuth(request);
  if (auth) return auth;

  log("info", "cron fulfillment: no-op (Shopify removed)");
  return Response.json({ ok: true, message: "Fulfillment cron is now a no-op (Shopify integration removed)" });
}

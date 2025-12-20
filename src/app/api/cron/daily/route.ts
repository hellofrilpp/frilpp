import { requireCronAuth } from "@/lib/cron-auth";
import { GET as verifyCron } from "@/app/api/cron/verify/route";
import { GET as fulfillmentCron } from "@/app/api/cron/fulfillment/route";
import { GET as notifyCron } from "@/app/api/cron/notify/route";
import { GET as metaSyncCron } from "@/app/api/cron/meta-sync/route";

export const runtime = "nodejs";

function isEightAmNewYork(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "NaN");
  return hour === 8;
}

function buildCronRequest(path: string) {
  const headers = new Headers();
  const secret = process.env.CRON_SECRET;
  if (secret) {
    headers.set("authorization", `Bearer ${secret}`);
  } else {
    headers.set("x-vercel-cron", "1");
  }
  return new Request(`http://localhost${path}`, { headers });
}

async function runJob(name: string, fn: (req: Request) => Promise<Response>) {
  try {
    const res = await fn(buildCronRequest(`/api/cron/${name}`));
    const body = await res.json().catch(() => null);
    return {
      ok: res.ok,
      status: res.status,
      body,
    };
  } catch (err) {
    return {
      ok: false,
      status: 500,
      body: { error: err instanceof Error ? err.message : "Cron failed" },
    };
  }
}

export async function GET(request: Request) {
  const auth = requireCronAuth(request);
  if (auth) return auth;

  const now = new Date();
  if (!isEightAmNewYork(now)) {
    return Response.json({
      ok: true,
      skipped: true,
      reason: "Not 8am America/New_York",
      now: now.toISOString(),
    });
  }

  const results = {
    verify: await runJob("verify", verifyCron),
    fulfillment: await runJob("fulfillment", fulfillmentCron),
    notify: await runJob("notify", notifyCron),
    "meta-sync": await runJob("meta-sync", metaSyncCron),
  };

  const ok = Object.values(results).every((r) => r.ok);
  return Response.json({ ok, results });
}

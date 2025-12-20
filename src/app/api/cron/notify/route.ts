import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { sendByChannel } from "@/lib/comms";
import { markNotificationError, markNotificationSent } from "@/lib/notifications";
import { sendAlert } from "@/lib/alerts";
import { log } from "@/lib/logger";
import { captureException } from "@/lib/telemetry";
import { requireCronAuth } from "@/lib/cron-auth";

export const runtime = "nodejs";

function safeJsonParse(text: string | null) {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function format(type: string, payload: unknown) {
  const p = (payload ?? {}) as Record<string, unknown>;

  if (type === "creator_approved") {
    const offerTitle = String(p.offerTitle ?? "your offer");
    const brandName = String(p.brandName ?? "the brand");
    const campaignCode = String(p.campaignCode ?? "");
    const shareUrl = String(p.shareUrl ?? "");
    return {
      subject: `You're approved for ${brandName}`,
      text: [
        `You're approved for: ${offerTitle}`,
        campaignCode ? `Your code: ${campaignCode}` : "",
        shareUrl ? `Trackable link: ${shareUrl}` : "",
        "",
        "Next: watch for shipment updates in Frilpp.",
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  if (type === "shipment_fulfilled") {
    const brandName = String(p.brandName ?? "Frilpp");
    const trackingNumber = String(p.trackingNumber ?? "");
    const trackingUrl = String(p.trackingUrl ?? "");
    return {
      subject: `Your shipment is on the way (${brandName})`,
      text: [
        "Your seeding shipment has been fulfilled.",
        trackingNumber ? `Tracking: ${trackingNumber}` : "",
        trackingUrl ? `Track here: ${trackingUrl}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  if (type === "deliverable_due_soon") {
    const dueAt = String(p.dueAt ?? "");
    const campaignCode = String(p.campaignCode ?? "");
    return {
      subject: "Reminder: your deliverable is due soon",
      text: [
        "Reminder: your deliverable is due soon.",
        dueAt ? `Due at: ${dueAt}` : "",
        campaignCode ? `Code: ${campaignCode}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  if (type === "strike_issued") {
    const reason = String(p.reason ?? "Missed deliverable");
    return {
      subject: "Strike issued on Frilpp",
      text: [
        "A strike was issued on your account.",
        `Reason: ${reason}`,
        "",
        "If you believe this is a mistake, reply with your post link for review.",
      ].join("\n"),
    };
  }

  return {
    subject: "Frilpp notification",
    text: typeof payload === "string" ? payload : "You have a new notification.",
  };
}

export async function GET(request: Request) {
  try {
    const auth = requireCronAuth(request);
    if (auth) return auth;

    if (!process.env.DATABASE_URL) {
      return Response.json(
        { ok: false, error: "DATABASE_URL is not configured" },
        { status: 500 },
      );
    }

  const pending = await db
    .select()
    .from(notifications)
    .where(eq(notifications.status, "PENDING"))
    .orderBy(asc(notifications.createdAt))
    .limit(20);

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const n of pending) {
    const payload = safeJsonParse(n.payload);
    const msg = format(n.type, payload);
    try {
      const sent = await sendByChannel({
        channel: n.channel,
        to: n.to,
        subject: msg.subject,
        text: msg.text,
        html: `<div style="font-family: ui-sans-serif, system-ui; line-height: 1.5;"><pre style="white-space: pre-wrap;">${msg.text}</pre></div>`,
      });
      if (!sent.ok) {
        await markNotificationError(n.id, sent.error ?? "Send failed");
        results.push({ id: n.id, ok: false, error: sent.error ?? "Send failed" });
        continue;
      }
      await markNotificationSent(n.id);
      results.push({ id: n.id, ok: true });
    } catch (err) {
      const error = err instanceof Error ? err.message : "Send failed";
      await markNotificationError(n.id, error);
      results.push({ id: n.id, ok: false, error });
    }
  }

    log("info", "cron notify finished", { processed: results.length });
    return Response.json({ ok: true, processed: results.length, results });
  } catch (err) {
    log("error", "cron notify failed", { error: err instanceof Error ? err.message : "unknown" });
    captureException(err, { job: "notify" });
    void sendAlert({
      subject: "Cron notify failed",
      text: err instanceof Error ? err.stack ?? err.message : "Unknown error",
    });
    return Response.json({ ok: false, error: "Cron failed" }, { status: 500 });
  }
}

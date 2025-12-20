import { sendEmail } from "@/lib/email";
import { log } from "@/lib/logger";

export async function sendAlert(params: { subject: string; text: string; data?: Record<string, unknown> }) {
  const to = process.env.ALERT_EMAIL_TO;
  if (!to) {
    log("warn", "alert skipped: ALERT_EMAIL_TO not configured", { subject: params.subject });
    return { ok: false as const, skipped: true as const };
  }

  const html = [
    `<div style="font-family: ui-sans-serif, system-ui; line-height: 1.5;">`,
    `<h2>${escapeHtml(params.subject)}</h2>`,
    `<pre style="background:#f6f6f6; padding:12px; border-radius:8px; white-space:pre-wrap;">${escapeHtml(
      params.text,
    )}</pre>`,
    params.data
      ? `<pre style="background:#f6f6f6; padding:12px; border-radius:8px; white-space:pre-wrap;">${escapeHtml(
          JSON.stringify(params.data, null, 2),
        )}</pre>`
      : "",
    `</div>`,
  ].join("");

  const res = await sendEmail({
    to,
    subject: `[Frilpp] ${params.subject}`,
    html,
    text: params.text,
  });
  if (!res.ok) {
    log("error", "alert send failed", { subject: params.subject, error: "error" in res ? res.error : "unknown" });
  }
  return res.ok ? { ok: true as const } : { ok: false as const, skipped: false as const };
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


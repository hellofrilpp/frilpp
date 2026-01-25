import { fetchWithTimeout } from "@/lib/http";

type ResendSendResponse = { id: string };

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM ?? process.env.RESEND_FROM;

  if (!apiKey || !from) {
    return { ok: false as const, skipped: true as const, error: "Email not configured" };
  }

  const res = await fetchWithTimeout("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      reply_to: params.replyTo,
    }),
    timeoutMs: 10_000,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false as const, skipped: false as const, error: body || "Email send failed" };
  }

  const json = (await res.json().catch(() => null)) as ResendSendResponse | null;
  return { ok: true as const, id: json?.id ?? null };
}

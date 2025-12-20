import { sendEmail } from "@/lib/email";

async function sendTwilioMessage(params: { to: string; from: string; body: string }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    return { ok: false as const, skipped: true as const, error: "Twilio not configured" };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const body = new URLSearchParams();
  body.set("To", params.to);
  body.set("From", params.from);
  body.set("Body", params.body);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false as const, skipped: false as const, error: text || "Twilio send failed" };
  }

  return { ok: true as const };
}

export async function sendByChannel(params: {
  channel: "EMAIL" | "SMS" | "WHATSAPP";
  to: string;
  subject?: string;
  text: string;
  html?: string;
}) {
  if (params.channel === "EMAIL") {
    const res = await sendEmail({
      to: params.to,
      subject: params.subject ?? "Frilpp notification",
      html: params.html ?? `<pre>${params.text}</pre>`,
      text: params.text,
    });
    if (res.ok) return { ok: true as const };
    return { ok: false as const, error: res.error ?? "Email send failed", skipped: res.skipped ?? false };
  }

  if (params.channel === "SMS") {
    const from = process.env.TWILIO_FROM_NUMBER;
    if (!from) return { ok: false as const, error: "TWILIO_FROM_NUMBER not configured", skipped: true as const };
    const res = await sendTwilioMessage({ to: params.to, from, body: params.text });
    if (res.ok) return { ok: true as const };
    return { ok: false as const, error: res.error, skipped: res.skipped };
  }

  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!from) return { ok: false as const, error: "TWILIO_WHATSAPP_FROM not configured", skipped: true as const };
  const res = await sendTwilioMessage({
    to: params.to.startsWith("whatsapp:") ? params.to : `whatsapp:${params.to}`,
    from: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
    body: params.text,
  });
  if (res.ok) return { ok: true as const };
  return { ok: false as const, error: res.error, skipped: res.skipped };
}


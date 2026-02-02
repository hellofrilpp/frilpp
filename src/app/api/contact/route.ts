import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { ipKey, rateLimit } from "@/lib/rate-limit";
import { checkRequestSize, RequestSizeLimits } from "@/lib/request-size";

const contactSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  phone: z.string().max(50).optional().nullable(),
  message: z.string().min(1).max(2000),
});

export async function POST(request: Request) {
  const sizeCheck = checkRequestSize(request, RequestSizeLimits.SMALL);
  if (sizeCheck) return sizeCheck;

  try {
    const json = await request.json();
    const parsed = contactSchema.safeParse(json);
    if (!parsed.success) {
      return Response.json(
        { ok: false, error: "Invalid form data." },
        { status: 400 },
      );
    }

    const { name, email, phone, message } = parsed.data;

    const ip = ipKey(request);
    const limit = await rateLimit({
      key: `contact:${ip}`,
      limit: 5,
      windowSeconds: 60 * 60,
    });
    if (!limit.allowed) {
      return Response.json(
        { ok: false, error: "Too many requests. Try again later." },
        { status: 429 },
      );
    }

    const text = [
      `Name: ${name}`,
      `Email: ${email}`,
      `Phone: ${phone || "-"}`,
      "",
      message,
    ].join("\n");

    const html = `
      <div>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || "-"}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, "<br />")}</p>
      </div>
    `;

    const res = await sendEmail({
      to: "hello@frilpp.com",
      subject: `Frilpp contact form: ${name}`,
      html,
      text,
      replyTo: email,
    });

    if (!res.ok) {
      return Response.json(
        { ok: false, error: res.error ?? "Email failed to send." },
        { status: 500 },
      );
    }

    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { ok: false, error: "Something went wrong." },
      { status: 500 },
    );
  }
}

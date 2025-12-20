import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const cookieHeader = request.headers.get("cookie");
  const sessionId = cookieHeader
    ?.split(/;\s*/g)
    .map((p) => p.split("="))
    .find((kv) => kv[0] === SESSION_COOKIE_NAME)?.[1];

  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, decodeURIComponent(sessionId)));
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return Response.json({ ok: true });
}


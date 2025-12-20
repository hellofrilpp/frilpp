import { eq } from "drizzle-orm";
import { db } from "@/db";
import { userSocialAccounts } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const sessionOrResponse = await requireUser(request);
  if (sessionOrResponse instanceof Response) return sessionOrResponse;

  const rows = await db
    .select({
      provider: userSocialAccounts.provider,
      username: userSocialAccounts.username,
      providerUserId: userSocialAccounts.providerUserId,
    })
    .from(userSocialAccounts)
    .where(eq(userSocialAccounts.userId, sessionOrResponse.user.id));

  return Response.json({ ok: true, accounts: rows });
}

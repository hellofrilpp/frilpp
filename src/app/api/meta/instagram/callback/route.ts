import { cookies } from "next/headers";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { creatorMeta, creators } from "@/db/schema";
import { requireCreatorContext } from "@/lib/auth";
import { discoverInstagramAccount, exchangeMetaCode, fetchInstagramProfile } from "@/lib/meta";

export const runtime = "nodejs";

const schema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const ctx = await requireCreatorContext(request);
  if (ctx instanceof Response) return ctx;

  const url = new URL(request.url);
  const parsed = schema.safeParse({
    code: url.searchParams.get("code"),
    state: url.searchParams.get("state"),
  });
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid callback" }, { status: 400 });
  }

  const jar = await cookies();
  const stateCookie = jar.get("meta_oauth_state")?.value;
  if (!stateCookie || stateCookie !== parsed.data.state) {
    return Response.json({ ok: false, error: "Invalid state" }, { status: 400 });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  const redirectUri = `${origin}/api/meta/instagram/callback`;

  const exchanged = await exchangeMetaCode({ code: parsed.data.code, redirectUri });
  const ig = await discoverInstagramAccount({ accessToken: exchanged.accessToken });
  const profileResult: { ok: true; profile: Awaited<ReturnType<typeof fetchInstagramProfile>> } | { ok: false; error: string } =
    ig?.igUserId
      ? await fetchInstagramProfile({ accessToken: exchanged.accessToken, igUserId: ig.igUserId })
          .then((p) => ({ ok: true as const, profile: p }))
          .catch((err) => ({
            ok: false as const,
            error: err instanceof Error ? err.message : "Failed to fetch Instagram profile",
          }))
      : { ok: false, error: "Instagram account not found" };

  const profileOk = profileResult.ok ? profileResult.profile : null;
  const profileError = profileResult.ok ? null : profileResult.error;

  const now = new Date();
  const existing = await db.select({ id: creatorMeta.id }).from(creatorMeta).where(eq(creatorMeta.creatorId, ctx.creator.id)).limit(1);

  if (existing[0]) {
    await db
      .update(creatorMeta)
      .set({
        igUserId: ig?.igUserId ?? null,
        accountType: profileOk?.accountType ?? null,
        accessTokenEncrypted: exchanged.accessTokenEncrypted,
        expiresAt: exchanged.expiresAt,
        profileSyncedAt: profileOk ? now : null,
        profileError,
        updatedAt: now,
      })
      .where(eq(creatorMeta.id, existing[0].id));
  } else {
    await db.insert(creatorMeta).values({
      id: crypto.randomUUID(),
      creatorId: ctx.creator.id,
      igUserId: ig?.igUserId ?? null,
      accountType: profileOk?.accountType ?? null,
      accessTokenEncrypted: exchanged.accessTokenEncrypted,
      expiresAt: exchanged.expiresAt,
      profileSyncedAt: profileOk ? now : null,
      profileError,
      scopes: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (ig?.igUserId) {
    await db
      .update(creators)
      .set({
        igUserId: ig.igUserId,
        username: profileOk?.username ?? ctx.creator.username,
        followersCount: profileOk?.followersCount ?? ctx.creator.followersCount,
        updatedAt: now,
      })
      .where(eq(creators.id, ctx.creator.id));
  }

  jar.delete("meta_oauth_state");
  return Response.redirect(new URL("/influencer/profile?meta=connected", url.origin), 302);
}

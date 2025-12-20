import crypto from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { brandMemberships, creators, sessions, users } from "@/db/schema";

export const SESSION_COOKIE_NAME = "frilpp_session";

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(/;\s*/g);
  for (const p of parts) {
    const idx = p.indexOf("=");
    if (idx < 0) continue;
    const key = p.slice(0, idx);
    if (key !== name) continue;
    return decodeURIComponent(p.slice(idx + 1));
  }
  return null;
}

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function generateLoginToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashLoginToken(token: string) {
  return sha256Hex(token);
}

export async function getSessionUser(request: Request) {
  const sessionId = getCookieValue(request.headers.get("cookie"), SESSION_COOKIE_NAME);
  if (!sessionId) return null;

  const now = new Date();
  const rows = await db
    .select({
      sessionId: sessions.id,
      sessionExpiresAt: sessions.expiresAt,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, now)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    sessionId: row.sessionId,
    sessionExpiresAt: row.sessionExpiresAt,
    user: row.user,
  };
}

export async function requireUser(request: Request) {
  const session = await getSessionUser(request);
  if (!session) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return session;
}

function hasAcceptedLegal(session: Awaited<ReturnType<typeof getSessionUser>>) {
  if (!session) return false;
  return Boolean(session.user.tosAcceptedAt && session.user.privacyAcceptedAt);
}

function legalRequiredResponse() {
  return Response.json(
    { ok: false, error: "Legal acceptance required", code: "NEEDS_LEGAL_ACCEPTANCE" },
    { status: 409 },
  );
}

export async function getUserMemberships(userId: string) {
  const rows = await db
    .select()
    .from(brandMemberships)
    .where(eq(brandMemberships.userId, userId))
    .limit(50);
  return rows;
}

export async function requireActiveBrandId(request: Request) {
  const sessionOrResponse = await requireUser(request);
  if (sessionOrResponse instanceof Response) return sessionOrResponse;

  if (!hasAcceptedLegal(sessionOrResponse)) {
    return legalRequiredResponse();
  }

  const { user } = sessionOrResponse;
  if (user.activeBrandId) return { ...sessionOrResponse, brandId: user.activeBrandId };

  const memberships = await getUserMemberships(user.id);
  if (memberships.length === 1) {
    const brandId = memberships[0]!.brandId;
    await db
      .update(users)
      .set({ activeBrandId: brandId, updatedAt: new Date() })
      .where(eq(users.id, user.id));
    return { ...sessionOrResponse, brandId };
  }

  return Response.json(
    { ok: false, error: "No active brand selected", code: "NEEDS_BRAND_SELECTION" },
    { status: 409 },
  );
}

export async function requireBrandMembership(params: { userId: string; brandId: string }) {
  const rows = await db
    .select()
    .from(brandMemberships)
    .where(and(eq(brandMemberships.userId, params.userId), eq(brandMemberships.brandId, params.brandId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function requireBrandContext(request: Request) {
  const sessionOrResponse = await requireActiveBrandId(request);
  if (sessionOrResponse instanceof Response) return sessionOrResponse;

  const membership = await requireBrandMembership({
    userId: sessionOrResponse.user.id,
    brandId: sessionOrResponse.brandId,
  });
  if (!membership) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  return { ...sessionOrResponse, membership };
}

export async function requireCreatorContext(request: Request) {
  const sessionOrResponse = await requireUser(request);
  if (sessionOrResponse instanceof Response) return sessionOrResponse;

  if (!hasAcceptedLegal(sessionOrResponse)) {
    return legalRequiredResponse();
  }

  const creatorRows = await db
    .select()
    .from(creators)
    .where(eq(creators.id, sessionOrResponse.user.id))
    .limit(1);
  const creator = creatorRows[0];
  if (!creator) {
    return Response.json(
      { ok: false, error: "Creator profile required", code: "NEEDS_CREATOR_PROFILE" },
      { status: 409 },
    );
  }

  return { ...sessionOrResponse, creator };
}

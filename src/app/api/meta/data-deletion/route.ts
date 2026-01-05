import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { creatorMeta, creators, userSocialAccounts } from "@/db/schema";
import { deleteUserAccount } from "@/lib/account-deletion";

export const runtime = "nodejs";

type SignedRequestPayload = {
  algorithm?: string;
  issued_at?: number;
  user_id?: string;
};

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  return Buffer.from(padded + "=".repeat(padLength), "base64");
}

function parseSignedRequest(signedRequest: string, secret: string) {
  const [encodedSig, encodedPayload] = signedRequest.split(".", 2);
  if (!encodedSig || !encodedPayload) {
    throw new Error("Invalid signed request");
  }

  const signature = base64UrlDecode(encodedSig);
  const expected = crypto.createHmac("sha256", secret).update(encodedPayload).digest();
  if (signature.length !== expected.length || !crypto.timingSafeEqual(signature, expected)) {
    throw new Error("Invalid signature");
  }

  const payloadJson = base64UrlDecode(encodedPayload).toString("utf8");
  const payload = JSON.parse(payloadJson) as SignedRequestPayload;
  if (payload.algorithm && payload.algorithm !== "HMAC-SHA256") {
    throw new Error("Invalid algorithm");
  }
  return payload;
}

async function extractSignedRequest(request: Request) {
  const url = new URL(request.url);
  const fromQuery = url.searchParams.get("signed_request");
  if (fromQuery) return fromQuery;

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const json = await request.json().catch(() => null);
    if (json && typeof json.signed_request === "string") return json.signed_request as string;
  }

  const form = await request.formData().catch(() => null);
  if (form) {
    const value = form.get("signed_request");
    if (typeof value === "string") return value;
  }

  return null;
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const signedRequest = await extractSignedRequest(request);
  if (!signedRequest) {
    return Response.json({ error: "signed_request is required" }, { status: 400 });
  }

  const secret = process.env.META_APP_SECRET;
  if (!secret) {
    return Response.json(
      { error: "META_APP_SECRET is not configured" },
      { status: 500 },
    );
  }

  let payload: SignedRequestPayload;
  try {
    payload = parseSignedRequest(signedRequest, secret);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Invalid signed request" },
      { status: 400 },
    );
  }

  const igUserId = typeof payload.user_id === "string" ? payload.user_id : null;
  if (!igUserId) {
    return Response.json({ error: "user_id missing in signed request" }, { status: 400 });
  }

  let userId: string | null = null;

  const creatorRows = await db
    .select({ id: creators.id })
    .from(creators)
    .where(eq(creators.igUserId, igUserId))
    .limit(1);
  if (creatorRows[0]) {
    userId = creatorRows[0].id;
  }

  if (!userId) {
    const metaRows = await db
      .select({ creatorId: creatorMeta.creatorId })
      .from(creatorMeta)
      .where(eq(creatorMeta.igUserId, igUserId))
      .limit(1);
    if (metaRows[0]) {
      userId = metaRows[0].creatorId;
    }
  }

  if (!userId) {
    const socialRows = await db
      .select({ userId: userSocialAccounts.userId })
      .from(userSocialAccounts)
      .where(and(eq(userSocialAccounts.provider, "INSTAGRAM"), eq(userSocialAccounts.providerUserId, igUserId)))
      .limit(1);
    if (socialRows[0]) {
      userId = socialRows[0].userId;
    }
  }

  const deletionResult = userId ? await deleteUserAccount(userId) : { deleted: false };
  const confirmationCode = crypto.randomUUID();

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const statusUrl = new URL("/data-deletion", origin);
  statusUrl.searchParams.set("code", confirmationCode);
  statusUrl.searchParams.set("status", deletionResult.deleted ? "deleted" : "not_found");

  return Response.json({
    url: statusUrl.toString(),
    confirmation_code: confirmationCode,
  });
}

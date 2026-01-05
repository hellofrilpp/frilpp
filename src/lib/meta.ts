import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { fetchWithTimeout } from "@/lib/http";

export function getMetaApiVersion() {
  return process.env.META_API_VERSION ?? "v20.0";
}

export function getMetaAppConfig() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) return null;
  return { appId, appSecret };
}

export function buildInstagramOAuthUrl(params: {
  redirectUri: string;
  state: string;
  scopes: string[];
}) {
  const cfg = getMetaAppConfig();
  if (!cfg) throw new Error("META_APP_ID / META_APP_SECRET not configured");

  const url = new URL(`https://www.facebook.com/${getMetaApiVersion()}/dialog/oauth`);
  url.searchParams.set("client_id", cfg.appId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("state", params.state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", params.scopes.join(","));
  return url.toString();
}

type OAuthTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in?: number;
};

type PagesListResponse = {
  data: Array<{ id: string; name: string; access_token: string }>;
};

type PageIgAccountResponse = {
  instagram_business_account?: { id: string; username: string } | null;
};

export async function exchangeMetaCode(params: {
  code: string;
  redirectUri: string;
}) {
  const cfg = getMetaAppConfig();
  if (!cfg) throw new Error("META_APP_ID / META_APP_SECRET not configured");

  const base = `https://graph.facebook.com/${getMetaApiVersion()}`;
  const tokenUrl = new URL(`${base}/oauth/access_token`);
  tokenUrl.searchParams.set("client_id", cfg.appId);
  tokenUrl.searchParams.set("client_secret", cfg.appSecret);
  tokenUrl.searchParams.set("redirect_uri", params.redirectUri);
  tokenUrl.searchParams.set("code", params.code);

  const shortRes = await fetchWithTimeout(tokenUrl.toString(), { method: "GET", timeoutMs: 10_000 });
  const shortJson = (await shortRes.json().catch(() => null)) as OAuthTokenResponse | null;
  if (!shortRes.ok || !shortJson?.access_token) {
    throw new Error("Meta token exchange failed");
  }

  const longUrl = new URL(`${base}/oauth/access_token`);
  longUrl.searchParams.set("grant_type", "fb_exchange_token");
  longUrl.searchParams.set("client_id", cfg.appId);
  longUrl.searchParams.set("client_secret", cfg.appSecret);
  longUrl.searchParams.set("fb_exchange_token", shortJson.access_token);

  const longRes = await fetchWithTimeout(longUrl.toString(), { method: "GET", timeoutMs: 10_000 });
  const longJson = (await longRes.json().catch(() => null)) as OAuthTokenResponse | null;
  if (!longRes.ok || !longJson?.access_token) {
    throw new Error("Meta long-lived token exchange failed");
  }

  const expiresIn = longJson.expires_in ?? null;
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;

  return {
    accessToken: longJson.access_token,
    accessTokenEncrypted: encryptSecret(longJson.access_token),
    expiresAt,
  };
}

export async function discoverInstagramAccount(params: { accessToken: string }) {
  const base = `https://graph.facebook.com/${getMetaApiVersion()}`;
  const pagesRes = await fetchWithTimeout(
    `${base}/me/accounts?access_token=${encodeURIComponent(params.accessToken)}`,
    { timeoutMs: 10_000 },
  );
  const pagesJson = (await pagesRes.json().catch(() => null)) as PagesListResponse | null;
  const pages = pagesJson?.data ?? [];
  if (!pages.length) return null;

  for (const page of pages) {
    const pageRes = await fetchWithTimeout(
      `${base}/${page.id}?fields=instagram_business_account{id,username}&access_token=${encodeURIComponent(page.access_token)}`,
      { timeoutMs: 10_000 },
    );
    const pageJson = (await pageRes.json().catch(() => null)) as PageIgAccountResponse | null;
    const ig = pageJson?.instagram_business_account;
    if (ig?.id) {
      return { igUserId: ig.id, igUsername: ig.username ?? null };
    }
  }

  return null;
}

type IgProfileResponse = {
  id: string;
  username?: string;
  followers_count?: number;
  media_count?: number;
  account_type?: string;
};

export async function fetchInstagramProfile(params: { accessToken: string; igUserId: string }) {
  const base = `https://graph.facebook.com/${getMetaApiVersion()}`;
  const url = new URL(`${base}/${params.igUserId}`);
  url.searchParams.set("fields", "id,username,followers_count,media_count,account_type");
  url.searchParams.set("access_token", params.accessToken);

  const res = await fetchWithTimeout(url.toString(), { method: "GET", timeoutMs: 10_000 });
  const json = (await res.json().catch(() => null)) as IgProfileResponse | { error?: { message?: string } } | null;
  if (!res.ok || !json || !("id" in json)) {
    const msg = json && "error" in json ? json.error?.message : null;
    throw new Error(msg || "Failed to fetch Instagram profile");
  }
  return {
    igUserId: String(json.id),
    username: typeof json.username === "string" ? json.username : null,
    followersCount: typeof json.followers_count === "number" ? json.followers_count : null,
    mediaCount: typeof json.media_count === "number" ? json.media_count : null,
    accountType: typeof json.account_type === "string" ? json.account_type : null,
  };
}

export async function fetchRecentMedia(params: {
  accessTokenEncrypted: string;
  igUserId: string;
  limit: number;
}) {
  const accessToken = decryptSecret(params.accessTokenEncrypted);
  const base = `https://graph.facebook.com/${getMetaApiVersion()}`;
  const fields = [
    "id",
    "caption",
    "media_type",
    "permalink",
    "timestamp",
    "username",
  ].join(",");

  const url = new URL(`${base}/${params.igUserId}/media`);
  url.searchParams.set("fields", fields);
  url.searchParams.set("limit", String(params.limit));
  url.searchParams.set("access_token", accessToken);

  const res = await fetchWithTimeout(url.toString(), { method: "GET", timeoutMs: 10_000 });
  const json = (await res.json().catch(() => null)) as
    | { data: Array<{ id: string; caption?: string; media_type?: string; permalink?: string; timestamp?: string }> }
    | { error?: { message?: string } }
    | null;

  if (!res.ok || !json || !("data" in json)) {
    const msg = json && "error" in json ? json.error?.message : null;
    throw new Error(msg || "Failed to fetch Instagram media");
  }

  return json.data;
}

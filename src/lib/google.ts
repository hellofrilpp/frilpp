import { encryptSecret } from "@/lib/crypto";
import { fetchWithTimeout } from "@/lib/http";

export function getGoogleAppConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function buildGoogleOAuthUrl(params: { redirectUri: string; state: string; scopes: string[] }) {
  const cfg = getGoogleAppConfig();
  if (!cfg) throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not configured");

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", params.scopes.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", params.state);
  return url.toString();
}

type GoogleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

export async function exchangeGoogleCode(params: { code: string; redirectUri: string }) {
  const cfg = getGoogleAppConfig();
  if (!cfg) throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not configured");

  const body = new URLSearchParams();
  body.set("client_id", cfg.clientId);
  body.set("client_secret", cfg.clientSecret);
  body.set("code", params.code);
  body.set("grant_type", "authorization_code");
  body.set("redirect_uri", params.redirectUri);

  const res = await fetchWithTimeout("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    timeoutMs: 10_000,
  });
  const json = (await res.json().catch(() => null)) as GoogleTokenResponse | null;
  if (!res.ok || !json?.access_token) {
    const msg = json?.error_description || json?.error || "Google token exchange failed";
    throw new Error(msg);
  }

  const expiresAt = json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null;
  return {
    accessToken: json.access_token,
    accessTokenEncrypted: encryptSecret(json.access_token),
    refreshTokenEncrypted: json.refresh_token ? encryptSecret(json.refresh_token) : null,
    expiresAt,
    scopes: json.scope ?? null,
  };
}

type GoogleUserInfoResponse = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  error?: { message?: string };
};

export async function fetchGoogleUserInfo(params: { accessToken: string }) {
  const res = await fetchWithTimeout("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { authorization: `Bearer ${params.accessToken}` },
    timeoutMs: 10_000,
  });
  const json = (await res.json().catch(() => null)) as GoogleUserInfoResponse | null;
  if (!res.ok || !json?.sub) {
    const msg = json?.error?.message || "Failed to fetch Google user info";
    throw new Error(msg);
  }

  return {
    googleUserId: json.sub,
    email: json.email ?? null,
    emailVerified: json.email_verified ?? false,
    name: json.name ?? null,
    picture: json.picture ?? null,
  };
}

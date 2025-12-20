import { encryptSecret } from "@/lib/crypto";

export function getTikTokAppConfig() {
  const clientId = process.env.TIKTOK_CLIENT_ID;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function buildTikTokOAuthUrl(params: {
  redirectUri: string;
  state: string;
  scopes: string[];
}) {
  const cfg = getTikTokAppConfig();
  if (!cfg) throw new Error("TIKTOK_CLIENT_ID / TIKTOK_CLIENT_SECRET not configured");

  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
  url.searchParams.set("client_key", cfg.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", params.scopes.join(","));
  url.searchParams.set("state", params.state);
  return url.toString();
}

type TikTokTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  open_id?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

export async function exchangeTikTokCode(params: { code: string; redirectUri: string }) {
  const cfg = getTikTokAppConfig();
  if (!cfg) throw new Error("TIKTOK_CLIENT_ID / TIKTOK_CLIENT_SECRET not configured");

  const body = new URLSearchParams();
  body.set("client_key", cfg.clientId);
  body.set("client_secret", cfg.clientSecret);
  body.set("code", params.code);
  body.set("grant_type", "authorization_code");
  body.set("redirect_uri", params.redirectUri);

  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json().catch(() => null)) as TikTokTokenResponse | null;
  if (!res.ok || !json?.access_token || !json?.open_id) {
    const msg = json?.error_description || json?.error || "TikTok token exchange failed";
    throw new Error(msg);
  }

  const expiresAt = json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null;

  return {
    accessToken: json.access_token,
    accessTokenEncrypted: encryptSecret(json.access_token),
    refreshTokenEncrypted: json.refresh_token ? encryptSecret(json.refresh_token) : null,
    expiresAt,
    openId: json.open_id,
    scopes: json.scope ?? null,
  };
}

type TikTokProfileResponse = {
  data?: {
    user?: {
      open_id?: string;
      display_name?: string;
    };
  };
  error?: { code?: number; message?: string };
};

export async function fetchTikTokProfile(params: { accessToken: string }) {
  const url = new URL("https://open.tiktokapis.com/v2/user/info/");
  url.searchParams.set("fields", "open_id,display_name");

  const res = await fetch(url.toString(), {
    headers: { authorization: `Bearer ${params.accessToken}` },
  });
  const json = (await res.json().catch(() => null)) as TikTokProfileResponse | null;
  if (!res.ok || !json?.data?.user?.open_id) {
    const msg = json?.error?.message || "Failed to fetch TikTok profile";
    throw new Error(msg);
  }

  return {
    openId: json.data.user.open_id,
    displayName: json.data.user.display_name ?? null,
  };
}

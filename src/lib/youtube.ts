import { decryptSecret, encryptSecret } from "@/lib/crypto";

export function getYouTubeAppConfig() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function buildYouTubeOAuthUrl(params: { redirectUri: string; state: string; scopes: string[] }) {
  const cfg = getYouTubeAppConfig();
  if (!cfg) throw new Error("YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET not configured");

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", params.scopes.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", params.state);
  return url.toString();
}

type YouTubeTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

export async function exchangeYouTubeCode(params: { code: string; redirectUri: string }) {
  const cfg = getYouTubeAppConfig();
  if (!cfg) throw new Error("YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET not configured");

  const body = new URLSearchParams();
  body.set("client_id", cfg.clientId);
  body.set("client_secret", cfg.clientSecret);
  body.set("code", params.code);
  body.set("grant_type", "authorization_code");
  body.set("redirect_uri", params.redirectUri);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json().catch(() => null)) as YouTubeTokenResponse | null;
  if (!res.ok || !json?.access_token) {
    const msg = json?.error_description || json?.error || "YouTube token exchange failed";
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

export async function refreshYouTubeAccessToken(params: { refreshTokenEncrypted: string }) {
  const cfg = getYouTubeAppConfig();
  if (!cfg) throw new Error("YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET not configured");

  const refreshToken = decryptSecret(params.refreshTokenEncrypted);
  const body = new URLSearchParams();
  body.set("client_id", cfg.clientId);
  body.set("client_secret", cfg.clientSecret);
  body.set("refresh_token", refreshToken);
  body.set("grant_type", "refresh_token");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json().catch(() => null)) as YouTubeTokenResponse | null;
  if (!res.ok || !json?.access_token) {
    const msg = json?.error_description || json?.error || "YouTube token refresh failed";
    throw new Error(msg);
  }

  const expiresAt = json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null;
  return {
    accessToken: json.access_token,
    accessTokenEncrypted: encryptSecret(json.access_token),
    expiresAt,
    scopes: json.scope ?? null,
  };
}

type YouTubeChannelsResponse = {
  items?: Array<{
    id?: string;
    snippet?: { title?: string; customUrl?: string };
  }>;
  error?: { message?: string };
};

export async function fetchYouTubeChannel(params: { accessToken: string }) {
  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("mine", "true");

  const res = await fetch(url.toString(), {
    headers: { authorization: `Bearer ${params.accessToken}` },
  });
  const json = (await res.json().catch(() => null)) as YouTubeChannelsResponse | null;
  const item = json?.items?.[0];
  if (!res.ok || !item?.id) {
    const msg = json?.error?.message || "Failed to fetch YouTube channel";
    throw new Error(msg);
  }

  const title = item.snippet?.title ?? null;
  const customUrl = item.snippet?.customUrl ?? null;
  return {
    channelId: item.id,
    username: customUrl?.trim() || title,
  };
}

type YouTubeSearchResponse = {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: { title?: string; description?: string; publishedAt?: string };
  }>;
  error?: { message?: string };
};

export async function fetchRecentYouTubeVideos(params: {
  accessToken: string;
  channelId: string;
  limit: number;
}) {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("channelId", params.channelId);
  url.searchParams.set("type", "video");
  url.searchParams.set("order", "date");
  url.searchParams.set("maxResults", String(Math.min(Math.max(params.limit, 1), 50)));

  const res = await fetch(url.toString(), {
    headers: { authorization: `Bearer ${params.accessToken}` },
  });
  const json = (await res.json().catch(() => null)) as YouTubeSearchResponse | null;
  if (!res.ok || !json?.items) {
    const msg = json?.error?.message || "Failed to fetch YouTube videos";
    throw new Error(msg);
  }

  return json.items
    .map((item) => ({
      id: item.id?.videoId ?? null,
      title: item.snippet?.title ?? "",
      description: item.snippet?.description ?? "",
      publishedAt: item.snippet?.publishedAt ?? null,
    }))
    .filter((v) => Boolean(v.id));
}


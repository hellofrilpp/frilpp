import crypto from "node:crypto";
import { fetchWithTimeout } from "@/lib/http";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function getShopifyApiVersion() {
  return process.env.SHOPIFY_API_VERSION ?? "2025-01";
}

export function normalizeShopDomain(input: string) {
  const trimmed = input.trim().toLowerCase();
  const noProtocol = trimmed.replace(/^https?:\/\//, "");
  const noPath = noProtocol.split("/")[0] ?? "";
  if (!noPath.endsWith(".myshopify.com")) {
    throw new Error("Shop domain must end with .myshopify.com");
  }
  return noPath;
}

export function buildInstallUrl(shopDomain: string, redirectUri: string, state: string) {
  const apiKey = requiredEnv("SHOPIFY_API_KEY");
  const scopes = process.env.SHOPIFY_SCOPES ?? "read_products,write_orders,read_fulfillments";
  const authUrl = new URL(`https://${shopDomain}/admin/oauth/authorize`);
  authUrl.searchParams.set("client_id", apiKey);
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  return authUrl.toString();
}

export function verifyShopifyHmac(params: URLSearchParams) {
  const secret = requiredEnv("SHOPIFY_API_SECRET");
  const hmac = params.get("hmac");
  if (!hmac) return false;

  const sorted = Array.from(params.entries())
    .filter(([k]) => k !== "hmac" && k !== "signature")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const digest = crypto.createHmac("sha256", secret).update(sorted).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(digest, "hex"), Buffer.from(hmac, "hex"));
  } catch {
    return false;
  }
}

export async function exchangeAccessToken(shopDomain: string, code: string) {
  const apiKey = requiredEnv("SHOPIFY_API_KEY");
  const apiSecret = requiredEnv("SHOPIFY_API_SECRET");
  const res = await fetchWithTimeout(`https://${shopDomain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: apiKey,
      client_secret: apiSecret,
      code,
    }),
    timeoutMs: 10_000,
  });
  const json = (await res.json().catch(() => null)) as null | { access_token?: string; scope?: string };
  if (!res.ok || !json?.access_token) {
    throw new Error("Failed to exchange Shopify access token");
  }
  return { accessToken: json.access_token, scope: json.scope ?? "" };
}

export async function shopifyRest<T>(
  shopDomain: string,
  accessToken: string,
  path: string,
  init?: RequestInit,
) {
  const version = getShopifyApiVersion();
  const url = `https://${shopDomain}/admin/api/${version}${path}`;
  const res = await fetchWithTimeout(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "X-Shopify-Access-Token": accessToken,
      "content-type": "application/json",
    },
    timeoutMs: 12_000,
  });
  const json = (await res.json().catch(() => null)) as T | null;
  if (!res.ok || !json) {
    throw new Error(`Shopify API request failed: ${path}`);
  }
  return json;
}

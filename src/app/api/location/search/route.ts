import { z } from "zod";

export const runtime = "nodejs";

const querySchema = z.object({
  q: z.string().min(1).max(200),
});

type GeoapifyFeature = {
  properties?: {
    formatted?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country_code?: string;
    lat?: number;
    lon?: number;
  };
};

type GeoapifyResponse = {
  features?: GeoapifyFeature[];
};

type LocationSuggestion = {
  label: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  zip: string;
  country: "US" | "IN" | null;
  lat: number;
  lng: number;
};

function resolveToken() {
  const direct = process.env.GEOAPIFY_API_KEY;
  return typeof direct === "string" && direct.trim() ? direct.trim() : null;
}

function normalizeCountry(code?: string | null) {
  const upper = (code || "").toUpperCase();
  if (upper === "US" || upper === "USA") return "US";
  if (upper === "IN" || upper === "IND") return "IN";
  return null;
}

function toSuggestion(feature: GeoapifyFeature): LocationSuggestion | null {
  const props = feature.properties;
  if (!props || typeof props.lat !== "number" || typeof props.lon !== "number") return null;
  const street = [props.housenumber, props.street].filter(Boolean).join(" ").trim();
  const label = props.formatted || street || "";
  if (!label) return null;
  return {
    label,
    address1: street || label,
    city: props.city || "",
    province: props.state || "",
    zip: props.postcode || "",
    country: normalizeCountry(props.country_code),
    lat: props.lat,
    lng: props.lon,
  };
}

export async function GET(request: Request) {
  const token = resolveToken();
  if (!token) {
    return Response.json({ ok: false, error: "Geoapify API key not configured" }, { status: 500 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ q: url.searchParams.get("q") ?? "" });
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid query" }, { status: 400 });
  }

  const encoded = encodeURIComponent(parsed.data.q.trim());
  const geoUrl = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encoded}&limit=5&apiKey=${token}`;

  const res = await fetch(geoUrl, { headers: { accept: "application/json" } });
  if (!res.ok) {
    return Response.json({ ok: false, error: "Geoapify request failed" }, { status: 502 });
  }
  const json = (await res.json().catch(() => null)) as GeoapifyResponse | null;
  const suggestions = (json?.features ?? [])
    .map(toSuggestion)
    .filter((item): item is LocationSuggestion => Boolean(item));
  return Response.json({ ok: true, suggestions });
}

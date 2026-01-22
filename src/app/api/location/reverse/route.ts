import { z } from "zod";

export const runtime = "nodejs";

const querySchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
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
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const parsed = querySchema.safeParse({ lat, lng });
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid coordinates" }, { status: 400 });
  }

  const geoUrl = `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&limit=1&apiKey=${token}`;

  const res = await fetch(geoUrl, { headers: { accept: "application/json" } });
  if (!res.ok) {
    return Response.json({ ok: false, error: "Geoapify request failed" }, { status: 502 });
  }
  const json = (await res.json().catch(() => null)) as GeoapifyResponse | null;
  const suggestion = json?.features?.[0] ? toSuggestion(json.features[0]) : null;
  if (!suggestion) {
    return Response.json({ ok: true, suggestion: null });
  }
  return Response.json({ ok: true, suggestion });
}

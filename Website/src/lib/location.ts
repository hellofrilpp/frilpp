export type LocationSuggestion = {
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

type MapboxContextItem = {
  id: string;
  text: string;
  short_code?: string;
};

type MapboxFeature = {
  center: [number, number];
  context?: MapboxContextItem[];
  address?: string;
  properties?: {
    address?: string;
  };
  text: string;
  place_name?: string;
};

type MapboxResponse = {
  features?: MapboxFeature[];
};


const normalizeCountry = (code: string | undefined | null) => {
  const upper = (code || "").toUpperCase();
  if (upper === "US" || upper === "USA") return "US";
  if (upper === "IN" || upper === "IND") return "IN";
  return null;
};

const getContextText = (context: Array<{ id: string; text: string; short_code?: string }> | undefined, prefix: string) => {
  const match = context?.find((item) => item.id.startsWith(prefix));
  return match?.text ?? "";
};

const getContextCountry = (context: Array<{ id: string; text: string; short_code?: string }> | undefined) => {
  const match = context?.find((item) => item.id.startsWith("country."));
  const code = match?.short_code || match?.text;
  return normalizeCountry(code);
};

const toSuggestion = (feature: MapboxFeature): LocationSuggestion => {
  const [lng, lat] = feature.center as [number, number];
  const context = feature.context as Array<{ id: string; text: string; short_code?: string }> | undefined;
  const addressNumber = feature.address ?? feature.properties?.address ?? "";
  const address1 = addressNumber ? `${addressNumber} ${feature.text}` : feature.text;
  return {
    label: feature.place_name ?? address1,
    address1,
    city: getContextText(context, "place.") || getContextText(context, "locality.") || "",
    province: getContextText(context, "region.") || "",
    zip: getContextText(context, "postcode.") || "",
    country: getContextCountry(context),
    lat,
    lng,
  };
};

export async function searchAddress(query: string): Promise<LocationSuggestion[]> {
  if (!query.trim()) return [];
  const encoded = encodeURIComponent(query.trim());
  const res = await fetch(`/api/location/search?q=${encoded}`);
  if (!res.ok) return [];
  const json = (await res.json().catch(() => null)) as { ok?: boolean; data?: MapboxResponse | null } | null;
  if (!json?.ok) return [];
  const features = json?.data?.features ?? [];
  return features.map(toSuggestion);
}

export async function reverseGeocode(lat: number, lng: number): Promise<LocationSuggestion | null> {
  const res = await fetch(`/api/location/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as { ok?: boolean; data?: MapboxResponse | null } | null;
  if (!json?.ok) return null;
  const feature = json?.data?.features?.[0];
  if (!feature) return null;
  return toSuggestion(feature);
}

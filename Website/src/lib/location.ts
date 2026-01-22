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

// Geoapify results are normalized by the API layer.

export async function searchAddress(query: string): Promise<LocationSuggestion[]> {
  if (!query.trim()) return [];
  const encoded = encodeURIComponent(query.trim());
  const res = await fetch(`/api/location/search?q=${encoded}`);
  if (!res.ok) return [];
  const json = (await res.json().catch(() => null)) as { ok?: boolean; suggestions?: LocationSuggestion[] } | null;
  if (!json?.ok) return [];
  return json.suggestions ?? [];
}

export async function reverseGeocode(lat: number, lng: number): Promise<LocationSuggestion | null> {
  const res = await fetch(`/api/location/reverse?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as { ok?: boolean; suggestion?: LocationSuggestion | null } | null;
  if (!json?.ok) return null;
  return json.suggestion ?? null;
}

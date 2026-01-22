import { z } from "zod";

export const runtime = "nodejs";

const querySchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

function resolveToken() {
  const direct = process.env.MAPBOX_ACCESS_TOKEN ?? process.env.MAPBOX_TOKEN ?? process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  return typeof direct === "string" && direct.trim() ? direct.trim() : null;
}

export async function GET(request: Request) {
  const token = resolveToken();
  if (!token) {
    return Response.json({ ok: false, error: "Mapbox token not configured" }, { status: 500 });
  }

  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lng"));
  const parsed = querySchema.safeParse({ lat, lng });
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid coordinates" }, { status: 400 });
  }

  const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=address,place,locality,postcode,region,country&limit=1&access_token=${token}`;

  const res = await fetch(mapboxUrl, { headers: { accept: "application/json" } });
  if (!res.ok) {
    return Response.json({ ok: false, error: "Mapbox request failed" }, { status: 502 });
  }
  const json = await res.json().catch(() => null);
  return Response.json({ ok: true, data: json ?? null });
}

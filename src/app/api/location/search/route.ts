import { z } from "zod";

export const runtime = "nodejs";

const querySchema = z.object({
  q: z.string().min(1).max(200),
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
  const parsed = querySchema.safeParse({ q: url.searchParams.get("q") ?? "" });
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid query" }, { status: 400 });
  }

  const encoded = encodeURIComponent(parsed.data.q.trim());
  const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?autocomplete=true&types=address,place,locality,postcode,region,country&limit=5&access_token=${token}`;

  const res = await fetch(mapboxUrl, { headers: { accept: "application/json" } });
  if (!res.ok) {
    return Response.json({ ok: false, error: "Mapbox request failed" }, { status: 502 });
  }
  const json = await res.json().catch(() => null);
  return Response.json({ ok: true, data: json ?? null });
}

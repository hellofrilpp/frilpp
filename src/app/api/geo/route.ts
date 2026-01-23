export const runtime = "nodejs";

function getMarketFromHeaders(request: Request) {
  const candidates = [
    "x-vercel-ip-country",
    "x-country-code",
    "cf-ipcountry",
    "x-geo-country",
  ] as const;
  for (const key of candidates) {
    const value = request.headers.get(key);
    if (value && value.trim().toUpperCase() === "IN") return "IN" as const;
  }
  return "US" as const;
}

export async function GET(request: Request) {
  const market = getMarketFromHeaders(request);
  return Response.json({ ok: true, market });
}

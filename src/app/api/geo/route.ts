export const runtime = "nodejs";

function getCountryFromHeaders(request: Request) {
  const candidates = [
    "x-vercel-ip-country",
    "x-country-code",
    "cf-ipcountry",
    "x-geo-country",
  ] as const;
  for (const key of candidates) {
    const value = request.headers.get(key);
    if (value && value.trim()) return value.trim().toUpperCase();
  }
  return null;
}

export async function GET(request: Request) {
  const country = getCountryFromHeaders(request);
  const market = country === "IN" ? "IN" : "US";
  return Response.json({ ok: true, country: country ?? null, market });
}


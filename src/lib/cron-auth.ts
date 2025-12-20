export function requireCronAuth(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? request.headers.get("x-cron-secret");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : header;

  if (secret) {
    if (!token || token !== secret) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    return null;
  }

  const vercelCron = request.headers.get("x-vercel-cron");
  if (process.env.VERCEL === "1" && vercelCron) {
    return null;
  }

  if (process.env.NODE_ENV === "production") {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

import { getSessionUser } from "@/lib/auth";

const DEFAULT_ADMIN_EMAIL = "hello@frilpp.com";

export function getAdminEmail() {
  const raw = String(process.env.ADMIN_EMAIL ?? DEFAULT_ADMIN_EMAIL)
    .trim()
    .toLowerCase();
  return raw || DEFAULT_ADMIN_EMAIL;
}

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  return email.trim().toLowerCase() === getAdminEmail();
}

export async function requireAdmin(request: Request) {
  const session = await getSessionUser(request);
  if (!session) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminEmail(session.user.email)) {
    return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }
  return session;
}

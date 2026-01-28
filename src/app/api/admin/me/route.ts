import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const sessionOrResponse = await requireAdmin(request);
  if (sessionOrResponse instanceof Response) return sessionOrResponse;

  return Response.json({
    ok: true,
    user: {
      id: sessionOrResponse.user.id,
      email: sessionOrResponse.user.email,
      name: sessionOrResponse.user.name,
      hasPassword: Boolean(sessionOrResponse.user.passwordHash),
    },
  });
}

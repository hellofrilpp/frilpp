import { count, desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import { creators, matches } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const sessionOrResponse = await requireAdmin(request);
  if (sessionOrResponse instanceof Response) return sessionOrResponse;

  const rows = await db
    .select({
      id: creators.id,
      username: creators.username,
      fullName: creators.fullName,
      email: creators.email,
      followersCount: creators.followersCount,
      country: creators.country,
      createdAt: creators.createdAt,
    })
    .from(creators)
    .orderBy(desc(creators.createdAt))
    .limit(200);

  const creatorIds = rows.map((row) => row.id);
  const matchCounts = creatorIds.length
    ? await db
        .select({ creatorId: matches.creatorId, total: count(matches.id) })
        .from(matches)
        .where(inArray(matches.creatorId, creatorIds))
        .groupBy(matches.creatorId)
    : [];

  const matchCountByCreator = new Map(matchCounts.map((row) => [row.creatorId, Number(row.total ?? 0)]));

  return Response.json({
    ok: true,
    creators: rows.map((row) => ({
      id: row.id,
      username: row.username,
      fullName: row.fullName,
      email: row.email,
      followersCount: row.followersCount,
      country: row.country,
      createdAt: row.createdAt.toISOString(),
      matchCount: matchCountByCreator.get(row.id) ?? 0,
    })),
  });
}

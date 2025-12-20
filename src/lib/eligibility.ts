import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { strikes } from "@/db/schema";

export function getStrikeLimit() {
  const n = Number(process.env.STRIKE_LIMIT ?? "3");
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 3;
}

export function getCreatorFollowerRange() {
  const min = Number(process.env.CREATOR_MIN_FOLLOWERS ?? "1000");
  const max = Number(process.env.CREATOR_MAX_FOLLOWERS ?? "5000");
  const minSafe = Number.isFinite(min) && min >= 0 ? Math.floor(min) : 1000;
  const maxSafe = Number.isFinite(max) && max >= minSafe ? Math.floor(max) : 5000;
  return { min: minSafe, max: maxSafe };
}

export async function getActiveStrikeCount(creatorId: string) {
  const rows = await db
    .select({ id: strikes.id })
    .from(strikes)
    .where(and(eq(strikes.creatorId, creatorId), isNull(strikes.forgivenAt)))
    .limit(100);
  return rows.length;
}

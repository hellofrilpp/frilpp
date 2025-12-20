import { eq } from "drizzle-orm";
import { db } from "@/db";
import { creators } from "@/db/schema";

export const DEFAULT_CREATOR_ID = "creator_demo";

export async function getOrCreateDefaultCreator() {
  const existing = await db
    .select()
    .from(creators)
    .where(eq(creators.id, DEFAULT_CREATOR_ID))
    .limit(1);
  if (existing[0]) return existing[0];

  await db.insert(creators).values({
    id: DEFAULT_CREATOR_ID,
    igUserId: null,
    username: "demo_creator",
    followersCount: 5200,
    country: "US",
    fullName: "Demo Creator",
    email: "demo@example.com",
    phone: "+1 555 0100",
    address1: "123 Demo St",
    address2: null,
    city: "San Francisco",
    province: "CA",
    zip: "94105",
  });

  const created = await db
    .select()
    .from(creators)
    .where(eq(creators.id, DEFAULT_CREATOR_ID))
    .limit(1);
  if (!created[0]) throw new Error("Failed to create default creator");
  return created[0];
}

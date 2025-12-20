import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";

export const DEFAULT_BRAND_ID = "brand_demo";

export async function getOrCreateDefaultBrand() {
  const existing = await db
    .select()
    .from(brands)
    .where(eq(brands.id, DEFAULT_BRAND_ID))
    .limit(1);

  if (existing[0]) return existing[0];

  await db.insert(brands).values({
    id: DEFAULT_BRAND_ID,
    name: "Demo Brand",
    countriesDefault: ["US", "IN"],
    acceptanceFollowersThreshold: 5000,
    acceptanceAboveThresholdAutoAccept: true,
  });

  const created = await db
    .select()
    .from(brands)
    .where(eq(brands.id, DEFAULT_BRAND_ID))
    .limit(1);

  if (!created[0]) throw new Error("Failed to create default brand");
  return created[0];
}


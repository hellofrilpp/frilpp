import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { shopifyStores } from "@/db/schema";

export async function getShopifyStoreForBrand(brandId: string) {
  const rows = await db
    .select()
    .from(shopifyStores)
    .where(and(eq(shopifyStores.brandId, brandId), isNull(shopifyStores.uninstalledAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertShopifyStore(input: {
  brandId: string;
  shopDomain: string;
  accessTokenEncrypted: string;
  scopes: string;
}) {
  const existing = await db
    .select()
    .from(shopifyStores)
    .where(eq(shopifyStores.shopDomain, input.shopDomain))
    .limit(1);

  if (existing[0]) {
    await db
      .update(shopifyStores)
      .set({
        brandId: input.brandId,
        accessTokenEncrypted: input.accessTokenEncrypted,
        scopes: input.scopes,
        uninstalledAt: null,
        installedAt: new Date(),
      })
      .where(eq(shopifyStores.id, existing[0].id));
    return existing[0].id;
  }

  const id = crypto.randomUUID();
  await db.insert(shopifyStores).values({
    id,
    brandId: input.brandId,
    shopDomain: input.shopDomain,
    accessTokenEncrypted: input.accessTokenEncrypted,
    scopes: input.scopes,
  });
  return id;
}

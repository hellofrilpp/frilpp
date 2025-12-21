import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { brands } from "@/db/schema";
import { requireBrandContext } from "@/lib/auth";

export const runtime = "nodejs";

const bodySchema = z.object({
  name: z.string().min(2).max(80).optional(),
  website: z.string().trim().max(200).optional(),
  description: z.string().trim().max(500).optional(),
  industry: z.string().trim().max(80).optional(),
  location: z.string().trim().max(80).optional(),
  address1: z.string().trim().max(128).optional(),
  address2: z.string().trim().max(128).optional(),
  city: z.string().trim().max(64).optional(),
  province: z.string().trim().max(64).optional(),
  zip: z.string().trim().max(16).optional(),
  country: z.enum(["US", "IN"]).optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  logoUrl: z.string().trim().max(500).optional(),
});

const normalizeOptional = (value: string | undefined) => {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const validateUrl = (value: string | null, field: string) => {
  if (!value) return;
  try {
    new URL(value);
  } catch {
    throw new Error(`${field} must be a valid URL`);
  }
};

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const ctx = await requireBrandContext(request);
  if (ctx instanceof Response) return ctx;

  const rows = await db
    .select({
      name: brands.name,
      website: brands.website,
      description: brands.description,
      industry: brands.industry,
      location: brands.location,
      address1: brands.address1,
      address2: brands.address2,
      city: brands.city,
      province: brands.province,
      zip: brands.zip,
      country: brands.country,
      lat: brands.lat,
      lng: brands.lng,
      logoUrl: brands.logoUrl,
    })
    .from(brands)
    .where(eq(brands.id, ctx.brandId))
    .limit(1);
  const brand = rows[0];
  if (!brand) return Response.json({ ok: false, error: "Brand not found" }, { status: 404 });

  return Response.json({ ok: true, profile: brand });
}

export async function PATCH(request: Request) {
  if (!process.env.DATABASE_URL) {
    return Response.json(
      { ok: false, error: "DATABASE_URL is not configured" },
      { status: 500 },
    );
  }

  const ctx = await requireBrandContext(request);
  if (ctx instanceof Response) return ctx;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const update: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  const website = normalizeOptional(parsed.data.website);
  const logoUrl = normalizeOptional(parsed.data.logoUrl);
  if (parsed.data.name !== undefined) update.name = parsed.data.name;
  if (website !== undefined) update.website = website;
  if (parsed.data.description !== undefined) update.description = normalizeOptional(parsed.data.description);
  if (parsed.data.industry !== undefined) update.industry = normalizeOptional(parsed.data.industry);
  if (parsed.data.location !== undefined) update.location = normalizeOptional(parsed.data.location);
  if (parsed.data.address1 !== undefined) update.address1 = normalizeOptional(parsed.data.address1);
  if (parsed.data.address2 !== undefined) update.address2 = normalizeOptional(parsed.data.address2);
  if (parsed.data.city !== undefined) update.city = normalizeOptional(parsed.data.city);
  if (parsed.data.province !== undefined) update.province = normalizeOptional(parsed.data.province);
  if (parsed.data.zip !== undefined) update.zip = normalizeOptional(parsed.data.zip);
  if (parsed.data.country !== undefined) update.country = parsed.data.country ?? null;
  if (parsed.data.lat !== undefined) update.lat = parsed.data.lat;
  if (parsed.data.lng !== undefined) update.lng = parsed.data.lng;
  if (logoUrl !== undefined) update.logoUrl = logoUrl;

  try {
    validateUrl(website ?? null, "website");
    validateUrl(logoUrl ?? null, "logoUrl");
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Invalid URL" },
      { status: 400 },
    );
  }

  await db.update(brands).set(update).where(eq(brands.id, ctx.brandId));

  const rows = await db
    .select({
      name: brands.name,
      website: brands.website,
      description: brands.description,
      industry: brands.industry,
      location: brands.location,
      address1: brands.address1,
      address2: brands.address2,
      city: brands.city,
      province: brands.province,
      zip: brands.zip,
      country: brands.country,
      lat: brands.lat,
      lng: brands.lng,
      logoUrl: brands.logoUrl,
    })
    .from(brands)
    .where(eq(brands.id, ctx.brandId))
    .limit(1);

  return Response.json({ ok: true, profile: rows[0] });
}

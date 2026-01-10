import { z } from "zod";
import {
  CAMPAIGN_CATEGORIES,
  CONTENT_TYPES,
  CREATOR_CATEGORIES,
  PLATFORMS_BY_COUNTRY,
  REGION_OPTIONS,
  platformsForCountries,
} from "@/lib/picklists";

const milesToKm = (miles: number) => miles * 1.609344;

export const offerMetadataSchema = z
  .object({
    productValue: z.number().min(0).max(1_000_000).nullable().optional(),
    category: z.enum(CAMPAIGN_CATEGORIES).nullable().optional(),
    categoryOther: z.string().trim().min(2).max(64).nullable().optional(),
    description: z.string().trim().max(800).nullable().optional(),
    platforms: z.array(z.enum(PLATFORMS_BY_COUNTRY.US)).max(6).optional().default([]),
    platformOther: z.string().trim().min(2).max(64).nullable().optional(),
    contentTypes: z.array(z.enum(CONTENT_TYPES)).max(6).optional().default([]),
    contentTypeOther: z.string().trim().min(2).max(64).nullable().optional(),
    hashtags: z.string().trim().max(200).nullable().optional(),
    guidelines: z.string().trim().max(800).nullable().optional(),
    niches: z.array(z.enum(CREATOR_CATEGORIES)).max(8).optional().default([]),
    nicheOther: z.string().trim().min(2).max(64).nullable().optional(),
    region: z.enum(REGION_OPTIONS).nullable().optional(),
    campaignName: z.string().trim().max(160).nullable().optional(),
    fulfillmentType: z.enum(["SHOPIFY", "MANUAL"]).nullable().optional(),
    manualFulfillmentMethod: z.enum(["PICKUP", "LOCAL_DELIVERY"]).nullable().optional(),
    manualFulfillmentNotes: z.string().trim().max(300).nullable().optional(),
    // Local radius is stored in kilometers (preferred). `locationRadiusMiles` is accepted for backward compatibility.
    locationRadiusKm: z.number().min(1).max(8000).nullable().optional(),
    locationRadiusMiles: z.number().min(1).max(5000).nullable().optional(),
    ctaUrl: z.string().trim().max(800).url().nullable().optional(),
    presetId: z.string().trim().max(40).nullable().optional(),
  })
  .passthrough()
  .superRefine((data, ctx) => {
    if (data.category === "OTHER" && !data.categoryOther) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["categoryOther"],
        message: "categoryOther is required when category is OTHER",
      });
    }
    if (data.category !== "OTHER" && data.categoryOther) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["categoryOther"],
        message: "categoryOther is only allowed when category is OTHER",
      });
    }
    const platforms = data.platforms ?? [];
    if (platforms.includes("OTHER") && !data.platformOther) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["platformOther"],
        message: "platformOther is required when platforms include OTHER",
      });
    }
    if (!platforms.includes("OTHER") && data.platformOther) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["platformOther"],
        message: "platformOther is only allowed when platforms include OTHER",
      });
    }
    const contentTypes = data.contentTypes ?? [];
    if (contentTypes.includes("OTHER") && !data.contentTypeOther) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contentTypeOther"],
        message: "contentTypeOther is required when contentTypes include OTHER",
      });
    }
    if (!contentTypes.includes("OTHER") && data.contentTypeOther) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contentTypeOther"],
        message: "contentTypeOther is only allowed when contentTypes include OTHER",
      });
    }
    const niches = data.niches ?? [];
    if (niches.includes("OTHER") && !data.nicheOther) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nicheOther"],
        message: "nicheOther is required when niches include OTHER",
      });
    }
    if (!niches.includes("OTHER") && data.nicheOther) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nicheOther"],
        message: "nicheOther is only allowed when niches include OTHER",
      });
    }
  });

export function coerceDraftMetadata(raw: unknown) {
  const record =
    raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};

  const kmRaw = record.locationRadiusKm;
  const milesRaw = record.locationRadiusMiles;
  const radiusKm = (() => {
    const km = typeof kmRaw === "number" ? kmRaw : typeof kmRaw === "string" ? Number(kmRaw) : null;
    if (km !== null && Number.isFinite(km) && km > 0) return km;
    const miles =
      typeof milesRaw === "number" ? milesRaw : typeof milesRaw === "string" ? Number(milesRaw) : null;
    if (miles !== null && Number.isFinite(miles) && miles > 0) return milesToKm(miles);
    return null;
  })();

  const next: Record<string, unknown> = { ...record, locationRadiusKm: radiusKm };
  delete next.locationRadiusMiles;
  return next;
}

export function validatePublishMetadata(params: {
  raw: unknown;
  countriesAllowed: Array<"US" | "IN">;
}) {
  const parsed = offerMetadataSchema.safeParse(params.raw ?? {});
  if (!parsed.success) {
    return {
      ok: false as const,
      response: Response.json(
        { ok: false, error: "Invalid metadata", issues: parsed.error.issues },
        { status: 400 },
      ),
    };
  }

  const metadata = parsed.data;
  const radiusKm = (() => {
    const km = metadata.locationRadiusKm;
    if (typeof km === "number" && Number.isFinite(km) && km > 0) return km;
    const miles = metadata.locationRadiusMiles;
    if (typeof miles === "number" && Number.isFinite(miles) && miles > 0) return milesToKm(miles);
    return null;
  })();

  const allowedPlatforms = platformsForCountries(params.countriesAllowed);
  const invalidPlatforms = (metadata.platforms ?? []).filter(
    (platform) => !allowedPlatforms.includes(platform),
  );
  if (invalidPlatforms.length) {
    return {
      ok: false as const,
      response: Response.json(
        {
          ok: false,
          error: "Platforms not allowed for selected countries",
          issues: invalidPlatforms.map((platform) => ({ platform })),
        },
        { status: 400 },
      ),
    };
  }

  if (metadata.region) {
    const expectedRegion =
      params.countriesAllowed.length === 2
        ? "US_IN"
        : params.countriesAllowed[0] === "IN"
          ? "IN"
          : "US";
    if (metadata.region !== expectedRegion) {
      return {
        ok: false as const,
        response: Response.json(
          {
            ok: false,
            error: "Region does not match countriesAllowed",
            issues: [{ region: metadata.region, expected: expectedRegion }],
          },
          { status: 400 },
        ),
      };
    }
  }

  const storedMetadata: Record<string, unknown> = {
    ...metadata,
    locationRadiusKm: radiusKm,
  };
  delete storedMetadata.locationRadiusMiles;

  return { ok: true as const, metadata: storedMetadata };
}


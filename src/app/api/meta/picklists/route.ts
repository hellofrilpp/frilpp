import {
  CAMPAIGN_CATEGORIES,
  CONTENT_TYPES,
  CREATOR_CATEGORIES,
  PLATFORMS_BY_COUNTRY,
  REGION_OPTIONS,
  toItems,
} from "@/lib/picklists";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    ok: true,
    creatorCategories: toItems(CREATOR_CATEGORIES),
    campaignCategories: toItems(CAMPAIGN_CATEGORIES),
    campaignNiches: toItems(CAMPAIGN_CATEGORIES),
    contentTypes: toItems(CONTENT_TYPES),
    platformsByCountry: {
      US: toItems(PLATFORMS_BY_COUNTRY.US),
      IN: toItems(PLATFORMS_BY_COUNTRY.IN),
    },
    regions: toItems(REGION_OPTIONS),
    countries: ["US", "IN"],
  });
}

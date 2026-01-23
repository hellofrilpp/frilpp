import {
  CAMPAIGN_CATEGORIES,
  CONTENT_TYPES,
  CREATOR_CATEGORIES,
  OFFER_PRESETS,
  PLATFORMS,
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
    platforms: toItems(PLATFORMS),
    offerPresets: OFFER_PRESETS,
  });
}

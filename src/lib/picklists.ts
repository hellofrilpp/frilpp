export const CREATOR_CATEGORIES = [
  "BEAUTY",
  "FASHION",
  "FITNESS",
  "FOOD",
  "TRAVEL",
  "LIFESTYLE",
  "TECH",
  "HOME",
  "PARENTING",
  "PETS",
  "OTHER",
] as const;

export const CAMPAIGN_CATEGORIES = [
  "SKINCARE",
  "MAKEUP",
  "FASHION",
  "FITNESS",
  "FOOD",
  "TECH",
  "HOME",
  "WELLNESS",
  "OTHER",
] as const;

export const CONTENT_TYPES = [
  "REEL",
  "STORY",
  "FEED_POST",
  "REVIEW_VIDEO",
  "OTHER",
] as const;

export const PLATFORMS_BY_COUNTRY = {
  US: ["INSTAGRAM", "TIKTOK", "YOUTUBE", "OTHER"],
  IN: ["INSTAGRAM", "YOUTUBE", "OTHER"],
} as const;

export const REGION_OPTIONS = ["US", "IN", "US_IN"] as const;
export const ALL_PLATFORMS = Array.from(
  new Set([...PLATFORMS_BY_COUNTRY.US, ...PLATFORMS_BY_COUNTRY.IN]),
) as (typeof PLATFORMS_BY_COUNTRY)["US"][number][];

export type CreatorCategoryId = (typeof CREATOR_CATEGORIES)[number];
export type CampaignCategoryId = (typeof CAMPAIGN_CATEGORIES)[number];
export type ContentTypeId = (typeof CONTENT_TYPES)[number];
export type PlatformId = (typeof ALL_PLATFORMS)[number];
export type RegionId = (typeof REGION_OPTIONS)[number];

export const LABELS: Record<string, string> = {
  BEAUTY: "Beauty",
  FASHION: "Fashion",
  FITNESS: "Fitness",
  FOOD: "Food",
  TRAVEL: "Travel",
  LIFESTYLE: "Lifestyle",
  TECH: "Tech",
  HOME: "Home",
  PARENTING: "Parenting",
  PETS: "Pets",
  OTHER: "Other",
  SKINCARE: "Skincare",
  MAKEUP: "Makeup",
  WELLNESS: "Wellness",
  REEL: "Reel",
  STORY: "Story",
  FEED_POST: "Feed Post",
  REVIEW_VIDEO: "Review Video",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  US: "United States",
  IN: "India",
  US_IN: "US + India",
};

export const toItems = (values: readonly string[]) =>
  values.map((value) => ({ id: value, label: LABELS[value] ?? value }));

export const platformsForCountries = (countries: Array<keyof typeof PLATFORMS_BY_COUNTRY>) => {
  const unique = Array.from(new Set(countries));
  if (!unique.length) return [] as PlatformId[];
  let allowed = new Set<string>(PLATFORMS_BY_COUNTRY[unique[0]]);
  for (const country of unique.slice(1)) {
    const next = new Set(PLATFORMS_BY_COUNTRY[country]);
    allowed = new Set([...allowed].filter((value) => next.has(value)));
  }
  return Array.from(allowed) as PlatformId[];
};

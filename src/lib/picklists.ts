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

export const PLATFORMS = ["TIKTOK", "YOUTUBE", "OTHER"] as const;

export const OFFER_PRESETS = [
  {
    id: "TIKTOK_REVIEW",
    label: "TikTok Review",
    description: "Short review video on TikTok.",
    platforms: ["TIKTOK"],
    contentTypes: ["REVIEW_VIDEO"],
    template: "REEL",
  },
  {
    id: "UGC_ONLY",
    label: "UGC Only",
    description: "Content delivered to brand, no public post.",
    platforms: [],
    contentTypes: [],
    template: "UGC_ONLY",
  },
] as const;

export const MATCH_REJECTION_REASONS = [
  "Not a fit for campaign",
  "Low content quality",
  "Audience mismatch",
  "Location mismatch",
  "Already fulfilled",
  "Suspected fraud",
] as const;

export type CreatorCategoryId = (typeof CREATOR_CATEGORIES)[number];
export type CampaignCategoryId = (typeof CAMPAIGN_CATEGORIES)[number];
export type ContentTypeId = (typeof CONTENT_TYPES)[number];
export type PlatformId = (typeof PLATFORMS)[number];
export type MatchRejectionReason = (typeof MATCH_REJECTION_REASONS)[number];

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
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
};

export const toItems = (values: readonly string[]) =>
  values.map((value) => ({ id: value, label: LABELS[value] ?? value }));

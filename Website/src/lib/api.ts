export type ApiErrorPayload = {
  ok?: boolean;
  error?: string;
  code?: string;
  [key: string]: unknown;
};

export class ApiError extends Error {
  status: number;
  code?: string;
  data?: ApiErrorPayload;

  constructor(message: string, status: number, code?: string, data?: ApiErrorPayload) {
    super(message);
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

const rawBase = (import.meta as ImportMeta & { env?: Record<string, string> }).env
  ?.VITE_API_BASE_URL;
const API_BASE_URL = rawBase ? rawBase.replace(/\/$/, "") : "";

export function apiUrl(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalized}` : normalized;
}

async function parseJsonSafely(response: Response) {
  try {
    return (await response.json()) as ApiErrorPayload;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
  });

  if (response.ok) {
    return (await response.json()) as T;
  }

  const data = await parseJsonSafely(response);
  const message = data?.error || `Request failed (${response.status})`;
  throw new ApiError(message, response.status, data?.code, data ?? undefined);
}

export type MagicLinkResponse = {
  ok: boolean;
  sent: boolean;
  debug?: string | null;
};

export async function requestMagicLink(email: string, next?: string) {
  return apiFetch<MagicLinkResponse>("/api/auth/request", {
    method: "POST",
    body: JSON.stringify({
      email,
      next,
      acceptTerms: true,
      acceptPrivacy: true,
    }),
  });
}

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  activeBrandId: string | null;
  tosAcceptedAt: string | null;
  privacyAcceptedAt: string | null;
  igDataAccessAcceptedAt: string | null;
  hasCreatorProfile: boolean;
  memberships: Array<{ brandId: string; role: string; brandName: string }>;
};

export async function getAuthMe() {
  return apiFetch<{ ok: boolean; user: AuthUser | null }>("/api/auth/me");
}

export async function logout() {
  return apiFetch<{ ok: boolean }>("/api/auth/logout", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export type BrandOffer = {
  id: string;
  title: string;
  template: "REEL" | "FEED" | "REEL_PLUS_STORY" | "UGC_ONLY";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  countriesAllowed: string[];
  maxClaims: number;
  deadlineDaysAfterDelivery: number;
  deliverableType: "REELS" | "FEED" | "UGC_ONLY";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  brandName: string;
};

export async function getBrandOffers() {
  return apiFetch<{ ok: boolean; offers: BrandOffer[] }>("/api/brand/offers");
}

export async function createBrandOffer(payload: {
  title: string;
  template: "REEL" | "FEED" | "REEL_PLUS_STORY" | "UGC_ONLY";
  countriesAllowed: Array<"US" | "IN">;
  maxClaims: number;
  deadlineDaysAfterDelivery: number;
  followersThreshold: number;
  aboveThresholdAutoAccept: boolean;
  usageRightsRequired?: boolean;
  usageRightsScope?: string;
  products?: Array<{ shopifyProductId: string; shopifyVariantId: string; quantity: number }>;
  metadata?: Record<string, unknown>;
}) {
  return apiFetch<{ ok: boolean; offerId: string }>("/api/brand/offers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateBrandOffer(
  offerId: string,
  payload: Partial<{
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  }>,
) {
  return apiFetch<{ ok: boolean }>(`/api/brand/offers/${offerId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function duplicateBrandOffer(offerId: string) {
  return apiFetch<{ ok: boolean; offerId: string }>(
    `/api/brand/offers/${offerId}/duplicate`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export type BrandMatch = {
  matchId: string;
  status: "PENDING_APPROVAL" | "ACCEPTED" | "REVOKED" | "CANCELED" | "CLAIMED";
  campaignCode: string;
  createdAt: string;
  acceptedAt: string | null;
  offer: { id: string; title: string };
  creator: {
    id: string;
    username: string | null;
    followersCount: number | null;
    country: string | null;
    shippingReady: boolean;
  };
};

export async function getBrandMatches(status?: BrandMatch["status"]) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch<{ ok: boolean; matches: BrandMatch[] }>(`/api/brand/matches${query}`);
}

export async function approveBrandMatch(matchId: string) {
  return apiFetch<{ ok: boolean }>(`/api/brand/matches/${matchId}/approve`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function rejectBrandMatch(matchId: string) {
  return apiFetch<{ ok: boolean }>(`/api/brand/matches/${matchId}/reject`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export type BrandShipment = {
  id: string;
  status: string;
  shopDomain: string;
  shopifyOrderId: string | null;
  shopifyOrderName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  error: string | null;
  updatedAt: string;
  match: { id: string; campaignCode: string };
  offer: { title: string };
  creator: { id: string; username: string | null; email: string | null; country: string | null };
};

export async function getBrandShipments() {
  return apiFetch<{ ok: boolean; shipments: BrandShipment[] }>("/api/brand/shipments");
}

export type BrandDeliverable = {
  deliverableId: string;
  status: "DUE" | "VERIFIED" | "FAILED";
  expectedType: "REELS" | "FEED" | "UGC_ONLY";
  dueAt: string;
  submittedPermalink: string | null;
  submittedNotes: string | null;
  submittedAt: string | null;
  usageRightsGrantedAt: string | null;
  usageRightsScope: string | null;
  verifiedPermalink: string | null;
  verifiedAt: string | null;
  failureReason: string | null;
  match: { id: string; campaignCode: string };
  offer: { title: string; usageRightsRequired: boolean; usageRightsScope: string | null };
  creator: { id: string; username: string | null; followersCount: number | null; email: string | null };
};

export async function getBrandDeliverables(status?: BrandDeliverable["status"]) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch<{ ok: boolean; deliverables: BrandDeliverable[] }>(
    `/api/brand/deliverables${query}`,
  );
}

export async function verifyBrandDeliverable(
  deliverableId: string,
  payload?: { permalink?: string },
) {
  return apiFetch<{ ok: boolean }>(`/api/brand/deliverables/${deliverableId}/verify`, {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
}

export async function failBrandDeliverable(
  deliverableId: string,
  payload?: { reason?: string },
) {
  return apiFetch<{ ok: boolean }>(`/api/brand/deliverables/${deliverableId}/fail`, {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
}

export type BrandAnalyticsOffer = {
  offerId: string;
  title: string;
  publishedAt: string | null;
  matchCount: number;
  clickCount: number;
  orderCount: number;
  revenueCents: number;
};

export async function getBrandAnalytics() {
  return apiFetch<{ ok: boolean; offers: BrandAnalyticsOffer[] }>("/api/brand/analytics");
}

export type BrandAcceptanceSettings = {
  threshold: number;
  aboveThresholdAutoAccept: boolean;
};

export async function getBrandAcceptanceSettings() {
  return apiFetch<{ ok: boolean; acceptance: BrandAcceptanceSettings }>(
    "/api/brand/settings/acceptance",
  );
}

export async function updateBrandAcceptanceSettings(payload: BrandAcceptanceSettings) {
  return apiFetch<{ ok: boolean }>("/api/brand/settings/acceptance", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function getBrandInstagramHandle() {
  return apiFetch<{ ok: boolean; instagramHandle: string | null }>(
    "/api/brand/settings/instagram",
  );
}

export async function updateBrandInstagramHandle(instagramHandle: string) {
  return apiFetch<{ ok: boolean }>("/api/brand/settings/instagram", {
    method: "PATCH",
    body: JSON.stringify({ instagramHandle }),
  });
}

export type BrandProfile = {
  name: string;
  website: string | null;
  description: string | null;
  industry: string | null;
  location: string | null;
  logoUrl: string | null;
};

export async function getBrandProfile() {
  return apiFetch<{ ok: boolean; profile: BrandProfile }>("/api/brand/profile");
}

export async function updateBrandProfile(payload: Partial<BrandProfile>) {
  return apiFetch<{ ok: boolean; profile: BrandProfile }>("/api/brand/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export type BrandNotifications = {
  newMatch: boolean;
  contentReceived: boolean;
  weeklyDigest: boolean;
  marketing: boolean;
};

export async function getBrandNotifications() {
  return apiFetch<{ ok: boolean; notifications: BrandNotifications }>(
    "/api/brand/notifications",
  );
}

export async function updateBrandNotifications(payload: BrandNotifications) {
  return apiFetch<{ ok: boolean }>("/api/brand/notifications", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export type ShopifyStatus = {
  connected: boolean;
  shopDomain: string | null;
  scopes: string | null;
};

export async function getShopifyStatus() {
  return apiFetch<{ ok: boolean } & ShopifyStatus>("/api/shopify/status");
}

export type ShopifyProduct = {
  id: string;
  title: string;
  imageUrl: string | null;
  variants: Array<{ id: string; title: string }>;
};

export async function getShopifyProducts(query?: string, limit = 10) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (query) params.set("query", query);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<{ ok: boolean; products: ShopifyProduct[] }>(
    `/api/shopify/products${suffix}`,
  );
}

export type CreatorFeedOffer = {
  id: string;
  brandName: string;
  title: string;
  deliverable: "REELS" | "FEED" | "UGC_ONLY";
  usageRightsRequired: boolean;
  usageRightsScope: string | null;
  countriesAllowed: string[];
  deadlineDaysAfterDelivery: number;
  maxClaims: number;
};

export async function getCreatorFeed(country?: "US" | "IN") {
  const query = country ? `?country=${encodeURIComponent(country)}` : "";
  return apiFetch<{ ok: boolean; blocked: boolean; reason?: string; offers: CreatorFeedOffer[] }>(
    `/api/creator/feed${query}`,
  );
}

export async function claimOffer(offerId: string) {
  return apiFetch<{ ok: boolean }>(`/api/creator/offers/${offerId}/claim`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export type CreatorProfile = {
  id: string;
  username: string | null;
  followersCount: number | null;
  country: string | null;
  categories?: string[] | null;
  categoriesOther?: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  zip: string | null;
};

export async function getCreatorProfile() {
  return apiFetch<{ ok: boolean; creator: CreatorProfile }>("/api/creator/profile");
}

export async function updateCreatorProfile(payload: Partial<CreatorProfile>) {
  return apiFetch<{ ok: boolean; creator: CreatorProfile }>("/api/creator/profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function completeCreatorOnboarding(payload: {
  username?: string;
  followersCount?: number;
  country: "US" | "IN";
  categories?: string[];
  categoriesOther?: string;
  fullName: string;
  email: string;
  phone?: string;
  address1: string;
  address2?: string;
  city: string;
  province?: string;
  zip: string;
}) {
  return apiFetch<{ ok: boolean }>("/api/onboarding/creator", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function submitCreatorDeliverable(
  matchId: string,
  payload: { url: string; notes?: string; grantUsageRights?: boolean },
) {
  return apiFetch<{ ok: boolean }>(`/api/creator/matches/${matchId}/submit`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type CreatorDeliverable = {
  deliverableId: string;
  status: "DUE" | "VERIFIED" | "FAILED";
  expectedType: "REELS" | "FEED" | "UGC_ONLY";
  dueAt: string;
  submittedPermalink: string | null;
  submittedNotes: string | null;
  submittedAt: string | null;
  usageRightsGrantedAt: string | null;
  usageRightsScope: string | null;
  verifiedPermalink: string | null;
  verifiedAt: string | null;
  failureReason: string | null;
  match: { id: string; campaignCode: string };
  offer: { title: string; usageRightsRequired: boolean; usageRightsScope: string | null };
  brand: { name: string };
};

export async function getCreatorDeliverables() {
  return apiFetch<{ ok: boolean; deliverables: CreatorDeliverable[] }>(
    "/api/creator/deliverables",
  );
}

export type InstagramStatus = {
  ok: boolean;
  connected: boolean;
  igUserId: string | null;
  expiresAt: string | null;
  accountType: string | null;
  profileSyncedAt: string | null;
  profileError: string | null;
};

export async function getInstagramStatus() {
  return apiFetch<InstagramStatus>("/api/meta/instagram/status");
}

export async function syncInstagramProfile() {
  return apiFetch<{ ok: boolean }>("/api/meta/instagram/sync", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export type CreatorDeal = {
  id: string;
  brand: string;
  product: string;
  valueUsd: number | null;
  status: "pending" | "approved" | "shipped" | "post_required" | "complete";
  matchDate: string;
  deadline: string | null;
  trackingNumber: string | null;
};

export async function getCreatorDeals() {
  return apiFetch<{ ok: boolean; deals: CreatorDeal[] }>("/api/creator/deals");
}

export type PicklistItem = { id: string; label: string };

export type PicklistsResponse = {
  ok: boolean;
  creatorCategories: PicklistItem[];
  campaignCategories: PicklistItem[];
  campaignNiches: PicklistItem[];
  contentTypes: PicklistItem[];
  platformsByCountry: { US: PicklistItem[]; IN: PicklistItem[] };
  regions: PicklistItem[];
  countries: string[];
};

export async function getPicklists() {
  return apiFetch<PicklistsResponse>("/api/meta/picklists");
}

export type CreatorAchievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
};

export type CreatorAchievementsResponse = {
  ok: boolean;
  achievements: CreatorAchievement[];
  totalXp: number;
  unlockedCount: number;
  level: number;
  activeStrikes: number;
};

export async function getCreatorAchievements() {
  return apiFetch<CreatorAchievementsResponse>("/api/creator/achievements");
}

export type LeaderboardCreator = {
  rank: number;
  name: string;
  handle: string | null;
  xp: number;
  deals: number;
  avatar: string;
  trend: string;
};

export type LeaderboardBrand = {
  rank: number;
  name: string;
  category: string;
  xp: number;
  creators: number;
  avatar: string;
  trend: string;
};

export async function getLeaderboard() {
  return apiFetch<{
    ok: boolean;
    creators: LeaderboardCreator[];
    brands: LeaderboardBrand[];
  }>("/api/leaderboard");
}

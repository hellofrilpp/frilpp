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

export async function apiFetch<T>(
  path: string,
  init?: (RequestInit & { timeoutMs?: number }) | undefined,
): Promise<T> {
  const timeoutMs = init?.timeoutMs ?? 20_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const mergedSignal =
    init?.signal &&
    typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.any === "function"
      ? AbortSignal.any([init.signal, controller.signal])
      : controller.signal;

  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      signal: mergedSignal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      credentials: "include",
    });
  } catch (err) {
    if (err && typeof err === "object" && "name" in err && err.name === "AbortError") {
      throw new ApiError("Request timed out", 408);
    }
    throw new ApiError("Network error", 0);
  } finally {
    clearTimeout(timeout);
  }

  if (response.ok) {
    return (await response.json()) as T;
  }

  const data = await parseJsonSafely(response);
  const code = data?.code;

  if (typeof window !== "undefined") {
    const nextPath = `${window.location.pathname}${window.location.search}`;
    if (response.status === 409 && code === "NEEDS_LEGAL_ACCEPTANCE") {
      window.location.href = apiUrl(`/legal/accept?next=${encodeURIComponent(nextPath)}`);
    }
    if (response.status === 409 && code === "NEEDS_BRAND_SELECTION") {
      if (!window.location.pathname.startsWith("/brand/")) {
        window.location.href = apiUrl(`/brand/dashboard`);
      }
    }
    if (response.status === 409 && code === "NEEDS_CREATOR_PROFILE") {
      window.location.href = apiUrl(`/influencer/onboarding`);
    }
  }

  const message = data?.error || `Request failed (${response.status})`;
  throw new ApiError(message, response.status, code, data ?? undefined);
}

export type MagicLinkResponse = {
  ok: boolean;
  sent: boolean;
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

export async function continuePasswordAuth(email: string) {
  return apiFetch<{ ok: boolean; allowPassword: boolean }>("/api/auth/password/continue", {
    method: "POST",
    body: JSON.stringify({ email, lane: "brand" }),
  });
}

export async function loginWithPassword(email: string, password: string, next?: string) {
  return apiFetch<{ ok: boolean; nextPath: string }>("/api/auth/password/login", {
    method: "POST",
    body: JSON.stringify({ email, password, next, lane: "brand" }),
  });
}

export async function setPassword(password: string) {
  return apiFetch<{ ok: boolean }>("/api/auth/password/set", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}


export type AuthUser = {
  id: string;
  email: string | null;
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

export async function createBrandWorkspace(payload: { name: string; countriesDefault?: Array<"US" | "IN"> }) {
  return apiFetch<{ ok: boolean; brand: { id: string; name: string } }>(
    "/api/onboarding/brand",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export type BillingProvider = "STRIPE" | "RAZORPAY";

export type BillingStatus = {
  ok: boolean;
  authed: boolean;
  billingEnabled?: boolean;
  brand: { id: string; name: string | null; subscribed: boolean } | null;
  creator: { id: string; subscribed: boolean } | null;
};

export async function getBillingStatus() {
  return apiFetch<BillingStatus>("/api/billing/status");
}

export async function startBillingCheckout(payload: { lane: "brand" | "creator"; provider?: BillingProvider }) {
  return apiFetch<{ ok: boolean; provider?: BillingProvider; checkoutUrl: string }>("/api/billing/checkout", {
    method: "POST",
    body: JSON.stringify(payload),
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
  acceptanceFollowersThreshold: number;
  acceptanceAboveThresholdAutoAccept: boolean;
  metadata: Record<string, unknown>;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  brandName: string;
};

export async function getBrandOffers() {
  return apiFetch<{ ok: boolean; offers: BrandOffer[] }>("/api/brand/offers");
}

export type BrandOfferDetails = {
  id: string;
  title: string;
  template: "REEL" | "FEED" | "REEL_PLUS_STORY" | "UGC_ONLY";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  countriesAllowed: string[];
  maxClaims: number;
  deadlineDaysAfterDelivery: number;
  deliverableType: "REELS" | "FEED" | "UGC_ONLY";
  requiresCaptionCode: boolean;
  usageRightsRequired: boolean;
  usageRightsScope: string | null;
  acceptanceFollowersThreshold: number;
  acceptanceAboveThresholdAutoAccept: boolean;
  metadata: Record<string, unknown>;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  products: Array<{ shopifyProductId: string; shopifyVariantId: string; quantity: number }>;
};

export async function getBrandOffer(offerId: string) {
  return apiFetch<{ ok: boolean; offer: BrandOfferDetails }>(`/api/brand/offers/${offerId}`);
}

export async function createBrandOffer(payload: {
  title: string;
  template: "REEL" | "FEED" | "REEL_PLUS_STORY" | "UGC_ONLY";
  status?: "DRAFT" | "PUBLISHED";
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
    timeoutMs: 60_000,
  });
}

export async function updateBrandOffer(
  offerId: string,
  payload: Partial<{
    title: string;
    template: "REEL" | "FEED" | "REEL_PLUS_STORY" | "UGC_ONLY";
    countriesAllowed: Array<"US" | "IN">;
    maxClaims: number;
    deadlineDaysAfterDelivery: number;
    followersThreshold: number;
    aboveThresholdAutoAccept: boolean;
    usageRightsRequired: boolean;
    usageRightsScope: string;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    products: Array<{ shopifyProductId: string; shopifyVariantId: string; quantity: number }>;
    metadata: Record<string, unknown>;
  }>,
) {
  return apiFetch<{ ok: boolean }>(`/api/brand/offers/${offerId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteBrandOffer(offerId: string) {
  return apiFetch<{ ok: boolean }>(`/api/brand/offers/${offerId}`, {
    method: "DELETE",
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
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
    city?: string | null;
    province?: string | null;
    zip?: string | null;
    shippingReady: boolean;
    distanceKm?: number | null;
    distanceMiles?: number | null;
  };
};

export async function getBrandMatches(status?: BrandMatch["status"]) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch<{ ok: boolean; matches: BrandMatch[] }>(`/api/brand/matches${query}`);
}

export async function getBrandMatchesByOffer(offerId: string, status?: BrandMatch["status"]) {
  const params = new URLSearchParams();
  params.set("offerId", offerId);
  if (status) {
    params.set("status", status);
  }
  const query = params.toString();
  return apiFetch<{ ok: boolean; matches: BrandMatch[] }>(`/api/brand/matches?${query}`);
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
  fulfillmentType: "SHOPIFY" | "MANUAL";
  status: string;
  shopDomain: string | null;
  shopifyOrderId: string | null;
  shopifyOrderName: string | null;
  carrier?: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  error: string | null;
  updatedAt: string;
  match: { id: string; campaignCode: string };
  offer: { title: string };
  creator: { id: string; username: string | null; fullName?: string | null; email: string | null };
};

export async function getBrandShipments() {
  return apiFetch<{ ok: boolean; shipments: BrandShipment[] }>("/api/brand/shipments");
}

export async function updateManualShipment(
  shipmentId: string,
  payload: {
    status?: "PENDING" | "SHIPPED";
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
  },
) {
  return apiFetch<{ ok: boolean }>(`/api/brand/shipments/manual/${shipmentId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
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
  creator: {
    id: string;
    username: string | null;
    fullName?: string | null;
    followersCount: number | null;
    email: string | null;
  };
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
  refundCents: number;
  netRevenueCents: number;
};

export async function getBrandAnalytics() {
  return apiFetch<{ ok: boolean; offers: BrandAnalyticsOffer[] }>("/api/brand/analytics");
}

export type BrandCreatorAnalytics = {
  creatorId: string;
  username: string | null;
  followersCount: number | null;
  categories: string[] | null;
  matchCount: number;
  verifiedCount: number;
  clickCount: number;
  orderCount: number;
  revenueCents: number;
  refundCents: number;
  netRevenueCents: number;
  seedCostCents: number;
  earningsCents?: number;
  repeatBuyerCount?: number;
  roiPercent: number | null;
  ltvCents: number;
};

export async function getBrandCreatorAnalytics() {
  return apiFetch<{ ok: boolean; creators: BrandCreatorAnalytics[] }>(
    "/api/brand/analytics/creators",
  );
}

export type CreatorRecommendation = {
  creatorId: string;
  username: string;
  score: number;
  reason: string;
  rank: number;
  distanceKm?: number | null;
  distanceMiles?: number | null;
};

export type OfferDraftInput = {
  title?: string;
  countriesAllowed?: Array<"US" | "IN">;
  platforms?: string[];
  contentTypes?: string[];
  niches?: string[];
  locationRadiusKm?: number | null;
  locationRadiusMiles?: number | null;
  minFollowers?: number;
  maxFollowers?: number;
  category?: string;
  description?: string;
};

export async function getCreatorRecommendations(payload: {
  offerId?: string;
  limit?: number;
  offerDraft?: OfferDraftInput;
}) {
  return apiFetch<{ ok: boolean; creators: CreatorRecommendation[]; fallback?: boolean }>(
    "/api/ai/creators",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
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


export type BrandProfile = {
  name: string;
  website: string | null;
  description: string | null;
  industry: string | null;
  location: string | null;
  address1?: string | null;
  address2?: string | null;
  city?: string | null;
  province?: string | null;
  zip?: string | null;
  lat?: number | null;
  lng?: number | null;
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
  locationRadiusMiles?: number | null;
  distanceMiles?: number | null;
};

export async function getCreatorFeed() {
  return apiFetch<{ ok: boolean; blocked: boolean; reason?: string; offers: CreatorFeedOffer[] }>(
    "/api/creator/feed",
  );
}

export async function claimOffer(offerId: string) {
  return apiFetch<{ ok: boolean }>(`/api/creator/offers/${offerId}/claim`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export async function rejectOffer(offerId: string) {
  return apiFetch<{ ok: boolean }>(`/api/creator/offers/${offerId}/reject`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export type CreatorProfile = {
  id: string;
  username: string | null;
  followersCount: number | null;
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
  lat?: number | null;
  lng?: number | null;
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
  lat?: number;
  lng?: number;
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


export type CreatorDeal = {
  id: string;
  brand: string;
  product: string;
  valueUsd: number | null;
  status: "pending" | "approved" | "shipped" | "post_required" | "posted" | "complete";
  matchDate: string;
  deadline: string | null;
  trackingNumber: string | null;
};

export async function getCreatorDeals() {
  return apiFetch<{ ok: boolean; deals: CreatorDeal[] }>("/api/creator/deals");
}

export type SocialAccount = {
  provider: "TIKTOK" | "YOUTUBE";
  username: string | null;
  providerUserId: string;
};

export async function getSocialAccounts() {
  return apiFetch<{ ok: boolean; accounts: SocialAccount[] }>("/api/auth/social/accounts");
}

export type PicklistItem = { id: string; label: string };
export type OfferPreset = {
  id: string;
  label: string;
  description: string;
  platforms: string[];
  contentTypes: string[];
  template: string;
};

export type PicklistsResponse = {
  ok: boolean;
  creatorCategories: PicklistItem[];
  campaignCategories: PicklistItem[];
  campaignNiches: PicklistItem[];
  contentTypes: PicklistItem[];
  platforms: PicklistItem[];
  offerPresets: OfferPreset[];
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

export type LeaderboardStats = {
  activeCreators: number;
  activeBrands: number;
  dealsCompleted: number;
};

export async function getLeaderboard() {
  return apiFetch<{
    ok: boolean;
    creators: LeaderboardCreator[];
    stats: LeaderboardStats;
  }>("/api/leaderboard");
}

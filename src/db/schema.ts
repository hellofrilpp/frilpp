import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  integer,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const deliverableTypeEnum = pgEnum("deliverable_type", [
  "REELS",
  "FEED",
  "UGC_ONLY",
]);

export const offerTemplateEnum = pgEnum("offer_template", [
  "REEL",
  "FEED",
  "REEL_PLUS_STORY",
  "UGC_ONLY",
]);

export const offerStatusEnum = pgEnum("offer_status", [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);

export const matchStatusEnum = pgEnum("match_status", [
  "CLAIMED",
  "PENDING_APPROVAL",
  "ACCEPTED",
  "REVOKED",
  "CANCELED",
]);

export const deliverableStatusEnum = pgEnum("deliverable_status", [
  "DUE",
  "VERIFIED",
  "FAILED",
]);

export const brands = pgTable("brands", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  website: text("website"),
  description: text("description"),
  industry: text("industry"),
  location: text("location"),
  address1: text("address1"),
  address2: text("address2"),
  city: text("city"),
  province: text("province"),
  zip: text("zip"),
  country: text("country"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  logoUrl: text("logo_url"),
  countriesDefault: text("countries_default").array().notNull(),
  instagramHandle: text("instagram_handle"),
  acceptanceFollowersThreshold: integer("acceptance_followers_threshold")
    .notNull()
    .default(5000),
  acceptanceAboveThresholdAutoAccept: boolean(
    "acceptance_above_threshold_auto_accept",
  )
    .notNull()
    .default(true),
  notificationNewMatch: boolean("notification_new_match").notNull().default(true),
  notificationContentReceived: boolean("notification_content_received")
    .notNull()
    .default(true),
  notificationWeeklyDigest: boolean("notification_weekly_digest")
    .notNull()
    .default(false),
  notificationMarketing: boolean("notification_marketing").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const offers = pgTable("offers", {
  id: text("id").primaryKey(),
  brandId: text("brand_id")
    .notNull()
    .references(() => brands.id, { onDelete: "cascade" }),

  title: text("title").notNull(),
  template: offerTemplateEnum("template").notNull(),
  status: offerStatusEnum("status").notNull().default("DRAFT"),

  countriesAllowed: text("countries_allowed").array().notNull(),
  maxClaims: integer("max_claims").notNull(),
  deadlineDaysAfterDelivery: integer("deadline_days_after_delivery").notNull(),

  deliverableType: deliverableTypeEnum("deliverable_type").notNull(),
  requiresCaptionCode: boolean("requires_caption_code").notNull().default(true),

  usageRightsRequired: boolean("usage_rights_required").notNull().default(false),
  usageRightsScope: text("usage_rights_scope"),

  acceptanceFollowersThreshold: integer("acceptance_followers_threshold").notNull(),
  acceptanceAboveThresholdAutoAccept: boolean(
    "acceptance_above_threshold_auto_accept",
  ).notNull(),

  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),

  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const creators = pgTable("creators", {
  id: text("id").primaryKey(),
  igUserId: text("ig_user_id"),
  username: text("username"),
  followersCount: integer("followers_count"),
  country: text("country"),
  categories: text("categories").array(),
  categoriesOther: text("categories_other"),
  fullName: text("full_name"),
  email: text("email"),
  phone: text("phone"),
  address1: text("address1"),
  address2: text("address2"),
  city: text("city"),
  province: text("province"),
  zip: text("zip"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const matches = pgTable(
  "matches",
  {
    id: text("id").primaryKey(),
    offerId: text("offer_id")
      .notNull()
      .references(() => offers.id, { onDelete: "cascade" }),
    creatorId: text("creator_id")
      .notNull()
      .references(() => creators.id, { onDelete: "cascade" }),

    status: matchStatusEnum("status").notNull(),
    campaignCode: text("campaign_code").notNull(),

    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    campaignCodeUnique: uniqueIndex("matches_campaign_code_unique").on(t.campaignCode),
  }),
);

export const deliverables = pgTable("deliverables", {
  id: text("id").primaryKey(),
  matchId: text("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  status: deliverableStatusEnum("status").notNull(),
  expectedType: deliverableTypeEnum("expected_type").notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),

  submittedPermalink: text("submitted_permalink"),
  submittedNotes: text("submitted_notes"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  usageRightsGrantedAt: timestamp("usage_rights_granted_at", { withTimezone: true }),
  usageRightsScope: text("usage_rights_scope"),
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
  reviewedByUserId: text("reviewed_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),

  verifiedMediaId: text("verified_media_id"),
  verifiedPermalink: text("verified_permalink"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  failureReason: text("failure_reason"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const strikes = pgTable("strikes", {
  id: text("id").primaryKey(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => creators.id, { onDelete: "cascade" }),
  matchId: text("match_id").references(() => matches.id, { onDelete: "set null" }),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  forgivenAt: timestamp("forgiven_at", { withTimezone: true }),
  forgivenReason: text("forgiven_reason"),
});

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  brandId: text("brand_id").references(() => brands.id, { onDelete: "set null" }),
  actorType: text("actor_type").notNull(), // BRAND | CREATOR | ADMIN | SYSTEM
  actorId: text("actor_id"),
  action: text("action").notNull(),
  data: text("data"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const membershipRoleEnum = pgEnum("membership_role", ["OWNER", "ADMIN", "MEMBER"]);

export const billingProviderEnum = pgEnum("billing_provider", ["STRIPE", "RAZORPAY"]);
export const billingSubjectTypeEnum = pgEnum("billing_subject_type", ["BRAND", "CREATOR"]);
export const billingSubscriptionStatusEnum = pgEnum("billing_subscription_status", [
  "ACTIVE",
  "TRIALING",
  "PAST_DUE",
  "CANCELED",
  "INACTIVE",
]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  activeBrandId: text("active_brand_id"),
  tosAcceptedAt: timestamp("tos_accepted_at", { withTimezone: true }),
  privacyAcceptedAt: timestamp("privacy_accepted_at", { withTimezone: true }),
  igDataAccessAcceptedAt: timestamp("ig_data_access_accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const billingSubscriptions = pgTable(
  "billing_subscriptions",
  {
    id: text("id").primaryKey(),
    subjectType: billingSubjectTypeEnum("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    provider: billingProviderEnum("provider").notNull(),
    providerCustomerId: text("provider_customer_id"),
    providerSubscriptionId: text("provider_subscription_id").notNull(),
    status: billingSubscriptionStatusEnum("status").notNull().default("INACTIVE"),
    market: text("market").notNull().default("US"),
    planKey: text("plan_key").notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    providerSubscriptionUnique: uniqueIndex("billing_subscriptions_provider_sub_id_unique").on(
      t.provider,
      t.providerSubscriptionId,
    ),
    subjectUnique: uniqueIndex("billing_subscriptions_subject_unique").on(t.subjectType, t.subjectId),
    statusIdx: index("billing_subscriptions_status_idx").on(t.status),
  }),
);

export const rateLimitBuckets = pgTable(
  "rate_limit_buckets",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.key, t.windowStart] }),
  }),
);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const loginTokens = pgTable("login_tokens", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const brandMemberships = pgTable("brand_memberships", {
  id: text("id").primaryKey(),
  brandId: text("brand_id")
    .notNull()
    .references(() => brands.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: membershipRoleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const creatorMeta = pgTable("creator_meta", {
  id: text("id").primaryKey(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => creators.id, { onDelete: "cascade" }),
  igUserId: text("ig_user_id"),
  accountType: text("account_type"),
  accessTokenEncrypted: text("access_token_encrypted").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  profileSyncedAt: timestamp("profile_synced_at", { withTimezone: true }),
  profileError: text("profile_error"),
  scopes: text("scopes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const notificationChannelEnum = pgEnum("notification_channel", [
  "EMAIL",
  "SMS",
  "WHATSAPP",
]);
export const notificationStatusEnum = pgEnum("notification_status", [
  "PENDING",
  "SENT",
  "ERROR",
]);

export const socialProviderEnum = pgEnum("social_provider", ["INSTAGRAM", "TIKTOK"]);

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  channel: notificationChannelEnum("channel").notNull(),
  status: notificationStatusEnum("status").notNull().default("PENDING"),
  to: text("to").notNull(),
  type: text("type").notNull(),
  payload: text("payload"),
  error: text("error"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userSocialAccounts = pgTable(
  "user_social_accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: socialProviderEnum("provider").notNull(),
    providerUserId: text("provider_user_id").notNull(),
    username: text("username"),
    accessTokenEncrypted: text("access_token_encrypted"),
    refreshTokenEncrypted: text("refresh_token_encrypted"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    scopes: text("scopes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    providerUserUnique: uniqueIndex("user_social_accounts_provider_user_unique").on(
      t.provider,
      t.providerUserId,
    ),
    userProviderUnique: uniqueIndex("user_social_accounts_user_provider_unique").on(
      t.userId,
      t.provider,
    ),
  }),
);

export const pendingSocialAccounts = pgTable(
  "pending_social_accounts",
  {
    id: text("id").primaryKey(),
    provider: socialProviderEnum("provider").notNull(),
    providerUserId: text("provider_user_id").notNull(),
    username: text("username"),
    accessTokenEncrypted: text("access_token_encrypted"),
    refreshTokenEncrypted: text("refresh_token_encrypted"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    scopes: text("scopes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    providerUserUnique: uniqueIndex("pending_social_accounts_provider_user_unique").on(
      t.provider,
      t.providerUserId,
    ),
  }),
);

export const updatedAtTriggerSql = sql`
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

export const shopifyStores = pgTable("shopify_stores", {
  id: text("id").primaryKey(),
  brandId: text("brand_id")
    .notNull()
    .references(() => brands.id, { onDelete: "cascade" }),
  shopDomain: text("shop_domain").notNull(),
  accessTokenEncrypted: text("access_token_encrypted").notNull(),
  scopes: text("scopes").notNull(),
  installedAt: timestamp("installed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  uninstalledAt: timestamp("uninstalled_at", { withTimezone: true }),
});

export const offerProducts = pgTable("offer_products", {
  id: text("id").primaryKey(),
  offerId: text("offer_id")
    .notNull()
    .references(() => offers.id, { onDelete: "cascade" }),
  shopifyProductId: text("shopify_product_id").notNull(),
  shopifyVariantId: text("shopify_variant_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
});

export const linkClicks = pgTable("link_clicks", {
  id: text("id").primaryKey(),
  matchId: text("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  occurredAt: timestamp("occurred_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  ipHash: text("ip_hash"),
  userAgent: text("user_agent"),
  referer: text("referer"),
});

export const attributedOrders = pgTable("attributed_orders", {
  id: text("id").primaryKey(),
  matchId: text("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  shopDomain: text("shop_domain").notNull(),
  shopifyOrderId: text("shopify_order_id").notNull(),
  shopifyCustomerId: text("shopify_customer_id"),
  currency: text("currency").notNull(),
  totalPrice: integer("total_price_cents").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const attributedRefunds = pgTable(
  "attributed_refunds",
  {
    id: text("id").primaryKey(),
    matchId: text("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    shopDomain: text("shop_domain").notNull(),
    shopifyOrderId: text("shopify_order_id").notNull(),
    shopifyRefundId: text("shopify_refund_id").notNull(),
    currency: text("currency").notNull(),
    totalRefund: integer("total_refund_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    refundUnique: uniqueIndex("attributed_refunds_shopify_refund_unique").on(
      t.shopDomain,
      t.shopifyRefundId,
    ),
  }),
);

export const matchDiscounts = pgTable(
  "match_discounts",
  {
    id: text("id").primaryKey(),
    matchId: text("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    shopDomain: text("shop_domain").notNull(),
    shopifyPriceRuleId: text("shopify_price_rule_id").notNull(),
    shopifyDiscountCodeId: text("shopify_discount_code_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    matchIdUnique: uniqueIndex("match_discounts_match_id_unique").on(t.matchId),
  }),
);

export const shopifyOrderStatusEnum = pgEnum("shopify_order_status", [
  "PENDING",
  "DRAFT_CREATED",
  "COMPLETED",
  "FULFILLED",
  "CANCELED",
  "ERROR",
]);

export const manualShipmentStatusEnum = pgEnum("manual_shipment_status", [
  "PENDING",
  "SHIPPED",
]);

export const shopifyOrders = pgTable(
  "shopify_orders",
  {
    id: text("id").primaryKey(),
    matchId: text("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    shopDomain: text("shop_domain").notNull(),

    status: shopifyOrderStatusEnum("status").notNull().default("PENDING"),
    shopifyDraftOrderId: text("shopify_draft_order_id"),
    shopifyOrderId: text("shopify_order_id"),
    shopifyOrderName: text("shopify_order_name"),

    trackingNumber: text("tracking_number"),
    trackingUrl: text("tracking_url"),

    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    matchIdUnique: uniqueIndex("shopify_orders_match_id_unique").on(t.matchId),
  }),
);

export const manualShipments = pgTable(
  "manual_shipments",
  {
    id: text("id").primaryKey(),
    matchId: text("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    status: manualShipmentStatusEnum("status").notNull().default("PENDING"),
    carrier: text("carrier"),
    trackingNumber: text("tracking_number"),
    trackingUrl: text("tracking_url"),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    matchIdUnique: uniqueIndex("manual_shipments_match_id_unique").on(t.matchId),
  }),
);

export const redemptionChannelEnum = pgEnum("redemption_channel", [
  "IN_STORE",
  "ONLINE",
  "OTHER",
]);

export const redemptions = pgTable(
  "redemptions",
  {
    id: text("id").primaryKey(),
    matchId: text("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    channel: redemptionChannelEnum("channel").notNull().default("IN_STORE"),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("USD"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    matchCreatedAtIdx: index("redemptions_match_id_created_at_idx").on(t.matchId, t.createdAt),
  }),
);

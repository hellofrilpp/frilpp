# Data model (v1)

## Core entities
### Brand
- `id`
- `name`
- `country_default` (US/IN)
- `acceptance_followers_threshold`
- `acceptance_above_threshold = AUTO_ACCEPT`
- `acceptance_below_threshold = REQUIRE_APPROVAL`

### ShopifyStore
- `id`, `brand_id`
- `shop_domain`
- `access_token_encrypted`
- `scope`
- `installed_at`, `uninstalled_at`

### Influencer
- `id`
- `ig_user_id` (app-scoped)
- `username`
- `followers_count` (cached)
- `country` (US/IN)
- `shipping_address`
- `meta_access_token_encrypted`
- `token_expires_at`
- `status` (ACTIVE/COOLDOWN/BANNED)
- `strike_count`

### Offer
- `id`, `brand_id`
- `title`, `description`
- `template` (REEL / FEED / REEL_PLUS_STORY / UGC_ONLY)
- `countries_allowed` (US/IN)
- `max_claims`
- `acceptance_override_followers_threshold?`
- `acceptance_mode` (INHERIT/AUTO_ACCEPT/REQUIRE_APPROVAL)
- `deliverable_type` (REELS/FEED/UGC_ONLY)
- `deliverable_deadline_rule` (days_after_delivery | fixed_date)
- `requires_caption_code = true`
- `created_at`, `published_at`, `archived_at`

### OfferProduct
- `offer_id`
- `shopify_product_id`, `shopify_variant_id`
- `quantity`

### Match
- `id`, `offer_id`, `influencer_id`
- `status` (CLAIMED/PENDING_APPROVAL/ACCEPTED/REVOKED/CANCELED)
- `campaign_code`
- `accepted_at`

### Order
- `id`, `match_id`
- `shopify_order_id`
- `status` (CREATED/FULFILLED/CANCELED)
- `tracking_number`, `tracking_url`

### Deliverable
- `id`, `match_id`
- `status` (DUE/VERIFIED/FAILED)
- `expected_type`
- `due_at`
- `verified_media_id?`
- `verified_permalink?`
- `verified_at?`
- `failure_reason?`

### Strike
- `id`, `influencer_id`, `match_id?`
- `reason`
- `created_at`
- `forgiven_at?`, `forgiven_by?`, `forgiven_reason?`

## Notes
- Keep `followers_count` cached but refresh periodically.
- Store raw verification snapshots (media id, caption hash, timestamp) for audit.


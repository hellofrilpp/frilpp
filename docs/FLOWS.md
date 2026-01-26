# User flows (v1)

## 1) Brand onboarding
1. Install Frilpp Shopify app
2. OAuth grants Admin API access
3. Brand config:
   - default eligible countries: US, IN
   - acceptance threshold `X` followers (default 5k)
4. Optional: shipping origin settings (US warehouse, India warehouse)

## 2) Creator onboarding
1. Connect Instagram professional account via Meta OAuth
2. We fetch + cache:
   - `ig_user_id`, `username`, `followers_count`
3. Creator enters shipping address and selects country (US/IN)
4. Creator sees feed

## 3) Offer creation (2-minute path)
1. Choose template (Reel / Feed / Reel+Story bonus / UGC only)
2. Pick products (from Shopify)
3. Set:
   - max claims
   - eligible countries
   - deliverable deadline rule (days after delivery)
4. Acceptance policy (inherit brand default; optional override)
5. Publish → offer appears in creator feed

## 4) Claim → acceptance decision
1. Creator clicks “Claim”
2. System validates:
   - creator status (not banned/cooldown)
   - address present, country allowed
   - offer slots remaining + inventory rules
3. System fetches cached `followers_count` (refresh if stale)
4. Decision:
   - set status → `PENDING_APPROVAL` (brand sees request)
   - on brand approval → `ACCEPTED`

## 5) Fulfillment (Shopify)
On `ACCEPTED`:
1. Create Shopify draft order (100% discount) with:
   - influencer shipping address
   - order tag `FRILPP_SEEDING`
   - note attributes: `match_id`, `campaign_code`, `deliverable_type`, `due_at`
2. If stockout / API error:
   - retry via job
   - if still failing, set match `CANCELED` and notify creator
3. On fulfillment webhook:
   - store tracking details
   - compute `due_at` based on delivery date or ship date (config)

## 6) Verification (Reels/Feed enforced)
On `SHIPPED` (or `DELIVERED` if carrier integration available):
1. Generate and display `campaign_code` to creator
2. Verification worker polls:
   - `GET /{ig-user-id}/media` for new posts within window
   - for each media id: `GET /{ig-media-id}` for `caption`, `media_product_type`, `permalink`, `timestamp`
3. When match found:
   - set deliverable `VERIFIED`
   - record `verified_media_id` + `verified_permalink` + snapshot
4. On deadline pass without valid match:
   - set `FAILED`
   - create strike

## 7) Stories (bonus / best-effort)
If offer requests a Story:
- Option A (best-effort): detect story media exists (`GET /{ig-user-id}/stories`) and optionally pull insights (`/{ig-media-id}/insights`)
- Option B (more reliable): require link sticker to a unique URL or display a unique coupon code
- Do not issue strikes solely based on “tagged @brand in story” (not reliably verifiable)

## 8) Disputes / appeals
- Creator can appeal a strike once per match
- Brand can forgive strike with a reason (audited)
- Admin can override any state transition

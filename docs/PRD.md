# Frilpp PRD (Product Requirements Doc)

## Summary
Influencer agencies are too expensive for small brands. Product seeding today is spreadsheet + manual DMs + manual shipping + manual chasing. Frilpp is a Tinder-like CRM that lets brands publish “barter offers” and lets verified nano-influencers swipe to claim. The system auto-fulfills via Shopify and verifies deliverables via Meta APIs.

## Target users
### Brands (D2C)
- Founder / marketing lead doing seeding manually
- Ops person fulfilling orders and tracking “who posted”

### Creators (nano-influencers)
- 1k–50k followers (configurable)
- Primarily US + India in v1

## Core jobs-to-be-done
### Brand
- “Post an offer in under 2 minutes.”
- “Send product without DMs or spreadsheets.”
- “Know who owes content, who delivered, who ghosted.”
- “Enforce a fair policy so repeat offenders can’t keep claiming.”

### Creator
- “Find free product offers that match my niche.”
- “Claim quickly and get shipped with minimal back-and-forth.”
- “Know exactly what to post, by when, and how I’ll be verified.”

## Key product decisions
### Verification
- Enforced deliverable for strikes/gating: **Reels/Feed** with a unique **campaign code** in caption (API-verifiable).
- Stories: best-effort (we can list stories and fetch insights for a Story media ID, but story tag/mention verification is not reliable via APIs). Stories are optional/bonus or require creator proof.

### Acceptance policy
Brand-level rule:
- All claims require brand approval.
- Brands can set a minimum follower threshold for eligibility.

## MVP scope
### Brand
1) Connect Shopify store
2) Create an offer (template-based wizard)
3) Set creator criteria (followers threshold X)
4) Review matches + approvals
5) Auto-create Shopify order on acceptance
6) View pipeline: claimed → shipped → due → verified → strike/dispute

### Creator
1) Connect Instagram professional account (Meta OAuth)
2) Provide shipping address (US/India)
3) Swipe/claim offers
4) View requirements + due date + unique campaign code
5) Post Reel/Feed with the campaign code in caption
6) Get verified automatically; strikes for missed/invalid deliverables

## Non-goals (MVP)
- Agency-style outreach/DM automation
- Multi-platform verification (TikTok/YouTube)
- Story-only enforcement without creator proof
- Payments/affiliate payouts (barter only)

## Requirements
### Offer creation (brand)
- Under 2 minutes
- Template selection: “1 Reel”, “1 Feed Post”, “Reel + Story (bonus)”, “UGC only (no posting)”
- Product selection from Shopify (variants, quantities)
- Shipping coverage and eligible countries (US/India)
- Deliverable requirements:
  - type (REELS/FEED)
  - due date (N days after delivery or fixed date)
  - mandatory caption code insertion
  - optional @brand tag + hashtag (not used for enforcement)
- Acceptance:
  - inherits from brand policy, optional override

### Automated fulfillment (Shopify)
- On acceptance, create a $0 order for influencer:
  - draft order with 100% discount or order creation with manual payment
  - address from creator profile
- Track fulfillment + tracking number(s)
- Handle cancellations (stockouts, creator strikes, manual revoke)

### Verification (Meta)
- For each accepted match, generate unique code `FRILP-XXXXXX` (or shorter).
- Verification job (polling):
  - fetch influencer’s new IG media within window
  - detect eligible media product type (REELS/FEED)
  - confirm caption contains code (case-insensitive)
  - store permalink + timestamp for audit
- Failure states:
  - no post by deadline
  - post exists but missing code
  - post exists but wrong type
  - private account (cannot verify)

### Strikes
- Each match has a deliverable status and violation reason.
- Strike rules (configurable):
  - Missed deadline → 1 strike
  - Invalid deliverable (wrong type / missing code) → 1 strike
- Enforcement:
  - 2 strikes → cooldown (e.g., 30 days)
  - 3 strikes → ban (brand-visible)
- Manual override by brand/admin with reason.

## Success metrics
Brand-side:
- median time to publish offer < 2 minutes
- claimed-to-shipped automation rate > 90%
- verified deliverable rate (within deadline) > 60–80% depending on niche

Creator-side:
- claim-to-shipment median time
- % of creators who complete first deliverable

System:
- verification false-negative rate < 2%
- verification false-positive rate ~ 0%

## Edge cases (must handle)
- Creator deletes post after verification
- Creator changes caption after verification (re-run check on schedule)
- Creator account becomes private mid-campaign
- Out-of-stock product after claim
- Multi-warehouse shipping (US vs India)
- Returns/refunds not applicable (barter orders)

# Architecture

## Goal
Ship a Shopify-first product seeding platform with automated:
- offer distribution (creator feed)
- order creation + tracking sync
- deliverable verification + strikes

## Proposed system (v1)
### Web app
- Next.js (App Router) for brand + creator UI
- Auth: session-based (brand) + creator OAuth identity (Meta)

### Database
- Postgres (Vercel Postgres)
- ORM: Prisma or Drizzle (pick one early)

### Job runner
- Vercel-first approach: scheduled, bounded work via Vercel Cron + serverless route handlers
  - verification polling loops (batched)
  - Shopify retry jobs (batched)
  - strike evaluation / cooldown
- Fan-out (when needed): Upstash QStash to split work per match/order

### Integrations
- Shopify: OAuth, Admin API, webhooks (fulfillment events), draft orders
- Meta: Instagram Graph API via Facebook Login for Business (creator connection)

## Verification strategy (enforced)
We verify deliverables using a **unique campaign code** placed in the caption of a Reel/Feed post.
- Why: story tag verification isn’t reliable via IG APIs; caption parsing is reliable.
- How:
  1) On match acceptance, generate `campaign_code`
  2) Poll `GET /{ig-user-id}/media` (time-based pagination) and inspect new media IDs
  3) For each media ID, fetch fields including `caption`, `media_product_type`, `permalink`, `timestamp`
  4) Mark match verified when code is present and type matches

## High-level components
- `Offer Service`: offer templates, eligibility rules, caps
- `Match Service`: claim/approve state machine
- `Fulfillment Service`: create Shopify order, track shipment, handle exceptions
- `Verification Service`: polls Meta, evaluates deliverables, writes audits
- `Reputation Service`: strikes, cooldowns, bans, appeals

## Security + compliance
- Store OAuth tokens encrypted at rest
- Least-privilege permissions + App Review alignment
- FTC disclosure checkbox + default copy templates
- Audit log for admin overrides and strike actions

## Vercel
See `docs/VERCEL.md`.

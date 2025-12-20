# Execution plan (build order)

## Phase 0 — Foundations (1–2 days)
- Decide DB (Postgres) + ORM (Prisma)
- Add auth (brands via Shopify; creators via Meta)
- Add env/config system + encrypted token storage

## Phase 1 — Brand offer builder + publishing (3–5 days)
- Shopify app install + product import for offer builder
- Offer templates + fast publish
- Brand acceptance policy UI + persistence

## Phase 2 — Creator onboarding + feed (3–5 days)
- Meta OAuth connect for creator
- Country + address capture (US/IN)
- Feed ranking (simple filters + recency)
- Claim flow + acceptance state machine

## Phase 3 — Fulfillment automation (3–7 days)
- Draft order creation + retries
- Fulfillment webhook ingestion + tracking sync
- Brand pipeline dashboard (claimed/shipped/due/verified)

## Phase 4 — Verification + strikes (4–10 days)
- Campaign code generation per match
- Verification polling worker (Reels/Feed)
- Strike evaluation + cooldown/ban rules
- Audit logs + dispute/forgive

## Phase 5 — Hardening (ongoing)
- Rate limits, token refresh, monitoring
- Fraud signals (account age, engagement heuristics)
- QA playbook + sandbox stores/accounts


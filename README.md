Frilpp is a product-seeding CRM for D2C brands and nano-influencers.

Brands post “barter offers” (free product in exchange for a deliverable). Creators swipe to claim. The platform automates fulfillment via Shopify and verifies deliverables (Reels/Feed) via Meta APIs using a unique campaign code per match.

## Getting Started

### Prereqs
- Node.js + pnpm

### Dev
Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Auth (magic link)
- Visit `/login` and request a magic link.
- Email delivery requires Resend (`RESEND_API_KEY` + `RESEND_FROM` or `AUTH_EMAIL_FROM`). If it’s not configured, the API returns an error.
- After login, use `/onboarding` to create a brand workspace and/or a creator profile.

### Database (Vercel Postgres)
- Generate migrations: `DATABASE_URL=postgres://... pnpm db:generate`
- Apply migrations: `pnpm db:migrate`

## Docs
- `docs/PRD.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_MODEL.md`
- `docs/API_SPEC.md`
- `docs/AUTH.md`
- `docs/NOTIFICATIONS.md`
- `docs/INTEGRATIONS_META.md`
- `docs/INTEGRATIONS_SHOPIFY.md`
- `docs/VERCEL.md`

## Status
MVP flows are live: multi-tenant auth/onboarding, offer library + publish, creator claims, Shopify automation, deliverables queue + verification cron, and notification queue.

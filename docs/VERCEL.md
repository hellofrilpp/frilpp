# Vercel deployment notes

## What Vercel is great at
- Next.js App Router (serverless route handlers)
- Webhooks (fast request/response)
- Managed Postgres via Vercel Postgres
- Scheduled work via Vercel Cron

## Constraints to design around
- No long-running background workers (anything > seconds will get cut off)
- Cron and webhooks must do small, bounded work and return quickly
- Use fan-out/scheduling (e.g., QStash) if verification needs many per-run checks

## DB recommendation
- Vercel Postgres (Postgres) for core entities (brands, offers, matches, orders, deliverables, strikes)
- Keep external tokens encrypted in the DB; store encryption keys in Vercel env vars

## Migrations (Drizzle)
- Generate migration SQL locally: `DATABASE_URL=postgres://... pnpm db:generate`
- Apply migrations:
  - local: `pnpm db:migrate`
  - Vercel: automatic during production deploy if `MIGRATE_ON_DEPLOY=true` (recommended), or run `pnpm db:migrate` manually/CI
- `drizzle/` is committed and becomes the source of truth for schema evolution.

## Alerts / logs (recommended)
- Set `ALERT_EMAIL_TO` + Resend env vars to receive alert emails when crons/webhooks fail.
- Set `LOG_LEVEL=debug` during early beta debugging.

## Cron jobs (daily schedule)
Vercel Cron only supports recurring schedules, so we run these once per day (UTC).

Endpoint (daily):
- `/api/cron/daily` – runs verify + fulfillment + notify + meta-sync in sequence at 8am America/New_York
  - Scheduled twice (12:00 and 13:00 UTC) to handle daylight saving time automatically.

Manual endpoints (ad hoc runs):
- `/api/cron/verify`
- `/api/cron/fulfillment`
- `/api/cron/notify`
- `/api/cron/meta-sync`

Cron auth:
- Vercel Cron automatically sends the `x-vercel-cron` header; handlers accept it by default.
- If you set `CRON_SECRET`, the handlers require `Authorization: Bearer <CRON_SECRET>` (recommended for non-Vercel schedulers).

## Background jobs strategy (serverless-safe)
- Vercel Cron hits `GET /api/cron/verify`
- That handler:
  - selects a bounded batch (e.g., 50) of pending deliverables
  - runs verification checks with timeouts
  - updates status + writes audit rows
  - exits

If we need more scale:
- Use Upstash QStash to enqueue per-match verification jobs and run them as separate invocations.

## Attribution endpoints
- Public redirect + click tracking: `GET /r/:campaignCode` (writes to `link_clicks`)
- Shopify orders webhook for conversion attribution: `POST /api/webhooks/shopify/orders-create`

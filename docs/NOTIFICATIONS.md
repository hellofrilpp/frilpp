# Notifications (Email / SMS / WhatsApp)

Frilpp queues notifications in Postgres and delivers them via a Vercel Cron job.

## How it works

- App enqueues notifications into `notifications` (status `PENDING`).
- Cron endpoint `/api/cron/notify` runs every 5 minutes (see `vercel.json`), sends a small batch, and marks:
  - `SENT` on success
  - `ERROR` on failure

## Supported channels

- Email (Resend): `RESEND_API_KEY`, `RESEND_FROM` (or `AUTH_EMAIL_FROM`)
- SMS / WhatsApp (Twilio): optional
  - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
  - `TWILIO_FROM_NUMBER`
  - `TWILIO_WHATSAPP_FROM`

## Current events

- `creator_approved`
- `shipment_fulfilled`
- `deliverable_due_soon`
- `strike_issued`


Here’s what you need to set up first.

Env Variables (what + where they come from)

Core

DATABASE_URL — Postgres connection string (Vercel Postgres/Neon/Supabase).
NEXT_PUBLIC_APP_URL — your canonical URL (e.g. https://frilpp.com).
TOKEN_ENCRYPTION_KEY — 32+ bytes (used to encrypt tokens). Generate with:
openssl rand -base64 32
MIGRATE_ON_DEPLOY — set to true in prod to run migrations.
Auth + Email

RESEND_API_KEY — Resend API key.
AUTH_EMAIL_FROM (or RESEND_FROM) — e.g. hello@frilpp.com.
ALERT_EMAIL_TO — where system alerts go (optional).
Social (Instagram + TikTok)

META_APP_ID
META_APP_SECRET
META_API_VERSION (optional; default v20.0)
TIKTOK_CLIENT_ID
TIKTOK_CLIENT_SECRET
TIKTOK_REDIRECT_URL (optional; otherwise uses NEXT_PUBLIC_APP_URL)
Shopify

SHOPIFY_API_KEY
SHOPIFY_API_SECRET
SHOPIFY_APP_URL (optional; falls back to NEXT_PUBLIC_APP_URL)
SHOPIFY_SCOPES (optional; default is fine)
SHOPIFY_API_VERSION (optional; default set in code)
DEFAULT_CREATOR_DISCOUNT_PERCENT (optional; default 10)
Comms (optional)

TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_FROM_NUMBER
TWILIO_WHATSAPP_FROM
AI + Location

ZAI_API_KEY
ZAI_API_BASE_URL (optional; default already set)
ZAI_MODEL (optional; default glm-4.6)
VITE_MAPBOX_TOKEN (public token for address autocomplete)
Observability (optional)

SENTRY_DSN
SENTRY_TRACES_SAMPLE_RATE (optional)
LOG_LEVEL (optional; set to debug)
Rate limits / policy (optional overrides)

RATE_LIMIT_AUTH_PER_IP_PER_HOUR
RATE_LIMIT_AUTH_PER_EMAIL_PER_HOUR
RATE_LIMIT_CLAIMS_PER_CREATOR_PER_MINUTE
RATE_LIMIT_CLAIMS_PER_IP_PER_MINUTE
RATE_LIMIT_REDIRECTS_PER_MINUTE
CREATOR_MIN_FOLLOWERS
CREATOR_MAX_FOLLOWERS
STRIKE_LIMIT
META_PROFILE_STALE_DAYS
Cron (recommended)

CRON_SECRET — if set, cron requests must send Authorization: Bearer <secret>.
Accounts you should create

Database: Vercel Postgres or Neon (grab DATABASE_URL).
Resend: verify frilpp.com, create API key, set sender to hello@frilpp.com.
Meta developer account: create app, add Instagram Graph API, set OAuth redirect(s):
https://frilpp.com/api/auth/social/instagram/callback
https://frilpp.com/api/meta/instagram/callback
TikTok developer account: create app, set redirect:
https://frilpp.com/api/auth/social/tiktok/callback
Shopify Partner account: create app, set App URL + Redirect URL:
App URL: https://frilpp.com
Redirect URL: https://frilpp.com/api/shopify/callback
Z.ai account: get API key.
Mapbox account: public token for geocoding.
Twilio (optional): SMS + WhatsApp.
Sentry (optional): error tracking.
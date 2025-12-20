# Auth (Magic Link)

Frilpp uses email magic links with a Postgres-backed session cookie.

## Flow

1. User enters email on `/login`.
2. `POST /api/auth/request` is rate-limited and requires accepting Terms + Privacy; it creates a short-lived login token (10 minutes) and emails a link:
   - `/api/auth/callback?token=...`
3. Callback consumes the token, creates a `sessions` row, and sets an HTTP-only cookie `frilpp_session`.
4. Brand + creator setup is handled in `/onboarding`.
5. If legal acceptance is missing, Frilpp redirects to `/legal/accept`.

## Env vars

- `DATABASE_URL`
- Email (Resend):
  - `RESEND_API_KEY`
  - `RESEND_FROM` (or `AUTH_EMAIL_FROM`)
- `NEXT_PUBLIC_APP_URL` (used to build absolute links)
- Rate limits:
  - `RATE_LIMIT_AUTH_PER_IP_PER_HOUR`
  - `RATE_LIMIT_AUTH_PER_EMAIL_PER_HOUR`

If Resend isn’t configured, `/api/auth/request` returns a `debug` link for local development.

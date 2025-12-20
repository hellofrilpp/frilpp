# Meta / Instagram (Verification)

Frilpp verifies Reel/Feed deliverables by scanning the creator’s recent media captions for a unique campaign code (e.g. `FRILP-A1B2C3`), optionally requiring a mention of the brand handle (e.g. `@brandhandle`).

Stories are treated as best-effort; the API surface is not reliable enough to enforce at scale.

## Setup

Env vars:

- `META_APP_ID`
- `META_APP_SECRET`
- `META_API_VERSION` (default `v20.0`)
- `META_PROFILE_STALE_DAYS` (default `7`, used by `/api/cron/meta-sync`)
- `NEXT_PUBLIC_APP_URL` (used to build redirect URI)

Creator connect:

- Creator clicks **Connect** in `/influencer/settings`
- OAuth redirect: `/api/meta/instagram/connect`
- Callback: `/api/meta/instagram/callback`

## What we require from creators
- Instagram **Professional account** (Creator/Business)
- A **Facebook Page** connected to that IG account (required for the IG Graph API flow we use)

## Permissions (typical)

The OAuth flow requests:

- `instagram_basic`
- `pages_show_list`
- `pages_read_engagement`
- `instagram_manage_insights`

Your Meta app will require review/approval for production use with real creators.

## What Frilpp stores (and why)
- Encrypted long-lived user access token (`creator_meta.access_token_encrypted`) to read recent media for verification.
- IG user id (`creator_meta.ig_user_id`) to fetch `/media`.
- Token expiry (`creator_meta.expires_at`) to surface “reconnect needed” states.
- Profile snapshot timestamps (`creator_meta.profile_synced_at`) so follower count/username aren’t stale.

## Verification method (enforced)
We only *enforce* what we can reliably check via APIs:
- Reels/Feed media exists after acceptance date
- Caption contains the unique `campaignCode`
- Optional: caption includes `@brandhandle` if the brand configured one

This is implemented by polling recent media (`/{ig-user-id}/media?fields=...`) and matching:
- `caption` contains code (case-insensitive)
- `media_type` matches expected deliverable (Reels vs non-Reels)

## App Review notes

Prepare:

- A test creator IG Professional account (Business/Creator) connected to a Facebook Page
- Screencast showing:
  - connect flow
  - fetching recent media
  - verification by caption campaign code
- Clear explanation that Frilpp reads creator media metadata (caption/permalink/timestamp) for contract enforcement.

See `docs/META_APP_REVIEW.md` for a step-by-step checklist and reviewer copy.

## Limitations

- Stories verification is best-effort and should not be the enforcement mechanism.
- Token expiry: creators may need to reconnect periodically; Frilpp stores `expires_at` and refreshes profile snapshots via `/api/cron/meta-sync`.

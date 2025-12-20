# Meta App Review checklist (Instagram verification)

Frilpp uses the Instagram Graph API to **verify Reels/Feed** deliverables by scanning the creator’s recent media captions for a unique campaign code.

Stories are best-effort and **not** used for enforcement.

## 1) Preconditions (test accounts)
- 1 Instagram **Professional** account (Creator/Business)
- A **Facebook Page** connected to that Instagram account
- That Instagram account must be added as a tester/developer for your Meta app until review is approved

## 2) App configuration
- Product: **Facebook Login**
- Valid OAuth redirect URIs:
  - `https://<your-domain>/api/meta/instagram/callback`
- Data deletion / contact email set
- Privacy Policy URL + Terms URL set (use your `/legal/*` pages)

## 3) Permissions (what we request)
Frilpp’s OAuth flow requests:
- `instagram_basic`
- `pages_show_list`
- `pages_read_engagement`
- `instagram_manage_insights`

## 4) Reviewer-facing explanation (copy-paste)
**Why we need these permissions**
- Frilpp is a product seeding CRM that enforces barter deliverables.
- Creators connect their IG professional account so Frilpp can read **recent media metadata** (caption, permalink, timestamp, media type) and verify the required post contains a unique campaign code.
- We do **not** post on behalf of creators; we only read metadata needed for verification and auditing.

## 5) Demo flow to record (screencast)
1. Sign in as a creator
2. Go to `/influencer/settings` → **Connect**
3. Approve Meta OAuth
4. Claim a posting offer (Reels/Feed)
5. Post a Reel/Feed with the campaign code in caption
6. Show `/brand/deliverables` moving to VERIFIED after `/api/cron/verify` runs (or manual re-run)

## 6) Common reasons review fails
- IG account is not Professional or not linked to a FB Page
- Redirect URI mismatch (http vs https, missing path)
- The screencast doesn’t clearly show what data is accessed and where it’s used


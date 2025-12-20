# API spec (internal, v1)

## Brand
- `POST /api/brand/offers` create offer (draft)
- `POST /api/brand/offers/:id/publish`
- `GET /api/brand/offers` list
- `GET /api/brand/matches` list matches (filters: status, offer_id)
- `POST /api/brand/matches/:id/approve`
- `POST /api/brand/matches/:id/revoke`
- `PATCH /api/brand/settings/acceptance` set follower threshold policy

## Creator
- `GET /api/creator/feed` returns personalized offer cards
- `POST /api/creator/offers/:id/claim`
- `GET /api/creator/matches` list matches + requirements

## Webhooks
- `POST /api/webhooks/shopify/orders/fulfilled`
- `POST /api/webhooks/shopify/app/uninstalled`

## Jobs
- `verifyDeliverables(match_id)`
- `syncShipment(order_id)`
- `refreshInfluencerProfile(influencer_id)`


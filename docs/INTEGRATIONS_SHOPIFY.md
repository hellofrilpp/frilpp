# Shopify integration

## App model (recommended)
Build as a Shopify app so brands can create offers from their Shopify admin and we can create orders automatically.

See `docs/SHOPIFY_PROD_CHECKLIST.md` for the production checklist.

## OAuth routes (implemented)
- Install: `GET /api/shopify/install?shop=<your-store.myshopify.com>`
- Callback: `GET /api/shopify/callback`
- Status: `GET /api/shopify/status`
- Products (REST): `GET /api/shopify/products?limit=10&query=...`

## Core capabilities needed
- OAuth install flow to get Admin API access token
- Read products/variants to populate offer builder
- Create $0 order for accepted matches:
  - draft order + 100% discount (recommended)
  - or order with manual payment method
- Receive fulfillment updates (webhooks)
- Store tracking numbers/URLs

## Env vars
- `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`
- `SHOPIFY_SCOPES` (must include `write_webhooks` and `write_price_rules`/`write_discounts` for v1 attribution)
- `SHOPIFY_API_VERSION` (default `2025-01`)
- `SHOPIFY_APP_URL` (must be a public HTTPS URL for Shopify)
- `TOKEN_ENCRYPTION_KEY` (used to encrypt the Shopify access token at rest)

## Webhooks (minimum)
- `orders/create` (for attribution)
- `fulfillments/create` (for shipment tracking + due dates)
- `app/uninstalled` (to stop automation for uninstalled stores)

Implemented endpoints:
- `POST /api/webhooks/shopify/orders-create`
- `POST /api/webhooks/shopify/fulfillments-create`
- `POST /api/webhooks/shopify/app-uninstalled`

## Attribution (implemented, v1)
- We attribute purchases to a match when the Shopify order uses a discount code equal to the match campaign code.
- Webhook endpoint: `POST /api/webhooks/shopify/orders-create` (verify via `X-Shopify-Hmac-Sha256`).

## Data hygiene
- Tag orders as “FRILPP_SEEDING” and attach match ID + campaign code as order note/attributes
- Handle out-of-stock and partial fulfillments

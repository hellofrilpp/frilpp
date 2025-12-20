# Shopify production checklist

## App settings
- App URL: `https://<your-domain>`
- Allowed redirection URL(s):
  - `https://<your-domain>/api/shopify/callback`
- Scopes include:
  - `read_products`, `write_orders`, `read_fulfillments`, `write_webhooks`
  - If using discount attribution: `write_price_rules`, `write_discounts`

## Webhooks (required)
Register via `POST /api/shopify/webhooks/register` (brand must be logged in + connected):
- `orders/create` → `POST /api/webhooks/shopify/orders-create`
- `fulfillments/create` → `POST /api/webhooks/shopify/fulfillments-create`
- `app/uninstalled` → `POST /api/webhooks/shopify/app-uninstalled`

## Operational checks
- Confirm webhook HMAC verification succeeds in production.
- Confirm `app/uninstalled` marks the store as uninstalled (automation should stop).
- Confirm attribution is deduped by `(shop_domain, shopify_order_id)` uniqueness.


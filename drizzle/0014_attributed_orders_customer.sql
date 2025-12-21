ALTER TABLE attributed_orders
ADD COLUMN IF NOT EXISTS shopify_customer_id text;

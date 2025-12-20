import { shopifyRest } from "@/lib/shopify";

type PriceRuleCreateRequest = {
  price_rule: {
    title: string;
    target_type: "line_item";
    target_selection: "entitled";
    allocation_method: "across";
    value_type: "percentage";
    value: string; // negative percent as string, e.g. "-10.0"
    customer_selection: "all";
    entitled_product_ids: number[];
    once_per_customer: boolean;
    usage_limit: number | null;
    starts_at: string;
    ends_at: string | null;
  };
};

type PriceRuleCreateResponse = { price_rule: { id: number } };

type DiscountCodeCreateRequest = { discount_code: { code: string } };
type DiscountCodeCreateResponse = { discount_code: { id: number; code: string } };

export async function createDiscountForMatch(params: {
  shopDomain: string;
  accessToken: string;
  code: string;
  entitledProductIds: string[];
  percentOff: number;
  daysValid: number;
}) {
  const entitledProductIds = params.entitledProductIds
    .map((id) => Number(id))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (!entitledProductIds.length) {
    throw new Error("No entitled products for discount");
  }

  const percent = Math.max(0, Math.min(100, params.percentOff));
  if (percent <= 0) {
    throw new Error("Discount percent must be > 0");
  }

  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + params.daysValid * 24 * 60 * 60 * 1000);

  const priceRuleRequest: PriceRuleCreateRequest = {
    price_rule: {
      title: `Frilpp ${params.code}`,
      target_type: "line_item",
      target_selection: "entitled",
      allocation_method: "across",
      value_type: "percentage",
      value: `-${percent.toFixed(1)}`,
      customer_selection: "all",
      entitled_product_ids: entitledProductIds,
      once_per_customer: false,
      usage_limit: null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
    },
  };

  const priceRuleJson = await shopifyRest<PriceRuleCreateResponse>(
    params.shopDomain,
    params.accessToken,
    "/price_rules.json",
    { method: "POST", body: JSON.stringify(priceRuleRequest) },
  );

  const priceRuleId = priceRuleJson.price_rule.id;

  const codeJson = await shopifyRest<DiscountCodeCreateResponse>(
    params.shopDomain,
    params.accessToken,
    `/price_rules/${priceRuleId}/discount_codes.json`,
    {
      method: "POST",
      body: JSON.stringify({ discount_code: { code: params.code } } satisfies DiscountCodeCreateRequest),
    },
  );

  return {
    shopifyPriceRuleId: String(priceRuleId),
    shopifyDiscountCodeId: String(codeJson.discount_code.id),
    code: codeJson.discount_code.code,
  };
}

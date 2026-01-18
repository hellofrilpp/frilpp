export type BillingProvider = "STRIPE" | "RAZORPAY";
export type BillingMarket = "US" | "IN";
export type BillingProviderMode = "AUTO" | "STRIPE" | "RAZORPAY";

export function enabledBillingProviders(
  market: BillingMarket,
  mode: BillingProviderMode,
): BillingProvider[] {
  if (mode === "STRIPE") return ["STRIPE"];
  if (mode === "RAZORPAY") return ["RAZORPAY"];
  return [market === "IN" ? "RAZORPAY" : "STRIPE"];
}

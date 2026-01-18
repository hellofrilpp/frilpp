export type BillingProvider = "STRIPE" | "RAZORPAY";
export type BillingMarket = "US" | "IN";
export type BillingProviderMode = "AUTO" | "STRIPE" | "RAZORPAY" | "BOTH";

const rawMode = (import.meta as ImportMeta & { env?: Record<string, string> }).env
  ?.VITE_BILLING_PROVIDER_MODE;

export function billingProviderMode(): BillingProviderMode {
  const normalized = (rawMode ?? "").trim().toUpperCase();
  if (normalized === "STRIPE") return "STRIPE";
  if (normalized === "RAZORPAY") return "RAZORPAY";
  if (normalized === "BOTH") return "BOTH";
  return "AUTO";
}

export function enabledBillingProviders(market: BillingMarket): BillingProvider[] {
  const mode = billingProviderMode();
  if (mode === "STRIPE") return ["STRIPE"];
  if (mode === "RAZORPAY") return ["RAZORPAY"];
  if (mode === "BOTH") return ["STRIPE", "RAZORPAY"];
  return [market === "IN" ? "RAZORPAY" : "STRIPE"];
}


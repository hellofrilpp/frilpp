import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandLayout from "@/components/brand/BrandLayout";
import { ApiError, apiUrl, getBillingStatus, startBillingCheckout, type BillingProvider } from "@/lib/api";
import { enabledBillingProviders, type BillingMarket } from "@/lib/billing";
import { useQuery } from "@tanstack/react-query";

type GeoResponse = { market?: unknown } | null;

const BrandBilling = () => {
  const [message, setMessage] = useState<string | null>(null);
  const [checkoutProvider, setCheckoutProvider] = useState<BillingProvider | null>(null);

  const { data: billingStatus } = useQuery({
    queryKey: ["billing-status"],
    queryFn: getBillingStatus,
  });

  const { data: market } = useQuery({
    queryKey: ["geo-market"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/geo"), { credentials: "include" }).catch(() => null);
      if (!res || !res.ok) return "US" as const;
      const json = (await res.json().catch(() => null)) as GeoResponse;
      return json?.market === "IN" ? ("IN" as const) : ("US" as const);
    },
    staleTime: 1000 * 60 * 60,
    retry: false,
  });

  const subscribed = billingStatus?.brand?.subscribed ?? false;
  const resolvedMarket: BillingMarket = market === "IN" ? "IN" : "US";
  const enabledProviders = useMemo(
    () => enabledBillingProviders(resolvedMarket),
    [resolvedMarket],
  );

  const priceLabel = resolvedMarket === "IN" ? "₹299/mo" : "$29/mo";

  async function subscribeWith(provider: BillingProvider) {
    if (checkoutProvider) return;
    setCheckoutProvider(provider);
    setMessage(null);
    try {
      const res = await startBillingCheckout({ lane: "brand", provider });
      if (!res.ok || !res.checkoutUrl) {
        throw new Error("Failed to start checkout");
      }
      window.location.href = res.checkoutUrl;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Checkout failed";
      setMessage(message);
      setCheckoutProvider(null);
    }
  }

  return (
    <BrandLayout>
      <div className="p-6 md:p-10 max-w-4xl">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-5 h-5 text-neon-yellow" />
              <span className="text-xs font-pixel text-neon-yellow">[BILLING]</span>
            </div>
            <h1 className="text-xl md:text-2xl font-pixel text-foreground">SUBSCRIBE</h1>
            <p className="font-mono text-sm text-muted-foreground mt-1">
              &gt; Unlock publishing + creator details. Cancel anytime.
            </p>
          </div>
          <Button variant="outline" size="sm" className="border-2 border-border font-mono text-xs" asChild>
            <Link to="/brand/dashboard">BACK_TO_DASHBOARD</Link>
          </Button>
        </div>

        {message ? (
          <div className="mb-6 border-2 border-destructive bg-destructive/10 p-4 text-xs font-mono text-destructive">
            {message}
          </div>
        ) : null}

        <div className="border-4 border-border bg-card">
          <div className="p-4 border-b-4 border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 border-2 border-neon-green bg-neon-green/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-neon-green" />
              </div>
              <div>
                <p className="font-pixel text-sm text-neon-green">GROWTH_PLAN</p>
                <p className="text-xs font-mono text-muted-foreground">Monthly subscription · {resolvedMarket}</p>
              </div>
            </div>
            <div className="font-mono text-sm text-neon-yellow">{priceLabel}</div>
          </div>

          <div className="p-6 space-y-4">
            <ul className="list-disc pl-5 text-xs font-mono text-muted-foreground space-y-1">
              <li>Publish campaigns</li>
              <li>Unlock creator usernames</li>
              <li>AI recommendations + nearby preview</li>
              <li>Clicks + redemptions ROI</li>
            </ul>

            {subscribed ? (
              <div className="border-2 border-neon-green bg-neon-green/10 p-4 text-xs font-mono text-neon-green">
                SUBSCRIPTION_ACTIVE
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {enabledProviders.map((provider) => (
                  <Button
                    key={provider}
                    onClick={() => subscribeWith(provider)}
                    disabled={checkoutProvider !== null}
                    className={
                      provider === "STRIPE"
                        ? "bg-neon-purple text-background hover:bg-neon-purple/90 font-pixel text-xs pixel-btn"
                        : "bg-neon-yellow text-background hover:bg-neon-yellow/90 font-pixel text-xs pixel-btn"
                    }
                  >
                    {checkoutProvider === provider
                      ? "REDIRECTING..."
                      : provider === "STRIPE"
                        ? "SUBSCRIBE_WITH_STRIPE"
                        : "SUBSCRIBE_WITH_RAZORPAY"}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </BrandLayout>
  );
};

export default BrandBilling;


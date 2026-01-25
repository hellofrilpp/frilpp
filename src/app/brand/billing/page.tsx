"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type BillingProvider = "STRIPE" | "RAZORPAY";
type BillingMarket = "US" | "IN";
type BillingProviderMode = "AUTO" | "STRIPE" | "RAZORPAY";

type ApiError = Error & { status?: number };

type BillingStatus = {
  ok: boolean;
  brand: { id: string; name: string | null; subscribed: boolean } | null;
  billingEnabled?: boolean;
};

type BillingConfig = { enabled: boolean; mode: BillingProviderMode };

type GeoResponse = { market?: unknown } | null;

const enabledBillingProviders = (
  market: BillingMarket,
  mode: BillingProviderMode,
): BillingProvider[] => {
  if (mode === "STRIPE") return ["STRIPE"];
  if (mode === "RAZORPAY") return ["RAZORPAY"];
  return [market === "IN" ? "RAZORPAY" : "STRIPE"];
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  const data = (await res.json().catch(() => null)) as T & { error?: string };
  if (!res.ok) {
    const err = new Error((data as { error?: string })?.error ?? "Request failed") as ApiError;
    err.status = res.status;
    throw err;
  }
  return data;
}

export default function BrandBillingPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [checkoutProvider, setCheckoutProvider] = useState<BillingProvider | null>(null);
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [market, setMarket] = useState<BillingMarket>("US");
  const [billingConfig, setBillingConfig] = useState<BillingConfig>({ enabled: true, mode: "AUTO" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [statusRes, geoRes, configRes] = await Promise.all([
          fetchJson<BillingStatus>("/api/billing/status"),
          fetch("/api/geo", { credentials: "include" }).catch(() => null),
          fetchJson<{ ok?: boolean; enabled?: unknown; mode?: unknown }>("/api/billing/config").catch(
            () => ({ enabled: true, mode: "AUTO" }),
          ),
        ]);

        if (cancelled) return;

        setBillingStatus(statusRes);

        if (geoRes && geoRes.ok) {
          const geoJson = (await geoRes.json().catch(() => null)) as GeoResponse;
          setMarket(geoJson?.market === "IN" ? "IN" : "US");
        } else {
          setMarket("US");
        }

        const enabled = Boolean(configRes.enabled ?? true);
        const mode =
          configRes.mode === "STRIPE" || configRes.mode === "RAZORPAY" ? configRes.mode : "AUTO";
        setBillingConfig({ enabled, mode });
      } catch (err) {
        const status = err instanceof Error && "status" in err ? (err as ApiError).status : undefined;
        if (status === 401) {
          window.location.href = "/brand/auth";
          return;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const subscribed = billingStatus?.brand?.subscribed ?? false;
  const billingEnabled = billingConfig.enabled ?? true;
  const enabledProviders = useMemo(
    () => enabledBillingProviders(market, billingConfig.mode),
    [market, billingConfig.mode],
  );
  const priceLabel = market === "IN" ? "₹299/mo" : "$29/mo";

  async function subscribeWith(provider: BillingProvider) {
    if (checkoutProvider) return;
    setCheckoutProvider(provider);
    setMessage(null);
    try {
      const res = await fetchJson<{ ok: boolean; checkoutUrl?: string }>(
        "/api/billing/checkout",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ lane: "brand", provider }),
        },
      );
      if (!res.ok || !res.checkoutUrl) {
        throw new Error("Failed to start checkout");
      }
      window.location.href = res.checkoutUrl;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Checkout failed";
      setMessage(message);
      setCheckoutProvider(null);
    }
  }

  return (
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
        <Button
          variant="outline"
          size="sm"
          className="border-2 border-border font-mono text-xs"
          onClick={() => {
            window.location.href = "/brand/dashboard";
          }}
        >
          BACK_TO_DASHBOARD
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
              <p className="text-xs font-mono text-muted-foreground">Monthly subscription · Global</p>
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
          ) : !billingEnabled ? (
            <div className="border-2 border-border bg-muted p-4 text-xs font-mono text-muted-foreground">
              BILLING_DISABLED (beta)
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
  );
}

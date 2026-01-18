"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Market = "US" | "IN";
type BillingProvider = "STRIPE" | "RAZORPAY";
type BillingProviderMode = "AUTO" | "STRIPE" | "RAZORPAY";

function enabledProviders(market: Market, mode: BillingProviderMode): BillingProvider[] {
  if (mode === "STRIPE") return ["STRIPE"];
  if (mode === "RAZORPAY") return ["RAZORPAY"];
  return [market === "IN" ? "RAZORPAY" : "STRIPE"];
}

export default function BrandBillingPage() {
  const [market, setMarket] = useState<Market>("US");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");
  const [checkoutStatus, setCheckoutStatus] = useState<"idle" | "loading" | "error">("idle");
  const [checkoutProvider, setCheckoutProvider] = useState<BillingProvider | null>(null);
  const [providerMode, setProviderMode] = useState<BillingProviderMode>("AUTO");
  const [billingEnabled, setBillingEnabled] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setStatus("loading");
      try {
        const res = await fetch("/api/geo");
        const data = (await res.json().catch(() => null)) as { market?: unknown } | null;
        if (data?.market === "IN" || data?.market === "US") {
          setMarket(data.market);
        }
        setStatus("idle");
      } catch {
        setStatus("error");
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/billing/config", { method: "GET" }).catch(() => null);
      const json = (await res?.json().catch(() => null)) as { mode?: unknown; enabled?: unknown } | null;
      setBillingEnabled(Boolean(json?.enabled));
      if (json?.mode === "STRIPE" || json?.mode === "RAZORPAY") {
        setProviderMode(json.mode);
        return;
      }
      setProviderMode("AUTO");
    })();
  }, []);

  const priceLabel = useMemo(() => {
    return market === "IN" ? "₹299/mo" : "$29/mo";
  }, [market]);

  async function subscribe(provider: BillingProvider) {
    setCheckoutStatus("loading");
    setCheckoutProvider(provider);
    setMessage(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lane: "brand", provider }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; checkoutUrl: string }
        | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(
          data && "error" in data && typeof data.error === "string"
            ? data.error
            : "Failed to start checkout",
        );
      }
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setCheckoutStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to start checkout");
      setCheckoutProvider(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl px-4 py-10 md:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Brand</Badge>
              <Badge variant="secondary">Billing</Badge>
              <Badge variant="secondary">{market === "IN" ? "India" : "US"}</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Subscribe</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Publish offers and unlock full creator details. Cancel anytime.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/brand/offers">
              <Button variant="outline">Offers</Button>
            </Link>
            <Link href="/">
              <Button variant="outline">Home</Button>
            </Link>
          </div>
        </div>

        {message ? (
          <div className="mt-6 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
            {message}
          </div>
        ) : null}

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Brand plan</CardTitle>
            <CardDescription>{status === "loading" ? "Detecting market…" : "Monthly subscription"}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-baseline justify-between">
              <div className="text-sm text-muted-foreground">Price</div>
              <div className="font-mono text-lg">{priceLabel}</div>
            </div>
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              <li>Publish offers</li>
              <li>Unlock creator usernames</li>
              <li>AI recommendations + nearby preview</li>
              <li>Clicks + redemptions ROI</li>
            </ul>
            {billingEnabled ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {enabledProviders(market, providerMode).map((provider) => (
                  <Button
                    key={provider}
                    onClick={() => subscribe(provider)}
                    disabled={checkoutStatus === "loading" || status === "loading"}
                  >
                    {checkoutStatus === "loading" && checkoutProvider === provider
                      ? "Redirecting…"
                      : provider === "STRIPE"
                        ? "Subscribe with Stripe"
                        : "Subscribe with Razorpay"}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
                Billing is disabled (beta).
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

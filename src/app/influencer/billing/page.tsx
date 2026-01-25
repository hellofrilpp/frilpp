"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Market = "US" | "IN";

export default function CreatorBillingPage() {
  const [market, setMarket] = useState<Market>("US");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");
  const [checkoutStatus, setCheckoutStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [emailRequired, setEmailRequired] = useState(false);

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

  const priceLabel = useMemo(() => {
    return market === "IN" ? "₹100/mo" : "$10/mo";
  }, [market]);

  async function subscribe() {
    setCheckoutStatus("loading");
    setMessage(null);
    setEmailRequired(false);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lane: "creator" }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; checkoutUrl: string }
        | { ok: false; error?: string; code?: string };
      if (res.status === 409 && data && "ok" in data && data.ok === false && data.code === "EMAIL_REQUIRED") {
        setCheckoutStatus("idle");
        setEmailRequired(true);
        setMessage("Add your email in settings to start billing.");
        return;
      }
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
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl px-4 py-10 md:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Creator</Badge>
              <Badge variant="secondary">Billing</Badge>
              <Badge variant="secondary">Global</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Subscribe</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Claim offers and unlock the full experience. Cancel anytime.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/influencer/discover">
              <Button variant="outline">Feed</Button>
            </Link>
            <Link href="/">
              <Button variant="outline">Home</Button>
            </Link>
          </div>
        </div>

        {message ? (
          <div className="mt-6 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
            {emailRequired ? (
              <span>
                {message}{" "}
                <Link className="underline" href="/influencer/profile">
                  Update email
                </Link>
                .
              </span>
            ) : (
              message
            )}
          </div>
        ) : null}

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Creator plan</CardTitle>
            <CardDescription>{status === "loading" ? "Checking billing details…" : "Monthly subscription"}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-baseline justify-between">
              <div className="text-sm text-muted-foreground">Price</div>
              <div className="font-mono text-lg">{priceLabel}</div>
            </div>
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              <li>Claim offers</li>
              <li>Share-kit + verified posting</li>
              <li>Achievements + streaks</li>
              <li>Performance stats</li>
            </ul>
            <Button onClick={subscribe} disabled={checkoutStatus === "loading" || status === "loading"}>
              {checkoutStatus === "loading" ? "Redirecting…" : "Subscribe"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

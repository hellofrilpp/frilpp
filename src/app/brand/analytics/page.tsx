"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AnalyticsOfferRow = {
  offerId: string;
  title: string;
  publishedAt: string | null;
  matchCount: number;
  clickCount: number;
  orderCount: number;
  redemptionCount: number;
  revenueCents: number;
  refundCents?: number;
  redemptionRevenueCents: number;
  totalRevenueCents: number;
};

export default function BrandAnalyticsPage() {
  const [rows, setRows] = useState<AnalyticsOfferRow[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus("loading");
      try {
        const res = await fetch("/api/brand/analytics");
        const data = (await res.json().catch(() => null)) as
          | { ok: true; offers: AnalyticsOfferRow[] }
          | { ok: false; error?: string };
        if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
          throw new Error(
            data && "error" in data && typeof data.error === "string"
              ? data.error
              : "Failed to load analytics",
          );
        }
        if (cancelled) return;
        setRows(data.offers);
        setStatus("idle");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 md:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Brand</Badge>
              <Badge variant="secondary">Analytics</Badge>
              <Badge variant="secondary">Attribution</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
              Offer performance
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Tracks clicks via `r/FRILP-XXXXXX`, attributed purchases via discount codes matching
              the code, plus manual redemptions recorded by your team.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/brand/offers">
              <Button variant="outline">Offers</Button>
            </Link>
            <Link href="/brand/analytics/creators">
              <Button variant="outline">Creators</Button>
            </Link>
            <Link href="/brand/shipments">
              <Button variant="outline">Shipments</Button>
            </Link>
            <Link href="/brand/redemptions">
              <Button variant="outline">Redemptions</Button>
            </Link>
            <Link href="/brand/offers/new">
              <Button variant="secondary">New offer</Button>
            </Link>
            <Link href="/">
              <Button variant="outline">Home</Button>
            </Link>
          </div>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>
              {status === "loading"
                ? "Loading…"
                : status === "error"
                  ? "Failed to load (check DATABASE_URL + migrations)."
                  : "Last 50 published offers."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!rows.length ? (
              <div className="text-sm text-muted-foreground">
                No published offers yet (or no DB configured).
              </div>
            ) : (
              <div className="grid gap-3">
                {rows.map((r) => (
                  <div key={r.offerId} className="rounded-lg border bg-card p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold">{r.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Offer: <span className="font-mono">{r.offerId}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge>Accepted: {r.matchCount}</Badge>
                        <Badge>Clicks: {r.clickCount}</Badge>
                        <Badge>Orders: {r.orderCount}</Badge>
                        <Badge>Redemptions: {r.redemptionCount}</Badge>
                        <Badge variant={r.clickCount > 0 ? "secondary" : "outline"}>
                          CVR:{" "}
                          {r.clickCount > 0
                            ? `${Math.round((r.orderCount / r.clickCount) * 10_000) / 100}%`
                            : "—"}
                        </Badge>
                        <Badge variant={r.totalRevenueCents > 0 ? "success" : "outline"}>
                          Revenue: ${(r.totalRevenueCents / 100).toFixed(2)}
                        </Badge>
                        <Badge variant={r.clickCount > 0 ? "secondary" : "outline"}>
                          EPC:{" "}
                          {r.clickCount > 0
                            ? `$${((r.totalRevenueCents / 100) / r.clickCount).toFixed(2)}`
                            : "—"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

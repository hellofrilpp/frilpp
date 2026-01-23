"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type CreatorRow = {
  creatorId: string;
  username: string | null;
  followersCount: number | null;
  categories: string[] | null;
  matchCount: number;
  verifiedCount: number;
  clickCount: number;
  orderCount: number;
  redemptionCount: number;
  revenueCents: number;
  refundCents: number;
  redemptionRevenueCents: number;
  netRevenueCents: number;
  seedCostCents: number;
  repeatBuyerCount: number;
  roiPercent: number | null;
};

function usd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function BrandCreatorAnalyticsPage() {
  const [rows, setRows] = useState<CreatorRow[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus("loading");
      try {
        const res = await fetch("/api/brand/analytics/creators");
        const data = (await res.json().catch(() => null)) as
          | { ok: true; creators: CreatorRow[] }
          | { ok: false; error?: string };
        if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
          throw new Error(
            data && "error" in data && typeof data.error === "string"
              ? data.error
              : "Failed to load creator analytics",
          );
        }
        if (cancelled) return;
        setRows(data.creators);
        setStatus("idle");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const username = (row.username ?? "").toLowerCase();
      return username.includes(q);
    });
  }, [query, rows]);

  const summary = useMemo(() => {
    return visible.reduce(
      (acc, row) => {
        acc.creators += 1;
        acc.matches += row.matchCount;
        acc.clicks += row.clickCount;
        acc.redemptions += row.redemptionCount;
        acc.seedCostCents += row.seedCostCents;
        acc.netRevenueCents += row.netRevenueCents;
        return acc;
      },
      { creators: 0, matches: 0, clicks: 0, redemptions: 0, seedCostCents: 0, netRevenueCents: 0 },
    );
  }, [visible]);

  const overallRoi =
    summary.seedCostCents > 0
      ? Math.round(((summary.netRevenueCents - summary.seedCostCents) / summary.seedCostCents) * 1000) / 10
      : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 md:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Brand</Badge>
              <Badge variant="secondary">Analytics</Badge>
              <Badge variant="secondary">Creators</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Creator ROI</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Aggregates clicks and redemptions per creator across accepted matches.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/brand/analytics">
              <Button variant="outline">Offers</Button>
            </Link>
            <Link href="/brand/redemptions">
              <Button variant="outline">Redemptions</Button>
            </Link>
            <Link href="/brand/shipments">
              <Button variant="outline">Shipments</Button>
            </Link>
            <Link href="/brand/offers/new">
              <Button variant="secondary">New offer</Button>
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Creators</CardTitle>
              <CardDescription>Visible</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{summary.creators}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Clicks</CardTitle>
              <CardDescription>Total</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{summary.clicks}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Revenue</CardTitle>
              <CardDescription>Net + redemptions</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{usd(summary.netRevenueCents)}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>ROI</CardTitle>
              <CardDescription>Approx.</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{overallRoi === null ? "—" : `${overallRoi}%`}</CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Top creators</CardTitle>
            <CardDescription>
              {status === "loading"
                ? "Loading…"
                : status === "error"
                  ? "Failed to load (check DATABASE_URL + migrations)."
                  : `${visible.length} creators.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <Input
                placeholder="Search username…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {!visible.length ? (
              <div className="text-sm text-muted-foreground">No creators yet.</div>
            ) : (
              <div className="grid gap-3">
                {visible.map((row) => {
                  const cvr = row.clickCount > 0 ? Math.round((row.orderCount / row.clickCount) * 10_000) / 100 : null;
                  const epc = row.clickCount > 0 ? (row.netRevenueCents / 100) / row.clickCount : null;
                  return (
                    <div key={row.creatorId} className="rounded-lg border bg-card p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold">
                            {row.username ? `@${row.username}` : "Creator"}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {row.followersCount ? `${row.followersCount.toLocaleString()} followers` : "followers n/a"}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge>Matches: {row.matchCount}</Badge>
                          <Badge>Verified: {row.verifiedCount}</Badge>
                          <Badge>Clicks: {row.clickCount}</Badge>
                          <Badge>Orders: {row.orderCount}</Badge>
                          <Badge>Redemptions: {row.redemptionCount}</Badge>
                          <Badge variant={row.netRevenueCents > 0 ? "success" : "outline"}>
                            Revenue: {usd(row.netRevenueCents)}
                          </Badge>
                          <Badge variant={row.seedCostCents > 0 ? "secondary" : "outline"}>
                            Seed cost: {usd(row.seedCostCents)}
                          </Badge>
                          <Badge variant={row.roiPercent !== null ? (row.roiPercent >= 0 ? "success" : "warning") : "outline"}>
                            ROI: {row.roiPercent === null ? "—" : `${row.roiPercent}%`}
                          </Badge>
                          <Badge variant={cvr !== null ? "secondary" : "outline"}>
                            CVR: {cvr === null ? "—" : `${cvr}%`}
                          </Badge>
                          <Badge variant={epc !== null ? "secondary" : "outline"}>
                            EPC: {epc === null ? "—" : `$${epc.toFixed(2)}`}
                          </Badge>
                          <Badge variant={row.repeatBuyerCount > 0 ? "secondary" : "outline"}>
                            Repeat buyers: {row.repeatBuyerCount}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

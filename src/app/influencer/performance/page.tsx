"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Performance = {
  summary: {
    totalClicks: number;
    totalRedemptions: number;
    totalRedemptionRevenueCents: number;
    totalNetOrderRevenueCents: number;
  };
  matches: Array<{
    id: string;
    brandName: string;
    offerTitle: string;
    campaignCode: string;
    shareUrl: string;
    createdAt: string;
    deliverable: { status: string | null; dueAt: string; verifiedPermalink: string | null } | null;
    metrics: {
      clicks: number;
      redemptionCount: number;
      redemptionRevenueCents: number;
      netOrderRevenueCents: number;
    };
  }>;
};

function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CreatorPerformancePage() {
  const [data, setData] = useState<Performance | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus("loading");
      setMessage(null);
      try {
        const res = await fetch("/api/creator/performance", { method: "GET" });
        const json = (await res.json().catch(() => null)) as
          | ({ ok: true } & Performance)
          | { ok: false; error?: string };
        if (!res.ok || !json || !("ok" in json) || json.ok !== true) {
          throw new Error(
            json && "error" in json && typeof json.error === "string" ? json.error : "Failed",
          );
        }
        if (cancelled) return;
        setData({ summary: json.summary, matches: json.matches });
        setStatus("idle");
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Failed to load performance");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => {
    return (
      data?.summary ?? {
        totalClicks: 0,
        totalRedemptions: 0,
        totalRedemptionRevenueCents: 0,
        totalNetOrderRevenueCents: 0,
      }
    );
  }, [data?.summary]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-10 md:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Creator</Badge>
              <Badge variant="secondary">Performance</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Your performance</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Tracks clicks from your Frilpp link and redemptions logged by the brand.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/influencer/discover">
              <Button variant="secondary">Feed</Button>
            </Link>
            <Link href="/influencer/deals">
              <Button variant="outline">Deals</Button>
            </Link>
            <Link href="/influencer/deliverables">
              <Button variant="outline">Deliverables</Button>
            </Link>
            <Link href="/influencer/achievements">
              <Button variant="outline">Achievements</Button>
            </Link>
            <Link href="/influencer/profile">
              <Button variant="outline">Profile</Button>
            </Link>
          </div>
        </div>

        {message ? (
          <div className="mt-6 rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
            {message}
          </div>
        ) : null}

        <div className="mt-8 grid gap-3 sm:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Clicks</CardTitle>
              <CardDescription>Total</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{summary.totalClicks}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Redemptions</CardTitle>
              <CardDescription>Total</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{summary.totalRedemptions}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Logged revenue</CardTitle>
              <CardDescription>Redemptions</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {formatUsd(summary.totalRedemptionRevenueCents)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Online revenue</CardTitle>
              <CardDescription>Orders (net)</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {formatUsd(summary.totalNetOrderRevenueCents)}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Matches</CardTitle>
            <CardDescription>
              {status === "loading"
                ? "Loading…"
                : status === "error"
                  ? "Error (check login + creator profile)."
                  : `${data?.matches.length ?? 0} active matches.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!data?.matches.length ? (
              <div className="text-sm text-muted-foreground">No accepted matches yet.</div>
            ) : (
              <div className="grid gap-3">
                {data.matches.map((match) => (
                  <div key={match.id} className="rounded-lg border bg-card p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-balance">{match.offerTitle}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{match.brandName}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="secondary">Code: {match.campaignCode}</Badge>
                          <Badge variant="secondary">Clicks: {match.metrics.clicks}</Badge>
                          <Badge variant="secondary">Redemptions: {match.metrics.redemptionCount}</Badge>
                          <Badge variant="secondary">
                            Revenue: {formatUsd(match.metrics.redemptionRevenueCents)}
                          </Badge>
                          {match.deliverable?.status ? (
                            <Badge
                              variant={
                                match.deliverable.status === "VERIFIED"
                                  ? "success"
                                  : match.deliverable.status === "FAILED"
                                    ? "danger"
                                    : "outline"
                              }
                            >
                              {match.deliverable.status}
                            </Badge>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link href={`/influencer/matches/${encodeURIComponent(match.id)}/share`}>
                          <Button size="sm" variant="secondary" type="button">
                            Share kit
                          </Button>
                        </Link>
                        <a href={match.shareUrl} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline" type="button">
                            Open link
                          </Button>
                        </a>
                        {match.deliverable?.verifiedPermalink ? (
                          <a href={match.deliverable.verifiedPermalink} target="_blank" rel="noreferrer">
                            <Button size="sm" variant="outline" type="button">
                              Verified post
                            </Button>
                          </a>
                        ) : null}
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

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type BrandOffer = {
  id: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

type BrandMatch = {
  matchId: string;
  status: "PENDING_APPROVAL" | "ACCEPTED" | "REVOKED" | "CANCELED" | "CLAIMED";
  createdAt: string;
  offer: { id: string; title: string };
  creator: { username: string | null; followersCount: number | null };
};

type BrandDeliverable = {
  deliverableId: string;
  verifiedAt: string | null;
  dueAt: string;
  offer: { title: string };
};

type BillingStatus = {
  ok: boolean;
  billingEnabled?: boolean;
  brand?: { subscribed?: boolean } | null;
};

type CreatorRecommendation = {
  creatorId: string;
  username: string;
  score: number;
  reason: string;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  const data = (await res.json().catch(() => null)) as T;
  if (!res.ok) {
    const err = new Error("Request failed");
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return data;
}

export default function BrandDashboardPage() {
  const [offers, setOffers] = useState<BrandOffer[]>([]);
  const [pendingMatches, setPendingMatches] = useState<BrandMatch[]>([]);
  const [acceptedMatches, setAcceptedMatches] = useState<BrandMatch[]>([]);
  const [verifiedDeliverables, setVerifiedDeliverables] = useState<BrandDeliverable[]>([]);
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  const [recommendations, setRecommendations] = useState<CreatorRecommendation[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus("loading");
      setMessage(null);
      try {
        const [
          offersRes,
          pendingRes,
          acceptedRes,
          deliverablesRes,
          billingRes,
        ] = await Promise.all([
          fetchJson<{ ok: boolean; offers: BrandOffer[] }>("/api/brand/offers"),
          fetchJson<{ ok: boolean; matches: BrandMatch[] }>(
            "/api/brand/matches?status=PENDING_APPROVAL",
          ),
          fetchJson<{ ok: boolean; matches: BrandMatch[] }>(
            "/api/brand/matches?status=ACCEPTED",
          ),
          fetchJson<{ ok: boolean; deliverables: BrandDeliverable[] }>(
            "/api/brand/deliverables?status=VERIFIED",
          ),
          fetchJson<BillingStatus>("/api/billing/status"),
        ]);

        if (cancelled) return;
        setOffers(offersRes.offers ?? []);
        setPendingMatches(pendingRes.matches ?? []);
        setAcceptedMatches(acceptedRes.matches ?? []);
        setVerifiedDeliverables(deliverablesRes.deliverables ?? []);
        setBillingStatus(billingRes ?? null);
        setStatus("idle");
      } catch (err) {
        const statusCode = err && typeof err === "object" && "status" in err ? (err as { status?: number }).status : undefined;
        if (statusCode === 401) {
          window.location.href = "/brand/auth";
          return;
        }
        if (!cancelled) {
          setStatus("error");
          setMessage("Failed to load dashboard data.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const reachEstimate = acceptedMatches.reduce(
    (sum, match) => sum + (match.creator.followersCount ?? 0),
    0,
  );

  const isSubscribed = billingStatus?.brand?.subscribed ?? false;
  const formatReach = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return `${value}`;
  };

  const stats = useMemo(
    () => [
      {
        label: "Active campaigns",
        value: `${offers.filter((offer) => offer.status === "PUBLISHED").length}`,
        change: `${offers.length} total`,
        href: "/brand/campaigns",
      },
      {
        label: "Pending matches",
        value: `${pendingMatches.length}`,
        change: `${pendingMatches.length} awaiting`,
        href: "/brand/pipeline",
      },
      {
        label: "Content received",
        value: `${verifiedDeliverables.length}`,
        change: `${verifiedDeliverables.length} verified`,
        href: "/brand/pipeline",
      },
      {
        label: "Est. reach",
        value: formatReach(reachEstimate),
        change: `${acceptedMatches.length} active`,
        href: "/brand/analytics",
      },
    ],
    [offers, pendingMatches.length, verifiedDeliverables.length, reachEstimate, acceptedMatches.length],
  );

  const recentActivity = useMemo(() => {
    const items = [
      ...pendingMatches.map((match) => ({
        message: `${match.creator.username ?? "Creator"} matched ${match.offer.title}`,
        time: match.createdAt,
        status: "pending" as const,
      })),
      ...verifiedDeliverables.map((deliverable) => ({
        message: `Content verified for ${deliverable.offer.title}`,
        time: deliverable.verifiedAt ?? deliverable.dueAt,
        status: "complete" as const,
      })),
    ];
    return items
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 4)
      .map((item) => ({
        ...item,
        time: new Date(item.time).toLocaleDateString(),
        href: "/brand/pipeline",
      }));
  }, [pendingMatches, verifiedDeliverables]);

  const activeCampaigns = useMemo(() => {
    const acceptedByOffer = acceptedMatches.reduce<Record<string, number>>((acc, match) => {
      acc[match.offer.title] = (acc[match.offer.title] ?? 0) + 1;
      return acc;
    }, {});
    const pendingByOffer = pendingMatches.reduce<Record<string, number>>((acc, match) => {
      acc[match.offer.title] = (acc[match.offer.title] ?? 0) + 1;
      return acc;
    }, {});
    const completeByOffer = verifiedDeliverables.reduce<Record<string, number>>((acc, deliverable) => {
      acc[deliverable.offer.title] = (acc[deliverable.offer.title] ?? 0) + 1;
      return acc;
    }, {});

    return offers.slice(0, 3).map((offer) => ({
      id: offer.id,
      name: offer.title,
      matches: acceptedByOffer[offer.title] ?? 0,
      pending: pendingByOffer[offer.title] ?? 0,
      shipped: 0,
      complete: completeByOffer[offer.title] ?? 0,
    }));
  }, [offers, acceptedMatches, pendingMatches, verifiedDeliverables]);

  async function fetchRecommendations() {
    setRecommendationsLoading(true);
    try {
      const res = await fetchJson<{ ok: boolean; creators: CreatorRecommendation[] }>(
        "/api/ai/creators",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ limit: 5 }),
        },
      );
      setRecommendations(res.creators ?? []);
    } catch {
      setRecommendations([]);
    } finally {
      setRecommendationsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Brand</Badge>
              <Badge variant="secondary">Dashboard</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Campaign status overview and activity.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isSubscribed ? (
              <Link href="/brand/billing">
                <Button variant="secondary">Subscribe</Button>
              </Link>
            ) : null}
            <Link href="/brand/campaigns/new">
              <Button>New campaign</Button>
            </Link>
          </div>
        </div>

        {status === "error" ? (
          <div className="mt-6 rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
            {message ?? "Failed to load dashboard."}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Link key={stat.label} href={stat.href}>
              <Card className="transition hover:shadow-card-hover">
                <CardHeader>
                  <CardDescription>{stat.label}</CardDescription>
                  <CardTitle className="text-2xl">{stat.value}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  {stat.change}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Recent activity</CardTitle>
                <CardDescription>Latest creator activity across offers.</CardDescription>
              </div>
              <Link href="/brand/pipeline">
                <Button variant="outline" size="sm">
                  View pipeline
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="grid gap-4">
              {!recentActivity.length ? (
                <div className="text-sm text-muted-foreground">No recent activity yet.</div>
              ) : (
                recentActivity.map((activity, index) => (
                  <Link key={index} href={activity.href} className="rounded-lg border p-3">
                    <div className="text-sm font-medium">{activity.message}</div>
                    <div className="text-xs text-muted-foreground">{activity.time}</div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active campaigns</CardTitle>
              <CardDescription>Snapshot of your latest offers.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {!activeCampaigns.length ? (
                <div className="text-sm text-muted-foreground">No campaigns yet.</div>
              ) : (
                activeCampaigns.map((campaign) => (
                  <Link key={campaign.id} href={`/brand/campaigns/${campaign.id}`}>
                    <div className="rounded-lg border p-3">
                      <div className="text-sm font-medium">{campaign.name}</div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {campaign.complete} done · {campaign.pending} pending
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded bg-muted">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: campaign.matches
                              ? `${(campaign.complete / campaign.matches) * 100}%`
                              : "0%",
                          }}
                        />
                      </div>
                    </div>
                  </Link>
                ))
              )}
              <Link href="/brand/campaigns">
                <Button variant="ghost" size="sm" className="w-full">
                  View all
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>AI match suggestions</CardTitle>
              <CardDescription>Generate high-potential creator recommendations.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchRecommendations}>
              {recommendationsLoading ? "Thinking..." : "Generate"}
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4">
            {recommendations.length ? (
              recommendations.map((creator) => (
                <div key={creator.creatorId} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="text-sm font-medium">{creator.username}</div>
                    <div className="text-xs text-muted-foreground">{creator.reason}</div>
                  </div>
                  <div className="text-sm font-semibold">{creator.score}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">
                Generate AI matches to see creators.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

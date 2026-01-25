"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Camera,
  CheckCircle,
  Clock,
  Package,
  Plus,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

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

const STAT_STYLES = {
  "neon-green": {
    border: "border-neon-green",
    hover: "hover:border-neon-green",
    text: "text-neon-green",
    bg: "bg-neon-green/10",
  },
  "neon-pink": {
    border: "border-neon-pink",
    hover: "hover:border-neon-pink",
    text: "text-neon-pink",
    bg: "bg-neon-pink/10",
  },
  "neon-purple": {
    border: "border-neon-purple",
    hover: "hover:border-neon-purple",
    text: "text-neon-purple",
    bg: "bg-neon-purple/10",
  },
  "neon-yellow": {
    border: "border-neon-yellow",
    hover: "hover:border-neon-yellow",
    text: "text-neon-yellow",
    bg: "bg-neon-yellow/10",
  },
};

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
        const statusCode =
          err && typeof err === "object" && "status" in err
            ? (err as { status?: number }).status
            : undefined;
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
        label: "ACTIVE CAMPAIGNS",
        value: `${offers.filter((offer) => offer.status === "PUBLISHED").length}`,
        icon: Package,
        change: `${offers.length} total`,
        color: "neon-green" as const,
        href: "/brand/campaigns",
      },
      {
        label: "PENDING MATCHES",
        value: `${pendingMatches.length}`,
        icon: Users,
        change: `${pendingMatches.length} awaiting`,
        color: "neon-pink" as const,
        href: "/brand/pipeline",
      },
      {
        label: "CONTENT RECEIVED",
        value: `${verifiedDeliverables.length}`,
        icon: Camera,
        change: `${verifiedDeliverables.length} verified`,
        color: "neon-purple" as const,
        href: "/brand/pipeline",
      },
      {
        label: "EST. REACH",
        value: formatReach(reachEstimate),
        icon: TrendingUp,
        change: `${acceptedMatches.length} active`,
        color: "neon-yellow" as const,
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
    <div className="p-6 md:p-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-neon-green animate-pulse-neon" />
            <span className="text-xs font-pixel text-neon-green">[DASHBOARD]</span>
          </div>
          <h1 className="text-xl md:text-2xl font-pixel text-foreground">WELCOME BACK</h1>
          <p className="font-mono text-sm text-muted-foreground mt-1">&gt; Campaign status: ACTIVE</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isSubscribed ? (
            <Link
              href="/brand/billing"
              className="inline-flex items-center bg-neon-yellow text-background hover:bg-neon-yellow/90 font-pixel text-xs px-6 py-2 border-2 border-border pixel-btn"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              SUBSCRIBE
            </Link>
          ) : null}
          <Link
            href="/brand/campaigns/new"
            className="inline-flex items-center bg-primary text-primary-foreground hover:bg-primary/90 font-pixel text-xs px-6 py-2 border-2 border-border pixel-btn glow-green"
          >
            <Plus className="w-4 h-4 mr-2" />
            NEW CAMPAIGN
          </Link>
        </div>
      </div>

      {status === "error" ? (
        <div className="mb-6 border-4 border-border bg-card p-4 text-xs font-mono text-muted-foreground">
          {message ?? "Failed to load dashboard."}
        </div>
      ) : null}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map((stat, index) => {
          const style = STAT_STYLES[stat.color];
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className={cn(
                "p-5 border-4 border-border bg-card transition-all group block",
                style.hover,
              )}
              aria-label={stat.label}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className={cn(
                    "w-10 h-10 border-2 flex items-center justify-center",
                    style.border,
                    style.bg,
                  )}
                >
                  <stat.icon className={cn("w-5 h-5", style.text)} />
                </div>
                <span className="text-xs font-pixel text-muted-foreground">
                  [{String(index + 1).padStart(2, "0")}]
                </span>
              </div>
              <p className={cn("text-2xl font-pixel mb-1", style.text)}>{stat.value}</p>
              <p className="text-xs font-mono text-muted-foreground mb-2">{stat.label}</p>
              <p className="text-xs font-mono text-neon-green">{stat.change}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border-4 border-border bg-card">
          <div className="p-4 border-b-4 border-border flex items-center justify-between">
            <h2 className="font-pixel text-sm text-neon-purple">[ACTIVITY_LOG]</h2>
            <Link
              href="/brand/pipeline"
              className="text-xs font-mono hover:text-neon-green"
            >
              VIEW_ALL →
            </Link>
          </div>
          <div className="divide-y-2 divide-border">
            {!recentActivity.length ? (
              <div className="p-4 text-xs font-mono text-muted-foreground">
                No recent activity yet.
              </div>
            ) : (
              recentActivity.map((activity, index) => (
                <Link
                  key={index}
                  href={activity.href}
                  className="p-4 flex items-start gap-4 hover:bg-muted/50 transition-colors"
                >
                  <div
                    className={cn(
                      "w-8 h-8 flex items-center justify-center flex-shrink-0 border-2",
                      activity.status === "complete"
                        ? "bg-neon-green border-neon-green text-background"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {activity.status === "complete" ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono">{activity.message}</p>
                    <p className="text-xs font-mono text-muted-foreground mt-1">
                      {activity.time}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="border-4 border-border bg-card">
          <div className="p-4 border-b-4 border-border">
            <h2 className="font-pixel text-sm text-neon-pink">[CAMPAIGNS]</h2>
          </div>
          <div className="divide-y-2 divide-border">
            {!activeCampaigns.length ? (
              <div className="p-4 text-xs font-mono text-muted-foreground">No campaigns yet.</div>
            ) : (
              activeCampaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`/brand/campaigns/${campaign.id}`}
                  className="p-4 block hover:bg-muted/50 transition-colors"
                >
                  <p className="text-sm font-mono mb-3">{campaign.name}</p>
                  <div className="flex gap-3 text-xs font-mono text-muted-foreground mb-3">
                    <span className="text-neon-green">{campaign.complete} done</span>
                    <span>{campaign.pending} pending</span>
                  </div>
                  <div className="h-2 bg-muted flex overflow-hidden">
                    <div
                      className="h-full bg-neon-green"
                      style={{
                        width: `${
                          campaign.matches ? (campaign.complete / campaign.matches) * 100 : 0
                        }%`,
                      }}
                    />
                    <div
                      className="h-full bg-neon-yellow"
                      style={{
                        width: `${
                          campaign.matches ? (campaign.shipped / campaign.matches) * 100 : 0
                        }%`,
                      }}
                    />
                  </div>
                </Link>
              ))
            )}
          </div>
          <div className="p-4 border-t-4 border-border">
            <Link
              href="/brand/campaigns"
              className="w-full inline-flex justify-center text-xs font-mono hover:text-neon-pink"
            >
              VIEW_ALL →
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-6 border-4 border-border bg-card">
        <div className="p-4 border-b-4 border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-neon-yellow" />
            <h2 className="font-pixel text-sm text-neon-yellow">[AI_MATCHES]</h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-2 border-border font-mono text-xs"
            onClick={fetchRecommendations}
          >
            {recommendationsLoading ? "THINKING..." : "GENERATE"}
          </Button>
        </div>
        <div className="divide-y-2 divide-border">
          {recommendations.length ? (
            recommendations.map((creator) => (
              <div key={creator.creatorId} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm">{creator.username}</p>
                  <p className="text-xs font-mono text-muted-foreground">{creator.reason}</p>
                </div>
                <div className="text-right">
                  <p className="font-pixel text-sm text-neon-green">{creator.score}</p>
                  <p className="text-xs font-mono text-muted-foreground">AI score</p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-xs font-mono text-muted-foreground">
              Generate AI matches to see high-potential creators.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

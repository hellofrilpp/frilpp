"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { Eye, ShoppingCart, BadgeDollarSign, Receipt, BarChart3 } from "lucide-react";

type AnalyticsOfferRow = {
  offerId: string;
  title: string;
  clickCount: number;
  orderCount: number;
  redemptionCount: number;
  revenueCents: number;
  redemptionRevenueCents: number;
  refundCents: number;
};

type CreatorAnalyticsRow = {
  creatorId: string;
  username: string | null;
  matchCount: number;
  verifiedCount: number;
  clickCount: number;
  orderCount: number;
  redemptionCount: number;
  revenueCents: number;
  redemptionRevenueCents: number;
  refundCents: number;
};

type ApiError = Error & { status?: number };

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(0)}`;

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

export default function BrandAnalyticsPage() {
  const [offers, setOffers] = useState<AnalyticsOfferRow[]>([]);
  const [creators, setCreators] = useState<CreatorAnalyticsRow[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [creatorStatus, setCreatorStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus("loading");
      setCreatorStatus("loading");
      try {
        const [offersRes, creatorsRes] = await Promise.all([
          fetchJson<{ ok: boolean; offers: AnalyticsOfferRow[] }>("/api/brand/analytics"),
          fetchJson<{ ok: boolean; creators: CreatorAnalyticsRow[] }>("/api/brand/analytics/creators"),
        ]);
        if (cancelled) return;
        setOffers(offersRes.offers ?? []);
        setCreators(creatorsRes.creators ?? []);
        setStatus("idle");
        setCreatorStatus("idle");
      } catch (err) {
        const statusCode =
          err && typeof err === "object" && "status" in err ? (err as ApiError).status : undefined;
        if (statusCode === 401) {
          window.location.href = "/brand/auth";
          return;
        }
        if (!cancelled) {
          setStatus("error");
          setCreatorStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalClicks = offers.reduce((sum, offer) => sum + offer.clickCount, 0);
  const totalOrders = offers.reduce((sum, offer) => sum + offer.orderCount, 0);
  const totalRedemptions = offers.reduce((sum, offer) => sum + offer.redemptionCount, 0);
  const totalOrderRevenueCents = offers.reduce((sum, offer) => sum + offer.revenueCents, 0);
  const totalRedemptionRevenueCents = offers.reduce(
    (sum, offer) => sum + offer.redemptionRevenueCents,
    0,
  );
  const totalRefundCents = offers.reduce((sum, offer) => sum + offer.refundCents, 0);
  const totalRevenueCents = totalOrderRevenueCents + totalRedemptionRevenueCents;

  const overviewStats = [
    {
      label: "CLICKS",
      value: totalClicks ? `${totalClicks}` : "0",
      textClass: "text-neon-green",
      borderClass: "hover:border-neon-green",
    },
    {
      label: "ORDERS",
      value: totalOrders ? `${totalOrders}` : "0",
      textClass: "text-neon-pink",
      borderClass: "hover:border-neon-pink",
    },
    {
      label: "REDEMPTIONS",
      value: totalRedemptions ? `${totalRedemptions}` : "0",
      textClass: "text-neon-purple",
      borderClass: "hover:border-neon-purple",
    },
    {
      label: "ORDER REVENUE",
      value: formatMoney(totalOrderRevenueCents),
      textClass: "text-neon-yellow",
      borderClass: "hover:border-neon-yellow",
    },
  ];

  const campaignPerformance = offers.map((offer) => ({
    name: offer.title,
    clicks: `${offer.clickCount}`,
    orders: offer.orderCount,
    redemptions: offer.redemptionCount,
    revenue: formatMoney(offer.revenueCents),
  }));

  const contentMetrics = [
    { icon: Eye, label: "CLICKS", value: `${totalClicks}`, textClass: "text-neon-green" },
    { icon: ShoppingCart, label: "ORDERS", value: `${totalOrders}`, textClass: "text-neon-pink" },
    { icon: BadgeDollarSign, label: "REVENUE", value: formatMoney(totalRevenueCents), textClass: "text-neon-purple" },
    { icon: Receipt, label: "REFUNDS", value: formatMoney(totalRefundCents), textClass: "text-neon-yellow" },
  ];

  const creatorsEmpty = creatorStatus !== "loading" && !creators.length;
  const offersEmpty = status !== "loading" && !offers.length;

  const creatorRows = useMemo(() => creators, [creators]);

  return (
    <div className="p-6 md:p-10">
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-5 h-5 text-neon-green" />
          <span className="text-xs font-pixel text-neon-green">[ANALYTICS]</span>
        </div>
        <h1 className="text-xl md:text-2xl font-pixel text-foreground">PERFORMANCE</h1>
        <p className="font-mono text-sm text-muted-foreground mt-1">
          &gt; Track attributed clicks, orders, and redemptions
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {overviewStats.map((stat) => (
          <div
            key={stat.label}
            className={`p-5 border-4 border-border bg-card transition-all ${stat.borderClass}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-pixel text-muted-foreground">{stat.label}</span>
            </div>
            <p className={`text-2xl font-pixel mb-2 ${stat.textClass}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="border-4 border-border bg-card">
        <div className="p-4 border-b-4 border-border">
          <h2 className="font-pixel text-sm text-neon-pink">[CAMPAIGN_STATS]</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="text-left p-4 text-xs font-pixel text-muted-foreground">NAME</th>
                <th className="text-right p-4 text-xs font-pixel text-muted-foreground">CLICKS</th>
                <th className="text-right p-4 text-xs font-pixel text-muted-foreground">ORDERS</th>
                <th className="text-right p-4 text-xs font-pixel text-muted-foreground">REDEMPTIONS</th>
                <th className="text-right p-4 text-xs font-pixel text-muted-foreground">ORDER REV</th>
              </tr>
            </thead>
            <tbody>
              {offersEmpty ? (
                <tr>
                  <td className="p-4 text-xs font-mono text-muted-foreground" colSpan={5}>
                    {status === "loading" ? "Loading offers..." : "No campaign data yet."}
                  </td>
                </tr>
              ) : (
                campaignPerformance.map((campaign) => (
                  <tr key={campaign.name} className="border-b-2 border-border last:border-b-0 hover:bg-muted/50">
                    <td className="p-4">
                      <span className="font-mono text-sm">{campaign.name}</span>
                    </td>
                    <td className="p-4 text-right font-pixel text-neon-green">{campaign.clicks}</td>
                    <td className="p-4 text-right font-mono">{campaign.orders}</td>
                    <td className="p-4 text-right font-mono">{campaign.redemptions}</td>
                    <td className="p-4 text-right font-pixel text-neon-pink">{campaign.revenue}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 border-4 border-border bg-card">
        <div className="p-4 border-b-4 border-border">
          <h2 className="font-pixel text-sm text-neon-yellow">[CONTENT_METRICS]</h2>
        </div>
        <div className="grid sm:grid-cols-4 gap-0">
          {contentMetrics.map((metric, index) => (
            <div key={metric.label} className={`p-6 ${index < 3 ? "border-r-2 border-border" : ""}`}>
              <metric.icon className={`w-5 h-5 ${metric.textClass} mb-4`} />
              <p className={`text-2xl font-pixel mb-1 ${metric.textClass}`}>{metric.value}</p>
              <p className="text-xs font-mono text-muted-foreground">{metric.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 border-4 border-border bg-card">
        <div className="p-4 border-b-4 border-border">
          <h2 className="font-pixel text-sm text-neon-green">[CREATOR_PERFORMANCE]</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="text-left p-4 text-xs font-pixel text-muted-foreground">CREATOR</th>
                <th className="text-right p-4 text-xs font-pixel text-muted-foreground">MATCHES</th>
                <th className="text-right p-4 text-xs font-pixel text-muted-foreground">VERIFIED</th>
                <th className="text-right p-4 text-xs font-pixel text-muted-foreground">CLICKS</th>
                <th className="text-right p-4 text-xs font-pixel text-muted-foreground">ORDERS</th>
                <th className="text-right p-4 text-xs font-pixel text-muted-foreground">REDEMPTIONS</th>
                <th className="text-right p-4 text-xs font-pixel text-muted-foreground">ORDER REV</th>
                <th className="text-right p-4 text-xs font-pixel text-muted-foreground">REDEEM REV</th>
                <th className="text-right p-4 text-xs font-pixel text-muted-foreground">REFUNDS</th>
              </tr>
            </thead>
            <tbody>
              {creatorsEmpty ? (
                <tr>
                  <td className="p-4 text-xs font-mono text-muted-foreground" colSpan={9}>
                    {creatorStatus === "loading"
                      ? "Loading creator analytics..."
                      : "No creator performance data yet."}
                  </td>
                </tr>
              ) : (
                creatorRows.map((creator) => (
                  <tr
                    key={creator.creatorId}
                    className="border-b-2 border-border last:border-b-0 hover:bg-muted/50"
                  >
                    <td className="p-4">
                      <span className="font-mono text-sm">{creator.username ?? "Creator"}</span>
                    </td>
                    <td className="p-4 text-right font-mono">{creator.matchCount}</td>
                    <td className="p-4 text-right font-mono">{creator.verifiedCount ?? 0}</td>
                    <td className="p-4 text-right font-mono">{creator.clickCount ?? 0}</td>
                    <td className="p-4 text-right font-mono">{creator.orderCount ?? 0}</td>
                    <td className="p-4 text-right font-mono">{creator.redemptionCount ?? 0}</td>
                    <td className="p-4 text-right font-mono text-neon-green">
                      {formatMoney(creator.revenueCents ?? 0)}
                    </td>
                    <td className="p-4 text-right font-mono text-neon-yellow">
                      {formatMoney(creator.redemptionRevenueCents ?? 0)}
                    </td>
                    <td className="p-4 text-right font-mono text-neon-purple">
                      {formatMoney(creator.refundCents ?? 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

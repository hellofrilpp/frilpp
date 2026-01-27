"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  CheckCircle,
  Truck,
  Camera,
  Star,
  AlertTriangle,
  ChevronRight,
  Package,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import InfluencerLayout from "@/components/influencer/InfluencerLayout";

type ApiError = Error & { status?: number; code?: string };

type DealStatus =
  | "pending"
  | "approved"
  | "shipped"
  | "post_required"
  | "repost_required"
  | "posted"
  | "complete"
  | "rejected";

type Deal = {
  id: string;
  brandId: string;
  brand: string;
  product: string;
  value: string;
  status: DealStatus;
  matchDate: string;
  deadline?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  rejectionReason?: string | null;
  rejectedAt?: string | null;
};

type CreatorDeal = {
  id: string;
  brandId: string;
  brand: string;
  product: string;
  valueUsd: number | null;
  status: DealStatus;
  matchDate: string;
  deadline: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  carrier: string | null;
  rejectionReason: string | null;
  rejectedAt: string | null;
};

type CreatorDeliverable = {
  deliverableId: string;
  status: string;
  dueAt: string;
  submittedPermalink: string | null;
  submittedNotes: string | null;
  submittedAt: string | null;
  usageRightsGrantedAt: string | null;
  verifiedPermalink: string | null;
  verifiedAt: string | null;
  match: { id: string };
  offer: { usageRightsRequired: boolean; usageRightsScope: string | null };
};

type DeliverablesResponse = {
  ok: boolean;
  deliverables: CreatorDeliverable[];
};

type DealsResponse = {
  ok: boolean;
  deals: CreatorDeal[];
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  const data = (await res.json().catch(() => null)) as T & { error?: string; code?: string };
  if (!res.ok) {
    const err = new Error(data?.error ?? "Request failed") as ApiError;
    err.status = res.status;
    err.code = data?.code;
    throw err;
  }
  return data;
}

const statusConfig: Record<DealStatus, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: "PENDING", icon: Clock, color: "border-border text-muted-foreground" },
  approved: { label: "APPROVED", icon: CheckCircle, color: "border-neon-blue text-neon-blue" },
  shipped: { label: "SHIPPED", icon: Truck, color: "border-neon-yellow text-neon-yellow bg-neon-yellow/10" },
  post_required: { label: "POST NOW", icon: Camera, color: "bg-neon-pink text-background" },
  repost_required: { label: "RE-POST REQUIRED", icon: Camera, color: "bg-neon-yellow text-background" },
  posted: { label: "POSTED", icon: Camera, color: "border-neon-pink text-neon-pink" },
  complete: { label: "COMPLETE", icon: Star, color: "bg-neon-green text-background" },
  rejected: { label: "REJECTED", icon: AlertTriangle, color: "border-destructive text-destructive bg-destructive/10" },
};

const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

export default function InfluencerDealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [deliverables, setDeliverables] = useState<CreatorDeliverable[]>([]);
  const [filter, setFilter] = useState<DealStatus | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [favoriteBrandIds, setFavoriteBrandIds] = useState<string[]>([]);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitUrl, setSubmitUrl] = useState("");
  const [submitNotes, setSubmitNotes] = useState("");
  const [submitUsageRights, setSubmitUsageRights] = useState(false);
  const [activeDeliverable, setActiveDeliverable] = useState<CreatorDeliverable | null>(null);
  const [detailsDeal, setDetailsDeal] = useState<Deal | null>(null);

  const deliverableByMatch = useMemo(() => {
    const map = new Map<string, CreatorDeliverable>();
    deliverables.forEach((deliverable) => {
      map.set(deliverable.match.id, deliverable);
    });
    return map;
  }, [deliverables]);

  const detailsDeliverable = detailsDeal ? deliverableByMatch.get(detailsDeal.id) ?? null : null;

  const load = async () => {
    setIsLoading(true);
    setNotice(null);
    try {
      const [dealRes, deliverableRes, favoritesRes] = await Promise.all([
        fetchJson<DealsResponse>("/api/creator/deals"),
        fetchJson<DeliverablesResponse>("/api/creator/deliverables"),
        fetchJson<{ ok: boolean; favorites: Array<{ brandId: string }> }>(
          "/api/creator/favorites/brands",
        ),
      ]);
      const mappedDeals = (dealRes.deals ?? []).map((deal) => ({
        id: deal.id,
        brandId: deal.brandId,
        brand: deal.brand,
        product: deal.product,
        value: deal.valueUsd ? `$${deal.valueUsd}` : "$0",
        status: deal.status,
        matchDate: new Date(deal.matchDate).toLocaleDateString(),
        deadline: deal.deadline ? new Date(deal.deadline).toLocaleDateString() : undefined,
        trackingNumber: deal.trackingNumber ?? undefined,
        trackingUrl: deal.trackingUrl ?? undefined,
        carrier: deal.carrier ?? undefined,
        rejectionReason: deal.rejectionReason ?? null,
        rejectedAt: deal.rejectedAt ?? null,
      }));
      setDeals(mappedDeals);
      setDeliverables(deliverableRes.deliverables ?? []);
      setFavoriteBrandIds((favoritesRes.favorites ?? []).map((fav) => fav.brandId));
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr?.code === "NEEDS_CREATOR_PROFILE") {
        window.location.href = "/influencer/onboarding";
        return;
      }
      if (apiErr?.code === "NEEDS_LEGAL_ACCEPTANCE") {
        window.location.href = "/legal/accept?next=/influencer/deals";
        return;
      }
      if (apiErr?.status === 401) {
        window.location.href = "/influencer/auth";
        return;
      }
      setNotice(apiErr?.message ?? "Failed to load deals.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredDeals =
    filter === "all"
      ? deals
      : filter === "approved"
        ? deals.filter((deal) => deal.status === "approved")
        : filter === "shipped"
          ? deals.filter(
              (deal) =>
                deal.status === "shipped" ||
                deal.status === "post_required" ||
                deal.status === "repost_required",
            )
          : deals.filter((deal) => deal.status === filter);

  const activeDeals = deals.filter((deal) => !["complete", "rejected"].includes(deal.status)).length;
  const completedDeals = deals.filter((deal) => deal.status === "complete").length;
  const totalValue = deals.reduce((sum, deal) => sum + Number(deal.value.replace("$", "")), 0);

  const favoriteBrandSet = useMemo(() => new Set(favoriteBrandIds), [favoriteBrandIds]);

  const toggleFavoriteBrand = async (brandId: string, favorite: boolean) => {
    try {
      await fetchJson("/api/creator/favorites/brands", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brandId, favorite }),
      });
      setFavoriteBrandIds((prev) => {
        if (favorite) return Array.from(new Set([...prev, brandId]));
        return prev.filter((id) => id !== brandId);
      });
      setNotice(favorite ? "Brand saved to favorites." : "Brand removed from favorites.");
    } catch (err) {
      const apiErr = err as ApiError;
      setNotice(apiErr?.message ?? "Unable to update favorite");
    }
  };

  return (
    <InfluencerLayout>
      <div className="p-6 md:p-10 pb-24 md:pb-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-5 h-5 text-neon-pink" />
            <span className="text-xs font-pixel text-neon-pink">[MY_DEALS]</span>
          </div>
          <h1 className="text-xl font-pixel text-foreground">YOUR LOOT</h1>
          <p className="font-mono text-sm text-muted-foreground mt-1">
            {isLoading ? "&gt; Loading your deals..." : "&gt; Track matched offers"}
          </p>
        </div>

        {notice ? (
          <div className="mb-6 border-2 border-neon-pink text-neon-pink p-3 text-xs font-mono">
            {notice}
          </div>
        ) : null}

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 border-4 border-neon-green bg-neon-green/10">
            <p className="text-2xl font-pixel text-neon-green">{activeDeals}</p>
            <p className="text-xs font-mono text-muted-foreground">ACTIVE</p>
          </div>
          <div className="p-4 border-4 border-neon-pink bg-neon-pink/10">
            <p className="text-2xl font-pixel text-neon-pink">{completedDeals}</p>
            <p className="text-xs font-mono text-muted-foreground">DONE</p>
          </div>
          <div className="p-4 border-4 border-neon-yellow bg-neon-yellow/10">
            <p className="text-2xl font-pixel text-neon-yellow">${totalValue}</p>
            <p className="text-xs font-mono text-muted-foreground">VALUE</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
          {(
            ["all", "pending", "approved", "shipped", "repost_required", "posted", "complete", "rejected"] as const
          ).map(
            (status) => (
              <Button
                key={status}
                variant="outline"
                size="sm"
                onClick={() => setFilter(status)}
                className={`whitespace-nowrap font-mono text-xs border-2 ${
                  filter === status
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:border-primary"
                }`}
              >
                {status === "all" ? "ALL" : statusConfig[status].label}
              </Button>
            ),
          )}
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-16 border-4 border-border bg-card">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-pixel text-sm mb-2 text-foreground">LOADING...</h3>
              <p className="font-mono text-xs text-muted-foreground">Fetching your deals</p>
            </div>
          ) : (
            filteredDeals.map((deal) => {
              const config = statusConfig[deal.status];
              return (
                <div key={deal.id} className="border-4 border-border bg-card hover:border-neon-pink transition-colors">
                  <div
                    className="p-4 flex items-start gap-4 cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setDetailsDeal(deal);
                      setDetailsOpen(true);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setDetailsDeal(deal);
                        setDetailsOpen(true);
                      }
                    }}
                  >
                    <div className="w-14 h-14 border-2 border-neon-purple bg-neon-purple/10 flex items-center justify-center flex-shrink-0">
                      <Package className="w-7 h-7 text-neon-purple" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-pixel text-sm text-foreground">{deal.product}</h3>
                          <p className="font-mono text-xs text-muted-foreground">{deal.brand}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-pixel flex-shrink-0 border-2 ${config.color}`}>
                            {config.label}
                          </span>
                          {deal.status === "complete" ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 border-2 border-border"
                              aria-label={
                                favoriteBrandSet.has(deal.brandId)
                                  ? "Unfavorite brand"
                                  : "Favorite brand"
                              }
                              onMouseDown={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                event.stopPropagation();
                                void toggleFavoriteBrand(
                                  deal.brandId,
                                  !favoriteBrandSet.has(deal.brandId),
                                );
                              }}
                            >
                              <Heart
                                className={
                                  favoriteBrandSet.has(deal.brandId)
                                    ? "w-4 h-4 text-neon-pink"
                                    : "w-4 h-4 text-muted-foreground"
                                }
                                fill={favoriteBrandSet.has(deal.brandId) ? "currentColor" : "none"}
                              />
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex gap-3 mt-3 text-xs font-mono text-muted-foreground">
                        <span className="text-neon-yellow">{deal.value}</span>
                        <span>|</span>
                        <span>{deal.matchDate}</span>
                      </div>

                      {deal.status === "shipped" && (deal.trackingNumber || deal.carrier || deal.trackingUrl) ? (
                        <div className="mt-3 p-2 bg-muted text-xs font-mono border-2 border-border space-y-1">
                          {deal.carrier ? (
                            <div>
                              <span className="text-muted-foreground">CARRIER: </span>
                              <span className="text-neon-yellow">{deal.carrier}</span>
                            </div>
                          ) : null}
                          {deal.trackingNumber ? (
                            <div>
                              <span className="text-muted-foreground">TRACKING: </span>
                              <span className="text-neon-yellow">{deal.trackingNumber}</span>
                            </div>
                          ) : null}
                          {deal.trackingUrl ? (
                            <div>
                              <span className="text-muted-foreground">LINK: </span>
                              <a
                                href={deal.trackingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-neon-green underline"
                              >
                                Open tracking
                              </a>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {(deal.status === "shipped" ||
                        deal.status === "post_required" ||
                        deal.status === "repost_required") &&
                      deal.deadline ? (
                        <div className="mt-3 flex items-center gap-2 text-neon-pink">
                          <Camera className="w-4 h-4" />
                          <span className="text-xs font-mono">DUE: {deal.deadline}</span>
                        </div>
                      ) : null}
                      {deal.status === "rejected" ? (
                        <div className="mt-3 border-2 border-destructive/40 bg-destructive/10 p-2 text-xs font-mono text-destructive">
                          Rejection reason: {deal.rejectionReason ?? "—"}
                        </div>
                      ) : null}
                      {(deal.status === "post_required" ||
                        deal.status === "repost_required" ||
                        deal.status === "posted") &&
                      deliverableByMatch.get(deal.id)?.submittedAt ? (
                        <div className="mt-3 text-xs font-mono text-neon-green">
                          SUBMITTED · Awaiting review
                        </div>
                      ) : null}
                    </div>

                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </div>

                  {(deal.status === "shipped" ||
                    deal.status === "post_required" ||
                    deal.status === "repost_required") && (
                    <div className="px-4 pb-4">
                      <Button
                        className="w-full bg-neon-pink text-background font-pixel text-xs pixel-btn glow-pink"
                        disabled={Boolean(deliverableByMatch.get(deal.id)?.submittedAt)}
                        onClick={(event) => {
                          event.stopPropagation();
                          const deliverable = deliverableByMatch.get(deal.id) ?? null;
                          setActiveDeliverable(deliverable);
                          setSubmitUrl(deliverable?.submittedPermalink ?? "");
                          setSubmitNotes(deliverable?.submittedNotes ?? "");
                          setSubmitUsageRights(Boolean(deliverable?.usageRightsGrantedAt));
                          setSubmitOpen(true);
                        }}
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        {deliverableByMatch.get(deal.id)?.submittedAt
                          ? "SUBMITTED"
                          : deal.status === "repost_required"
                            ? "RE-SUBMIT CONTENT"
                            : "SUBMIT CONTENT"}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {!isLoading && filteredDeals.length === 0 ? (
          <div className="text-center py-16 border-4 border-border bg-card">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-pixel text-sm mb-2 text-foreground">NO DEALS FOUND</h3>
            <p className="font-mono text-xs text-muted-foreground">Try adjusting filter</p>
          </div>
        ) : null}
      </div>

      {submitOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md border-4 border-border bg-card p-6">
            <div className="font-pixel text-sm text-neon-pink mb-4">SUBMIT POST</div>
            <div className="space-y-4">
              <div>
                <label className="font-mono text-xs text-muted-foreground">PERMALINK URL</label>
                <Input
                  value={submitUrl}
                  onChange={(event) => setSubmitUrl(event.target.value)}
                  placeholder="https://www.tiktok.com/..."
                  className="mt-2 border-2 border-border font-mono"
                />
              </div>
              <div>
                <label className="font-mono text-xs text-muted-foreground">NOTES (OPTIONAL)</label>
                <Textarea
                  value={submitNotes}
                  onChange={(event) => setSubmitNotes(event.target.value)}
                  className="mt-2 border-2 border-border font-mono"
                  rows={3}
                />
              </div>
              {activeDeliverable?.offer.usageRightsRequired ? (
                <label className="flex items-start gap-2 text-xs font-mono">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 border-2 border-border"
                    checked={submitUsageRights}
                    onChange={(event) => setSubmitUsageRights(event.target.checked)}
                  />
                  <span>
                    <span className="text-foreground">Grant usage rights</span>
                    <br />
                    <span className="text-muted-foreground">
                      This brand requires usage rights for paid ads.
                    </span>
                  </span>
                </label>
              ) : null}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="border-2 border-border font-pixel text-xs"
                  onClick={() => setSubmitOpen(false)}
                >
                  CANCEL
                </Button>
                <Button
                  className="flex-1 bg-neon-pink text-background font-pixel text-xs pixel-btn glow-pink"
                  disabled={!submitUrl || submitting || !activeDeliverable}
                  onClick={async () => {
                    if (!activeDeliverable) return;
                    try {
                      setSubmitting(true);
                      const normalizedUrl = normalizeUrl(submitUrl);
                      if (!normalizedUrl) {
                        setNotice("Please enter a valid permalink URL.");
                        setSubmitting(false);
                        return;
                      }
                      await fetchJson(`/api/creator/matches/${activeDeliverable.match.id}/submit`, {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({
                          url: normalizedUrl,
                          notes: submitNotes || undefined,
                          grantUsageRights: submitUsageRights || undefined,
                        }),
                      });
                      setNotice("Content submitted for review.");
                      setSubmitOpen(false);
                      await load();
                    } catch (err) {
                      const apiErr = err as ApiError;
                      setNotice(apiErr?.message ?? "Unable to submit");
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                >
                  {submitting ? "SENDING..." : "SUBMIT NOW"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {detailsOpen && detailsDeal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md border-4 border-border bg-card p-6">
            <div className="font-pixel text-sm text-neon-green mb-4">DEAL DETAILS</div>
            <div className="space-y-4">
              <div>
                <div className="font-pixel text-sm text-foreground">{detailsDeal.product}</div>
                <div className="text-xs font-mono text-muted-foreground">by {detailsDeal.brand}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <div className="text-muted-foreground">STATUS</div>
                  <div className="text-neon-green">{statusConfig[detailsDeal.status].label}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">MATCHED</div>
                  <div className="text-foreground">{detailsDeal.matchDate}</div>
                </div>
                {detailsDeal.deadline ? (
                  <div>
                    <div className="text-muted-foreground">DUE</div>
                    <div className="text-foreground">{detailsDeal.deadline}</div>
                  </div>
                ) : null}
              </div>
              {detailsDeal.status === "complete" ? (
                <div className="flex items-center justify-between border-2 border-border bg-muted p-3 text-xs font-mono">
                  <span className="text-muted-foreground">FAVORITE BRAND</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 border-2 border-border"
                    aria-label={
                      favoriteBrandSet.has(detailsDeal.brandId)
                        ? "Unfavorite brand"
                        : "Favorite brand"
                    }
                    onClick={() =>
                      void toggleFavoriteBrand(
                        detailsDeal.brandId,
                        !favoriteBrandSet.has(detailsDeal.brandId),
                      )
                    }
                  >
                    <Heart
                      className={
                        favoriteBrandSet.has(detailsDeal.brandId)
                          ? "w-4 h-4 text-neon-pink"
                          : "w-4 h-4 text-muted-foreground"
                      }
                      fill={favoriteBrandSet.has(detailsDeal.brandId) ? "currentColor" : "none"}
                    />
                  </Button>
                </div>
              ) : null}
              {detailsDeal.status === "rejected" ? (
                <div className="border-2 border-destructive/40 bg-destructive/10 p-3 text-xs font-mono text-destructive">
                  Rejection reason: {detailsDeal.rejectionReason ?? "—"}
                </div>
              ) : null}

              <div className="border-2 border-border bg-muted p-3">
                <div className="text-xs font-pixel text-neon-yellow mb-2">TRACKING</div>
                {detailsDeal.carrier || detailsDeal.trackingNumber || detailsDeal.trackingUrl ? (
                  <div className="space-y-1 text-xs font-mono">
                    {detailsDeal.carrier ? (
                      <div>
                        <span className="text-muted-foreground">CARRIER: </span>
                        <span className="text-foreground">{detailsDeal.carrier}</span>
                      </div>
                    ) : null}
                    {detailsDeal.trackingNumber ? (
                      <div>
                        <span className="text-muted-foreground">NUMBER: </span>
                        <span className="text-foreground">{detailsDeal.trackingNumber}</span>
                      </div>
                    ) : null}
                    {detailsDeal.trackingUrl ? (
                      <div>
                        <span className="text-muted-foreground">LINK: </span>
                        <a
                          href={detailsDeal.trackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-neon-green underline"
                        >
                          Open tracking
                        </a>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-xs font-mono text-muted-foreground">Not provided.</div>
                )}
              </div>

              <div className="border-2 border-border bg-muted p-3">
                <div className="text-xs font-pixel text-neon-pink mb-2">POST DETAILS</div>
                {detailsDeliverable ? (
                  <div className="space-y-2 text-xs font-mono">
                    {detailsDeliverable.submittedPermalink ? (
                      <div>
                        <span className="text-muted-foreground">SUBMITTED: </span>
                        <a
                          href={detailsDeliverable.submittedPermalink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-neon-green underline"
                        >
                          View post
                        </a>
                      </div>
                    ) : null}
                    {detailsDeliverable.verifiedPermalink ? (
                      <div>
                        <span className="text-muted-foreground">VERIFIED: </span>
                        <a
                          href={detailsDeliverable.verifiedPermalink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-neon-green underline"
                        >
                          View verified post
                        </a>
                      </div>
                    ) : null}
                    {detailsDeliverable.submittedNotes ? (
                      <div>
                        <span className="text-muted-foreground">NOTES: </span>
                        <span className="text-foreground">{detailsDeliverable.submittedNotes}</span>
                      </div>
                    ) : null}
                    {detailsDeliverable.verifiedAt ? (
                      <div>
                        <span className="text-muted-foreground">VERIFIED AT: </span>
                        <span className="text-foreground">
                          {new Date(detailsDeliverable.verifiedAt).toLocaleString()}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-xs font-mono text-muted-foreground">No post details found.</div>
                )}
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                className="border-2 border-border font-pixel text-xs"
                onClick={() => setDetailsOpen(false)}
              >
                CLOSE
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </InfluencerLayout>
  );
}

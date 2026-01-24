import { useEffect, useMemo, useState } from "react";
import { 
  Clock, 
  CheckCircle, 
  Truck, 
  Camera, 
  Star,
  ChevronRight,
  Package,
  Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import InfluencerLayout from "@/components/influencer/InfluencerLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, CreatorDeal, CreatorDeliverable, apiUrl, getCreatorDeals, getCreatorDeliverables, submitCreatorDeliverable } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type DealStatus = "pending" | "approved" | "shipped" | "post_required" | "posted" | "complete";

interface Deal {
  id: string;
  brand: string;
  product: string;
  value: string;
  status: DealStatus;
  matchDate: string;
  deadline?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
}

const statusConfig: Record<DealStatus, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: "PENDING", icon: Clock, color: "border-border text-muted-foreground" },
  approved: { label: "APPROVED", icon: CheckCircle, color: "border-neon-blue text-neon-blue" },
  shipped: { label: "SHIPPED", icon: Truck, color: "border-neon-yellow text-neon-yellow bg-neon-yellow/10" },
  post_required: { label: "POST NOW", icon: Camera, color: "bg-neon-pink text-background" },
  posted: { label: "POSTED", icon: Camera, color: "border-neon-pink text-neon-pink" },
  complete: { label: "COMPLETE", icon: Star, color: "bg-neon-green text-background" },
};

const InfluencerDeals = () => {
  const { toast } = useToast();
  const { data, error, isLoading } = useQuery({
    queryKey: ["creator-deals"],
    queryFn: getCreatorDeals,
  });
  const { data: deliverablesData } = useQuery({
    queryKey: ["creator-deliverables"],
    queryFn: getCreatorDeliverables,
  });
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<DealStatus | "all">("all");
  const [submitOpen, setSubmitOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitUrl, setSubmitUrl] = useState("");
  const [submitNotes, setSubmitNotes] = useState("");
  const [submitUsageRights, setSubmitUsageRights] = useState(false);
  const [activeDeliverable, setActiveDeliverable] = useState<CreatorDeliverable | null>(null);
  const [detailsDeal, setDetailsDeal] = useState<Deal | null>(null);

  const deals = useMemo<Deal[]>(() => {
    const rows = data?.deals ?? [];
    return rows.map((deal: CreatorDeal) => ({
      id: deal.id,
      brand: deal.brand,
      product: deal.product,
      value: deal.valueUsd ? `$${deal.valueUsd}` : "$0",
      status: deal.status,
      matchDate: new Date(deal.matchDate).toLocaleDateString(),
      deadline: deal.deadline ? new Date(deal.deadline).toLocaleDateString() : undefined,
      trackingNumber: deal.trackingNumber ?? undefined,
      trackingUrl: deal.trackingUrl ?? undefined,
      carrier: deal.carrier ?? undefined,
    }));
  }, [data]);

  const deliverableByMatch = useMemo(() => {
    const deliverables = deliverablesData?.deliverables ?? [];
    return new Map(deliverables.map((deliverable) => [deliverable.match.id, deliverable]));
  }, [deliverablesData]);

  const openDetails = (deal: Deal) => {
    setDetailsDeal(deal);
    setDetailsOpen(true);
  };

  const detailsDeliverable = detailsDeal ? deliverableByMatch.get(detailsDeal.id) ?? null : null;

  const filteredDeals =
    filter === "all"
      ? deals
      : filter === "approved"
        ? deals.filter((deal) => deal.status === "approved")
        : filter === "shipped"
          ? deals.filter((deal) => deal.status === "shipped" || deal.status === "post_required")
          : deals.filter((deal) => deal.status === filter);

  const activeDeals = deals.filter(d => d.status !== "complete").length;
  const completedDeals = deals.filter(d => d.status === "complete").length;
  const totalValue = deals.reduce((sum, d) => sum + parseInt(d.value.replace("$", "")), 0);

  const normalizeUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  useEffect(() => {
    if (error instanceof ApiError && error.code === "NEEDS_CREATOR_PROFILE") {
      window.location.href = "/influencer/onboarding";
    }
    if (error instanceof ApiError && error.code === "NEEDS_LEGAL_ACCEPTANCE") {
      window.location.href = apiUrl("/legal/accept?next=/influencer/deals");
    }
    if (error && !(error instanceof ApiError)) {
      toast({ title: "FAILED TO LOAD DEALS", description: "Please try again." });
    }
  }, [error, toast]);

  return (
    <InfluencerLayout>
      <div className="p-6 md:p-10 pb-24 md:pb-10">
        {/* Header */}
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

        {/* Stats */}
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

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
          {(["all", "pending", "approved", "shipped", "posted", "complete"] as const).map((status) => (
            <Button
              key={status}
              variant="outline"
              size="sm"
              onClick={() => setFilter(status)}
              className={`whitespace-nowrap font-mono text-xs border-2 ${
                filter === status 
                  ? 'bg-primary text-primary-foreground border-primary' 
                  : 'border-border hover:border-primary'
              }`}
            >
              {status === "all" ? "ALL" : statusConfig[status].label}
            </Button>
          ))}
        </div>

        {/* Deals List */}
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
                    onClick={() => openDetails(deal)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openDetails(deal);
                      }
                    }}
                  >
                    {/* Product Image */}
                    <div className="w-14 h-14 border-2 border-neon-purple bg-neon-purple/10 flex items-center justify-center flex-shrink-0">
                      <Package className="w-7 h-7 text-neon-purple" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-pixel text-sm text-foreground">{deal.product}</h3>
                          <p className="font-mono text-xs text-muted-foreground">{deal.brand}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-pixel flex-shrink-0 border-2 ${config.color}`}>
                          {config.label}
                        </span>
                      </div>

                      <div className="flex gap-3 mt-3 text-xs font-mono text-muted-foreground">
                        <span className="text-neon-yellow">{deal.value}</span>
                        <span>|</span>
                        <span>{deal.matchDate}</span>
                      </div>

                      {/* Status-specific content */}
                      {deal.status === "shipped" && (deal.trackingNumber || deal.carrier || deal.trackingUrl) && (
                        <div className="mt-3 p-2 bg-muted text-xs font-mono border-2 border-border space-y-1">
                          {deal.carrier && (
                            <div>
                              <span className="text-muted-foreground">CARRIER: </span>
                              <span className="text-neon-yellow">{deal.carrier}</span>
                            </div>
                          )}
                          {deal.trackingNumber && (
                            <div>
                              <span className="text-muted-foreground">TRACKING: </span>
                              <span className="text-neon-yellow">{deal.trackingNumber}</span>
                            </div>
                          )}
                          {deal.trackingUrl && (
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
                          )}
                        </div>
                      )}

                      {(deal.status === "shipped" || deal.status === "post_required") && deal.deadline && (
                        <div className="mt-3 flex items-center gap-2 text-neon-pink">
                          <Camera className="w-4 h-4" />
                          <span className="text-xs font-mono">DUE: {deal.deadline}</span>
                        </div>
                      )}
                      {(deal.status === "post_required" || deal.status === "posted") &&
                        deliverableByMatch.get(deal.id)?.submittedAt && (
                          <div className="mt-3 text-xs font-mono text-neon-green">
                            SUBMITTED · Awaiting review
                          </div>
                        )}
                    </div>

                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </div>

                  {/* Action Buttons */}
                  {(deal.status === "shipped" || deal.status === "post_required") && (
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
                        {deliverableByMatch.get(deal.id)?.submittedAt ? "SUBMITTED" : "SUBMIT CONTENT"}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {!isLoading && filteredDeals.length === 0 && (
          <div className="text-center py-16 border-4 border-border bg-card">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-pixel text-sm mb-2 text-foreground">NO DEALS FOUND</h3>
            <p className="font-mono text-xs text-muted-foreground">Try adjusting filter</p>
          </div>
        )}
      </div>
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="border-4 border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-pixel text-sm text-neon-pink">SUBMIT POST</DialogTitle>
          </DialogHeader>
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
            {activeDeliverable?.offer.usageRightsRequired && (
              <div className="flex items-start gap-2">
                <Checkbox
                  checked={submitUsageRights}
                  onCheckedChange={(checked) => setSubmitUsageRights(Boolean(checked))}
                />
                <div>
                  <p className="font-mono text-xs text-foreground">Grant usage rights</p>
                  <p className="text-xs font-mono text-muted-foreground">
                    This brand requires usage rights for paid ads.
                  </p>
                </div>
              </div>
            )}
            <Button
              className="w-full bg-neon-pink text-background font-pixel text-xs pixel-btn glow-pink"
              disabled={!submitUrl || submitting || !activeDeliverable}
              onClick={async () => {
                if (!activeDeliverable) return;
                try {
                  setSubmitting(true);
                  const normalizedUrl = normalizeUrl(submitUrl);
                  if (!normalizedUrl) {
                    toast({ title: "INVALID URL", description: "Please enter a valid permalink URL." });
                    setSubmitting(false);
                    return;
                  }
                  await submitCreatorDeliverable(activeDeliverable.match.id, {
                    url: normalizedUrl,
                    notes: submitNotes || undefined,
                    grantUsageRights: submitUsageRights || undefined,
                  });
                  toast({ title: "SUBMITTED", description: "Content submitted for review." });
                  setSubmitOpen(false);
                  await queryClient.invalidateQueries({ queryKey: ["creator-deals"] });
                  await queryClient.invalidateQueries({ queryKey: ["creator-deliverables"] });
                } catch (err) {
                  const message = err instanceof ApiError ? err.message : "Unable to submit";
                  toast({ title: "SUBMISSION FAILED", description: message });
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? "SENDING..." : "SUBMIT NOW"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="border-4 border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-pixel text-sm text-neon-green">DEAL DETAILS</DialogTitle>
          </DialogHeader>
          {detailsDeal ? (
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
          ) : null}
        </DialogContent>
      </Dialog>
    </InfluencerLayout>
  );
};

export default InfluencerDeals;

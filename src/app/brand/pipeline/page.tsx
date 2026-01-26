"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Eye,
  CheckCircle,
  Clock,
  Truck,
  Camera,
  Star,
  Users,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Stage = "applied" | "approved" | "shipped" | "posted" | "repost_required" | "complete";

type BrandMatch = {
  matchId: string;
  status: string;
  campaignCode: string;
  createdAt: string;
  offer: { id: string; title: string };
  creator: {
    id: string;
    username: string | null;
    fullName: string | null;
    followersCount: number | null;
    distanceKm?: number | null;
    distanceMiles?: number | null;
  };
};

type BrandShipment = {
  id: string;
  fulfillmentType: "SHOPIFY" | "MANUAL";
  status: string;
  carrier?: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  match: { id: string; campaignCode: string };
  offer: { title: string };
  creator: { id: string; username: string | null; fullName?: string | null };
};

type BrandDeliverable = {
  deliverableId: string;
  status: "DUE" | "VERIFIED" | "FAILED" | "REPOST_REQUIRED";
  submittedPermalink: string | null;
  submittedNotes: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  match: { id: string; campaignCode: string };
  offer: { title: string };
  creator: {
    id: string;
    username: string | null;
    fullName?: string | null;
    followersCount: number | null;
  };
  reviews: Array<{
    action: "REQUEST_CHANGES" | "FAILED" | "VERIFIED";
    reason: string | null;
    submittedPermalink: string | null;
    submittedNotes: string | null;
    reviewedByUserId: string | null;
    createdAt: string;
  }>;
};

type BrandOffer = { id: string; title: string };

type Influencer = {
  id: string;
  name: string;
  handle: string;
  followers: string;
  campaign: string;
  offerId?: string | null;
  stage: Stage;
  avatar: string;
  engagement: string;
  distanceKm?: number | null;
  distanceMiles?: number | null;
};

type NoticeKind = "success" | "error" | "info";

type ApiError = Error & { status?: number };

const kmToMiles = (km: number) => km / 1.609344;

const normalizeUrl = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const stages: { key: Stage; label: string; icon: React.ElementType; color: string }[] = [
  { key: "applied", label: "APPLIED", icon: Clock, color: "border-border" },
  { key: "approved", label: "APPROVED", icon: CheckCircle, color: "border-neon-blue" },
  { key: "shipped", label: "SHIPPED", icon: Truck, color: "border-neon-yellow" },
  { key: "posted", label: "POSTED", icon: Camera, color: "border-neon-pink" },
  {
    key: "repost_required",
    label: "RE-POST REQUIRED",
    icon: AlertTriangle,
    color: "border-neon-yellow bg-neon-yellow/10",
  },
  { key: "complete", label: "COMPLETE", icon: Star, color: "border-neon-green bg-neon-green/10" },
];

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

export default function BrandPipelinePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<Stage | "all">("all");
  const [draggedInfluencer, setDraggedInfluencer] = useState<Influencer | null>(null);
  const [influencersList, setInfluencersList] = useState<Influencer[]>([]);
  const [manualForms, setManualForms] = useState<
    Record<string, { carrier: string; trackingNumber: string; trackingUrl: string }>
  >({});
  const [shipmentOpen, setShipmentOpen] = useState(false);
  const [shipmentTarget, setShipmentTarget] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestReason, setRequestReason] = useState("Missing brand tag");
  const [requestTarget, setRequestTarget] = useState<string | null>(null);

  const [pendingMatches, setPendingMatches] = useState<BrandMatch[]>([]);
  const [acceptedMatches, setAcceptedMatches] = useState<BrandMatch[]>([]);
  const [shipments, setShipments] = useState<BrandShipment[]>([]);
  const [dueDeliverables, setDueDeliverables] = useState<BrandDeliverable[]>([]);
  const [verifiedDeliverables, setVerifiedDeliverables] = useState<BrandDeliverable[]>([]);
  const [offers, setOffers] = useState<BrandOffer[]>([]);
  const [notice, setNotice] = useState<{ kind: NoticeKind; text: string } | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = useCallback((kind: NoticeKind, text: string) => {
    setNotice({ kind, text });
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setNotice(null), 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [pendingRes, acceptedRes, shipmentsRes, dueRes, verifiedRes, offersRes] =
        await Promise.all([
          fetchJson<{ ok: boolean; matches: BrandMatch[] }>(
            "/api/brand/matches?status=PENDING_APPROVAL",
          ),
          fetchJson<{ ok: boolean; matches: BrandMatch[] }>("/api/brand/matches?status=ACCEPTED"),
          fetchJson<{ ok: boolean; shipments: BrandShipment[] }>("/api/brand/shipments"),
          fetchJson<{ ok: boolean; deliverables: BrandDeliverable[] }>(
            "/api/brand/deliverables?status=DUE",
          ),
          fetchJson<{ ok: boolean; deliverables: BrandDeliverable[] }>(
            "/api/brand/deliverables?status=VERIFIED",
          ),
          fetchJson<{ ok: boolean; offers: BrandOffer[] }>("/api/brand/offers"),
        ]);

      setPendingMatches(pendingRes.matches ?? []);
      setAcceptedMatches(acceptedRes.matches ?? []);
      setShipments(shipmentsRes.shipments ?? []);
      setDueDeliverables(dueRes.deliverables ?? []);
      setVerifiedDeliverables(verifiedRes.deliverables ?? []);
      setOffers(offersRes.offers ?? []);
    } catch (err) {
      const status = err instanceof Error && "status" in err ? (err as ApiError).status : undefined;
      if (status === 401) {
        window.location.href = "/brand/auth";
        return;
      }
      showNotice("error", "Failed to load pipeline.");
    }
  }, [showNotice]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const manualShipmentByMatch = useMemo(() => {
    const map = new Map<string, BrandShipment>();
    shipments.forEach((shipment) => {
      if (shipment.fulfillmentType !== "MANUAL") return;
      map.set(shipment.match.id, shipment);
    });
    return map;
  }, [shipments]);

  const offerIdByMatch = useMemo(() => {
    const map = new Map<string, string>();
    pendingMatches.forEach((match) => {
      map.set(match.matchId, match.offer.id);
    });
    acceptedMatches.forEach((match) => {
      map.set(match.matchId, match.offer.id);
    });
    return map;
  }, [pendingMatches, acceptedMatches]);

  const offerIdByTitle = useMemo(() => {
    const map = new Map<string, string>();
    offers.forEach((offer) => {
      map.set(offer.title, offer.id);
    });
    return map;
  }, [offers]);

  const formatFollowers = useCallback((count?: number | null) => {
    if (!count) return "—";
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return `${count}`;
  }, []);

  const formatDistance = useCallback(
    (influencer?: Pick<Influencer, "distanceKm" | "distanceMiles"> | null) => {
      if (!influencer) return null;
      const distance =
        influencer.distanceMiles ??
        (influencer.distanceKm !== null && influencer.distanceKm !== undefined
          ? kmToMiles(influencer.distanceKm)
          : null);
      if (distance === null || distance === undefined) return null;
      if (distance < 1) return "<1mi";
      return `${distance.toFixed(distance < 10 ? 1 : 0)}mi`;
    },
    [],
  );

  const buildInfluencer = useCallback(
    (
      matchId: string,
      name: string,
      username: string | null,
      followersCount: number | null,
      campaign: string,
      offerId: string | null | undefined,
      stage: Stage,
      distanceKm?: number | null,
      distanceMiles?: number | null,
    ): Influencer => {
      const displayName = name || username || "Creator";
      const handle = username ? `@${username}` : "@creator";
      const avatar = displayName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
      return {
        id: matchId,
        name: displayName,
        handle,
        followers: formatFollowers(followersCount),
        campaign,
        offerId: offerId ?? null,
        stage,
        avatar: avatar || "CR",
        engagement: "—",
        distanceKm: distanceKm ?? null,
        distanceMiles: distanceMiles ?? null,
      };
    },
    [formatFollowers],
  );

  const computedInfluencers = useMemo(() => {
    const map = new Map<string, Influencer>();

    pendingMatches.forEach((match) => {
      map.set(
        match.matchId,
        buildInfluencer(
          match.matchId,
          match.creator.fullName ?? match.creator.username ?? "Creator",
          match.creator.username ?? null,
          match.creator.followersCount,
          match.offer.title,
          match.offer.id,
          "applied",
          match.creator.distanceKm ?? null,
          match.creator.distanceMiles ?? null,
        ),
      );
    });

    acceptedMatches.forEach((match) => {
      map.set(
        match.matchId,
        buildInfluencer(
          match.matchId,
          match.creator.fullName ?? match.creator.username ?? "Creator",
          match.creator.username ?? null,
          match.creator.followersCount,
          match.offer.title,
          match.offer.id,
          "approved",
          match.creator.distanceKm ?? null,
          match.creator.distanceMiles ?? null,
        ),
      );
    });

    shipments.forEach((shipment) => {
      const shipped =
        shipment.fulfillmentType === "MANUAL"
          ? shipment.status === "SHIPPED"
          : ["FULFILLED", "COMPLETED"].includes(shipment.status);
      if (!shipped) return;
      map.set(
        shipment.match.id,
        buildInfluencer(
          shipment.match.id,
          shipment.creator.fullName ?? shipment.creator.username ?? "Creator",
          shipment.creator.username ?? null,
          null,
          shipment.offer.title,
          offerIdByMatch.get(shipment.match.id) ??
            offerIdByTitle.get(shipment.offer.title) ??
            null,
          "shipped",
          null,
          null,
        ),
      );
    });

    dueDeliverables.forEach((deliverable) => {
      if (deliverable.status !== "REPOST_REQUIRED" && !deliverable.submittedAt) return;
      map.set(
        deliverable.match.id,
        buildInfluencer(
          deliverable.match.id,
          deliverable.creator.fullName ?? deliverable.creator.username ?? "Creator",
          deliverable.creator.username ?? null,
          deliverable.creator.followersCount,
          deliverable.offer.title,
          offerIdByMatch.get(deliverable.match.id) ??
            offerIdByTitle.get(deliverable.offer.title) ??
            null,
          deliverable.status === "REPOST_REQUIRED" ? "repost_required" : "posted",
          null,
          null,
        ),
      );
    });

    verifiedDeliverables.forEach((deliverable) => {
      map.set(
        deliverable.match.id,
        buildInfluencer(
          deliverable.match.id,
          deliverable.creator.fullName ?? deliverable.creator.username ?? "Creator",
          deliverable.creator.username ?? null,
          deliverable.creator.followersCount,
          deliverable.offer.title,
          offerIdByMatch.get(deliverable.match.id) ??
            offerIdByTitle.get(deliverable.offer.title) ??
            null,
          "complete",
          null,
          null,
        ),
      );
    });

    return Array.from(map.values());
  }, [
    pendingMatches,
    acceptedMatches,
    shipments,
    dueDeliverables,
    verifiedDeliverables,
    offerIdByMatch,
    offerIdByTitle,
    buildInfluencer,
  ]);

  const deliverableByMatch = useMemo(() => {
    const map = new Map<string, BrandDeliverable>();
    dueDeliverables.forEach((deliverable) => {
      map.set(deliverable.match.id, deliverable);
    });
    verifiedDeliverables.forEach((deliverable) => {
      map.set(deliverable.match.id, deliverable);
    });
    return map;
  }, [dueDeliverables, verifiedDeliverables]);

  useEffect(() => {
    setInfluencersList(computedInfluencers);
  }, [computedInfluencers]);

  useEffect(() => {
    const next: Record<string, { carrier: string; trackingNumber: string; trackingUrl: string }> = {};
    shipments
      .filter((shipment) => shipment.fulfillmentType === "MANUAL" && shipment.status !== "SHIPPED")
      .forEach((shipment) => {
        next[shipment.id] = {
          carrier: shipment.carrier ?? "",
          trackingNumber: shipment.trackingNumber ?? "",
          trackingUrl: shipment.trackingUrl ?? "",
        };
      });
    setManualForms(next);
  }, [shipments]);

  const handleDragStart = (influencer: Influencer) => {
    setDraggedInfluencer(influencer);
  };

  const openShipment = (matchId: string) => {
    if (!manualShipmentByMatch.has(matchId)) {
      showNotice("info", "Auto shipment: no manual tracking needed.");
      return;
    }
    setShipmentTarget(matchId);
    setShipmentOpen(true);
  };

  const activeShipment = useMemo(() => {
    if (!shipmentTarget) return null;
    return manualShipmentByMatch.get(shipmentTarget) ?? null;
  }, [manualShipmentByMatch, shipmentTarget]);

  const openCampaignDetails = (influencer: Influencer) => {
    if (influencer.offerId) {
      router.push(`/brand/campaigns/${influencer.offerId}`);
      return;
    }
    showNotice("error", "Campaign not found. Try refreshing.");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (stage: Stage) => {
    if (!draggedInfluencer) return;
    if (stage === "repost_required") {
      showNotice("info", "Re-post required is set when you request changes.");
      setDraggedInfluencer(null);
      return;
    }
    if (stage === "approved") {
      setInfluencersList((prev) =>
        prev.map((inf) => (inf.id === draggedInfluencer.id ? { ...inf, stage } : inf)),
      );
      fetchJson(`/api/brand/matches/${encodeURIComponent(draggedInfluencer.id)}/approve`, {
        method: "POST",
      })
        .then(() => loadData())
        .catch(() => {
          showNotice("error", "Approve failed");
        });
    } else if (stage === "complete") {
      showNotice("info", "Verify in deliverables to complete.");
    } else {
      showNotice("info", "Move to Approved first, then update shipments/deliverables.");
    }
    setDraggedInfluencer(null);
  };

  const handleApprove = async (matchId: string) => {
    try {
      await fetchJson(`/api/brand/matches/${encodeURIComponent(matchId)}/approve`, {
        method: "POST",
      });
      showNotice("success", "Creator approved.");
      await loadData();
    } catch {
      showNotice("error", "Approve failed");
    }
  };

  const handleReject = async (matchId: string) => {
    try {
      await fetchJson(`/api/brand/matches/${encodeURIComponent(matchId)}/reject`, {
        method: "POST",
      });
      setInfluencersList((prev) => prev.filter((inf) => inf.id !== matchId));
      showNotice("success", "Creator rejected.");
      await loadData();
    } catch {
      showNotice("error", "Reject failed");
    }
  };

  const handleMarkShipped = async (matchId: string) => {
    const shipment = manualShipmentByMatch.get(matchId);
    if (!shipment) {
      showNotice("info", "No manual shipment for this match.");
      return;
    }
    try {
      const payload = manualForms[shipment.id] ?? {
        carrier: "",
        trackingNumber: "",
        trackingUrl: "",
      };
      await fetchJson(`/api/brand/shipments/manual/${encodeURIComponent(shipment.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: "SHIPPED",
          carrier: payload.carrier || undefined,
          trackingNumber: payload.trackingNumber || undefined,
          trackingUrl: payload.trackingUrl || undefined,
        }),
      });
      showNotice("success", "Shipment marked shipped.");
      await loadData();
    } catch {
      showNotice("error", "Update failed");
    }
  };

  const handleVerifyPost = async (matchId: string) => {
    const deliverable = deliverableByMatch.get(matchId);
    if (!deliverable || !deliverable.submittedPermalink) {
      showNotice("error", "Creator has not provided a permalink.");
      return;
    }
    try {
      await fetchJson(`/api/brand/deliverables/${encodeURIComponent(deliverable.deliverableId)}/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ permalink: deliverable.submittedPermalink ?? undefined }),
      });
      showNotice("success", "Deliverable approved.");
      await loadData();
    } catch {
      showNotice("error", "Verify failed");
    }
  };

  const openRequestChanges = (matchId: string) => {
    const deliverable = deliverableByMatch.get(matchId);
    if (!deliverable) {
      showNotice("error", "Creator has not provided a permalink.");
      return;
    }
    setRequestTarget(matchId);
    setRequestReason("Missing brand tag");
    setRequestOpen(true);
  };

  const submitRequestChanges = async () => {
    if (!requestTarget) return;
    const deliverable = deliverableByMatch.get(requestTarget);
    if (!deliverable) {
      showNotice("error", "Creator has not provided a permalink.");
      setRequestOpen(false);
      setRequestTarget(null);
      return;
    }
    const reason = requestReason.trim() || undefined;
    try {
      await fetchJson(
        `/api/brand/deliverables/${encodeURIComponent(deliverable.deliverableId)}/request-changes`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason }),
        },
      );
      showNotice("success", "Changes requested.");
      await loadData();
    } catch {
      showNotice("error", "Request failed");
    } finally {
      setRequestOpen(false);
      setRequestTarget(null);
    }
  };

  const filteredInfluencers = influencersList.filter(
    (inf) =>
      inf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inf.handle.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const getInfluencersByStage = (stage: Stage) => {
    if (stageFilter !== "all" && stageFilter !== stage) return [];
    return filteredInfluencers.filter((inf) => inf.stage === stage);
  };

  const noticeStyles = useMemo(() => {
    if (!notice) return "";
    if (notice.kind === "success") return "border-neon-green bg-neon-green/10 text-neon-green";
    if (notice.kind === "error") return "border-neon-pink bg-neon-pink/10 text-neon-pink";
    return "border-neon-yellow bg-neon-yellow/10 text-neon-yellow";
  }, [notice]);

  return (
    <div className="p-6 md:p-10">
      {notice ? (
        <div className={`mb-6 border-2 px-4 py-3 text-xs font-mono ${noticeStyles}`}>
          {notice.text}
        </div>
      ) : null}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-neon-purple" />
            <span className="text-xs font-pixel text-neon-purple">[PIPELINE]</span>
          </div>
          <h1 className="text-xl md:text-2xl font-pixel text-foreground">WORKFLOW</h1>
          <p className="font-mono text-sm text-muted-foreground mt-1">
            &gt; Drag creators through stages
          </p>
        </div>
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="SEARCH_CREATORS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-2 border-border font-mono text-sm focus:border-primary"
          />
        </div>
      </div>

      <div className="pb-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {stages.map((stage) => (
            <div
              key={stage.key}
              className="min-w-0"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(stage.key)}
            >
              <button
                type="button"
                className={`w-full text-left px-3 py-2 border-4 ${stage.color} mb-3 bg-card ${
                  stageFilter === stage.key ? "ring-2 ring-primary/60" : ""
                }`}
                onClick={() => setStageFilter((prev) => (prev === stage.key ? "all" : stage.key))}
              >
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <stage.icon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-pixel">{stage.label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground px-2 py-0.5 bg-muted">
                    {filteredInfluencers.filter((inf) => inf.stage === stage.key).length}
                  </span>
                </div>
              </button>

              <div className="space-y-3">
                {getInfluencersByStage(stage.key).map((influencer) => (
                  <div
                    key={influencer.id}
                    draggable
                    onDragStart={() => handleDragStart(influencer)}
                    className="bg-card border-2 border-border p-4 cursor-grab hover:border-primary transition-all active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-neon-pink/20 border-2 border-neon-pink flex items-center justify-center text-xs font-pixel text-neon-pink">
                          {influencer.avatar}
                        </div>
                        <div>
                          <p className="text-sm font-mono">{influencer.name}</p>
                          <p className="text-xs font-mono text-muted-foreground">{influencer.handle}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 border-2 border-border"
                        onClick={() => openCampaignDetails(influencer)}
                        aria-label="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>

                    {formatDistance(influencer) && (
                      <div className="text-xs font-mono text-neon-blue mb-3">
                        Distance: {formatDistance(influencer)}
                      </div>
                    )}

                    <div className="px-2 py-1 bg-muted text-xs font-mono inline-block">
                      {influencer.campaign}
                    </div>

                    {(influencer.stage === "posted" || influencer.stage === "repost_required") &&
                    deliverableByMatch.has(influencer.id) ? (
                      <div className="mt-3 space-y-2 text-xs font-mono">
                        {(() => {
                          const deliverable = deliverableByMatch.get(influencer.id);
                          const link = normalizeUrl(deliverable?.submittedPermalink ?? null);
                          if (!deliverable) return null;
                          return (
                            <>
                              {deliverable.status === "REPOST_REQUIRED" ? (
                                <div className="inline-flex items-center gap-2 border border-neon-yellow bg-neon-yellow/10 px-2 py-1 text-neon-yellow">
                                  RE-POST REQUIRED
                                </div>
                              ) : null}
                              {link ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-muted-foreground">POST:</span>
                                  <a
                                    href={link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-neon-blue underline break-all"
                                    onMouseDown={(event) => event.stopPropagation()}
                                  >
                                    {deliverable.submittedPermalink}
                                  </a>
                                </div>
                              ) : (
                                <div className="text-muted-foreground">POST: —</div>
                              )}
                              {deliverable.submittedNotes?.trim() ? (
                                <div className="text-muted-foreground">
                                  NOTES:{" "}
                                  <span className="text-foreground">{deliverable.submittedNotes}</span>
                                </div>
                              ) : null}
                              {deliverable.reviews?.length ? (
                                <div className="mt-2 space-y-1 text-muted-foreground">
                                  <div className="text-foreground">HISTORY</div>
                                  {deliverable.reviews.slice(0, 3).map((review, idx) => (
                                    <div key={`${deliverable.deliverableId}:${idx}`} className="text-xs">
                                      {new Date(review.createdAt).toLocaleDateString()} ·{" "}
                                      {review.action.replace("_", " ")}
                                      {review.reason ? ` — ${review.reason}` : ""}
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </>
                          );
                        })()}
                      </div>
                    ) : null}

                    {influencer.stage === "applied" && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-2 font-mono text-[10px]"
                          onMouseDown={(event) => event.stopPropagation()}
                          onClick={() => void handleApprove(influencer.id)}
                        >
                          APPROVE
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-2 font-mono text-[10px] text-destructive"
                          onMouseDown={(event) => event.stopPropagation()}
                          onClick={() => void handleReject(influencer.id)}
                        >
                          REJECT
                        </Button>
                      </div>
                    )}

                    {influencer.stage === "approved" && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-2 font-mono text-[10px]"
                          onMouseDown={(event) => event.stopPropagation()}
                          onClick={() => openShipment(influencer.id)}
                        >
                          OPEN_SHIPMENT
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-2 font-mono text-[10px] text-destructive"
                          onMouseDown={(event) => event.stopPropagation()}
                          onClick={() => void handleReject(influencer.id)}
                        >
                          REJECT
                        </Button>
                      </div>
                    )}

                    {influencer.stage === "posted" && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-2 font-mono text-[10px]"
                          onMouseDown={(event) => event.stopPropagation()}
                          onClick={() => void handleVerifyPost(influencer.id)}
                        >
                          VERIFY
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-2 font-mono text-[10px] text-destructive"
                          onMouseDown={(event) => event.stopPropagation()}
                          onClick={() => openRequestChanges(influencer.id)}
                        >
                          REQUEST_CHANGES
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <AlertDialog open={requestOpen} onOpenChange={setRequestOpen}>
        <AlertDialogContent className="border-4 border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-pixel text-sm text-neon-pink">
              REQUEST CHANGES
            </AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-xs">
              Tell the creator what to fix so they can resubmit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-3">
            <Textarea
              value={requestReason}
              onChange={(event) => setRequestReason(event.target.value)}
              placeholder="Missing brand tag"
              className="border-2 border-border font-mono text-xs min-h-[90px]"
            />
          </div>
          <AlertDialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="border-2 font-mono text-xs"
              onClick={() => {
                setRequestOpen(false);
                setRequestTarget(null);
              }}
            >
              CANCEL
            </Button>
            <Button
              variant="outline"
              className="border-2 font-mono text-xs text-destructive"
              onClick={submitRequestChanges}
            >
              REQUEST CHANGES
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={shipmentOpen}
        onOpenChange={(open) => {
          setShipmentOpen(open);
          if (!open) setShipmentTarget(null);
        }}
      >
        <AlertDialogContent className="border-4 border-border bg-card max-w-2xl w-[95vw]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-pixel text-sm text-neon-yellow">
              SHIPMENT DETAILS
            </AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-xs">
              Add tracking if you have it, then mark the shipment as sent.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {activeShipment ? (
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                <Input
                  value={manualForms[activeShipment.id]?.carrier ?? ""}
                  onChange={(event) =>
                    setManualForms((prev) => ({
                      ...prev,
                      [activeShipment.id]: {
                        ...prev[activeShipment.id],
                        carrier: event.target.value,
                      },
                    }))
                  }
                  placeholder="Carrier (optional)"
                  className="border-2 border-border font-mono text-xs h-11 w-full px-3"
                />
                <Input
                  value={manualForms[activeShipment.id]?.trackingNumber ?? ""}
                  onChange={(event) =>
                    setManualForms((prev) => ({
                      ...prev,
                      [activeShipment.id]: {
                        ...prev[activeShipment.id],
                        trackingNumber: event.target.value,
                      },
                    }))
                  }
                  placeholder="Tracking number (optional)"
                  className="border-2 border-border font-mono text-xs h-11 w-full px-3"
                />
                <Input
                  value={manualForms[activeShipment.id]?.trackingUrl ?? ""}
                  onChange={(event) =>
                    setManualForms((prev) => ({
                      ...prev,
                      [activeShipment.id]: {
                        ...prev[activeShipment.id],
                        trackingUrl: event.target.value,
                      },
                    }))
                  }
                  placeholder="Tracking URL (optional)"
                  className="border-2 border-border font-mono text-xs h-11 w-full px-3"
                />
              </div>
              <div className="flex justify-end pt-3">
                <Button
                  size="sm"
                  className="bg-neon-yellow text-background font-pixel text-xs pixel-btn"
                  onClick={async () => {
                    await handleMarkShipped(activeShipment.match.id);
                    setShipmentOpen(false);
                    setShipmentTarget(null);
                  }}
                >
                  MARK_SHIPPED
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-xs font-mono text-muted-foreground">
              Shipping for this campaign is handled automatically. No manual tracking needed.
            </div>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

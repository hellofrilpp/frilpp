import { useCallback, useEffect, useMemo, useState } from "react";
import { 
  Search,
  MoreVertical,
  Mail,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  Camera,
  Star,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import BrandLayout from "@/components/brand/BrandLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, BrandDeliverable, BrandMatch, BrandShipment, getBrandDeliverables, getBrandMatches, getBrandShipments, approveBrandMatch, rejectBrandMatch, verifyBrandDeliverable, requestBrandDeliverableChanges, updateManualShipment } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type Stage = "applied" | "approved" | "shipped" | "posted" | "complete";

interface Influencer {
  id: string;
  name: string;
  handle: string;
  followers: string;
  campaign: string;
  stage: Stage;
  avatar: string;
  engagement: string;
  distanceKm?: number | null;
  distanceMiles?: number | null;
}

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
  { key: "complete", label: "COMPLETE", icon: Star, color: "border-neon-green bg-neon-green/10" },
];

const BrandPipeline = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<Stage | "all">("all");
  const [draggedInfluencer, setDraggedInfluencer] = useState<Influencer | null>(null);
  const [influencersList, setInfluencersList] = useState<Influencer[]>([]);
  const [manualForms, setManualForms] = useState<Record<string, { carrier: string; trackingNumber: string; trackingUrl: string }>>({});
  const [shipmentOpen, setShipmentOpen] = useState(false);
  const [shipmentTarget, setShipmentTarget] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestReason, setRequestReason] = useState("Missing brand tag");
  const [requestTarget, setRequestTarget] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingMatchesData, error: matchesError } = useQuery({
    queryKey: ["brand-matches", "pending"],
    queryFn: () => getBrandMatches("PENDING_APPROVAL"),
  });
  const { data: acceptedMatchesData } = useQuery({
    queryKey: ["brand-matches", "accepted"],
    queryFn: () => getBrandMatches("ACCEPTED"),
  });
  const { data: shipmentsData } = useQuery({
    queryKey: ["brand-shipments"],
    queryFn: getBrandShipments,
  });
  const { data: dueDeliverablesData } = useQuery({
    queryKey: ["brand-deliverables", "due"],
    queryFn: () => getBrandDeliverables("DUE"),
  });
  const { data: verifiedDeliverablesData } = useQuery({
    queryKey: ["brand-deliverables", "verified"],
    queryFn: () => getBrandDeliverables("VERIFIED"),
  });
  const manualShipmentByMatch = useMemo(() => {
    const shipments = shipmentsData?.shipments ?? [];
    const map = new Map<string, BrandShipment>();
    shipments.forEach((shipment) => {
      if (shipment.fulfillmentType !== "MANUAL") return;
      map.set(shipment.match.id, shipment);
    });
    return map;
  }, [shipmentsData]);

  useEffect(() => {
    if (matchesError instanceof ApiError && matchesError.status === 401) {
      window.location.href = "/brand/auth";
    }
  }, [matchesError]);

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

  const buildInfluencer = useCallback((
    matchId: string,
    name: string,
    username: string | null,
    followersCount: number | null,
    campaign: string,
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
      stage,
      avatar: avatar || "CR",
      engagement: "—",
      distanceKm: distanceKm ?? null,
      distanceMiles: distanceMiles ?? null,
    };
  }, [formatFollowers]);

  const computedInfluencers = useMemo(() => {
    const map = new Map<string, Influencer>();

    const pendingMatches = pendingMatchesData?.matches ?? [];
    const acceptedMatches = acceptedMatchesData?.matches ?? [];
    const shipments = shipmentsData?.shipments ?? [];
    const dueDeliverables = dueDeliverablesData?.deliverables ?? [];
    const verifiedDeliverables = verifiedDeliverablesData?.deliverables ?? [];

    pendingMatches.forEach((match: BrandMatch) => {
      map.set(
        match.matchId,
        buildInfluencer(
          match.matchId,
          match.creator.fullName ?? match.creator.username ?? "Creator",
          match.creator.username ?? null,
          match.creator.followersCount,
          match.offer.title,
          "applied",
          match.creator.distanceKm ?? null,
          match.creator.distanceMiles ?? null,
        ),
      );
    });

    acceptedMatches.forEach((match: BrandMatch) => {
      map.set(
        match.matchId,
        buildInfluencer(
          match.matchId,
          match.creator.fullName ?? match.creator.username ?? "Creator",
          match.creator.username ?? null,
          match.creator.followersCount,
          match.offer.title,
          "approved",
          match.creator.distanceKm ?? null,
          match.creator.distanceMiles ?? null,
        ),
      );
    });

    shipments.forEach((shipment: BrandShipment) => {
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
          "shipped",
          null,
          null,
        ),
      );
    });

    dueDeliverables.forEach((deliverable: BrandDeliverable) => {
      if (!deliverable.submittedAt) return;
      map.set(
        deliverable.match.id,
        buildInfluencer(
          deliverable.match.id,
          deliverable.creator.fullName ?? deliverable.creator.username ?? "Creator",
          deliverable.creator.username ?? null,
          deliverable.creator.followersCount,
          deliverable.offer.title,
          "posted",
          null,
          null,
        ),
      );
    });

    verifiedDeliverables.forEach((deliverable: BrandDeliverable) => {
      map.set(
        deliverable.match.id,
        buildInfluencer(
          deliverable.match.id,
          deliverable.creator.fullName ?? deliverable.creator.username ?? "Creator",
          deliverable.creator.username ?? null,
          deliverable.creator.followersCount,
          deliverable.offer.title,
          "complete",
          null,
          null,
        ),
      );
    });

    return Array.from(map.values());
  }, [
    buildInfluencer,
    pendingMatchesData,
    acceptedMatchesData,
    shipmentsData,
    dueDeliverablesData,
    verifiedDeliverablesData,
  ]);

  const deliverableByMatch = useMemo(() => {
    const deliverables = dueDeliverablesData?.deliverables ?? [];
    return new Map(deliverables.map((deliverable) => [deliverable.match.id, deliverable]));
  }, [dueDeliverablesData]);

  useEffect(() => {
    setInfluencersList(computedInfluencers);
  }, [computedInfluencers]);

  useEffect(() => {
    const next: Record<string, { carrier: string; trackingNumber: string; trackingUrl: string }> = {};
    (shipmentsData?.shipments ?? [])
      .filter((shipment) => shipment.fulfillmentType === "MANUAL" && shipment.status !== "SHIPPED")
      .forEach((shipment) => {
        next[shipment.id] = {
          carrier: shipment.carrier ?? "",
          trackingNumber: shipment.trackingNumber ?? "",
          trackingUrl: shipment.trackingUrl ?? "",
        };
      });
    setManualForms(next);
  }, [shipmentsData]);

  const handleDragStart = (influencer: Influencer) => {
    setDraggedInfluencer(influencer);
  };

  const openShipment = (matchId: string) => {
    if (!manualShipmentByMatch.has(matchId)) {
      toast({
        title: "AUTO SHIPMENT",
        description: "Shipping is handled automatically. No manual tracking needed.",
      });
      return;
    }
    setShipmentTarget(matchId);
    setShipmentOpen(true);
  };

  const activeShipment = useMemo(() => {
    if (!shipmentTarget) return null;
    return manualShipmentByMatch.get(shipmentTarget) ?? null;
  }, [manualShipmentByMatch, shipmentTarget]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (stage: Stage) => {
    if (draggedInfluencer) {
      if (stage === "approved") {
        setInfluencersList(prev => 
          prev.map(inf => 
            inf.id === draggedInfluencer.id ? { ...inf, stage } : inf
          )
        );
        approveBrandMatch(draggedInfluencer.id).catch((err) => {
          const message = err instanceof ApiError ? err.message : "Approve failed";
          toast({ title: "APPROVE FAILED", description: message });
        });
      } else if (stage === "complete") {
        toast({ title: "VERIFY IN DELIVERABLES", description: "Use deliverables to verify posts." });
      } else {
        toast({ title: "NOT AVAILABLE", description: "Move to Approved first, then update shipments/deliverables." });
      }
      setDraggedInfluencer(null);
    }
  };

  const handleApprove = async (matchId: string) => {
    try {
      await approveBrandMatch(matchId);
      setInfluencersList((prev) =>
        prev.map((inf) => (inf.id === matchId ? { ...inf, stage: "approved" } : inf)),
      );
      toast({ title: "APPROVED", description: "Creator approved." });
      await queryClient.invalidateQueries({ queryKey: ["brand-matches", "pending"] });
      await queryClient.invalidateQueries({ queryKey: ["brand-matches", "accepted"] });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Approve failed";
      toast({ title: "APPROVE FAILED", description: message });
    }
  };

  const handleReject = async (matchId: string) => {
    try {
      await rejectBrandMatch(matchId);
      setInfluencersList((prev) => prev.filter((inf) => inf.id !== matchId));
      toast({ title: "REJECTED", description: "Creator rejected." });
      await queryClient.invalidateQueries({ queryKey: ["brand-matches", "pending"] });
      await queryClient.invalidateQueries({ queryKey: ["brand-matches", "accepted"] });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Reject failed";
      toast({ title: "REJECT FAILED", description: message });
    }
  };

  const handleMarkShipped = async (matchId: string) => {
    const shipment = manualShipmentByMatch.get(matchId);
    if (!shipment) {
      toast({ title: "NO MANUAL SHIPMENT", description: "Add a manual shipment in Shipments first." });
      return;
    }
    try {
      const payload = manualForms[shipment.id] ?? {
        carrier: "",
        trackingNumber: "",
        trackingUrl: "",
      };
      await updateManualShipment(shipment.id, {
        status: "SHIPPED",
        carrier: payload.carrier || undefined,
        trackingNumber: payload.trackingNumber || undefined,
        trackingUrl: payload.trackingUrl || undefined,
      });
      toast({ title: "SHIPPED", description: "Tracking saved." });
      await queryClient.invalidateQueries({ queryKey: ["brand-shipments"] });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Update failed";
      toast({ title: "UPDATE FAILED", description: message });
    }
  };

  const handleVerifyPost = async (matchId: string) => {
    const deliverable = deliverableByMatch.get(matchId);
    if (!deliverable || !deliverable.submittedPermalink) {
      toast({ title: "MISSING LINK", description: "Creator has not provided a permalink." });
      return;
    }
    try {
      await verifyBrandDeliverable(deliverable.deliverableId, {
        permalink: deliverable.submittedPermalink ?? undefined,
      });
      toast({ title: "VERIFIED", description: "Deliverable approved." });
      await queryClient.invalidateQueries({ queryKey: ["brand-deliverables"] });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Verify failed";
      toast({ title: "VERIFY FAILED", description: message });
    }
  };

  const openRequestChanges = (matchId: string) => {
    const deliverable = deliverableByMatch.get(matchId);
    if (!deliverable) {
      toast({ title: "MISSING LINK", description: "Creator has not provided a permalink." });
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
      toast({ title: "MISSING LINK", description: "Creator has not provided a permalink." });
      setRequestOpen(false);
      setRequestTarget(null);
      return;
    }
    const reason = requestReason.trim() || undefined;
    try {
      await requestBrandDeliverableChanges(deliverable.deliverableId, { reason });
      toast({ title: "CHANGES REQUESTED", description: "Creator can resubmit." });
      await queryClient.invalidateQueries({ queryKey: ["brand-deliverables"] });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Reject failed";
      toast({ title: "REQUEST FAILED", description: message });
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

  return (
    <BrandLayout>
      <div className="p-6 md:p-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-neon-purple" />
              <span className="text-xs font-pixel text-neon-purple">[PIPELINE]</span>
            </div>
            <h1 className="text-xl md:text-2xl font-pixel text-foreground">WORKFLOW</h1>
            <p className="font-mono text-sm text-muted-foreground mt-1">&gt; Drag creators through stages</p>
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

        {/* Kanban Board */}
        <div className="pb-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {stages.map((stage) => (
              <div
                key={stage.key}
                className="min-w-0"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(stage.key)}
              >
                {/* Column Header */}
                <button
                  type="button"
                  className={`w-full text-left p-4 border-4 ${stage.color} mb-4 bg-card ${
                    stageFilter === stage.key ? "ring-2 ring-primary/60" : ""
                  }`}
                  onClick={() => setStageFilter((prev) => (prev === stage.key ? "all" : stage.key))}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <stage.icon className="w-4 h-4" />
                      <span className="text-xs font-pixel">{stage.label}</span>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground px-2 py-1 bg-muted">
                      {filteredInfluencers.filter((inf) => inf.stage === stage.key).length}
                    </span>
                  </div>
                </button>

                {/* Cards */}
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onMouseDown={(event) => event.stopPropagation()}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="border-2 border-border">
                            <DropdownMenuItem className="font-mono text-xs">
                              <Mail className="w-4 h-4 mr-2" />
                              MESSAGE
                            </DropdownMenuItem>
                            {influencer.stage === "applied" && (
                              <DropdownMenuItem
                                className="font-mono text-xs"
                                onSelect={(event) => {
                                  event.preventDefault();
                                  void handleApprove(influencer.id);
                                }}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                APPROVE
                              </DropdownMenuItem>
                            )}
                            {influencer.stage === "approved" && (
                              <DropdownMenuItem
                                className="font-mono text-xs"
                                onSelect={(event) => {
                                  event.preventDefault();
                                  if ("stopPropagation" in event) {
                                    (event as Event).stopPropagation();
                                  }
                                  openShipment(influencer.id);
                                }}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openShipment(influencer.id);
                                }}
                              >
                                <Package className="w-4 h-4 mr-2" />
                                OPEN_SHIPMENT
                              </DropdownMenuItem>
                            )}
                            {influencer.stage === "posted" && deliverableByMatch.has(influencer.id) && (
                              <>
                                <DropdownMenuItem
                                  className="font-mono text-xs"
                                  onSelect={async (event) => {
                                    event.preventDefault();
                                    await handleVerifyPost(influencer.id);
                                  }}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  VERIFY_POST
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="font-mono text-xs text-destructive"
                                  onSelect={async (event) => {
                                    event.preventDefault();
                                    openRequestChanges(influencer.id);
                                  }}
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  REQUEST_CHANGES
                                </DropdownMenuItem>
                              </>
                            )}
                            {influencer.stage !== "posted" && (
                              <DropdownMenuItem
                                className="font-mono text-xs text-destructive"
                                onSelect={(event) => {
                                  event.preventDefault();
                                  void handleReject(influencer.id);
                                }}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                REJECT
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {formatDistance(influencer) && (
                        <div className="text-xs font-mono text-neon-blue mb-3">
                          Distance: {formatDistance(influencer)}
                        </div>
                      )}

                      <div className="px-2 py-1 bg-muted text-xs font-mono inline-block">
                        {influencer.campaign}
                      </div>

                      {influencer.stage === "posted" && deliverableByMatch.has(influencer.id) && (
                        <div className="mt-3 space-y-2 text-xs font-mono">
                          {(() => {
                            const deliverable = deliverableByMatch.get(influencer.id);
                            const link = normalizeUrl(deliverable?.submittedPermalink ?? null);
                            if (!deliverable) return null;
                            return (
                              <>
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
                                    NOTES: <span className="text-foreground">{deliverable.submittedNotes}</span>
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
                      )}

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
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
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
                <div className="flex justify-end">
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
    </BrandLayout>
  );
};

export default BrandPipeline;

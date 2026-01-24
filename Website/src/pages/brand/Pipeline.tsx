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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const manualShipments = (shipmentsData?.shipments ?? []).filter(
    (shipment) => shipment.fulfillmentType === "MANUAL" && shipment.status !== "SHIPPED",
  );
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

  const handleRequestChanges = async (matchId: string) => {
    const deliverable = deliverableByMatch.get(matchId);
    if (!deliverable) return;
    const reason = window.prompt("What needs to change?", "Missing brand tag") ?? undefined;
    try {
      await requestBrandDeliverableChanges(deliverable.deliverableId, { reason: reason || undefined });
      toast({ title: "CHANGES REQUESTED", description: "Creator can resubmit." });
      await queryClient.invalidateQueries({ queryKey: ["brand-deliverables"] });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Reject failed";
      toast({ title: "REQUEST FAILED", description: message });
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
                                onSelect={async (event) => {
                                  event.preventDefault();
                                  await handleMarkShipped(influencer.id);
                                }}
                              >
                                <Package className="w-4 h-4 mr-2" />
                                MARK_SHIPPED
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
                                    await handleRequestChanges(influencer.id);
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

                      <div className="flex gap-3 text-xs font-mono text-muted-foreground mb-3">
                        <span className="text-neon-green">{influencer.followers}</span>
                        <span>|</span>
                        <span className="text-neon-yellow">{influencer.engagement} eng</span>
                        {formatDistance(influencer) && (
                          <>
                            <span>|</span>
                            <span className="text-neon-blue">
                              {formatDistance(influencer)}
                            </span>
                          </>
                        )}
                      </div>

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

                      {influencer.stage === "approved" && (
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-2 font-mono text-[10px]"
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={() => void handleMarkShipped(influencer.id)}
                          >
                            MARK_SHIPPED
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
                            onClick={() => void handleRequestChanges(influencer.id)}
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
        <div className="mt-8 border-4 border-border bg-card">
          <div className="p-4 border-b-4 border-border flex items-center justify-between">
            <h2 className="font-pixel text-sm text-neon-yellow">[MANUAL_SHIPMENTS]</h2>
            <span className="text-xs font-mono text-muted-foreground">
              {manualShipments.length} pending
            </span>
          </div>
          <div className="divide-y-2 divide-border">
            {manualShipments.length ? (
              manualShipments.map((shipment) => (
                <div key={shipment.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-sm">{shipment.creator.username ?? "Creator"}</p>
                      <p className="text-xs font-mono text-muted-foreground">{shipment.offer.title}</p>
                    </div>
                    <span className="text-xs font-pixel text-neon-yellow">
                      {shipment.status}
                    </span>
                  </div>
                  <div className="grid md:grid-cols-3 gap-3">
                    <Input
                      value={manualForms[shipment.id]?.carrier ?? ""}
                      onChange={(event) =>
                        setManualForms((prev) => ({
                          ...prev,
                          [shipment.id]: {
                            ...prev[shipment.id],
                            carrier: event.target.value,
                          },
                        }))
                      }
                      placeholder="Carrier"
                      className="border-2 border-border font-mono text-xs"
                    />
                    <Input
                      value={manualForms[shipment.id]?.trackingNumber ?? ""}
                      onChange={(event) =>
                        setManualForms((prev) => ({
                          ...prev,
                          [shipment.id]: {
                            ...prev[shipment.id],
                            trackingNumber: event.target.value,
                          },
                        }))
                      }
                      placeholder="Tracking number"
                      className="border-2 border-border font-mono text-xs"
                    />
                    <Input
                      value={manualForms[shipment.id]?.trackingUrl ?? ""}
                      onChange={(event) =>
                        setManualForms((prev) => ({
                          ...prev,
                          [shipment.id]: {
                            ...prev[shipment.id],
                            trackingUrl: event.target.value,
                          },
                        }))
                      }
                      placeholder="Tracking URL"
                      className="border-2 border-border font-mono text-xs"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className="bg-neon-yellow text-background font-pixel text-xs pixel-btn"
                      onClick={async () => {
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
                      }}
                    >
                      MARK_SHIPPED
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-xs font-mono text-muted-foreground">
                Manual shipments will appear here once they’re created.
              </div>
            )}
          </div>
        </div>
      </div>
    </BrandLayout>
  );
};

export default BrandPipeline;

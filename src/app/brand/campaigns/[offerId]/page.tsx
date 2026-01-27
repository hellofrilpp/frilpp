"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy, Pause, Play, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MATCH_REJECTION_REASONS } from "@/lib/picklists";

type BrandOffer = {
  id: string;
  title: string;
  template: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  maxClaims: number | null;
  deadlineDaysAfterDelivery: number;
  acceptanceFollowersThreshold: number | null;
  usageRightsRequired: boolean | null;
  usageRightsScope: string | null;
  metadata: Record<string, unknown> | null;
};

type BrandMatch = {
  matchId: string;
  status: string;
  campaignCode: string;
  createdAt: string;
  rejectionReason: string | null;
  rejectedAt: string | null;
  deliverable: {
    status: string;
    submittedAt: string | null;
    submittedPermalink: string | null;
    submittedNotes: string | null;
    verifiedAt: string | null;
    verifiedPermalink: string | null;
  } | null;
  shipment: {
    orderStatus: string | null;
    orderTrackingNumber: string | null;
    orderTrackingUrl: string | null;
    manualStatus: string | null;
    manualCarrier: string | null;
    manualTrackingNumber: string | null;
    manualTrackingUrl: string | null;
  };
  offer: { id: string; title: string };
  creator: {
    id: string;
    username: string | null;
    followersCount: number | null;
    fullName: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    province: string | null;
    zip: string | null;
    tiktokUserId: string | null;
    shippingReady: boolean;
  };
};

const DEFAULT_REJECTION_REASON = MATCH_REJECTION_REASONS[0] ?? "Not a fit for campaign";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  const data = (await res.json().catch(() => null)) as T;
  if (!res.ok) {
    const error = new Error("Request failed");
    (error as Error & { status?: number }).status = res.status;
    throw error;
  }
  return data;
}

export default function BrandCampaignDetailsPage() {
  const params = useParams<{ offerId: string }>();
  const router = useRouter();
  const offerId = Array.isArray(params?.offerId) ? params.offerId[0] : params?.offerId;

  const [offer, setOffer] = useState<BrandOffer | null>(null);
  const [offerStatus, setOfferStatus] = useState<"idle" | "loading" | "error">("idle");
  const [offerError, setOfferError] = useState<string | null>(null);

  const [matches, setMatches] = useState<BrandMatch[]>([]);
  const [matchesStatus, setMatchesStatus] = useState<"idle" | "loading" | "error">("idle");
  const [matchesError, setMatchesError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; name: string } | null>(null);

  const loadOffer = useCallback(async () => {
    if (!offerId) return;
    setOfferStatus("loading");
    setOfferError(null);
    try {
      const data = await fetchJson<{ ok: boolean; offer: BrandOffer }>(
        `/api/brand/offers/${encodeURIComponent(offerId)}`,
      );
      setOffer(data.offer ?? null);
      setOfferStatus("idle");
    } catch (err) {
      const statusCode =
        err && typeof err === "object" && "status" in err ? (err as { status?: number }).status : undefined;
      if (statusCode === 401) {
        window.location.href = "/brand/auth";
        return;
      }
      setOfferStatus("error");
      setOfferError("Failed to load campaign.");
    }
  }, [offerId]);

  const loadMatches = useCallback(async () => {
    if (!offerId) return;
    setMatchesStatus("loading");
    setMatchesError(null);
    try {
      const data = await fetchJson<{ ok: boolean; matches: BrandMatch[] }>(
        `/api/brand/matches?offerId=${encodeURIComponent(offerId)}`,
      );
      setMatches(data.matches ?? []);
      setMatchesStatus("idle");
    } catch (err) {
      const statusCode =
        err && typeof err === "object" && "status" in err ? (err as { status?: number }).status : undefined;
      if (statusCode === 401) {
        window.location.href = "/brand/auth";
        return;
      }
      setMatchesStatus("error");
      setMatchesError("Failed to load applicants.");
    }
  }, [offerId]);

  useEffect(() => {
    void loadOffer();
    void loadMatches();
  }, [loadOffer, loadMatches]);

  const metadata = useMemo(() => (offer?.metadata ?? {}) as Record<string, unknown>, [offer]);

  const pendingCount = useMemo(
    () => matches.filter((match) => match.status === "PENDING_APPROVAL").length,
    [matches],
  );
  const acceptedCount = useMemo(
    () => matches.filter((match) => match.status === "ACCEPTED").length,
    [matches],
  );
  const completedCount = useMemo(
    () => matches.filter((match) => match.deliverable?.status === "VERIFIED").length,
    [matches],
  );

  const campaignComplete = useMemo(() => {
    if (!matches.length) return false;
    const acceptedMatches = matches.filter((match) => match.status === "ACCEPTED");
    if (!acceptedMatches.length) return false;
    return acceptedMatches.every((match) => match.deliverable?.status === "VERIFIED");
  }, [matches]);

  const presetLabel = useMemo(() => {
    if (!metadata.presetId || typeof metadata.presetId !== "string") return null;
    const map: Record<string, string> = {
      TIKTOK_REVIEW: "TikTok Review",
      UGC_ONLY: "UGC Only",
    };
    return map[metadata.presetId] ?? metadata.presetId;
  }, [metadata.presetId]);

  const listFromMeta = useCallback(
    (key: string) => {
      const raw = metadata[key];
      return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string") : [];
    },
    [metadata],
  );

  const platforms = listFromMeta("platforms");
  const contentTypes = listFromMeta("contentTypes");
  const niches = listFromMeta("niches");
  const hashtags = typeof metadata.hashtags === "string" ? metadata.hashtags : null;
  const guidelines = typeof metadata.guidelines === "string" ? metadata.guidelines : null;
  const fulfillmentType = typeof metadata.fulfillmentType === "string" ? metadata.fulfillmentType : null;
  const manualMethod =
    typeof metadata.manualFulfillmentMethod === "string" ? metadata.manualFulfillmentMethod : null;
  const manualNotes =
    typeof metadata.manualFulfillmentNotes === "string" ? metadata.manualFulfillmentNotes : null;
  const locationRadiusKm =
    typeof metadata.locationRadiusKm === "number" && Number.isFinite(metadata.locationRadiusKm)
      ? metadata.locationRadiusKm
      : null;
  const locationRadiusMiles = locationRadiusKm
    ? Math.round((locationRadiusKm / 1.609344) * 10) / 10
    : null;
  const ctaUrl = typeof metadata.ctaUrl === "string" ? metadata.ctaUrl : null;

  const statusLabel = useMemo(() => {
    if (!offer) return "";
    if (campaignComplete) return "COMPLETE";
    if (offer.status === "PUBLISHED") return "ACTIVE";
    if (offer.status === "ARCHIVED") return "PAUSED";
    return "DRAFT";
  }, [offer, campaignComplete]);

  const formatFollowers = (count?: number | null) => {
    if (!count) return "—";
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return `${count}`;
  };

  const formatStatus = (status?: string) => {
    switch (status) {
      case "PENDING_APPROVAL":
        return "PENDING";
      case "ACCEPTED":
        return "APPROVED";
      case "CLAIMED":
        return "CLAIMED";
      case "REVOKED":
        return "REVOKED";
      case "CANCELED":
        return "CANCELED";
      default:
        return status ?? "—";
    }
  };

  const isMatchShipped = (match: BrandMatch) => {
    const shippedStatuses = new Set(["DRAFT_CREATED", "COMPLETED", "FULFILLED"]);
    const orderShipped =
      match.shipment?.orderStatus && shippedStatuses.has(match.shipment.orderStatus);
    const manualShipped = match.shipment?.manualStatus === "SHIPPED";
    return Boolean(orderShipped || manualShipped);
  };

  const formatMatchStatus = (match: BrandMatch) => {
    if (match.deliverable?.status === "VERIFIED") return "COMPLETE";
    if (match.deliverable?.submittedAt) return "POSTED";
    if (isMatchShipped(match)) return "SHIPPED";
    return formatStatus(match.status);
  };

  const handlePauseResume = async () => {
    if (!offerId || !offer) return;
    const nextStatus = offer.status === "ARCHIVED" ? "PUBLISHED" : "ARCHIVED";
    try {
      await fetchJson(`/api/brand/offers/${encodeURIComponent(offerId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadOffer();
    } catch {
      setOfferError("Update failed.");
    }
  };

  const handleDuplicate = async () => {
    if (!offerId) return;
    try {
      const res = await fetchJson<{ ok: boolean; offerId: string }>(
        `/api/brand/offers/${encodeURIComponent(offerId)}/duplicate`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      router.push(`/brand/campaigns/${res.offerId}`);
    } catch {
      setOfferError("Duplicate failed.");
    }
  };

  const handleArchive = async () => {
    if (!offerId) return;
    const confirmed = window.confirm("Archive campaign?");
    if (!confirmed) return;
    try {
      await fetchJson(`/api/brand/offers/${encodeURIComponent(offerId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      });
      router.push("/brand/campaigns");
    } catch {
      setOfferError("Archive failed.");
    }
  };

  const handlePermanentDelete = async () => {
    if (!offerId || deleteConfirm.trim() !== "DELETE") return;
    try {
      await fetchJson(`/api/brand/offers/${encodeURIComponent(offerId)}`, {
        method: "DELETE",
      });
      router.push("/brand/campaigns");
    } catch {
      setOfferError("Delete failed.");
    } finally {
      setDeleteConfirm("");
      setDeleteOpen(false);
    }
  };

  const handleApprove = async (matchId: string) => {
    try {
      await fetchJson(`/api/brand/matches/${encodeURIComponent(matchId)}/approve`, {
        method: "POST",
      });
      await loadMatches();
    } catch {
      setMatchesError("Approve failed.");
    }
  };

  const handleReject = async (matchId: string) => {
    try {
      await fetchJson(`/api/brand/matches/${encodeURIComponent(matchId)}/reject`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: DEFAULT_REJECTION_REASON }),
      });
      await loadMatches();
    } catch {
      setMatchesError("Reject failed.");
    }
  };

  const handleRejectConfirmed = async () => {
    if (!rejectTarget) return;
    await handleReject(rejectTarget.id);
    setRejectTarget(null);
    setRejectOpen(false);
  };

  if (!offerId) {
    return (
      <div className="p-6 md:p-10">
        <p className="font-mono text-sm text-muted-foreground">Missing campaign id.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          className="border-2 font-mono text-xs"
          onClick={() => router.push("/brand/campaigns")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          BACK
        </Button>
        <div className="flex items-center gap-2">
          {offer?.status === "DRAFT" ? (
            <Button
              variant="outline"
              className="border-2 font-mono text-xs"
              onClick={() => router.push(`/brand/campaigns/new?offerId=${encodeURIComponent(offerId)}`)}
              disabled={!offer || offerStatus === "loading"}
            >
              <Play className="w-4 h-4 mr-2" />
              CONTINUE DRAFT
            </Button>
          ) : (
            <Button
              variant="outline"
              className="border-2 font-mono text-xs"
              onClick={handlePauseResume}
              disabled={!offer || offerStatus === "loading"}
            >
              {offer?.status === "ARCHIVED" ? (
                <Play className="w-4 h-4 mr-2" />
              ) : (
                <Pause className="w-4 h-4 mr-2" />
              )}
              {offer?.status === "ARCHIVED" ? "RESUME" : "PAUSE"}
            </Button>
          )}
          <Button
            variant="outline"
            className="border-2 font-mono text-xs"
            onClick={handleDuplicate}
            disabled={offerStatus === "loading"}
          >
            <Copy className="w-4 h-4 mr-2" />
            DUPLICATE
          </Button>
          <Button
            variant="outline"
            className="border-2 font-mono text-xs text-destructive"
            onClick={handleArchive}
            disabled={offerStatus === "loading"}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            ARCHIVE
          </Button>
          {offer?.status === "DRAFT" ? (
            <Button
              variant="outline"
              className="border-2 font-mono text-xs text-destructive"
              onClick={() => setDeleteOpen(true)}
              disabled={offerStatus === "loading"}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              DELETE PERMANENTLY
            </Button>
          ) : null}
        </div>
      </div>

      <div className="border-4 border-border bg-card p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <h1 className="font-pixel text-lg text-foreground">{offer?.title ?? "Loading..."}</h1>
            <p className="font-mono text-xs text-muted-foreground">&gt; Campaign details</p>
          </div>
          <span className="px-2 py-1 text-xs font-pixel border-2 border-border inline-block">
            {statusLabel || "—"}
          </span>
        </div>

        {offerError ? (
          <p className="font-mono text-sm text-destructive">{offerError}</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 font-mono text-xs text-muted-foreground">
            <div className="space-y-2">
              <div>
                <span className="text-foreground">Preset:</span> {presetLabel ?? "—"}
              </div>
              <div>
                <span className="text-foreground">Template:</span> {offer?.template ?? "—"}
              </div>
              <div>
                <span className="text-foreground">Max claims:</span> {offer?.maxClaims ?? "—"}
              </div>
              <div>
                <span className="text-foreground">Deadline:</span>{" "}
                {offer ? `${offer.deadlineDaysAfterDelivery} days after delivery` : "—"}
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-foreground">Minimum followers:</span>{" "}
                {offer?.acceptanceFollowersThreshold ?? "—"}
              </div>
              <div>
                <span className="text-foreground">Usage rights required:</span>{" "}
                {offer ? String(offer.usageRightsRequired) : "—"}
              </div>
              <div>
                <span className="text-foreground">Usage rights scope:</span>{" "}
                {offer?.usageRightsScope ?? "—"}
              </div>
            </div>
          </div>
        )}
      </div>

      {offer ? (
        <div className="border-4 border-border bg-card p-6 space-y-4">
          <div className="text-sm font-pixel text-neon-green">CONTENT DETAILS</div>
          <div className="grid md:grid-cols-2 gap-4 font-mono text-xs text-muted-foreground">
            <div className="space-y-2">
              <div>
                <span className="text-foreground">Platforms:</span>{" "}
                {platforms.length ? platforms.join(", ") : "—"}
              </div>
              <div>
                <span className="text-foreground">Content types:</span>{" "}
                {contentTypes.length ? contentTypes.join(", ") : "—"}
              </div>
              <div>
                <span className="text-foreground">Niches:</span>{" "}
                {niches.length ? niches.join(", ") : "—"}
              </div>
              <div>
                <span className="text-foreground">Hashtags:</span>{" "}
                {hashtags?.trim() ? hashtags : "—"}
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-foreground">Guidelines:</span>{" "}
                {guidelines?.trim() ? guidelines : "—"}
              </div>
              <div>
                <span className="text-foreground">Fulfillment:</span>{" "}
                {fulfillmentType ? fulfillmentType : "—"}
              </div>
              <div>
                <span className="text-foreground">Manual method:</span>{" "}
                {manualMethod ?? "—"}
              </div>
              <div>
                <span className="text-foreground">Manual notes:</span>{" "}
                {manualNotes?.trim() ? manualNotes : "—"}
              </div>
              <div>
                <span className="text-foreground">Radius:</span>{" "}
                {locationRadiusMiles ? `${locationRadiusMiles} mi` : "Global"}
              </div>
              <div>
                <span className="text-foreground">CTA URL:</span>{" "}
                {ctaUrl?.trim() ? ctaUrl : "—"}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="border-4 border-border bg-card p-6 space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="text-sm font-pixel text-neon-pink">APPLICANTS</div>
          <div className="font-mono text-xs text-muted-foreground">
            {matches.length} total · {pendingCount} pending · {acceptedCount} approved · {completedCount} complete
          </div>
        </div>
        {matchesStatus === "loading" ? (
          <p className="font-mono text-xs text-muted-foreground">Loading applicants...</p>
        ) : matchesStatus === "error" ? (
          <p className="font-mono text-xs text-destructive">{matchesError ?? "Failed to load applicants"}</p>
        ) : matches.length ? (
          <div className="grid gap-3">
            {matches.map((match) => (
              <div
                key={match.matchId}
                className="border-2 border-border bg-background/60 p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <div className="font-pixel text-xs text-foreground">
                    {match.creator.username ? `@${match.creator.username}` : "Creator"}
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    Name: {match.creator.fullName || "—"}
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    Email: {match.creator.email || "—"}
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    Phone: {match.creator.phone || "—"}
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    Followers: {formatFollowers(match.creator.followersCount)}
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    TikTok ID: {match.creator.tiktokUserId ?? "not connected"}
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    Shipping: {match.creator.shippingReady ? "ready" : "needs address"}
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    Location: {[match.creator.city, match.creator.province, match.creator.zip]
                      .filter((value) => typeof value === "string" && value.trim().length > 0)
                      .join(", ") || "—"}
                  </div>
                  {match.status === "REVOKED" ? (
                    <div className="font-mono text-[11px] text-destructive">
                      Rejection: {match.rejectionReason ?? "—"}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 text-[10px] font-pixel border-2 border-border">
                      {formatMatchStatus(match)}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {new Date(match.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {match.deliverable ? (
                    <div className="w-full border-2 border-border bg-muted p-2 text-[11px] font-mono text-muted-foreground">
                      {match.deliverable.submittedPermalink ? (
                        <div>
                          <span className="text-foreground">POST:</span>{" "}
                          <a
                            href={match.deliverable.submittedPermalink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-neon-green underline"
                          >
                            Open submitted
                          </a>
                        </div>
                      ) : null}
                      {match.deliverable.verifiedPermalink ? (
                        <div>
                          <span className="text-foreground">VERIFIED:</span>{" "}
                          <a
                            href={match.deliverable.verifiedPermalink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-neon-green underline"
                          >
                            Open verified
                          </a>
                        </div>
                      ) : null}
                      {match.deliverable.submittedNotes ? (
                        <div>
                          <span className="text-foreground">NOTES:</span> {match.deliverable.submittedNotes}
                        </div>
                      ) : null}
                      {match.deliverable.verifiedAt ? (
                        <div>
                          <span className="text-foreground">VERIFIED AT:</span>{" "}
                          {new Date(match.deliverable.verifiedAt).toLocaleString()}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {match.status === "PENDING_APPROVAL" ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-2 font-mono text-[10px]"
                        onClick={() => handleApprove(match.matchId)}
                      >
                        APPROVE
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-2 font-mono text-[10px] text-destructive"
                        onClick={() => handleReject(match.matchId)}
                      >
                        REJECT
                      </Button>
                    </div>
                  ) : match.status === "ACCEPTED" ? (
                    <div className="flex items-center gap-2">
                      {!isMatchShipped(match) && match.deliverable?.status !== "VERIFIED" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-2 font-mono text-[10px] text-destructive"
                          onClick={() => {
                            setRejectTarget({
                              id: match.matchId,
                              name: match.creator.username
                                ? `@${match.creator.username}`
                                : match.creator.fullName || "Creator",
                            });
                            setRejectOpen(true);
                          }}
                        >
                          REJECT
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="font-mono text-xs text-muted-foreground">No applications yet.</p>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="border-4 border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-pixel text-sm text-neon-pink">
              DELETE DRAFT CAMPAIGN
            </AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-xs">
              This permanently deletes the draft campaign. Type DELETE to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-3">
            <Input
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value)}
              placeholder="DELETE"
              className="border-2 border-border font-mono text-xs"
            />
          </div>
          <AlertDialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="border-2 font-mono text-xs"
              onClick={() => {
                setDeleteConfirm("");
                setDeleteOpen(false);
              }}
            >
              CANCEL
            </Button>
            <Button
              variant="outline"
              className="border-2 font-mono text-xs text-destructive"
              onClick={handlePermanentDelete}
              disabled={deleteConfirm.trim() !== "DELETE"}
            >
              DELETE PERMANENTLY
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent className="border-4 border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-pixel text-sm text-neon-pink">
              REJECT CREATOR
            </AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-xs">
              This removes{" "}
              <span className="text-foreground">{rejectTarget?.name ?? "this creator"}</span>{" "}
              from the campaign and prevents them from re-applying.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="border-2 font-mono text-xs"
              onClick={() => {
                setRejectTarget(null);
                setRejectOpen(false);
              }}
            >
              CANCEL
            </Button>
            <Button
              variant="outline"
              className="border-2 font-mono text-xs text-destructive"
              onClick={handleRejectConfirmed}
              disabled={!rejectTarget}
            >
              REJECT
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

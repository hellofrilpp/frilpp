import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Copy, Pause, Play, Trash2 } from "lucide-react";

import BrandLayout from "@/components/brand/BrandLayout";
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
import {
  ApiError,
  deleteBrandOffer,
  duplicateBrandOffer,
  getBrandMatchesByOffer,
  getBrandOffer,
  approveBrandMatch,
  rejectBrandMatch,
  updateBrandOffer,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const BrandCampaignDetails = () => {
  const { offerId } = useParams<{ offerId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data, error, refetch, isLoading } = useQuery({
    queryKey: ["brand-offer", offerId],
    queryFn: () => getBrandOffer(offerId as string),
    enabled: Boolean(offerId),
  });
  const {
    data: matchesData,
    error: matchesError,
    isLoading: matchesLoading,
    refetch: refetchMatches,
  } = useQuery({
    queryKey: ["brand-offer-matches", offerId],
    queryFn: () => getBrandMatchesByOffer(offerId as string),
    enabled: Boolean(offerId),
  });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      window.location.href = "/brand/auth";
    }
  }, [error]);

  const offer = data?.offer;
  const metadata = (offer?.metadata ?? {}) as Record<string, unknown>;
  const matches = matchesData?.matches ?? [];

  const pendingCount = useMemo(
    () => matches.filter((match) => match.status === "PENDING_APPROVAL").length,
    [matches],
  );
  const acceptedCount = useMemo(
    () => matches.filter((match) => match.status === "ACCEPTED").length,
    [matches],
  );

  const presetLabel = useMemo(() => {
    if (!metadata.presetId || typeof metadata.presetId !== "string") return null;
    const map: Record<string, string> = {
      TIKTOK_REVIEW: "TikTok Review",
      UGC_ONLY: "UGC Only",
    };
    return map[metadata.presetId] ?? metadata.presetId;
  }, [metadata.presetId]);

  const listFromMeta = (key: string) => {
    const raw = metadata[key];
    return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string") : [];
  };

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
  const locationRadiusMiles = locationRadiusKm ? Math.round((locationRadiusKm / 1.609344) * 10) / 10 : null;
  const ctaUrl = typeof metadata.ctaUrl === "string" ? metadata.ctaUrl : null;

  const statusLabel = useMemo(() => {
    if (!offer) return "";
    if (offer.status === "PUBLISHED") return "ACTIVE";
    if (offer.status === "ARCHIVED") return "PAUSED";
    return "DRAFT";
  }, [offer]);

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

  const handlePauseResume = async () => {
    if (!offerId || !offer) return;
    const nextStatus = offer.status === "ARCHIVED" ? "PUBLISHED" : "ARCHIVED";
    try {
      await updateBrandOffer(offerId, { status: nextStatus });
      await refetch();
      toast({
        title: nextStatus === "PUBLISHED" ? "RESUMED" : "PAUSED",
        description: "Campaign updated.",
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Update failed";
      toast({ title: "UPDATE FAILED", description: message });
    }
  };

  const handleDuplicate = async () => {
    if (!offerId) return;
    try {
      const res = await duplicateBrandOffer(offerId);
      toast({ title: "DUPLICATED", description: "Campaign duplicated." });
      navigate(`/brand/campaigns/${res.offerId}`);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Duplicate failed";
      toast({ title: "DUPLICATE FAILED", description: message });
    }
  };

  const handleArchive = async () => {
    if (!offerId) return;
    const confirmed = window.confirm("Archive campaign?");
    if (!confirmed) return;
    try {
      await updateBrandOffer(offerId, { status: "ARCHIVED" });
      toast({ title: "ARCHIVED", description: "Campaign archived." });
      navigate("/brand/campaigns");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Archive failed";
      toast({ title: "ARCHIVE FAILED", description: message });
    }
  };

  const handlePermanentDelete = async () => {
    if (!offerId) return;
    if (deleteConfirm.trim() !== "DELETE") return;
    try {
      await deleteBrandOffer(offerId);
      toast({ title: "DELETED", description: "Draft campaign permanently deleted." });
      navigate("/brand/campaigns");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Delete failed";
      toast({ title: "DELETE FAILED", description: message });
    } finally {
      setDeleteConfirm("");
      setDeleteOpen(false);
    }
  };

  const handleApprove = async (matchId: string) => {
    try {
      await approveBrandMatch(matchId);
      toast({ title: "APPROVED", description: "Creator approved for this campaign." });
      await refetchMatches();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Approval failed";
      toast({ title: "APPROVE FAILED", description: message });
    }
  };

  const handleReject = async (matchId: string) => {
    try {
      await rejectBrandMatch(matchId);
      toast({ title: "REJECTED", description: "Creator rejected for this campaign." });
      await refetchMatches();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Reject failed";
      toast({ title: "REJECT FAILED", description: message });
    }
  };

  if (!offerId) {
    return (
      <BrandLayout>
        <div className="p-6 md:p-10">
          <p className="font-mono text-sm text-muted-foreground">Missing campaign id.</p>
        </div>
      </BrandLayout>
    );
  }

  return (
    <BrandLayout>
      <div className="p-6 md:p-10 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Button variant="outline" className="border-2 font-mono text-xs" asChild>
            <Link to="/brand/campaigns">
              <ArrowLeft className="w-4 h-4 mr-2" />
              BACK
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            {offer?.status === "DRAFT" ? (
              <Button
                variant="outline"
                className="border-2 font-mono text-xs"
                onClick={() => navigate(`/brand/campaigns/new?offerId=${encodeURIComponent(offerId ?? "")}`)}
                disabled={!offer || isLoading}
              >
                <Play className="w-4 h-4 mr-2" />
                CONTINUE DRAFT
              </Button>
            ) : (
              <Button
                variant="outline"
                className="border-2 font-mono text-xs"
                onClick={handlePauseResume}
                disabled={!offer || isLoading}
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
              disabled={isLoading}
            >
              <Copy className="w-4 h-4 mr-2" />
              DUPLICATE
            </Button>
            <Button
              variant="outline"
              className="border-2 font-mono text-xs text-destructive"
              onClick={handleArchive}
              disabled={isLoading}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              ARCHIVE
            </Button>
            {offer?.status === "DRAFT" && (
              <Button
                variant="outline"
                className="border-2 font-mono text-xs text-destructive"
                onClick={() => setDeleteOpen(true)}
                disabled={isLoading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                DELETE PERMANENTLY
              </Button>
            )}
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

          {error ? (
            <p className="font-mono text-sm text-destructive">
              {error instanceof ApiError ? error.message : "Failed to load campaign"}
            </p>
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
                  <span className="text-foreground">Followers threshold:</span>{" "}
                  {offer?.acceptanceFollowersThreshold ?? "—"}
                </div>
                <div>
                  <span className="text-foreground">Auto-accept above threshold:</span>{" "}
                  {offer ? String(offer.acceptanceAboveThresholdAutoAccept) : "—"}
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
              {matches.length} total · {pendingCount} pending · {acceptedCount} approved
            </div>
          </div>
          {matchesLoading ? (
            <p className="font-mono text-xs text-muted-foreground">Loading applicants...</p>
          ) : matchesError ? (
            <p className="font-mono text-xs text-destructive">
              {matchesError instanceof ApiError ? matchesError.message : "Failed to load applicants"}
            </p>
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
                      Shipping: {match.creator.shippingReady ? "ready" : "needs address"}
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      Location: {[match.creator.city, match.creator.province, match.creator.zip]
                        .filter((value) => typeof value === "string" && value.trim().length > 0)
                        .join(", ") || "—"}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-[10px] font-pixel border-2 border-border">
                        {formatStatus(match.status)}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {new Date(match.createdAt).toLocaleDateString()}
                      </span>
                    </div>
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
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-mono text-xs text-muted-foreground">No applications yet.</p>
          )}
        </div>
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
    </BrandLayout>
  );
};

export default BrandCampaignDetails;

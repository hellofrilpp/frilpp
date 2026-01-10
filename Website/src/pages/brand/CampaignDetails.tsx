import { useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Copy, Pause, Play, Trash2 } from "lucide-react";

import BrandLayout from "@/components/brand/BrandLayout";
import { Button } from "@/components/ui/button";
import { ApiError, duplicateBrandOffer, getBrandOffer, updateBrandOffer } from "@/lib/api";
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

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401) {
      window.location.href = "/brand/auth";
    }
  }, [error]);

  const offer = data?.offer;

  const statusLabel = useMemo(() => {
    if (!offer) return "";
    if (offer.status === "PUBLISHED") return "ACTIVE";
    if (offer.status === "ARCHIVED") return "PAUSED";
    return "DRAFT";
  }, [offer]);

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

  const handleDelete = async () => {
    if (!offerId) return;
    const confirmed = window.confirm("Delete campaign? This will archive it.");
    if (!confirmed) return;
    try {
      await updateBrandOffer(offerId, { status: "ARCHIVED" });
      toast({ title: "DELETED", description: "Campaign archived." });
      navigate("/brand/campaigns");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Delete failed";
      toast({ title: "DELETE FAILED", description: message });
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
              onClick={handleDelete}
              disabled={isLoading}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              DELETE
            </Button>
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
                  <span className="text-foreground">Template:</span> {offer?.template ?? "—"}
                </div>
                <div>
                  <span className="text-foreground">Countries:</span>{" "}
                  {offer?.countriesAllowed?.join(", ") ?? "—"}
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
      </div>
    </BrandLayout>
  );
};

export default BrandCampaignDetails;


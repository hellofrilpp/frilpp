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
import InfluencerLayout from "@/components/influencer/InfluencerLayout";
import { useQuery } from "@tanstack/react-query";
import { ApiError, CreatorDeal, apiUrl, getCreatorDeals } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type DealStatus = "pending" | "approved" | "shipped" | "post_required" | "complete";

interface Deal {
  id: string;
  brand: string;
  product: string;
  value: string;
  status: DealStatus;
  matchDate: string;
  deadline?: string;
  trackingNumber?: string;
}

const statusConfig: Record<DealStatus, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: "PENDING", icon: Clock, color: "border-border text-muted-foreground" },
  approved: { label: "APPROVED", icon: CheckCircle, color: "border-neon-blue text-neon-blue" },
  shipped: { label: "SHIPPED", icon: Truck, color: "border-neon-yellow text-neon-yellow bg-neon-yellow/10" },
  post_required: { label: "POST NOW", icon: Camera, color: "bg-neon-pink text-background" },
  complete: { label: "COMPLETE", icon: Star, color: "bg-neon-green text-background" },
};

const InfluencerDeals = () => {
  const { toast } = useToast();
  const { data, error, isLoading } = useQuery({
    queryKey: ["creator-deals"],
    queryFn: getCreatorDeals,
  });
  const [filter, setFilter] = useState<DealStatus | "all">("all");

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
    }));
  }, [data]);

  const filteredDeals = filter === "all" ? deals : deals.filter(deal => deal.status === filter);

  const activeDeals = deals.filter(d => d.status !== "complete").length;
  const completedDeals = deals.filter(d => d.status === "complete").length;
  const totalValue = deals.reduce((sum, d) => sum + parseInt(d.value.replace("$", "")), 0);

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
          {(["all", "pending", "approved", "shipped", "post_required", "complete"] as const).map((status) => (
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
                  <div className="p-4 flex items-start gap-4">
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
                      {deal.status === "shipped" && deal.trackingNumber && (
                        <div className="mt-3 p-2 bg-muted text-xs font-mono border-2 border-border">
                          <span className="text-muted-foreground">TRACKING: </span>
                          <span className="text-neon-yellow">{deal.trackingNumber}</span>
                        </div>
                      )}

                      {deal.status === "post_required" && deal.deadline && (
                        <div className="mt-3 flex items-center gap-2 text-neon-pink">
                          <Camera className="w-4 h-4" />
                          <span className="text-xs font-mono">DUE: {deal.deadline}</span>
                        </div>
                      )}
                    </div>

                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </div>

                  {/* Action Buttons */}
                  {deal.status === "post_required" && (
                    <div className="px-4 pb-4">
                      <Button className="w-full bg-neon-pink text-background font-pixel text-xs pixel-btn glow-pink">
                        <Camera className="w-4 h-4 mr-2" />
                        SUBMIT CONTENT
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
    </InfluencerLayout>
  );
};

export default InfluencerDeals;

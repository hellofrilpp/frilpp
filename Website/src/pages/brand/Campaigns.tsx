import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { 
  Plus, 
  Search,
  MoreVertical,
  Eye,
  Pause,
  Copy,
  Trash2,
  Package,
  Play
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
import { useQuery } from "@tanstack/react-query";
import { ApiError, BrandOffer, duplicateBrandOffer, getBrandDeliverables, getBrandMatches, getBrandOffers, updateBrandOffer } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const BrandCampaigns = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const { toast } = useToast();

  const { data: offersData, error: offersError, refetch } = useQuery({
    queryKey: ["brand-offers"],
    queryFn: getBrandOffers,
  });
  const { data: pendingMatchesData } = useQuery({
    queryKey: ["brand-matches", "pending"],
    queryFn: () => getBrandMatches("PENDING_APPROVAL"),
  });
  const { data: acceptedMatchesData } = useQuery({
    queryKey: ["brand-matches", "accepted"],
    queryFn: () => getBrandMatches("ACCEPTED"),
  });
  const { data: verifiedDeliverablesData } = useQuery({
    queryKey: ["brand-deliverables", "verified"],
    queryFn: () => getBrandDeliverables("VERIFIED"),
  });

  if (offersError instanceof ApiError && offersError.status === 401) {
    window.location.href = "/brand/auth";
  }

  const statusLabel = (status: BrandOffer["status"]) => {
    if (status === "PUBLISHED") return "active";
    if (status === "ARCHIVED") return "paused";
    return "draft";
  };

  const templateLabel = (template: BrandOffer["template"]) => {
    switch (template) {
      case "REEL_PLUS_STORY":
        return "1 Reel + Story";
      case "REEL":
        return "1 Reel";
      case "FEED":
        return "1 Feed post";
      default:
        return "UGC only";
    }
  };

  const campaigns = useMemo(() => {
    const offers = offersData?.offers ?? [];
    const pendingMatches = pendingMatchesData?.matches ?? [];
    const acceptedMatches = acceptedMatchesData?.matches ?? [];
    const verified = verifiedDeliverablesData?.deliverables ?? [];

    const pendingByOffer = pendingMatches.reduce<Record<string, number>>((acc, match) => {
      acc[match.offer.id] = (acc[match.offer.id] ?? 0) + 1;
      return acc;
    }, {});

    const acceptedByOffer = acceptedMatches.reduce<Record<string, number>>((acc, match) => {
      acc[match.offer.id] = (acc[match.offer.id] ?? 0) + 1;
      return acc;
    }, {});

    const completeByOffer = verified.reduce<Record<string, number>>((acc, deliverable) => {
      const offerId = offers.find((offer) => offer.title === deliverable.offer.title)?.id;
      if (!offerId) return acc;
      acc[offerId] = (acc[offerId] ?? 0) + 1;
      return acc;
    }, {});

    return offers.map((offer) => ({
      id: offer.id,
      name: offer.title,
      product: offer.title,
      value: "$0",
      requirements: templateLabel(offer.template),
      status: statusLabel(offer.status),
      matches: acceptedByOffer[offer.id] ?? 0,
      pending: pendingByOffer[offer.id] ?? 0,
      complete: completeByOffer[offer.id] ?? 0,
      rawStatus: offer.status,
    }));
  }, [offersData, pendingMatchesData, acceptedMatchesData, verifiedDeliverablesData]);

  const handleStatusChange = async (offerId: string, status: "PUBLISHED" | "ARCHIVED") => {
    try {
      await updateBrandOffer(offerId, { status });
      await refetch();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Update failed";
      toast({ title: "UPDATE FAILED", description: message });
    }
  };

  const handleDuplicate = async (offerId: string) => {
    try {
      await duplicateBrandOffer(offerId);
      await refetch();
      toast({ title: "DUPLICATED", description: "Campaign duplicated." });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Duplicate failed";
      toast({ title: "DUPLICATE FAILED", description: message });
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "all" || campaign.status === filter;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-neon-green text-background';
      case 'paused': return 'bg-neon-yellow/20 text-neon-yellow border-2 border-neon-yellow';
      case 'draft': return 'border-2 border-border text-muted-foreground';
      default: return '';
    }
  };

  return (
    <BrandLayout>
      <div className="p-6 md:p-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5 text-neon-pink" />
              <span className="text-xs font-pixel text-neon-pink">[CAMPAIGNS]</span>
            </div>
            <h1 className="text-xl md:text-2xl font-pixel text-foreground">YOUR OFFERS</h1>
            <p className="font-mono text-sm text-muted-foreground mt-1">&gt; Manage product seeding campaigns</p>
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-pixel text-xs px-6 pixel-btn glow-green" asChild>
            <Link to="/brand/campaigns/new">
              <Plus className="w-4 h-4 mr-2" />
              NEW CAMPAIGN
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="SEARCH_CAMPAIGNS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-2 border-border font-mono text-sm focus:border-primary"
            />
          </div>
          <div className="flex gap-2">
            {["all", "active", "paused", "draft"].map((status) => (
              <Button
                key={status}
                variant="outline"
                size="sm"
                onClick={() => setFilter(status)}
                className={`font-mono text-xs border-2 ${
                  filter === status 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : 'border-border hover:border-primary'
                }`}
              >
                {status.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        {/* Campaigns Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCampaigns.map((campaign) => (
            <div 
              key={campaign.id} 
              className="border-4 border-border bg-card p-5 hover:border-neon-pink transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 border-4 border-neon-purple bg-neon-purple/10 flex items-center justify-center">
                  <Package className="w-7 h-7 text-neon-purple" />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-pixel ${getStatusColor(campaign.status)}`}>
                    {campaign.status.toUpperCase()}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 border-2 border-transparent hover:border-border">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="border-2 border-border">
                      <DropdownMenuItem className="font-mono text-xs">
                        <Eye className="w-4 h-4 mr-2" />
                        VIEW
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="font-mono text-xs"
                        onClick={() => {
                          if (campaign.rawStatus === "ARCHIVED") {
                            handleStatusChange(campaign.id, "PUBLISHED");
                          } else {
                            handleStatusChange(campaign.id, "ARCHIVED");
                          }
                        }}
                      >
                        {campaign.status === "paused" ? (
                          <Play className="w-4 h-4 mr-2" />
                        ) : (
                          <Pause className="w-4 h-4 mr-2" />
                        )}
                        {campaign.status === "paused" ? "RESUME" : "PAUSE"}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="font-mono text-xs" onClick={() => handleDuplicate(campaign.id)}>
                        <Copy className="w-4 h-4 mr-2" />
                        DUPLICATE
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="font-mono text-xs text-destructive"
                        onClick={() => handleStatusChange(campaign.id, "ARCHIVED")}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        DELETE
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <h3 className="font-pixel text-sm mb-1 text-foreground group-hover:text-neon-pink transition-colors">{campaign.name}</h3>
              <p className="text-xs font-mono text-muted-foreground mb-4">{campaign.product}</p>

              <div className="flex gap-3 text-xs font-mono text-muted-foreground mb-4">
                <span className="text-neon-yellow">{campaign.value}</span>
                <span>|</span>
                <span>{campaign.requirements}</span>
              </div>

              <div className="flex gap-4 text-xs font-mono">
                <div>
                  <span className="text-lg font-pixel text-neon-green">{campaign.matches}</span>
                  <span className="text-muted-foreground ml-1">match</span>
                </div>
                <div>
                  <span className="text-lg font-pixel text-neon-yellow">{campaign.pending}</span>
                  <span className="text-muted-foreground ml-1">pend</span>
                </div>
                <div>
                  <span className="text-lg font-pixel text-neon-pink">{campaign.complete}</span>
                  <span className="text-muted-foreground ml-1">done</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4 h-2 bg-muted flex overflow-hidden">
                <div className="h-full bg-neon-green" style={{ width: `${(campaign.complete / Math.max(campaign.matches, 1)) * 100}%` }} />
                <div className="h-full bg-neon-yellow" style={{ width: `${(campaign.pending / Math.max(campaign.matches, 1)) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </BrandLayout>
  );
};

export default BrandCampaigns;

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  Package, 
  Users, 
  Camera, 
  TrendingUp,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandLayout from "@/components/brand/BrandLayout";
import { useQuery } from "@tanstack/react-query";
import { ApiError, getBrandDeliverables, getBrandMatches, getBrandOffers, getCreatorRecommendations } from "@/lib/api";

const BrandDashboard = () => {
  const { data: offersData, error: offersError } = useQuery({
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
  const {
    data: recommendationsData,
    refetch: refetchRecommendations,
    isFetching: recommendationsLoading,
  } = useQuery({
    queryKey: ["creator-recommendations"],
    queryFn: () => getCreatorRecommendations({ limit: 5 }),
    enabled: false,
  });

  if (offersError instanceof ApiError && offersError.status === 401) {
    window.location.href = "/brand/auth";
  }

  const offers = offersData?.offers ?? [];
  const pendingMatches = pendingMatchesData?.matches ?? [];
  const acceptedMatches = acceptedMatchesData?.matches ?? [];
  const verifiedDeliverables = verifiedDeliverablesData?.deliverables ?? [];

  const reachEstimate = acceptedMatches.reduce((sum, match) => sum + (match.creator.followersCount ?? 0), 0);
  const formatReach = (value: number) => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return `${value}`;
  };

  const stats = useMemo(
    () => [
      {
        label: "ACTIVE CAMPAIGNS",
        value: `${offers.filter((offer) => offer.status === "PUBLISHED").length}`,
        icon: Package,
        change: `${offers.length} total`,
        color: "neon-green",
      },
      {
        label: "PENDING MATCHES",
        value: `${pendingMatches.length}`,
        icon: Users,
        change: `${pendingMatches.length} awaiting`,
        color: "neon-pink",
      },
      {
        label: "CONTENT RECEIVED",
        value: `${verifiedDeliverables.length}`,
        icon: Camera,
        change: `${verifiedDeliverables.length} verified`,
        color: "neon-purple",
      },
      {
        label: "EST. REACH",
        value: formatReach(reachEstimate),
        icon: TrendingUp,
        change: `${acceptedMatches.length} active`,
        color: "neon-yellow",
      },
    ],
    [offers, pendingMatches.length, verifiedDeliverables.length, reachEstimate, acceptedMatches.length],
  );

  const recentActivity = useMemo(() => {
    const items = [
      ...pendingMatches.map((match) => ({
        message: `${match.creator.username ?? "Creator"} matched ${match.offer.title}`,
        time: match.createdAt,
        status: "pending",
      })),
      ...verifiedDeliverables.map((deliverable) => ({
        message: `Content verified for ${deliverable.offer.title}`,
        time: deliverable.verifiedAt ?? deliverable.dueAt,
        status: "complete",
      })),
    ];
    return items
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 4)
      .map((item) => ({
        ...item,
        time: new Date(item.time).toLocaleDateString(),
      }));
  }, [pendingMatches, verifiedDeliverables]);

  const activeCampaigns = useMemo(() => {
    const acceptedByOffer = acceptedMatches.reduce<Record<string, number>>((acc, match) => {
      acc[match.offer.title] = (acc[match.offer.title] ?? 0) + 1;
      return acc;
    }, {});
    const pendingByOffer = pendingMatches.reduce<Record<string, number>>((acc, match) => {
      acc[match.offer.title] = (acc[match.offer.title] ?? 0) + 1;
      return acc;
    }, {});
    const completeByOffer = verifiedDeliverables.reduce<Record<string, number>>((acc, deliverable) => {
      acc[deliverable.offer.title] = (acc[deliverable.offer.title] ?? 0) + 1;
      return acc;
    }, {});

    return offers.slice(0, 3).map((offer) => ({
      name: offer.title,
      matches: acceptedByOffer[offer.title] ?? 0,
      pending: pendingByOffer[offer.title] ?? 0,
      shipped: 0,
      complete: completeByOffer[offer.title] ?? 0,
    }));
  }, [offers, acceptedMatches, pendingMatches, verifiedDeliverables]);
  return (
    <BrandLayout>
      <div className="p-6 md:p-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-neon-green animate-pulse-neon" />
              <span className="text-xs font-pixel text-neon-green">[DASHBOARD]</span>
            </div>
            <h1 className="text-xl md:text-2xl font-pixel text-foreground">WELCOME BACK</h1>
            <p className="font-mono text-sm text-muted-foreground mt-1">&gt; Campaign status: ACTIVE</p>
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-pixel text-xs px-6 pixel-btn glow-green" asChild>
            <Link to="/brand/campaigns/new">
              <Plus className="w-4 h-4 mr-2" />
              NEW CAMPAIGN
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className={`p-5 border-4 border-border bg-card hover:border-${stat.color} transition-all group`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 border-2 border-${stat.color} bg-${stat.color}/10 flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}`} />
                </div>
                <span className="text-xs font-pixel text-muted-foreground">[{String(index + 1).padStart(2, '0')}]</span>
              </div>
              <p className={`text-2xl font-pixel mb-1 text-${stat.color}`}>{stat.value}</p>
              <p className="text-xs font-mono text-muted-foreground mb-2">{stat.label}</p>
              <p className="text-xs font-mono text-neon-green">{stat.change}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 border-4 border-border bg-card">
            <div className="p-4 border-b-4 border-border flex items-center justify-between">
              <h2 className="font-pixel text-sm text-neon-purple">[ACTIVITY_LOG]</h2>
              <Button variant="ghost" size="sm" className="text-xs font-mono hover:text-neon-green">
                VIEW_ALL →
              </Button>
            </div>
            <div className="divide-y-2 divide-border">
              {recentActivity.map((activity, index) => (
                <div key={index} className="p-4 flex items-start gap-4 hover:bg-muted/50 transition-colors">
                  <div className={`w-8 h-8 flex items-center justify-center flex-shrink-0 border-2 ${
                    activity.status === 'complete' ? 'bg-neon-green border-neon-green text-background' :
                    activity.status === 'review' ? 'bg-neon-yellow/20 border-neon-yellow text-neon-yellow' :
                    'border-border text-muted-foreground'
                  }`}>
                    {activity.status === 'complete' ? <CheckCircle className="w-4 h-4" /> :
                     activity.status === 'review' ? <AlertCircle className="w-4 h-4" /> :
                     <Clock className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono">{activity.message}</p>
                    <p className="text-xs font-mono text-muted-foreground mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Campaigns */}
          <div className="border-4 border-border bg-card">
            <div className="p-4 border-b-4 border-border">
              <h2 className="font-pixel text-sm text-neon-pink">[CAMPAIGNS]</h2>
            </div>
            <div className="divide-y-2 divide-border">
              {activeCampaigns.map((campaign, index) => (
                <div key={index} className="p-4">
                  <p className="text-sm font-mono mb-3">{campaign.name}</p>
                  <div className="flex gap-3 text-xs font-mono text-muted-foreground mb-3">
                    <span className="text-neon-green">{campaign.complete} done</span>
                    <span>{campaign.pending} pending</span>
                  </div>
                  {/* Progress Bar */}
                  <div className="h-2 bg-muted flex overflow-hidden">
                    <div className="h-full bg-neon-green" style={{ width: `${(campaign.complete / campaign.matches) * 100}%` }} />
                    <div className="h-full bg-neon-yellow" style={{ width: `${(campaign.shipped / campaign.matches) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t-4 border-border">
              <Button variant="ghost" className="w-full text-xs font-mono hover:text-neon-pink" asChild>
                <Link to="/brand/campaigns">VIEW_ALL →</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* AI Match Suggestions */}
        <div className="mt-6 border-4 border-border bg-card">
          <div className="p-4 border-b-4 border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-neon-yellow" />
              <h2 className="font-pixel text-sm text-neon-yellow">[AI_MATCHES]</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-2 border-border font-mono text-xs"
              onClick={() => refetchRecommendations()}
            >
              {recommendationsLoading ? "THINKING..." : "GENERATE"}
            </Button>
          </div>
          <div className="divide-y-2 divide-border">
            {(recommendationsData?.creators ?? []).length ? (
              recommendationsData?.creators.map((creator) => (
                <div key={creator.creatorId} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm">{creator.username}</p>
                    <p className="text-xs font-mono text-muted-foreground">{creator.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-pixel text-sm text-neon-green">{creator.score}</p>
                    <p className="text-xs font-mono text-muted-foreground">AI score</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-xs font-mono text-muted-foreground">
                Generate AI matches to see high-potential creators.
              </div>
            )}
          </div>
        </div>
      </div>
    </BrandLayout>
  );
};

export default BrandDashboard;

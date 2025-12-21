import { 
  TrendingUp, 
  TrendingDown,
  Eye,
  Heart,
  Share2,
  Camera,
  BarChart3
} from "lucide-react";
import BrandLayout from "@/components/brand/BrandLayout";
import { useQuery } from "@tanstack/react-query";
import { ApiError, getBrandAnalytics, getBrandCreatorAnalytics, getBrandMatches } from "@/lib/api";
import { useEffect, useMemo } from "react";

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(0)}`;

const BrandAnalytics = () => {
  const { data: analyticsData, error: analyticsError } = useQuery({
    queryKey: ["brand-analytics"],
    queryFn: getBrandAnalytics,
  });
  const { data: creatorAnalyticsData } = useQuery({
    queryKey: ["brand-creator-analytics"],
    queryFn: getBrandCreatorAnalytics,
  });
  const { data: acceptedMatchesData } = useQuery({
    queryKey: ["brand-matches", "accepted"],
    queryFn: () => getBrandMatches("ACCEPTED"),
  });

  useEffect(() => {
    if (analyticsError instanceof ApiError && analyticsError.status === 401) {
      window.location.href = "/brand/auth";
    }
  }, [analyticsError]);

  const offers = analyticsData?.offers ?? [];
  const creatorRows = creatorAnalyticsData?.creators ?? [];
  const totalReach = offers.reduce((sum, offer) => sum + offer.clickCount, 0);
  const totalPosts = offers.reduce((sum, offer) => sum + offer.matchCount, 0);
  const totalOrders = offers.reduce((sum, offer) => sum + offer.orderCount, 0);
  const totalNetRevenueCents = offers.reduce((sum, offer) => sum + offer.netRevenueCents, 0);
  const totalRefundCents = offers.reduce((sum, offer) => sum + offer.refundCents, 0);
  const conversion = totalReach ? (totalOrders / totalReach) * 100 : 0;

  const overviewStats = [
    {
      label: "TOTAL REACH",
      value: totalReach ? `${totalReach}` : "0",
      change: "+0%",
      trend: "up",
      color: "neon-green",
    },
    {
      label: "CONTENT",
      value: totalPosts ? `${totalPosts}` : "0",
      change: "+0",
      trend: "up",
      color: "neon-pink",
    },
    {
      label: "AVG ENGAGEMENT",
      value: `${conversion.toFixed(1)}%`,
      change: "+0%",
      trend: "up",
      color: "neon-purple",
    },
    {
      label: "NET REVENUE",
      value: formatMoney(totalNetRevenueCents),
      change: totalRefundCents ? `-${formatMoney(totalRefundCents)} refunds` : "NO_REFUNDS",
      trend: totalRefundCents ? "down" : "up",
      color: "neon-yellow",
    },
  ];

  const campaignPerformance = offers.map((offer) => ({
    name: offer.title,
    reach: `${offer.clickCount}`,
    posts: offer.matchCount,
    engagement: offer.clickCount ? `${((offer.orderCount / offer.clickCount) * 100).toFixed(1)}%` : "0.0%",
    saves: `${offer.orderCount}`,
  }));

  const topInfluencers = useMemo(() => {
    const matches = acceptedMatchesData?.matches ?? [];
    const sorted = [...matches].sort((a, b) => (b.creator.followersCount ?? 0) - (a.creator.followersCount ?? 0));
    return sorted.slice(0, 4).map((match) => ({
      name: match.creator.username ?? "Creator",
      handle: match.creator.username ? `@${match.creator.username}` : "@creator",
      reach: `${match.creator.followersCount ?? 0}`,
      posts: 1,
      engagement: "—",
    }));
  }, [acceptedMatchesData]);

  const contentMetrics = [
    { icon: Eye, label: "CLICKS", value: `${totalReach}`, color: "neon-green" },
    { icon: Heart, label: "NET REV", value: formatMoney(totalNetRevenueCents), color: "neon-pink" },
    { icon: Share2, label: "REFUNDS", value: formatMoney(totalRefundCents), color: "neon-purple" },
    { icon: Camera, label: "CONTENT", value: `${totalPosts}`, color: "neon-yellow" },
  ];

  return (
    <BrandLayout>
      <div className="p-6 md:p-10">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-neon-green" />
            <span className="text-xs font-pixel text-neon-green">[ANALYTICS]</span>
          </div>
          <h1 className="text-xl md:text-2xl font-pixel text-foreground">PERFORMANCE</h1>
          <p className="font-mono text-sm text-muted-foreground mt-1">&gt; Track campaign ROI</p>
        </div>

        {/* Overview Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {overviewStats.map((stat, index) => (
            <div 
              key={index} 
              className={`p-5 border-4 border-border bg-card hover:border-${stat.color} transition-all`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-pixel text-muted-foreground">{stat.label}</span>
                {stat.trend === 'up' && <TrendingUp className="w-4 h-4 text-neon-green" />}
                {stat.trend === 'down' && <TrendingDown className="w-4 h-4 text-destructive" />}
              </div>
              <p className={`text-2xl font-pixel mb-2 text-${stat.color}`}>{stat.value}</p>
              <p className={`text-xs font-mono ${stat.trend === 'up' ? 'text-neon-green' : stat.trend === 'down' ? 'text-destructive' : 'text-muted-foreground'}`}>
                {stat.change}
              </p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Campaign Performance */}
          <div className="border-4 border-border bg-card">
            <div className="p-4 border-b-4 border-border">
              <h2 className="font-pixel text-sm text-neon-pink">[CAMPAIGN_STATS]</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="text-left p-4 text-xs font-pixel text-muted-foreground">NAME</th>
                    <th className="text-right p-4 text-xs font-pixel text-muted-foreground">REACH</th>
                    <th className="text-right p-4 text-xs font-pixel text-muted-foreground">POSTS</th>
                    <th className="text-right p-4 text-xs font-pixel text-muted-foreground">ENG</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignPerformance.map((campaign, index) => (
                    <tr key={index} className="border-b-2 border-border last:border-b-0 hover:bg-muted/50">
                      <td className="p-4">
                        <span className="font-mono text-sm">{campaign.name}</span>
                      </td>
                      <td className="p-4 text-right font-pixel text-neon-green">{campaign.reach}</td>
                      <td className="p-4 text-right font-mono">{campaign.posts}</td>
                      <td className="p-4 text-right font-pixel text-neon-pink">{campaign.engagement}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Influencers */}
          <div className="border-4 border-border bg-card">
            <div className="p-4 border-b-4 border-border">
              <h2 className="font-pixel text-sm text-neon-purple">[TOP_PERFORMERS]</h2>
            </div>
            <div className="divide-y-2 divide-border">
              {topInfluencers.map((influencer, index) => (
                <div key={index} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center text-xs font-pixel">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-mono text-sm">{influencer.name}</p>
                      <p className="text-xs font-mono text-muted-foreground">{influencer.handle}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-pixel text-sm text-neon-green">{influencer.reach}</p>
                    <p className="text-xs font-mono text-muted-foreground">{influencer.posts}p · {influencer.engagement}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content Metrics */}
        <div className="mt-6 border-4 border-border bg-card">
          <div className="p-4 border-b-4 border-border">
            <h2 className="font-pixel text-sm text-neon-yellow">[CONTENT_METRICS]</h2>
          </div>
          <div className="grid sm:grid-cols-4 gap-0">
            {contentMetrics.map((metric, index) => (
              <div key={index} className={`p-6 ${index < 3 ? 'border-r-2 border-border' : ''}`}>
                <metric.icon className={`w-5 h-5 text-${metric.color} mb-4`} />
                <p className={`text-2xl font-pixel mb-1 text-${metric.color}`}>{metric.value}</p>
                <p className="text-xs font-mono text-muted-foreground">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 border-4 border-border bg-card">
          <div className="p-4 border-b-4 border-border">
            <h2 className="font-pixel text-sm text-neon-green">[CREATOR_ROI_LTV]</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left p-4 text-xs font-pixel text-muted-foreground">CREATOR</th>
                  <th className="text-right p-4 text-xs font-pixel text-muted-foreground">MATCHES</th>
                  <th className="text-right p-4 text-xs font-pixel text-muted-foreground">EARNINGS</th>
                  <th className="text-right p-4 text-xs font-pixel text-muted-foreground">NET REV</th>
                  <th className="text-right p-4 text-xs font-pixel text-muted-foreground">REFUNDS</th>
                  <th className="text-right p-4 text-xs font-pixel text-muted-foreground">REPEAT</th>
                  <th className="text-right p-4 text-xs font-pixel text-muted-foreground">ROI</th>
                  <th className="text-right p-4 text-xs font-pixel text-muted-foreground">LTV</th>
                </tr>
              </thead>
              <tbody>
                {creatorRows.length ? (
                  creatorRows.map((creator) => (
                    <tr key={creator.creatorId} className="border-b-2 border-border last:border-b-0 hover:bg-muted/50">
                      <td className="p-4">
                        <span className="font-mono text-sm">
                          {creator.username ?? "Creator"}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono">{creator.matchCount}</td>
                      <td className="p-4 text-right font-mono text-neon-yellow">
                        {formatMoney(creator.earningsCents ?? creator.seedCostCents)}
                      </td>
                      <td className="p-4 text-right font-pixel text-neon-green">
                        {formatMoney(creator.netRevenueCents)}
                      </td>
                      <td className="p-4 text-right font-mono text-neon-purple">
                        {formatMoney(creator.refundCents)}
                      </td>
                      <td className="p-4 text-right font-mono">
                        {creator.repeatBuyerCount ?? 0}
                      </td>
                      <td className="p-4 text-right font-mono">
                        {creator.roiPercent !== null ? `${creator.roiPercent}%` : "—"}
                      </td>
                      <td className="p-4 text-right font-mono">
                        {formatMoney(creator.ltvCents)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="p-4 text-xs font-mono text-muted-foreground" colSpan={8}>
                      No creator performance data yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </BrandLayout>
  );
};

export default BrandAnalytics;

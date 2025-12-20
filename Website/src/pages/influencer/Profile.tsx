import { 
  Star, 
  Trophy, 
  Package, 
  Camera,
  AlertTriangle,
  Settings,
  Instagram,
  ExternalLink,
  Zap,
  Target,
  Rocket,
  Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import InfluencerLayout from "@/components/influencer/InfluencerLayout";
import { useQuery } from "@tanstack/react-query";
import { ApiError, CreatorDeal, apiUrl, getCreatorDeals, getCreatorProfile, getInstagramStatus } from "@/lib/api";
import { useEffect, useMemo } from "react";

const badges = [
  { name: "FIRST MATCH", description: "Complete first deal", earned: true, icon: Target },
  { name: "RISING STAR", description: "Complete 5 deals", earned: true, icon: Star },
  { name: "POWER USER", description: "Complete 10 deals", earned: true, icon: Rocket },
  { name: "SUPER SEEDER", description: "Complete 25 deals", earned: false, icon: Zap, progress: 24 },
  { name: "BRAND FAV", description: "Get re-matched", earned: true, icon: Heart },
  { name: "SPEED RUN", description: "Post within 24hrs", earned: false, icon: Trophy, progress: 0 },
];

const InfluencerProfile = () => {
  const { data: profileData, error: profileError } = useQuery({
    queryKey: ["creator-profile"],
    queryFn: getCreatorProfile,
  });
  const { data: dealsData } = useQuery({
    queryKey: ["creator-deals"],
    queryFn: getCreatorDeals,
  });
  const { data: igStatus } = useQuery({
    queryKey: ["instagram-status"],
    queryFn: getInstagramStatus,
  });

  useEffect(() => {
    if (profileError instanceof ApiError && profileError.code === "NEEDS_CREATOR_PROFILE") {
      window.location.href = "/influencer/onboarding";
    }
    if (profileError instanceof ApiError && profileError.code === "NEEDS_LEGAL_ACCEPTANCE") {
      window.location.href = apiUrl("/legal/accept?next=/influencer/profile");
    }
  }, [profileError]);

  const deals = dealsData?.deals ?? [];
  const totalDeals = deals.length;
  const completedDeals = deals.filter((deal: CreatorDeal) => deal.status === "complete").length;
  const totalValue = deals.reduce((sum: number, deal: CreatorDeal) => sum + (deal.valueUsd ?? 0), 0);

  const stats = useMemo(
    () => [
      { label: "DEALS", value: `${totalDeals}`, icon: Package, color: "neon-green" },
      { label: "CONTENT", value: `${completedDeals}`, icon: Camera, color: "neon-pink" },
      { label: "VALUE", value: `$${totalValue}`, icon: Star, color: "neon-yellow" },
    ],
    [totalDeals, completedDeals, totalValue],
  );

  const strikes = 0;
  const nextLevel = 25;
  const currentDeals = totalDeals;
  const levelProgress = nextLevel ? (currentDeals / nextLevel) * 100 : 0;

  const profile = profileData?.creator;
  const displayName = profile?.fullName || profile?.username || "CREATOR";
  const handle = profile?.username ? `@${profile.username}` : "@handle";
  const followers = profile?.followersCount ? `${profile.followersCount} followers` : "followers";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <InfluencerLayout>
      <div className="p-6 md:p-10 pb-24 md:pb-10 max-w-2xl mx-auto">
        {/* Profile Header */}
        <div className="text-center mb-10">
          <div className="w-24 h-24 mx-auto bg-neon-pink text-background flex items-center justify-center text-xl font-pixel mb-4 border-4 border-neon-pink">
            {initials || "CR"}
          </div>
          <h1 className="text-lg font-pixel text-foreground mb-1">{displayName}</h1>
          <p className="font-mono text-xs text-muted-foreground mb-4">
            {handle} // {followers}
          </p>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 border-2 border-neon-green bg-neon-green/10">
            <Instagram className="w-4 h-4 text-neon-green" />
            <span className="font-mono text-xs text-neon-green">
              {igStatus?.connected ? "CONNECTED" : "NOT CONNECTED"}
            </span>
            <ExternalLink className="w-3 h-3 text-neon-green" />
          </div>
        </div>

        {/* Level Progress */}
        <div className="border-4 border-neon-yellow bg-neon-yellow/10 p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-pixel text-sm text-neon-yellow">LV.3 POWER CREATOR</h2>
              <p className="font-mono text-xs text-muted-foreground">{currentDeals}/{nextLevel} to LV.4</p>
            </div>
            <div className="flex items-center gap-1">
              <Trophy className="w-5 h-5 text-neon-yellow" />
              <span className="font-pixel text-lg text-neon-yellow">2,450</span>
            </div>
          </div>
          <div className="h-3 bg-muted border-2 border-neon-yellow">
            <div 
              className="h-full bg-neon-yellow transition-all" 
              style={{ width: `${levelProgress}%` }} 
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className={`p-4 text-center border-4 border-${stat.color} bg-${stat.color}/10`}>
              <stat.icon className={`w-5 h-5 mx-auto mb-2 text-${stat.color}`} />
              <p className={`text-xl font-pixel text-${stat.color}`}>{stat.value}</p>
              <p className="text-xs font-mono text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Strikes Warning */}
        <div className={`border-4 p-4 mb-8 ${strikes > 0 ? 'border-destructive bg-destructive/10' : 'border-neon-green bg-neon-green/10'}`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className={`w-5 h-5 ${strikes > 0 ? 'text-destructive' : 'text-neon-green'}`} />
            <div>
              <p className="font-pixel text-xs">STRIKES: {strikes}/3</p>
              <p className="font-mono text-xs text-muted-foreground">
                {strikes === 0 
                  ? "GOOD STANDING // KEEP IT UP!"
                  : `${3 - strikes} strikes remaining`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="border-4 border-border mb-8 bg-card">
          <div className="p-4 border-b-4 border-border flex items-center gap-2">
            <Trophy className="w-5 h-5 text-neon-purple" />
            <h2 className="font-pixel text-sm text-neon-purple">[ACHIEVEMENTS]</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3">
            {badges.map((badge, index) => (
              <div 
                key={index} 
                className={`p-4 border-b-2 border-r-2 border-border ${!badge.earned ? 'opacity-40' : ''}`}
              >
                <div className={`w-10 h-10 mb-2 border-2 flex items-center justify-center ${
                  badge.earned 
                    ? 'border-neon-yellow bg-neon-yellow/10' 
                    : 'border-border bg-muted'
                }`}>
                  <badge.icon className={`w-5 h-5 ${badge.earned ? 'text-neon-yellow' : 'text-muted-foreground'}`} />
                </div>
                <p className="font-pixel text-xs">{badge.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{badge.description}</p>
                {!badge.earned && badge.progress !== undefined && badge.progress > 0 && (
                  <div className="mt-2 h-1 bg-muted">
                    <div 
                      className="h-full bg-neon-purple" 
                      style={{ width: `${(badge.progress / 25) * 100}%` }} 
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Settings Link */}
        <Button variant="outline" className="w-full border-2 border-border font-mono text-xs" asChild>
          <a href="#settings">
            <Settings className="w-4 h-4 mr-2" />
            ACCOUNT SETTINGS
          </a>
        </Button>
      </div>
    </InfluencerLayout>
  );
};

export default InfluencerProfile;

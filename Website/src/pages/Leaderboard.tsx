import { Link } from "react-router-dom";
import { Trophy, Crown, Star, TrendingUp, Users, Briefcase, ArrowLeft, Zap, Target, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getLeaderboard } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccessibilityToggle } from "@/components/AccessibilityToggle";

const getRankStyle = (rank: number) => {
  switch (rank) {
    case 1:
      return "border-neon-yellow bg-neon-yellow/10 text-neon-yellow";
    case 2:
      return "border-muted-foreground bg-muted-foreground/10 text-muted-foreground";
    case 3:
      return "border-neon-pink bg-neon-pink/10 text-neon-pink";
    default:
      return "border-border bg-card text-foreground";
  }
};

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="w-5 h-5 text-neon-yellow animate-pulse-neon" />;
    case 2:
      return <Trophy className="w-5 h-5 text-muted-foreground" />;
    case 3:
      return <Award className="w-5 h-5 text-neon-pink" />;
    default:
      return <span className="font-pixel text-sm">#{rank}</span>;
  }
};

const Leaderboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: getLeaderboard,
  });

  const creators = data?.creators ?? [];
  const stats = data?.stats ?? { activeCreators: 0, activeBrands: 0, dealsCompleted: 0 };

  return (
    <div className="min-h-screen bg-background bg-grid">
      {/* Header */}
      <header className="border-b-4 border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link to="/" className="flex items-center gap-3">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-neon-green flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-background" />
                </div>
                <span className="font-pixel text-lg text-foreground">LEADERBOARD</span>
              </div>
            </Link>
            <div className="sm:ml-auto flex items-center gap-2">
              <Zap className="w-4 h-4 text-neon-yellow animate-pulse-neon" />
              <span className="font-mono text-xs text-muted-foreground">LIVE RANKINGS</span>
            </div>
            <div className="sm:ml-3 flex items-center gap-2">
              <ThemeToggle />
              <AccessibilityToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="border-4 border-neon-green bg-card p-6 text-center relative overflow-hidden">
            <div className="absolute inset-0 scanlines opacity-30" />
            <Users className="w-8 h-8 mx-auto text-neon-green mb-2" />
            <p className="font-pixel text-2xl text-neon-green mb-1">
              {isLoading ? "--" : stats.activeCreators.toLocaleString()}
            </p>
            <p className="font-mono text-xs text-muted-foreground">ACTIVE CREATORS</p>
          </div>
          <div className="border-4 border-neon-pink bg-card p-6 text-center relative overflow-hidden">
            <div className="absolute inset-0 scanlines opacity-30" />
            <Briefcase className="w-8 h-8 mx-auto text-neon-pink mb-2" />
            <p className="font-pixel text-2xl text-neon-pink mb-1">
              {isLoading ? "--" : stats.activeBrands.toLocaleString()}
            </p>
            <p className="font-mono text-xs text-muted-foreground">ACTIVE BRANDS</p>
          </div>
          <div className="border-4 border-neon-yellow bg-card p-6 text-center relative overflow-hidden">
            <div className="absolute inset-0 scanlines opacity-30" />
            <Target className="w-8 h-8 mx-auto text-neon-yellow mb-2" />
            <p className="font-pixel text-2xl text-neon-yellow mb-1">
              {isLoading ? "--" : stats.dealsCompleted.toLocaleString()}
            </p>
            <p className="font-mono text-xs text-muted-foreground">DEALS COMPLETED</p>
          </div>
        </div>

        {/* Top creators */}
        <div className="w-full">
          <div className="mb-6 border-4 border-border bg-card p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <Users className="w-4 h-4 text-neon-green" />
              <span className="font-pixel text-xs">TOP CREATORS</span>
            </div>
          </div>

          {/* Top 3 Podium */}
          <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-3">
            {/* 2nd Place */}
            <div className="order-2 sm:order-1 sm:pt-8">
              <div className="border-4 border-muted-foreground bg-card p-4 text-center relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-muted-foreground flex items-center justify-center">
                  <span className="font-pixel text-background">2</span>
                </div>
                <div className="w-12 h-12 mx-auto bg-muted border-2 border-muted-foreground flex items-center justify-center font-pixel text-sm mb-2">
                  {creators[1]?.avatar ?? "--"}
                </div>
                <p className="font-pixel text-xs text-foreground truncate">{creators[1]?.name ?? "—"}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {creators[1] ? `${creators[1].xp.toLocaleString()} XP` : "--"}
                </p>
              </div>
            </div>

            {/* 1st Place */}
            <div className="order-1 sm:order-2">
              <div className="border-4 border-neon-yellow bg-card p-4 text-center relative glow-yellow">
                <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                  <Crown className="w-8 h-8 text-neon-yellow animate-pulse-neon" />
                </div>
                <div className="w-16 h-16 mx-auto bg-neon-yellow/20 border-2 border-neon-yellow flex items-center justify-center font-pixel text-lg mb-2 mt-2">
                  {creators[0]?.avatar ?? "--"}
                </div>
                <p className="font-pixel text-sm text-neon-yellow">{creators[0]?.name ?? "—"}</p>
                <p className="font-mono text-xs text-foreground">
                  {creators[0] ? `${creators[0].xp.toLocaleString()} XP` : "--"}
                </p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-neon-green" />
                  <span className="font-mono text-xs text-neon-green">{creators[0]?.trend ?? "0%"}</span>
                </div>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="order-3 sm:pt-12">
              <div className="border-4 border-neon-pink bg-card p-4 text-center relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-neon-pink flex items-center justify-center">
                  <span className="font-pixel text-background">3</span>
                </div>
                <div className="w-10 h-10 mx-auto bg-neon-pink/20 border-2 border-neon-pink flex items-center justify-center font-pixel text-xs mb-2">
                  {creators[2]?.avatar ?? "--"}
                </div>
                <p className="font-pixel text-xs text-foreground truncate">{creators[2]?.name ?? "—"}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {creators[2] ? `${creators[2].xp.toLocaleString()} XP` : "--"}
                </p>
              </div>
            </div>
          </div>

          {/* Full List */}
          <div className="border-4 border-border bg-card">
            <div className="border-b-4 border-border p-3 flex items-center gap-4">
              <span className="font-pixel text-xs text-muted-foreground w-10 sm:w-12">RANK</span>
              <span className="font-pixel text-xs text-muted-foreground flex-1">CREATOR</span>
              <span className="font-pixel text-xs text-muted-foreground w-16 sm:w-20 text-right">XP</span>
              <span className="font-pixel text-xs text-muted-foreground w-16 text-right hidden sm:block">DEALS</span>
              <span className="font-pixel text-xs text-muted-foreground w-16 text-right hidden sm:block">TREND</span>
            </div>
            {creators.map((creator, index) => (
              <div
                key={creator.rank}
                className={`p-4 flex items-center gap-4 border-b-2 border-border last:border-b-0 hover:bg-muted/50 transition-colors ${
                  index < 3 ? "bg-muted/30" : ""
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center border-2 ${getRankStyle(
                    creator.rank,
                  )}`}
                >
                  {getRankIcon(creator.rank)}
                </div>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-muted border-2 border-border flex items-center justify-center font-pixel text-xs shrink-0">
                    {creator.avatar}
                  </div>
                  <div className="min-w-0">
                    <p className="font-pixel text-xs sm:text-sm text-foreground truncate">{creator.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{creator.handle ?? "@creator"}</p>
                  </div>
                </div>
                <div className="w-16 sm:w-20 text-right">
                  <p className="font-mono text-sm text-neon-green">{creator.xp.toLocaleString()}</p>
                </div>
                <div className="w-16 text-right hidden sm:block">
                  <p className="font-mono text-sm text-foreground">{creator.deals}</p>
                </div>
                <div className="w-16 text-right hidden sm:flex items-center justify-end gap-1">
                  <TrendingUp className="w-3 h-3 text-neon-green" />
                  <span className="font-mono text-xs text-neon-green">{creator.trend}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center border-4 border-neon-green bg-card p-8 relative overflow-hidden">
          <div className="absolute inset-0 scanlines opacity-30" />
          <Star className="w-10 h-10 mx-auto text-neon-green mb-4 animate-pulse-neon" />
          <h2 className="font-pixel text-xl text-foreground mb-2">READY TO CLIMB?</h2>
          <p className="font-mono text-sm text-muted-foreground mb-6">
            Join the ranks and start earning XP today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/influencer/signup">
              <Button className="bg-neon-green text-background font-pixel text-xs pixel-btn glow-green w-full sm:w-auto">
                JOIN AS CREATOR
              </Button>
            </Link>
            <Link to="/brand/dashboard">
              <Button variant="outline" className="border-4 border-neon-pink text-neon-pink font-pixel text-xs hover:bg-neon-pink hover:text-background w-full sm:w-auto">
                JOIN AS BRAND
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Leaderboard;

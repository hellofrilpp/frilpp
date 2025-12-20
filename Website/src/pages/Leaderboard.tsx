import { useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, Crown, Star, TrendingUp, Users, Briefcase, ArrowLeft, Zap, Target, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const topCreators = [
  { rank: 1, name: "SarahGlow", handle: "@sarahglow", xp: 12450, deals: 47, avatar: "SG", trend: "+15%" },
  { rank: 2, name: "FitMike", handle: "@fitmike", xp: 11200, deals: 42, avatar: "FM", trend: "+12%" },
  { rank: 3, name: "BeautyBoss", handle: "@beautyboss", xp: 10890, deals: 39, avatar: "BB", trend: "+8%" },
  { rank: 4, name: "TechTara", handle: "@techtara", xp: 9750, deals: 36, avatar: "TT", trend: "+22%" },
  { rank: 5, name: "StyleKing", handle: "@styleking", xp: 9200, deals: 34, avatar: "SK", trend: "+5%" },
  { rank: 6, name: "LifeWithLisa", handle: "@lifewithlisa", xp: 8800, deals: 31, avatar: "LL", trend: "+18%" },
  { rank: 7, name: "GamerzPro", handle: "@gamerzpro", xp: 8500, deals: 29, avatar: "GP", trend: "+3%" },
  { rank: 8, name: "FoodieFreak", handle: "@foodiefreak", xp: 8100, deals: 28, avatar: "FF", trend: "+11%" },
  { rank: 9, name: "TravelTom", handle: "@traveltom", xp: 7800, deals: 26, avatar: "TM", trend: "+7%" },
  { rank: 10, name: "PetPals", handle: "@petpals", xp: 7500, deals: 24, avatar: "PP", trend: "+14%" },
];

const topBrands = [
  { rank: 1, name: "GlowUp Beauty", category: "Skincare", xp: 45200, creators: 156, avatar: "GB", trend: "+25%" },
  { rank: 2, name: "StyleHaus", category: "Fashion", xp: 42100, creators: 142, avatar: "SH", trend: "+18%" },
  { rank: 3, name: "VitaBlend", category: "Fitness", xp: 38900, creators: 128, avatar: "VB", trend: "+12%" },
  { rank: 4, name: "TechGear", category: "Electronics", xp: 35600, creators: 98, avatar: "TG", trend: "+30%" },
  { rank: 5, name: "EcoLife", category: "Lifestyle", xp: 32400, creators: 89, avatar: "EL", trend: "+15%" },
  { rank: 6, name: "PetWorld", category: "Pets", xp: 28900, creators: 76, avatar: "PW", trend: "+8%" },
  { rank: 7, name: "GameZone", category: "Gaming", xp: 26500, creators: 72, avatar: "GZ", trend: "+22%" },
  { rank: 8, name: "FoodFusion", category: "Food", xp: 24200, creators: 65, avatar: "FF", trend: "+11%" },
  { rank: 9, name: "HomeVibes", category: "Home", xp: 22800, creators: 58, avatar: "HV", trend: "+6%" },
  { rank: 10, name: "BookNook", category: "Books", xp: 20100, creators: 45, avatar: "BN", trend: "+9%" },
];

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
  const [activeTab, setActiveTab] = useState("creators");

  return (
    <div className="min-h-screen bg-background bg-grid">
      {/* Header */}
      <header className="border-b-4 border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-neon-green flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-background" />
                </div>
                <span className="font-pixel text-lg text-foreground">LEADERBOARD</span>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-neon-yellow animate-pulse-neon" />
              <span className="font-mono text-xs text-muted-foreground">LIVE RANKINGS</span>
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
            <p className="font-pixel text-2xl text-neon-green mb-1">2,547</p>
            <p className="font-mono text-xs text-muted-foreground">ACTIVE CREATORS</p>
          </div>
          <div className="border-4 border-neon-pink bg-card p-6 text-center relative overflow-hidden">
            <div className="absolute inset-0 scanlines opacity-30" />
            <Briefcase className="w-8 h-8 mx-auto text-neon-pink mb-2" />
            <p className="font-pixel text-2xl text-neon-pink mb-1">423</p>
            <p className="font-mono text-xs text-muted-foreground">ACTIVE BRANDS</p>
          </div>
          <div className="border-4 border-neon-yellow bg-card p-6 text-center relative overflow-hidden">
            <div className="absolute inset-0 scanlines opacity-30" />
            <Target className="w-8 h-8 mx-auto text-neon-yellow mb-2" />
            <p className="font-pixel text-2xl text-neon-yellow mb-1">8,912</p>
            <p className="font-mono text-xs text-muted-foreground">DEALS COMPLETED</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full mb-6 bg-card border-4 border-border p-1 h-auto">
            <TabsTrigger 
              value="creators" 
              className="flex-1 font-pixel text-xs py-3 data-[state=active]:bg-neon-green data-[state=active]:text-background"
            >
              <Users className="w-4 h-4 mr-2" />
              TOP CREATORS
            </TabsTrigger>
            <TabsTrigger 
              value="brands" 
              className="flex-1 font-pixel text-xs py-3 data-[state=active]:bg-neon-pink data-[state=active]:text-background"
            >
              <Briefcase className="w-4 h-4 mr-2" />
              TOP BRANDS
            </TabsTrigger>
          </TabsList>

          {/* Creators Tab */}
          <TabsContent value="creators" className="mt-0">
            {/* Top 3 Podium */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {/* 2nd Place */}
              <div className="order-1 pt-8">
                <div className="border-4 border-muted-foreground bg-card p-4 text-center relative">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-muted-foreground flex items-center justify-center">
                    <span className="font-pixel text-background">2</span>
                  </div>
                  <div className="w-12 h-12 mx-auto bg-muted border-2 border-muted-foreground flex items-center justify-center font-pixel text-sm mb-2">
                    {topCreators[1].avatar}
                  </div>
                  <p className="font-pixel text-xs text-foreground truncate">{topCreators[1].name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{topCreators[1].xp.toLocaleString()} XP</p>
                </div>
              </div>

              {/* 1st Place */}
              <div className="order-2">
                <div className="border-4 border-neon-yellow bg-card p-4 text-center relative glow-yellow">
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                    <Crown className="w-8 h-8 text-neon-yellow animate-pulse-neon" />
                  </div>
                  <div className="w-16 h-16 mx-auto bg-neon-yellow/20 border-2 border-neon-yellow flex items-center justify-center font-pixel text-lg mb-2 mt-2">
                    {topCreators[0].avatar}
                  </div>
                  <p className="font-pixel text-sm text-neon-yellow">{topCreators[0].name}</p>
                  <p className="font-mono text-xs text-foreground">{topCreators[0].xp.toLocaleString()} XP</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-neon-green" />
                    <span className="font-mono text-xs text-neon-green">{topCreators[0].trend}</span>
                  </div>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="order-3 pt-12">
                <div className="border-4 border-neon-pink bg-card p-4 text-center relative">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-neon-pink flex items-center justify-center">
                    <span className="font-pixel text-background">3</span>
                  </div>
                  <div className="w-10 h-10 mx-auto bg-neon-pink/20 border-2 border-neon-pink flex items-center justify-center font-pixel text-xs mb-2">
                    {topCreators[2].avatar}
                  </div>
                  <p className="font-pixel text-xs text-foreground truncate">{topCreators[2].name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{topCreators[2].xp.toLocaleString()} XP</p>
                </div>
              </div>
            </div>

            {/* Full List */}
            <div className="border-4 border-border bg-card">
              <div className="border-b-4 border-border p-3 flex items-center gap-4">
                <span className="font-pixel text-xs text-muted-foreground w-12">RANK</span>
                <span className="font-pixel text-xs text-muted-foreground flex-1">CREATOR</span>
                <span className="font-pixel text-xs text-muted-foreground w-20 text-right">XP</span>
                <span className="font-pixel text-xs text-muted-foreground w-16 text-right hidden sm:block">DEALS</span>
                <span className="font-pixel text-xs text-muted-foreground w-16 text-right hidden sm:block">TREND</span>
              </div>
              {topCreators.map((creator, index) => (
                <div 
                  key={creator.rank}
                  className={`p-4 flex items-center gap-4 border-b-2 border-border last:border-b-0 hover:bg-muted/50 transition-colors ${
                    index < 3 ? 'bg-muted/30' : ''
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={`w-10 h-10 flex items-center justify-center border-2 ${getRankStyle(creator.rank)}`}>
                    {getRankIcon(creator.rank)}
                  </div>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-muted border-2 border-border flex items-center justify-center font-pixel text-xs shrink-0">
                      {creator.avatar}
                    </div>
                    <div className="min-w-0">
                      <p className="font-pixel text-sm text-foreground truncate">{creator.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{creator.handle}</p>
                    </div>
                  </div>
                  <div className="w-20 text-right">
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
          </TabsContent>

          {/* Brands Tab */}
          <TabsContent value="brands" className="mt-0">
            {/* Top 3 Podium */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {/* 2nd Place */}
              <div className="order-1 pt-8">
                <div className="border-4 border-muted-foreground bg-card p-4 text-center relative">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-muted-foreground flex items-center justify-center">
                    <span className="font-pixel text-background">2</span>
                  </div>
                  <div className="w-12 h-12 mx-auto bg-muted border-2 border-muted-foreground flex items-center justify-center font-pixel text-sm mb-2">
                    {topBrands[1].avatar}
                  </div>
                  <p className="font-pixel text-xs text-foreground truncate">{topBrands[1].name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{topBrands[1].xp.toLocaleString()} XP</p>
                </div>
              </div>

              {/* 1st Place */}
              <div className="order-2">
                <div className="border-4 border-neon-yellow bg-card p-4 text-center relative glow-yellow">
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                    <Crown className="w-8 h-8 text-neon-yellow animate-pulse-neon" />
                  </div>
                  <div className="w-16 h-16 mx-auto bg-neon-yellow/20 border-2 border-neon-yellow flex items-center justify-center font-pixel text-lg mb-2 mt-2">
                    {topBrands[0].avatar}
                  </div>
                  <p className="font-pixel text-sm text-neon-yellow truncate">{topBrands[0].name}</p>
                  <p className="font-mono text-xs text-foreground">{topBrands[0].xp.toLocaleString()} XP</p>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-neon-green" />
                    <span className="font-mono text-xs text-neon-green">{topBrands[0].trend}</span>
                  </div>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="order-3 pt-12">
                <div className="border-4 border-neon-pink bg-card p-4 text-center relative">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-neon-pink flex items-center justify-center">
                    <span className="font-pixel text-background">3</span>
                  </div>
                  <div className="w-10 h-10 mx-auto bg-neon-pink/20 border-2 border-neon-pink flex items-center justify-center font-pixel text-xs mb-2">
                    {topBrands[2].avatar}
                  </div>
                  <p className="font-pixel text-xs text-foreground truncate">{topBrands[2].name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{topBrands[2].xp.toLocaleString()} XP</p>
                </div>
              </div>
            </div>

            {/* Full List */}
            <div className="border-4 border-border bg-card">
              <div className="border-b-4 border-border p-3 flex items-center gap-4">
                <span className="font-pixel text-xs text-muted-foreground w-12">RANK</span>
                <span className="font-pixel text-xs text-muted-foreground flex-1">BRAND</span>
                <span className="font-pixel text-xs text-muted-foreground w-20 text-right">XP</span>
                <span className="font-pixel text-xs text-muted-foreground w-20 text-right hidden sm:block">CREATORS</span>
                <span className="font-pixel text-xs text-muted-foreground w-16 text-right hidden sm:block">TREND</span>
              </div>
              {topBrands.map((brand, index) => (
                <div 
                  key={brand.rank}
                  className={`p-4 flex items-center gap-4 border-b-2 border-border last:border-b-0 hover:bg-muted/50 transition-colors ${
                    index < 3 ? 'bg-muted/30' : ''
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={`w-10 h-10 flex items-center justify-center border-2 ${getRankStyle(brand.rank)}`}>
                    {getRankIcon(brand.rank)}
                  </div>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-muted border-2 border-border flex items-center justify-center font-pixel text-xs shrink-0">
                      {brand.avatar}
                    </div>
                    <div className="min-w-0">
                      <p className="font-pixel text-sm text-foreground truncate">{brand.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{brand.category}</p>
                    </div>
                  </div>
                  <div className="w-20 text-right">
                    <p className="font-mono text-sm text-neon-pink">{brand.xp.toLocaleString()}</p>
                  </div>
                  <div className="w-20 text-right hidden sm:block">
                    <p className="font-mono text-sm text-foreground">{brand.creators}</p>
                  </div>
                  <div className="w-16 text-right hidden sm:flex items-center justify-end gap-1">
                    <TrendingUp className="w-3 h-3 text-neon-green" />
                    <span className="font-mono text-xs text-neon-green">{brand.trend}</span>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

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

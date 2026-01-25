"use client";

import { useAchievements, Achievement } from "@/hooks/use-achievements";
import InfluencerLayout from "@/components/influencer/InfluencerLayout";
import { Progress } from "@/components/ui/progress";
import { Trophy, Star, Gem, Crown, Lock, CheckCircle } from "lucide-react";

const rarityConfig = {
  common: {
    bg: "from-slate-800/50 to-slate-900/50",
    border: "border-slate-600",
    text: "text-slate-300",
    glow: "",
    icon: Star,
  },
  rare: {
    bg: "from-blue-900/50 to-blue-950/50",
    border: "border-blue-500",
    text: "text-blue-300",
    glow: "shadow-[0_0_15px_rgba(59,130,246,0.3)]",
    icon: Trophy,
  },
  epic: {
    bg: "from-purple-900/50 to-purple-950/50",
    border: "border-purple-500",
    text: "text-purple-300",
    glow: "shadow-[0_0_15px_rgba(168,85,247,0.3)]",
    icon: Gem,
  },
  legendary: {
    bg: "from-amber-900/50 to-amber-950/50",
    border: "border-amber-500",
    text: "text-amber-300",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.4)]",
    icon: Crown,
  },
};

const AchievementCard = ({ achievement }: { achievement: Achievement }) => {
  const config = rarityConfig[achievement.rarity];
  const RarityIcon = config.icon;
  const hasProgress = achievement.maxProgress !== undefined;
  const progressPercent = hasProgress
    ? ((achievement.progress || 0) / achievement.maxProgress!) * 100
    : 0;

  return (
    <div
      className={`relative p-4 bg-gradient-to-br ${config.bg} border-2 ${
        achievement.unlocked ? config.border : "border-muted/30"
      } rounded-none transition-all duration-300 ${achievement.unlocked ? config.glow : "opacity-60"} hover:scale-[1.02]`}
      style={{ fontFamily: "'Press Start 2P', cursive" }}
    >
      <div
        className={`absolute -top-0.5 -left-0.5 w-1.5 h-1.5 ${
          achievement.unlocked ? "bg-primary" : "bg-muted/50"
        }`}
      />
      <div
        className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 ${
          achievement.unlocked ? "bg-primary" : "bg-muted/50"
        }`}
      />
      <div
        className={`absolute -bottom-0.5 -left-0.5 w-1.5 h-1.5 ${
          achievement.unlocked ? "bg-primary" : "bg-muted/50"
        }`}
      />
      <div
        className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 ${
          achievement.unlocked ? "bg-primary" : "bg-muted/50"
        }`}
      />

      <div className="flex items-start gap-3">
        <div
          className={`relative w-12 h-12 shrink-0 bg-black/50 border-2 ${
            achievement.unlocked ? config.border : "border-muted/30"
          } flex items-center justify-center text-2xl`}
        >
          {achievement.unlocked ? achievement.icon : <Lock className="w-5 h-5 text-muted-foreground" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <RarityIcon className={`w-2.5 h-2.5 ${config.text}`} />
            <span className={`text-[6px] uppercase ${config.text}`}>{achievement.rarity}</span>
            {achievement.unlocked ? <CheckCircle className="w-2.5 h-2.5 text-accent ml-auto" /> : null}
          </div>

          <h3 className={`text-[8px] mb-1 truncate ${achievement.unlocked ? "text-white" : "text-muted-foreground"}`}>
            {achievement.name}
          </h3>

          <p className="text-[6px] text-muted-foreground leading-relaxed">{achievement.description}</p>

          {hasProgress && !achievement.unlocked ? (
            <div className="mt-2">
              <Progress value={progressPercent} className="h-1.5" />
              <p className="text-[5px] text-muted-foreground mt-1">
                {achievement.progress?.toLocaleString()} / {achievement.maxProgress?.toLocaleString()}
              </p>
            </div>
          ) : null}

          <div className="flex items-center gap-1 mt-2">
            <Star className="w-2.5 h-2.5 text-accent" />
            <span className={`text-[7px] ${achievement.unlocked ? "text-accent" : "text-muted-foreground"}`}>
              {achievement.unlocked ? `+${achievement.xp} XP earned` : `${achievement.xp} XP`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AchievementsPage() {
  const { achievements, getTotalXP, getUnlockedCount, isLoading } = useAchievements();

  const groupedAchievements = {
    legendary: achievements.filter((a) => a.rarity === "legendary"),
    epic: achievements.filter((a) => a.rarity === "epic"),
    rare: achievements.filter((a) => a.rarity === "rare"),
    common: achievements.filter((a) => a.rarity === "common"),
  };

  return (
    <InfluencerLayout>
      <div className="p-4 space-y-6" style={{ fontFamily: "'Press Start 2P', cursive" }}>
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Trophy className="w-6 h-6 text-accent" />
            <h1 className="text-sm text-white">Achievements</h1>
          </div>
          <p className="text-[8px] text-muted-foreground">
            Complete challenges to earn XP and unlock rewards
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card/50 border-2 border-primary/30 p-3 text-center">
            <p className="text-lg text-accent">
              {isLoading ? "--" : `${getUnlockedCount()}/${achievements.length}`}
            </p>
            <p className="text-[6px] text-muted-foreground mt-1">Unlocked</p>
          </div>
          <div className="bg-card/50 border-2 border-accent/30 p-3 text-center">
            <p className="text-lg text-primary">
              {isLoading ? "--" : getTotalXP().toLocaleString()}
            </p>
            <p className="text-[6px] text-muted-foreground mt-1">Total XP</p>
          </div>
        </div>

        <div className="space-y-4">
          {(["legendary", "epic", "rare", "common"] as const).map((tier) => (
            <div key={tier} className="space-y-3">
              <h2 className="text-[8px] uppercase text-muted-foreground">{tier}</h2>
              <div className="grid gap-3">
                {groupedAchievements[tier].map((achievement) => (
                  <AchievementCard key={achievement.id} achievement={achievement} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </InfluencerLayout>
  );
}

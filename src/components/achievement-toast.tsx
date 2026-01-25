"use client";

import { Trophy, Star, Gem, Crown } from "lucide-react";
import { Achievement } from "@/hooks/use-achievements";

type AchievementToastProps = {
  achievement: Achievement;
};

const rarityConfig = {
  common: {
    bg: "from-slate-800 to-slate-900",
    border: "border-slate-600",
    text: "text-slate-300",
    icon: Star,
  },
  rare: {
    bg: "from-blue-900 to-blue-950",
    border: "border-blue-500",
    text: "text-blue-300",
    icon: Trophy,
  },
  epic: {
    bg: "from-purple-900 to-purple-950",
    border: "border-purple-500",
    text: "text-purple-300",
    icon: Gem,
  },
  legendary: {
    bg: "from-amber-900 to-amber-950",
    border: "border-amber-500",
    text: "text-amber-300",
    icon: Crown,
  },
};

export const AchievementToast = ({ achievement }: AchievementToastProps) => {
  const config = rarityConfig[achievement.rarity];
  const RarityIcon = config.icon;

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r ${config.bg} border-2 ${config.border} rounded-none px-6 py-4 animate-fade-in shadow-[0_0_30px_rgba(0,245,255,0.3)] min-w-[300px]`}
      style={{ fontFamily: "'Press Start 2P', cursive" }}
    >
      <div className="absolute -top-1 -left-1 w-2 h-2 bg-primary" />
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary" />
      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-primary" />
      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-primary" />

      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 bg-black/50 border-2 ${config.border} flex items-center justify-center text-2xl`}
        >
          {achievement.icon}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <RarityIcon className={`w-3 h-3 ${config.text}`} />
            <span className={`text-[8px] uppercase ${config.text}`}>
              {achievement.rarity} Achievement
            </span>
          </div>

          <h3 className="text-[10px] text-white mb-1">{achievement.name}</h3>

          <p className="text-[6px] text-muted-foreground">{achievement.description}</p>

          <div className="flex items-center gap-1 mt-2">
            <span className="text-[8px] text-accent">+{achievement.xp} XP</span>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 animate-pulse opacity-20 pointer-events-none">
        <div className={`w-full h-full bg-gradient-to-r ${config.bg}`} />
      </div>
    </div>
  );
};

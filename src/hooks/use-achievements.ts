"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConfetti } from "@/hooks/use-confetti";
import { useFeedback } from "@/hooks/use-feedback";

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
};

type AchievementResponse = {
  ok: boolean;
  achievements: Achievement[];
  totalXp: number;
  unlockedCount: number;
  level: number;
  activeStrikes: number;
};

type ApiError = Error & { status?: number; code?: string };

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  const data = (await res.json().catch(() => null)) as T & { error?: string; code?: string };
  if (!res.ok) {
    const err = new Error(data?.error ?? "Request failed") as ApiError;
    err.status = res.status;
    err.code = data?.code;
    throw err;
  }
  return data;
}

export const useAchievements = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [totalXp, setTotalXp] = useState(0);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [level, setLevel] = useState(1);
  const [activeStrikes, setActiveStrikes] = useState(0);
  const [recentUnlock, setRecentUnlock] = useState<Achievement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const previousUnlocked = useRef<Set<string>>(new Set());

  const { fireLevelUp, fireMatch, fireFromSides } = useConfetti();
  const { achievement: playAchievementSound } = useFeedback();

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchJson<AchievementResponse>("/api/creator/achievements");
      setAchievements(res.achievements ?? []);
      setTotalXp(res.totalXp ?? 0);
      setUnlockedCount(res.unlockedCount ?? 0);
      setLevel(res.level ?? 1);
      setActiveStrikes(res.activeStrikes ?? 0);
    } catch {
      setAchievements([]);
      setTotalXp(0);
      setUnlockedCount(0);
      setLevel(1);
      setActiveStrikes(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!achievements.length) return;
    const unlockedIds = new Set(
      achievements.filter((achievement) => achievement.unlocked).map((achievement) => achievement.id),
    );
    const prev = previousUnlocked.current;
    const newlyUnlocked = achievements.find(
      (achievement) => achievement.unlocked && !prev.has(achievement.id),
    );

    if (newlyUnlocked) {
      setRecentUnlock(newlyUnlocked);
      playAchievementSound();

      switch (newlyUnlocked.rarity) {
        case "legendary":
          fireLevelUp();
          break;
        case "epic":
          fireFromSides();
          break;
        default:
          fireMatch();
      }

      setTimeout(() => setRecentUnlock(null), 5000);
    }

    previousUnlocked.current = unlockedIds;
  }, [achievements, fireFromSides, fireLevelUp, fireMatch, playAchievementSound]);

  const refreshAchievements = useCallback(() => {
    load();
  }, [load]);

  const getTotalXP = useCallback(() => totalXp, [totalXp]);
  const getUnlockedCount = useCallback(() => unlockedCount, [unlockedCount]);

  const unlockAchievement = useCallback(() => {
    refreshAchievements();
  }, [refreshAchievements]);

  const incrementProgress = useCallback(() => {
    refreshAchievements();
  }, [refreshAchievements]);

  const updateProgress = useCallback(() => {
    refreshAchievements();
  }, [refreshAchievements]);

  const resetAchievements = useCallback(() => {
    refreshAchievements();
  }, [refreshAchievements]);

  return {
    achievements,
    recentUnlock,
    isLoading,
    level,
    activeStrikes,
    unlockAchievement,
    updateProgress,
    incrementProgress,
    getTotalXP,
    getUnlockedCount,
    refreshAchievements,
    resetAchievements,
  };
};

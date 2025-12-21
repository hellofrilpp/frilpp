import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useConfetti } from "./useConfetti";
import { useFeedback } from "./useFeedback";
import { CreatorAchievement, getCreatorAchievements } from "@/lib/api";

export type Achievement = CreatorAchievement;

const emptyAchievements: Achievement[] = [];

export const useAchievements = () => {
  const queryClient = useQueryClient();
  const { fireLevelUp, fireMatch, fireFromSides } = useConfetti();
  const { achievement: playAchievementSound } = useFeedback();
  const [recentUnlock, setRecentUnlock] = useState<Achievement | null>(null);
  const previousUnlocked = useRef<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ["creator-achievements"],
    queryFn: getCreatorAchievements,
  });

  const achievements = data?.achievements ?? emptyAchievements;
  const totalXp = data?.totalXp ?? 0;
  const unlockedCount = data?.unlockedCount ?? 0;
  const level = data?.level ?? 1;
  const activeStrikes = data?.activeStrikes ?? 0;

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
    queryClient.invalidateQueries({ queryKey: ["creator-achievements"] });
  }, [queryClient]);

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

import { useState, useCallback } from 'react';
import { useConfetti } from './useConfetti';
import { useFeedback } from './useFeedback';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
  unlockedAt?: Date;
  progress?: number;
  maxProgress?: number;
}

const ACHIEVEMENTS_KEY = 'lovable_achievements';

const defaultAchievements: Achievement[] = [
  {
    id: 'first_swipe',
    name: 'First Swipe',
    description: 'Swipe on your first brand deal',
    icon: '👆',
    xp: 50,
    rarity: 'common',
    unlocked: false,
  },
  {
    id: 'first_match',
    name: 'Perfect Match',
    description: 'Get matched with a brand',
    icon: '💫',
    xp: 100,
    rarity: 'common',
    unlocked: false,
  },
  {
    id: 'swipe_master',
    name: 'Swipe Master',
    description: 'Swipe on 50 deals',
    icon: '🎯',
    xp: 250,
    rarity: 'rare',
    unlocked: false,
    progress: 0,
    maxProgress: 50,
  },
  {
    id: 'deal_closer',
    name: 'Deal Closer',
    description: 'Complete your first deal',
    icon: '🤝',
    xp: 500,
    rarity: 'rare',
    unlocked: false,
  },
  {
    id: 'content_creator',
    name: 'Content Creator',
    description: 'Submit 10 pieces of content',
    icon: '🎬',
    xp: 300,
    rarity: 'rare',
    unlocked: false,
    progress: 0,
    maxProgress: 10,
  },
  {
    id: 'rising_star',
    name: 'Rising Star',
    description: 'Reach Level 5',
    icon: '⭐',
    xp: 750,
    rarity: 'epic',
    unlocked: false,
  },
  {
    id: 'influencer_elite',
    name: 'Influencer Elite',
    description: 'Reach Level 10',
    icon: '👑',
    xp: 1500,
    rarity: 'epic',
    unlocked: false,
  },
  {
    id: 'money_maker',
    name: 'Money Maker',
    description: 'Earn $10,000 in total deals',
    icon: '💰',
    xp: 1000,
    rarity: 'epic',
    unlocked: false,
    progress: 0,
    maxProgress: 10000,
  },
  {
    id: 'viral_sensation',
    name: 'Viral Sensation',
    description: 'Get 1M total views on sponsored content',
    icon: '🚀',
    xp: 2000,
    rarity: 'legendary',
    unlocked: false,
    progress: 0,
    maxProgress: 1000000,
  },
  {
    id: 'brand_favorite',
    name: 'Brand Favorite',
    description: 'Get 5 repeat deals from the same brand',
    icon: '💎',
    xp: 2500,
    rarity: 'legendary',
    unlocked: false,
    progress: 0,
    maxProgress: 5,
  },
];

export const useAchievements = () => {
  const { fireLevelUp, fireMatch, fireFromSides } = useConfetti();
  const { achievement: playAchievementSound } = useFeedback();

  const loadAchievements = (): Achievement[] => {
    const saved = localStorage.getItem(ACHIEVEMENTS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    return defaultAchievements;
  };

  const [achievements, setAchievements] = useState<Achievement[]>(loadAchievements);
  const [recentUnlock, setRecentUnlock] = useState<Achievement | null>(null);

  const saveAchievements = (newAchievements: Achievement[]) => {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(newAchievements));
    setAchievements(newAchievements);
  };

  const unlockAchievement = useCallback((id: string) => {
    setAchievements(prev => {
      const achievement = prev.find(a => a.id === id);
      if (!achievement || achievement.unlocked) return prev;

      const updated = prev.map(a => 
        a.id === id 
          ? { ...a, unlocked: true, unlockedAt: new Date() }
          : a
      );

      localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(updated));

      // Trigger celebration based on rarity
      const unlockedAchievement = updated.find(a => a.id === id)!;
      setRecentUnlock(unlockedAchievement);
      playAchievementSound();

      switch (unlockedAchievement.rarity) {
        case 'legendary':
          fireLevelUp();
          break;
        case 'epic':
          fireFromSides();
          break;
        case 'rare':
          fireMatch();
          break;
        default:
          // Common achievements get a small confetti burst
          fireMatch();
      }

      // Clear recent unlock after 5 seconds
      setTimeout(() => setRecentUnlock(null), 5000);

      return updated;
    });
  }, [fireLevelUp, fireMatch, fireFromSides, playAchievementSound]);

  const updateProgress = useCallback((id: string, progress: number) => {
    setAchievements(prev => {
      const achievement = prev.find(a => a.id === id);
      if (!achievement || achievement.unlocked || !achievement.maxProgress) return prev;

      const newProgress = Math.min(progress, achievement.maxProgress);
      const shouldUnlock = newProgress >= achievement.maxProgress;

      const updated = prev.map(a => 
        a.id === id 
          ? { 
              ...a, 
              progress: newProgress,
              unlocked: shouldUnlock,
              unlockedAt: shouldUnlock ? new Date() : undefined
            }
          : a
      );

      localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(updated));

      if (shouldUnlock) {
        const unlockedAchievement = updated.find(a => a.id === id)!;
        setRecentUnlock(unlockedAchievement);
        playAchievementSound();

        switch (unlockedAchievement.rarity) {
          case 'legendary':
            fireLevelUp();
            break;
          case 'epic':
            fireFromSides();
            break;
          default:
            fireMatch();
        }

        setTimeout(() => setRecentUnlock(null), 5000);
      }

      return updated;
    });
  }, [fireLevelUp, fireMatch, fireFromSides, playAchievementSound]);

  const incrementProgress = useCallback((id: string, amount: number = 1) => {
    const achievement = achievements.find(a => a.id === id);
    if (achievement && achievement.progress !== undefined) {
      updateProgress(id, achievement.progress + amount);
    }
  }, [achievements, updateProgress]);

  const getTotalXP = useCallback(() => {
    return achievements
      .filter(a => a.unlocked)
      .reduce((sum, a) => sum + a.xp, 0);
  }, [achievements]);

  const getUnlockedCount = useCallback(() => {
    return achievements.filter(a => a.unlocked).length;
  }, [achievements]);

  const resetAchievements = useCallback(() => {
    localStorage.removeItem(ACHIEVEMENTS_KEY);
    setAchievements(defaultAchievements);
  }, []);

  return {
    achievements,
    recentUnlock,
    unlockAchievement,
    updateProgress,
    incrementProgress,
    getTotalXP,
    getUnlockedCount,
    resetAchievements,
  };
};

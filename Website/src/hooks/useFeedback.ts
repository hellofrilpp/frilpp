import { useCallback } from "react";

// Vibration patterns for different actions
const VIBRATION_PATTERNS = {
  tap: [10],
  success: [50, 30, 50],
  error: [100, 50, 100],
  swipeLeft: [30],
  swipeRight: [50, 20, 50],
  levelUp: [100, 50, 100, 50, 150],
  achievement: [50, 30, 50, 30, 100],
} as const;

type FeedbackType = keyof typeof VIBRATION_PATTERNS;

// Sound frequencies for retro beeps
const SOUND_FREQUENCIES = {
  tap: { freq: 800, duration: 50 },
  success: { freq: 1200, duration: 100 },
  error: { freq: 300, duration: 150 },
  swipeLeft: { freq: 400, duration: 80 },
  swipeRight: { freq: 1000, duration: 100 },
  levelUp: { freq: 1500, duration: 200 },
  achievement: { freq: 1800, duration: 150 },
} as const;

let audioContext: AudioContext | null = null;

type WindowWithWebkitAudioContext = Window & {
  webkitAudioContext?: typeof AudioContext;
};

const getAudioContext = () => {
  if (!audioContext) {
    const Ctor = window.AudioContext || (window as WindowWithWebkitAudioContext).webkitAudioContext;
    if (!Ctor) {
      throw new Error("AudioContext not supported");
    }
    audioContext = new Ctor();
  }
  return audioContext;
};

const playBeep = (type: FeedbackType) => {
  try {
    const ctx = getAudioContext();
    const { freq, duration } = SOUND_FREQUENCIES[type];
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = "square"; // Retro 8-bit sound
    oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
    
    // Quick fade out for cleaner sound
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
  } catch {
    // Audio not supported
  }
};

const vibrate = (type: FeedbackType) => {
  if ("vibrate" in navigator) {
    navigator.vibrate(VIBRATION_PATTERNS[type]);
  }
};

export const useFeedback = () => {
  const trigger = useCallback((type: FeedbackType, options?: { sound?: boolean; haptic?: boolean }) => {
    const { sound = true, haptic = true } = options || {};
    
    if (haptic) {
      vibrate(type);
    }
    
    if (sound) {
      playBeep(type);
    }
  }, []);

  const tap = useCallback(() => trigger("tap"), [trigger]);
  const success = useCallback(() => trigger("success"), [trigger]);
  const error = useCallback(() => trigger("error"), [trigger]);
  const swipeLeft = useCallback(() => trigger("swipeLeft"), [trigger]);
  const swipeRight = useCallback(() => trigger("swipeRight"), [trigger]);
  const levelUp = useCallback(() => trigger("levelUp"), [trigger]);
  const achievement = useCallback(() => trigger("achievement"), [trigger]);

  return {
    trigger,
    tap,
    success,
    error,
    swipeLeft,
    swipeRight,
    levelUp,
    achievement,
  };
};

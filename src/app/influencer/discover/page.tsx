"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Heart,
  X,
  Info,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import InfluencerLayout from "@/components/influencer/InfluencerLayout";
import { useFeedback } from "@/hooks/use-feedback";
import { useConfetti } from "@/hooks/use-confetti";
import { useAchievements } from "@/hooks/use-achievements";
import { AchievementToast } from "@/components/achievement-toast";

type ApiError = Error & { status?: number; code?: string };

type FeedOffer = {
  id: string;
  brandName: string;
  title: string;
  deliverable: "REELS" | "FEED" | "UGC";
  deadlineDaysAfterDelivery: number;
};

type FeedResponse = {
  ok: boolean;
  blocked?: boolean;
  reason?: string;
  profileComplete?: boolean;
  missingProfileFields?: string[];
  offers?: FeedOffer[];
};

type OfferCard = {
  id: string;
  brand: string;
  product: string;
  value: string;
  requirements: string;
  category: string;
  description: string;
  deadline: string;
  followers: string;
};

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

const requirementLabel = (deliverable: OfferCard["requirements"] | FeedOffer["deliverable"]) => {
  if (deliverable === "REELS") return "1 Reel";
  if (deliverable === "FEED") return "1 Feed post";
  return "UGC only";
};

export default function InfluencerDiscoverPage() {
  const [data, setData] = useState<FeedResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(
    null,
  );
  const [showDetails, setShowDetails] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [matchedOffers, setMatchedOffers] = useState<string[]>([]);
  const [hiddenOfferIds, setHiddenOfferIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const feedback = useFeedback();
  const { fireMatch, fireLevelUp } = useConfetti();
  const { recentUnlock, refreshAchievements } = useAchievements();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const res = await fetchJson<FeedResponse>("/api/creator/feed");
        if (!cancelled) setData(res);
      } catch (err) {
        const apiErr = err as ApiError;
        if (apiErr?.code === "NEEDS_CREATOR_PROFILE") {
          window.location.href = "/influencer/onboarding";
          return;
        }
        if (apiErr?.code === "NEEDS_LEGAL_ACCEPTANCE") {
          window.location.href = "/legal/accept?next=/influencer/discover";
          return;
        }
        if (!cancelled) {
          setNotice(apiErr?.message ?? "Failed to load offers.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const offers = useMemo<OfferCard[]>(() => {
    if (!data?.offers) return [];
    return data.offers.map((offer) => ({
      id: offer.id,
      brand: offer.brandName,
      product: offer.title,
      value: "$0",
      requirements: requirementLabel(offer.deliverable),
      category: "Seeding",
      description: `Post within ${offer.deadlineDaysAfterDelivery} days of delivery.`,
      deadline: `${offer.deadlineDaysAfterDelivery} days`,
      followers: "Nano creators",
    }));
  }, [data]);

  const visibleOffers = useMemo(() => {
    if (!offers.length) return [];
    const hiddenSet = new Set(hiddenOfferIds);
    return offers.filter((offer) => !hiddenSet.has(offer.id));
  }, [offers, hiddenOfferIds]);

  useEffect(() => {
    if (visibleOffers.length === 0 && currentIndex !== 0) {
      setCurrentIndex(0);
      return;
    }
    if (currentIndex >= visibleOffers.length && visibleOffers.length > 0) {
      setCurrentIndex(visibleOffers.length - 1);
    }
  }, [currentIndex, visibleOffers.length]);

  const currentOffer = visibleOffers[currentIndex];
  const hasMoreOffers = currentIndex < visibleOffers.length;

  const showNotice = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(null), 3500);
  };

  const handleSwipe = async (direction: "left" | "right") => {
    if (!currentOffer) return;
    if (direction === "right" && profileBlocked) {
      showNotice("Complete your profile before claiming offers.");
      window.location.href = "/influencer/profile";
      return;
    }
    let shouldRemove = false;
    let shouldAdvance = true;

    if (direction === "right") {
      try {
        await fetchJson(`/api/creator/offers/${currentOffer.id}/claim`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        });
        setSwipeDirection("right");
        setMatchedOffers((prev) => [...prev, currentOffer.id]);
        refreshAchievements();
        feedback.swipeRight();
        fireMatch();
        shouldRemove = true;
      } catch (err) {
        shouldAdvance = false;
        const apiErr = err as ApiError;
        if (apiErr?.code === "NEEDS_TIKTOK_CONNECT") {
          showNotice("Link your TikTok to claim this offer.");
          window.location.href = "/api/auth/social/tiktok/connect?next=/influencer/discover";
        } else if (apiErr?.code === "NEEDS_TIKTOK_RECONNECT") {
          showNotice("Your TikTok token expired. Reconnect to claim.");
        } else if (apiErr?.code === "NEEDS_LOCATION") {
          setShowLocationModal(true);
          return;
        } else if (apiErr?.code === "NEEDS_ADDRESS") {
          showNotice("Add your delivery address in Profile before claiming.");
          window.location.href = "/influencer/profile";
        } else if (apiErr?.code === "NEEDS_PROFILE") {
          showNotice("Complete your profile before claiming.");
          window.location.href = "/influencer/profile";
        } else if (apiErr?.code === "NEEDS_SOCIAL_CONNECT") {
          showNotice("Connect a social account to claim this offer.");
          window.location.href = "/api/auth/social/tiktok/connect?next=/influencer/discover";
        } else {
          showNotice(apiErr?.message ?? "Unable to claim offer.");
        }
        return;
      }
    } else {
      setSwipeDirection("left");
      try {
        await fetchJson(`/api/creator/offers/${currentOffer.id}/reject`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        });
      } catch {
        // ignore rejection tracking failures
      }
      feedback.swipeLeft();
    }

    setTimeout(() => {
      setSwipeDirection(null);
      if (!shouldAdvance) return;
      if (shouldRemove) {
        const removalId = currentOffer.id;
        setHiddenOfferIds((prev) => (prev.includes(removalId) ? prev : [...prev, removalId]));
        setCurrentIndex((prev) => {
          const nextLength = Math.max(visibleOffers.length - 1, 0);
          if (nextLength === 0) return 0;
          return Math.min(prev, nextLength - 1);
        });
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    }, 400);
  };

  const resetStack = () => {
    setCurrentIndex(0);
    setMatchedOffers([]);
    feedback.success();
    fireLevelUp();
  };

  const blocked = data?.blocked;
  const blockedReason = data?.reason;
  const profileMissing =
    data?.profileComplete === false ? data?.missingProfileFields ?? [] : [];
  const profileBlocked = profileMissing.length > 0;

  return (
    <>
      {recentUnlock ? <AchievementToast achievement={recentUnlock} /> : null}
      <InfluencerLayout>
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] p-6 bg-grid">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-neon-pink animate-pulse-neon" />
              <span className="text-xs font-pixel text-neon-pink">[DISCOVER]</span>
            </div>
            <h1 className="text-xl font-pixel text-foreground mb-2">SWIPE FOR LOOT</h1>
            <p className="text-sm font-mono text-muted-foreground">
              {isLoading
                ? "Loading offers..."
                : blocked
                  ? "Offers paused"
                  : hasMoreOffers
                    ? `${visibleOffers.length - currentIndex} offers remaining`
                    : "All caught up!"}
            </p>
          </div>

          {notice ? (
            <div className="mb-4 border-2 border-neon-pink text-neon-pink p-3 text-xs font-mono">
              {notice}
            </div>
          ) : null}

          {profileBlocked ? (
            <div className="mb-4 w-full max-w-2xl border-2 border-neon-yellow bg-neon-yellow/10 p-4 text-xs font-mono text-neon-yellow">
              Complete your profile before claiming offers. Missing: {profileMissing.join(", ")}.
              <div className="mt-3">
                <Button
                  size="sm"
                  className="bg-neon-yellow text-background font-pixel pixel-btn"
                  onClick={() => {
                    window.location.href = "/influencer/profile";
                  }}
                >
                  GO TO PROFILE
                </Button>
              </div>
            </div>
          ) : null}

          {isLoading ? (
            <div className="border-4 border-border bg-card p-6 text-center">
              <p className="font-mono text-sm text-muted-foreground">Loading offers...</p>
            </div>
          ) : blocked ? (
            <div className="border-4 border-border bg-card p-6 text-center">
              <p className="font-mono text-sm text-muted-foreground">
                {blockedReason ?? "You are temporarily blocked from claiming offers."}
              </p>
            </div>
          ) : hasMoreOffers ? (
            <div className="relative w-full max-w-sm">
              {currentIndex + 2 < visibleOffers.length ? (
                <div className="absolute top-4 left-4 right-4 h-[420px] bg-muted border-4 border-neon-purple transform rotate-3 opacity-60" />
              ) : null}
              {currentIndex + 1 < visibleOffers.length ? (
                <div className="absolute top-2 left-2 right-2 h-[420px] bg-card border-4 border-neon-blue transform -rotate-2 opacity-80" />
              ) : null}

              <div
                className={`relative bg-card border-4 border-neon-green transition-transform duration-400 ${
                  swipeDirection === "right" ? "swipe-right" : swipeDirection === "left" ? "swipe-left" : ""
                }`}
              >
                <div className="h-48 bg-muted flex items-center justify-center relative overflow-hidden">
                  <div className="w-20 h-20 border-4 border-neon-purple bg-neon-purple/20 flex items-center justify-center">
                    <Package className="w-10 h-10 text-neon-purple" />
                  </div>
                  <div className="absolute inset-0 scanlines opacity-50" />
                  <span className="absolute top-3 right-3 text-xs font-pixel text-neon-green">
                    [{String(currentIndex + 1).padStart(2, "0")}]
                  </span>

                  {swipeDirection === "right" ? (
                    <div className="absolute inset-0 bg-neon-green/30 flex items-center justify-center">
                      <span className="text-2xl font-pixel text-neon-green animate-pulse-neon">
                        MATCH!
                      </span>
                    </div>
                  ) : null}
                  {swipeDirection === "left" ? (
                    <div className="absolute inset-0 bg-destructive/30 flex items-center justify-center">
                      <span className="text-2xl font-pixel text-destructive">NOPE</span>
                    </div>
                  ) : null}
                </div>

                <div className="p-5 border-t-4 border-border">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 text-xs font-mono border-2 border-neon-pink text-neon-pink">
                        {currentOffer.category.toUpperCase()}
                      </span>
                      <span className="text-xs font-mono text-neon-yellow">{currentOffer.value}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 border-2 border-border hover:border-neon-blue"
                      onClick={() => {
                        feedback.tap();
                        setShowDetails(true);
                      }}
                    >
                      <Info className="w-4 h-4" />
                    </Button>
                  </div>

                  <h2 className="font-pixel text-lg mb-1 text-foreground">
                    {currentOffer.product}
                  </h2>
                  <p className="text-xs font-mono text-muted-foreground mb-2">
                    by {currentOffer.brand}
                  </p>
                  <p className="text-xs font-mono text-neon-green">{currentOffer.requirements}</p>

                  <div className="flex items-center justify-center gap-6 mt-6">
                    <button
                      onClick={() => handleSwipe("left")}
                      className="w-14 h-14 border-4 border-destructive bg-destructive/10 flex items-center justify-center hover:bg-destructive hover:text-background transition-all pixel-btn"
                    >
                      <X className="w-6 h-6 text-destructive" />
                    </button>
                    <button
                      onClick={() => handleSwipe("right")}
                      className="w-16 h-16 bg-neon-green text-background flex items-center justify-center pixel-btn glow-green"
                    >
                      <Heart className="w-7 h-7" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-6 mt-6 text-xs font-mono text-muted-foreground">
                <div className="flex items-center gap-1">
                  <ChevronLeft className="w-4 h-4 text-destructive" />
                  <span>SKIP</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>MATCH</span>
                  <ChevronRight className="w-4 h-4 text-neon-green" />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 border-4 border-border max-w-sm w-full bg-card">
              <Sparkles className="w-12 h-12 mx-auto text-neon-yellow mb-4 animate-pulse-neon" />
              <h2 className="font-pixel text-lg mb-2 text-foreground">ALL CAUGHT UP!</h2>
              <p className="font-mono text-sm text-muted-foreground mb-6">
                You matched with <span className="text-neon-green">{matchedOffers.length}</span> offers
                today
              </p>
              <Button
                onClick={resetStack}
                className="bg-neon-pink text-background font-pixel text-xs pixel-btn glow-pink"
              >
                PLAY AGAIN
              </Button>
            </div>
          )}

          {showDetails && currentOffer ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-md border-4 border-neon-green bg-card p-6 relative">
                <button
                  className="absolute right-3 top-3 text-xs font-mono text-muted-foreground hover:text-neon-green"
                  onClick={() => setShowDetails(false)}
                >
                  CLOSE
                </button>
                <h2 className="font-pixel text-lg text-neon-green mb-4">{currentOffer.product}</h2>
                <div className="space-y-4">
                  <div className="h-32 bg-muted border-2 border-border flex items-center justify-center">
                    <Package className="w-12 h-12 text-neon-purple" />
                  </div>
                  <div>
                    <h3 className="text-xs font-pixel text-muted-foreground mb-1">BRAND</h3>
                    <p className="font-mono text-sm">{currentOffer.brand}</p>
                  </div>
                  <div>
                    <h3 className="text-xs font-pixel text-muted-foreground mb-1">DESCRIPTION</h3>
                    <p className="font-mono text-xs">{currentOffer.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-xs font-pixel text-muted-foreground mb-1">VALUE</h3>
                      <p className="font-mono text-sm text-neon-yellow">{currentOffer.value}</p>
                    </div>
                    <div>
                      <h3 className="text-xs font-pixel text-muted-foreground mb-1">DEADLINE</h3>
                      <p className="font-mono text-sm">{currentOffer.deadline}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-pixel text-muted-foreground mb-1">REQUIREMENTS</h3>
                    <p className="font-mono text-sm text-neon-green">{currentOffer.requirements}</p>
                    <p className="font-mono text-xs text-muted-foreground mt-1">
                      {currentOffer.followers}
                    </p>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1 border-2 border-border font-mono text-xs"
                      onClick={() => {
                        setShowDetails(false);
                        handleSwipe("left");
                      }}
                    >
                      <X className="w-4 h-4 mr-2" />
                      PASS
                    </Button>
                    <Button
                      className="flex-1 bg-neon-green text-background font-pixel text-xs pixel-btn"
                      onClick={() => {
                        setShowDetails(false);
                        handleSwipe("right");
                      }}
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      MATCH
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {showLocationModal ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-md border-4 border-neon-pink bg-card p-6">
                <h2 className="font-pixel text-lg text-neon-pink mb-4">ADD YOUR LOCATION</h2>
                <div className="space-y-4">
                  <p className="font-mono text-sm text-muted-foreground">
                    This offer needs location for eligibility. Add your location in Profile to
                    continue.
                  </p>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      className="border-2 border-border font-pixel text-xs"
                      onClick={() => setShowLocationModal(false)}
                    >
                      CANCEL
                    </Button>
                    <Button
                      className="bg-neon-green text-background font-pixel text-xs pixel-btn glow-green"
                      onClick={() => {
                        setShowLocationModal(false);
                        window.location.href = "/influencer/profile";
                      }}
                    >
                      GO TO PROFILE
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </InfluencerLayout>
    </>
  );
}

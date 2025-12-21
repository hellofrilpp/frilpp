import { useEffect, useMemo, useState } from "react";
import { Heart, X, Info, ChevronLeft, ChevronRight, Sparkles, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import InfluencerLayout from "@/components/influencer/InfluencerLayout";
import { useFeedback } from "@/hooks/useFeedback";
import { useConfetti } from "@/hooks/useConfetti";
import { useAchievements } from "@/hooks/useAchievements";
import { AchievementToast } from "@/components/AchievementToast";
import { useToast } from "@/hooks/use-toast";
import { ApiError, apiUrl, claimOffer, getCreatorFeed } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

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

const requirementLabel = (deliverable: string) => {
  switch (deliverable) {
    case "REELS":
      return "1 Reel";
    case "FEED":
      return "1 Feed post";
    default:
      return "UGC only";
  }
};

const InfluencerDiscover = () => {
  const { toast } = useToast();
  const country: "US" | "IN" | undefined = undefined;
  const { data, isLoading, error } = useQuery({
    queryKey: ["creator-feed", country],
    queryFn: () => getCreatorFeed(country),
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [matchedOffers, setMatchedOffers] = useState<string[]>([]);
  const feedback = useFeedback();
  const { fireMatch, fireLevelUp } = useConfetti();
  const { recentUnlock, refreshAchievements } = useAchievements();

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

  useEffect(() => {
    if (error instanceof ApiError && error.code === "NEEDS_CREATOR_PROFILE") {
      window.location.href = "/influencer/onboarding";
    }
    if (error instanceof ApiError && error.code === "NEEDS_LEGAL_ACCEPTANCE") {
      window.location.href = apiUrl("/legal/accept?next=/influencer/discover");
    }
  }, [error]);

  const currentOffer = offers[currentIndex];
  const hasMoreOffers = currentIndex < offers.length;

  const handleSwipe = async (direction: "left" | "right") => {
    setSwipeDirection(direction);

    if (!currentOffer) {
      setSwipeDirection(null);
      return;
    }
    
    if (direction === "right") {
      try {
        await claimOffer(currentOffer.id);
        setMatchedOffers(prev => {
          const newMatches = [...prev, currentOffer.id];
          return newMatches;
        });
        refreshAchievements();
        feedback.swipeRight();
        fireMatch();
      } catch (err) {
        if (err instanceof ApiError && err.code === "NEEDS_INSTAGRAM_CONNECT") {
          toast({
            title: "CONNECT INSTAGRAM",
            description: "Link your Instagram to claim this offer.",
          });
          window.location.href = apiUrl("/api/meta/instagram/connect");
        } else if (err instanceof ApiError && err.code === "NEEDS_INSTAGRAM_SYNC") {
          toast({
            title: "SYNC REQUIRED",
            description: "Sync your Instagram profile before claiming.",
          });
        } else {
          const message = err instanceof ApiError ? err.message : "Unable to claim offer";
          toast({ title: "CLAIM FAILED", description: message });
        }
      }
    } else {
      feedback.swipeLeft();
    }

    setTimeout(() => {
      setSwipeDirection(null);
      setCurrentIndex(prev => prev + 1);
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

  return (
    <>
      {recentUnlock && <AchievementToast achievement={recentUnlock} />}
    <InfluencerLayout>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] p-6 bg-grid">
        {/* Header */}
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
                  ? `${offers.length - currentIndex} offers remaining`
                  : "All caught up!"
            }
          </p>
        </div>

        {/* Card Stack */}
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
            {/* Background Cards */}
            {currentIndex + 2 < offers.length && (
              <div className="absolute top-4 left-4 right-4 h-[420px] bg-muted border-4 border-neon-purple transform rotate-3 opacity-60" />
            )}
            {currentIndex + 1 < offers.length && (
              <div className="absolute top-2 left-2 right-2 h-[420px] bg-card border-4 border-neon-blue transform -rotate-2 opacity-80" />
            )}

            {/* Main Card */}
            <div 
              className={`relative bg-card border-4 border-neon-green transition-transform duration-400 ${
                swipeDirection === 'right' ? 'swipe-right' : 
                swipeDirection === 'left' ? 'swipe-left' : ''
              }`}
            >
              {/* Product Image */}
              <div className="h-48 bg-muted flex items-center justify-center relative overflow-hidden">
                <div className="w-20 h-20 border-4 border-neon-purple bg-neon-purple/20 flex items-center justify-center">
                  <Package className="w-10 h-10 text-neon-purple" />
                </div>
                <div className="absolute inset-0 scanlines opacity-50" />
                <span className="absolute top-3 right-3 text-xs font-pixel text-neon-green">
                  [{String(currentIndex + 1).padStart(2, '0')}]
                </span>
                
                {/* Swipe Indicators */}
                {swipeDirection === 'right' && (
                  <div className="absolute inset-0 bg-neon-green/30 flex items-center justify-center">
                    <span className="text-2xl font-pixel text-neon-green animate-pulse-neon">MATCH!</span>
                  </div>
                )}
                {swipeDirection === 'left' && (
                  <div className="absolute inset-0 bg-destructive/30 flex items-center justify-center">
                    <span className="text-2xl font-pixel text-destructive">NOPE</span>
                  </div>
                )}
              </div>

              {/* Card Content */}
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

                <h2 className="font-pixel text-lg mb-1 text-foreground">{currentOffer.product}</h2>
                <p className="text-xs font-mono text-muted-foreground mb-2">by {currentOffer.brand}</p>
                <p className="text-xs font-mono text-neon-green">{currentOffer.requirements}</p>

                {/* Swipe Buttons */}
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

            {/* Navigation Hint */}
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
          /* Empty State */
          <div className="text-center py-16 border-4 border-border max-w-sm w-full bg-card">
            <Sparkles className="w-12 h-12 mx-auto text-neon-yellow mb-4 animate-pulse-neon" />
            <h2 className="font-pixel text-lg mb-2 text-foreground">ALL CAUGHT UP!</h2>
            <p className="font-mono text-sm text-muted-foreground mb-6">
              You matched with <span className="text-neon-green">{matchedOffers.length}</span> offers today
            </p>
            <Button onClick={resetStack} className="bg-neon-pink text-background font-pixel text-xs pixel-btn glow-pink">
              PLAY AGAIN
            </Button>
          </div>
        )}

        {/* Details Dialog */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-md border-4 border-neon-green bg-card">
            <DialogHeader>
              <DialogTitle className="font-pixel text-lg text-neon-green">{currentOffer?.product}</DialogTitle>
            </DialogHeader>
            {currentOffer && (
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
                  <p className="font-mono text-xs text-muted-foreground mt-1">{currentOffer.followers}</p>
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
            )}
          </DialogContent>
        </Dialog>
      </div>
    </InfluencerLayout>
    </>
  );
};

export default InfluencerDiscover;

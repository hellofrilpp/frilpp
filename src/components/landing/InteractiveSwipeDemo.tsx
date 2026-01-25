"use client";

import { useCallback, useState } from "react";
import { Heart, X, Star } from "lucide-react";
import { useConfetti } from "@/hooks/use-confetti";

const sampleProducts = [
  {
    id: 1,
    name: "GLOWUP SERUM",
    category: "SKINCARE",
    value: "$50",
    requirement: "1 REEL + 2 STORIES",
    image: "/landing/products/serum.png",
    color: "neon-purple",
  },
  {
    id: 2,
    name: "RETRO KICKS",
    category: "FASHION",
    value: "$85",
    requirement: "1 REEL + 3 STORIES",
    image: "/landing/products/sneaker.png",
    color: "neon-pink",
  },
  {
    id: 3,
    name: "ARTISAN PALETTE",
    category: "BEAUTY",
    value: "$45",
    requirement: "2 REELS",
    image: "/landing/products/palette.png",
    color: "neon-blue",
  },
  {
    id: 4,
    name: "PROTEIN BAR",
    category: "FITNESS",
    value: "$35",
    requirement: "3 STORIES",
    image: "/landing/products/snackbar.png",
    color: "neon-green",
  },
  {
    id: 5,
    name: "PIXEL WATCH",
    category: "TECH",
    value: "$120",
    requirement: "1 REEL + 5 STORIES",
    image: "/landing/products/watch.png",
    color: "neon-yellow",
  },
];

const COLOR_STYLES = {
  "neon-purple": {
    border: "border-neon-purple",
    bg: "bg-neon-purple/10",
    text: "text-neon-purple",
    tagBg: "bg-neon-purple/20",
  },
  "neon-pink": {
    border: "border-neon-pink",
    bg: "bg-neon-pink/10",
    text: "text-neon-pink",
    tagBg: "bg-neon-pink/20",
  },
  "neon-blue": {
    border: "border-neon-blue",
    bg: "bg-neon-blue/10",
    text: "text-neon-blue",
    tagBg: "bg-neon-blue/20",
  },
  "neon-green": {
    border: "border-neon-green",
    bg: "bg-neon-green/10",
    text: "text-neon-green",
    tagBg: "bg-neon-green/20",
  },
  "neon-yellow": {
    border: "border-neon-yellow",
    bg: "bg-neon-yellow/10",
    text: "text-neon-yellow",
    tagBg: "bg-neon-yellow/20",
  },
};

type Product = (typeof sampleProducts)[number];

type SwipeDirection = "left" | "right" | null;

export default function InteractiveSwipeDemo() {
  const [index, setIndex] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection>(null);
  const [showMatch, setShowMatch] = useState(false);
  const [lastMatchedProduct, setLastMatchedProduct] = useState<Product | null>(null);
  const { fireMatch } = useConfetti();

  const product = sampleProducts[index % sampleProducts.length];
  const color = COLOR_STYLES[product.color as keyof typeof COLOR_STYLES];

  const handleSwipe = useCallback(
    (direction: "left" | "right") => {
      setSwipeDirection(direction);
      if (direction === "right") {
        setMatchCount((prev) => prev + 1);
        setLastMatchedProduct(product);
        setShowMatch(true);
        fireMatch();
      }
      setTimeout(() => {
        setSwipeDirection(null);
        setShowMatch(false);
        setIndex((prev) => (prev + 1) % sampleProducts.length);
      }, 450);
    },
    [fireMatch, product],
  );

  return (
    <div className="relative max-w-md mx-auto">
      <div className="absolute -top-8 right-0 text-xs font-pixel text-neon-green">
        MATCHED: {matchCount}
      </div>

      <div className="relative h-[420px]">
        <div className={`absolute inset-0 bg-card border-4 ${color.border} pixel-border-primary overflow-hidden`}
          style={{ transform: swipeDirection === "right" ? "translateX(30px) rotate(6deg)" : swipeDirection === "left" ? "translateX(-30px) rotate(-6deg)" : "none", transition: "transform 0.3s ease" }}
        >
          <div className="h-44 bg-muted flex items-center justify-center relative overflow-hidden">
            <img src={product.image} alt={product.name} className="w-32 h-32 object-contain" />
            <div className="absolute inset-0 scanlines opacity-30" />
            <div className="absolute top-2 left-2 text-xs font-pixel text-neon-green">
              [{String(product.id).padStart(2, "0")}]
            </div>
            <div className="absolute top-2 right-2">
              <Star className="w-4 h-4 text-neon-yellow animate-pulse-neon" />
            </div>
            {swipeDirection === "right" ? (
              <div className="absolute inset-0 bg-neon-green/20 flex items-center justify-center">
                <span className="font-pixel text-lg text-neon-green">LIKE!</span>
              </div>
            ) : null}
            {swipeDirection === "left" ? (
              <div className="absolute inset-0 bg-destructive/20 flex items-center justify-center">
                <span className="font-pixel text-lg text-destructive">NOPE</span>
              </div>
            ) : null}
          </div>

          <div className="p-4 border-t-4 border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-mono ${color.tagBg} ${color.text} border-2 ${color.border}`}>
                  {product.category}
                </span>
                <span className="text-xs font-mono text-neon-yellow">{product.value} VALUE</span>
              </div>
            </div>

            <h3 className="font-pixel text-base mb-1 text-foreground">{product.name}</h3>
            <p className="text-xs font-mono text-muted-foreground mb-4">
              {product.requirement} = PRODUCT DROP
            </p>

            <div className="flex items-center justify-center gap-6">
              <button
                className="w-12 h-12 border-4 border-destructive bg-destructive/10 flex items-center justify-center pixel-btn group"
                onClick={() => handleSwipe("left")}
              >
                <X className="w-5 h-5 text-destructive group-hover:text-foreground" />
              </button>
              <button
                className="w-14 h-14 bg-neon-green text-background flex items-center justify-center pixel-btn glow-green"
                onClick={() => handleSwipe("right")}
              >
                <Heart className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {showMatch && lastMatchedProduct ? (
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 border-2 border-neon-green bg-card px-4 py-2 text-xs font-mono text-neon-green animate-fade-in">
            MATCHED {lastMatchedProduct.name}
          </div>
        ) : null}
      </div>
    </div>
  );
}

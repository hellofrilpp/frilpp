import { useState, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { Heart, X, Star, Sparkles } from "lucide-react";
import { useConfetti } from "@/hooks/useConfetti";

import paletteImg from "@/assets/products/palette.png";
import sneakerImg from "@/assets/products/sneaker.png";
import snackbarImg from "@/assets/products/snackbar.png";
import serumImg from "@/assets/products/serum.png";
import watchImg from "@/assets/products/watch.png";

const sampleProducts = [
  {
    id: 1,
    name: "GLOWUP SERUM",
    category: "SKINCARE",
    value: "$50",
    requirement: "1 REEL + 2 STORIES",
    image: serumImg,
    color: "neon-purple",
  },
  {
    id: 2,
    name: "RETRO KICKS",
    category: "FASHION",
    value: "$85",
    requirement: "1 REEL + 3 STORIES",
    image: sneakerImg,
    color: "neon-pink",
  },
  {
    id: 3,
    name: "ARTISAN PALETTE",
    category: "BEAUTY",
    value: "$45",
    requirement: "2 REELS",
    image: paletteImg,
    color: "neon-blue",
  },
  {
    id: 4,
    name: "PROTEIN BAR",
    category: "FITNESS",
    value: "$35",
    requirement: "3 STORIES",
    image: snackbarImg,
    color: "neon-green",
  },
  {
    id: 5,
    name: "PIXEL WATCH",
    category: "TECH",
    value: "$120",
    requirement: "1 REEL + 5 STORIES",
    image: watchImg,
    color: "neon-yellow",
  },
];

interface SwipeCardProps {
  product: typeof sampleProducts[0];
  onSwipe: (direction: "left" | "right") => void;
  isTop: boolean;
}

const SwipeCard = ({ product, onSwipe, isTop }: SwipeCardProps) => {
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100) {
      const direction = info.offset.x > 0 ? "right" : "left";
      setExitDirection(direction);
      onSwipe(direction);
    }
  };

  const handleButtonSwipe = (direction: "left" | "right") => {
    setExitDirection(direction);
    onSwipe(direction);
  };

  return (
    <motion.div
      className="absolute inset-0"
      initial={{ scale: isTop ? 1 : 0.95, y: isTop ? 0 : 10 }}
      animate={{ scale: isTop ? 1 : 0.95, y: isTop ? 0 : 10 }}
      exit={{
        x: exitDirection === "right" ? 300 : exitDirection === "left" ? -300 : 0,
        rotate: exitDirection === "right" ? 20 : exitDirection === "left" ? -20 : 0,
        opacity: 0,
      }}
      transition={{ duration: 0.3 }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      style={{ zIndex: isTop ? 10 : 5, cursor: isTop ? "grab" : "default" }}
    >
      <div className={`h-full bg-card border-4 ${isTop ? 'border-primary pixel-border-primary' : 'border-border'} overflow-hidden`}>
        {/* Product Image Area */}
        <div className="h-44 bg-muted flex items-center justify-center relative overflow-hidden">
          <motion.img
            src={product.image}
            alt={product.name}
            className="w-32 h-32 object-contain"
            animate={isTop ? { y: [0, -5, 0] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          />
          {/* Scanlines */}
          <div className="absolute inset-0 scanlines opacity-30" />
          {/* Corner decorations */}
          <div className="absolute top-2 left-2 text-xs font-pixel text-neon-green">[{String(product.id).padStart(2, '0')}]</div>
          <motion.div
            className="absolute top-2 right-2"
            animate={isTop ? { scale: [1, 1.2, 1], rotate: [0, 180, 360] } : {}}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Star className="w-4 h-4 text-neon-yellow" />
          </motion.div>
        </div>
        
        {/* Card Content */}
        <div className="p-4 border-t-4 border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 text-xs font-mono bg-${product.color}/20 text-${product.color} border-2 border-${product.color}`}>
                {product.category}
              </span>
              <span className="text-xs font-mono text-neon-yellow">{product.value} VALUE</span>
            </div>
          </div>
          
          <h3 className="font-pixel text-base mb-1 text-foreground">{product.name}</h3>
          <p className="text-xs font-mono text-muted-foreground mb-4">{product.requirement} = PRODUCT DROP</p>
          
          {/* Swipe Buttons - Only interactive on top card */}
          {isTop && (
            <div className="flex items-center justify-center gap-6">
              <motion.button
                className="w-12 h-12 border-4 border-destructive bg-destructive/10 flex items-center justify-center pixel-btn group"
                whileHover={{ scale: 1.1, x: -5 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleButtonSwipe("left")}
              >
                <X className="w-5 h-5 text-destructive group-hover:text-foreground" />
              </motion.button>
              <motion.button
                className="w-14 h-14 bg-neon-green text-background flex items-center justify-center pixel-btn glow-green"
                whileHover={{ scale: 1.1, x: 5 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleButtonSwipe("right")}
                animate={{ 
                  boxShadow: [
                    "0 0 20px hsl(160 100% 50% / 0.5)",
                    "0 0 40px hsl(160 100% 50% / 0.8)",
                    "0 0 20px hsl(160 100% 50% / 0.5)"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Heart className="w-6 h-6" />
              </motion.button>
            </div>
          )}
        </div>
      </div>

      {/* Swipe indicators */}
      {isTop && (
        <>
          <motion.div
            className="absolute top-4 left-4 px-4 py-2 bg-destructive text-background font-pixel text-sm rotate-[-15deg] opacity-0"
            style={{ opacity: 0 }}
          >
            NOPE
          </motion.div>
          <motion.div
            className="absolute top-4 right-4 px-4 py-2 bg-neon-green text-background font-pixel text-sm rotate-[15deg] opacity-0"
            style={{ opacity: 0 }}
          >
            LIKE!
          </motion.div>
        </>
      )}
    </motion.div>
  );
};

const InteractiveSwipeDemo = () => {
  const [cards, setCards] = useState(sampleProducts);
  const [matchCount, setMatchCount] = useState(0);
  const [showMatch, setShowMatch] = useState(false);
  const [lastMatchedProduct, setLastMatchedProduct] = useState<typeof sampleProducts[0] | null>(null);
  const { fireMatch } = useConfetti();

  const handleSwipe = useCallback((direction: "left" | "right") => {
    const swipedCard = cards[0];
    
    if (direction === "right") {
      setMatchCount(prev => prev + 1);
      setLastMatchedProduct(swipedCard);
      setShowMatch(true);
      fireMatch();
      
      setTimeout(() => {
        setShowMatch(false);
      }, 1500);
    }

    // Remove the top card and add it back to the end after a delay
    setTimeout(() => {
      setCards(prev => {
        const [first, ...rest] = prev;
        return [...rest, first];
      });
    }, 300);
  }, [cards, fireMatch]);

  return (
    <div className="relative w-full max-w-sm mx-auto overflow-x-hidden">
      {/* Match counter */}
      <motion.div
        className="absolute -top-12 left-0 right-0 flex justify-center z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center gap-2 px-4 py-2 bg-card border-2 border-neon-pink">
          <Heart className="w-4 h-4 text-neon-pink" />
          <span className="font-pixel text-xs text-neon-pink">{matchCount} MATCHES</span>
        </div>
      </motion.div>

      {/* Instructions */}
      <motion.div
        className="absolute -top-6 left-1/2 -translate-x-1/2 z-20"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <div className="px-3 py-1 bg-neon-blue text-background text-xs font-pixel whitespace-nowrap">
          SWIPE OR TAP!
        </div>
      </motion.div>

      {/* Card stack */}
      <div className="relative h-[340px]">
        <AnimatePresence>
          {cards.slice(0, 2).reverse().map((product, index) => (
            <SwipeCard
              key={product.id}
              product={product}
              onSwipe={handleSwipe}
              isTop={index === 1}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Match overlay */}
      <AnimatePresence>
        {showMatch && lastMatchedProduct && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
          >
            <div className="text-center">
              <motion.div
                className="flex items-center justify-center gap-2 px-6 py-4 bg-neon-pink text-background"
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, -2, 2, 0]
                }}
                transition={{ duration: 0.5 }}
              >
                <Sparkles className="w-6 h-6" />
                <span className="font-pixel text-lg">IT&apos;S A MATCH!</span>
                <Sparkles className="w-6 h-6" />
              </motion.div>
              <motion.p
                className="mt-2 font-mono text-xs text-neon-green"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {lastMatchedProduct.name} wants you!
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating labels */}
      <motion.div
        className="absolute bottom-2 right-2 px-3 py-2 bg-neon-pink text-background text-xs font-pixel z-20"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        TRY IT! →
      </motion.div>
    </div>
  );
};

export default InteractiveSwipeDemo;

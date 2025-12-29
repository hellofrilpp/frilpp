import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import InteractiveSwipeDemo from "./InteractiveSwipeDemo";
import { useMarket } from "@/components/landing/market";

const floatingElements = [
  { delay: 0, x: "10%", y: "20%", rotate: 45 },
  { delay: 0.5, x: "85%", y: "15%", rotate: 12 },
  { delay: 1, x: "20%", y: "70%", rotate: -12 },
  { delay: 1.5, x: "8%", y: "45%", rotate: 45 },
  { delay: 2, x: "75%", y: "60%", rotate: 0 },
];

const Hero = () => {
  const { market } = useMarket();
  const unit = market === "IN" ? "km" : "mi";
  const radiusExample = market === "IN" ? 8 : 5;
  const moneyExample = market === "IN" ? "₹1,500" : "$50";

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-x-hidden pt-20 pb-16 bg-grid">
      {/* Animated floating decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {floatingElements.map((el, i) => (
          <motion.div
            key={i}
            className="absolute w-8 h-8 border-2 border-neon-green/30"
            style={{ left: el.x, top: el.y }}
            initial={{ opacity: 0, rotate: 0 }}
            animate={{ 
              opacity: [0.3, 0.6, 0.3],
              y: [0, -20, 0],
              rotate: [el.rotate, el.rotate + 90, el.rotate],
            }}
            transition={{
              duration: 4,
              delay: el.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
        
        {/* Animated gradient lines */}
        <motion.div
          className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-green/40 to-transparent"
          animate={{ opacity: [0.2, 0.6, 0.2], scaleX: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-pink/40 to-transparent"
          animate={{ opacity: [0.2, 0.6, 0.2], scaleX: [0.5, 1, 0.5] }}
          transition={{ duration: 3, delay: 1.5, repeat: Infinity }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex w-fit max-w-[calc(100vw-2rem)] items-center gap-2 px-3 py-2 border-2 border-neon-yellow bg-card mb-8 pixel-btn mx-auto lg:mx-0"
            >
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-4 h-4 text-neon-yellow" />
              </motion.div>
              <span className="text-[10px] sm:text-xs font-mono text-neon-yellow whitespace-normal break-words leading-tight text-left">
                INTERACTIVE DEMO
              </span>
            </motion.div>

            {/* Headline with staggered animation */}
            <motion.h1
              className="text-2xl md:text-4xl lg:text-5xl font-pixel mb-6 leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <motion.span
                className="text-neon-green block"
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                STOP
              </motion.span>
              <motion.span
                className="text-foreground block"
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                DMING.
              </motion.span>
              <motion.span
                className="text-neon-pink block"
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                START
              </motion.span>
              <motion.span
                className="text-foreground inline-block"
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                MATCHING
              </motion.span>
              <motion.span
                className="text-neon-yellow inline-block"
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                _
              </motion.span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-10 font-mono leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              &gt; Local businesses find nearby IG/TikTok creators — without DM chaos
              <br />
              &gt; Post an offer, set a local radius, and track clicks + redemptions.
              <br />
              <span className="text-neon-green">
                &gt; Example: “Free {moneyExample} cake box” within {radiusExample}{unit}
              </span>
            </motion.p>

            {/* Dual CTAs */}
            <motion.div
              className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg" 
                  className="bg-neon-green text-background hover:bg-neon-green/90 text-xs font-pixel px-8 py-6 pixel-btn glow-green"
                  asChild
                >
                  <Link to="/brand/signup">
                    I&apos;M A BUSINESS
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  size="lg" 
                  className="bg-neon-pink text-background hover:bg-neon-pink/90 text-xs font-pixel px-8 py-6 pixel-btn glow-pink"
                  asChild
                >
                  <Link to="/influencer/signup">
                    I&apos;M A CREATOR
                    <Zap className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>

            {/* Stats ticker with counting animation */}
            <motion.div
              className="flex items-center gap-6 mt-10 justify-center lg:justify-start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.9 }}
            >
              {[
                { value: `IG/TikTok`, label: "SIGNUP", color: "text-neon-green" },
                { value: `${radiusExample}${unit}`, label: "LOCAL_RADIUS", color: "text-neon-pink" },
                { value: "CLICKS+REDEEM", label: "ROI", color: "text-neon-yellow" },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  className="text-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1 + i * 0.1, type: "spring" }}
                >
                  <motion.div
                    className={`text-2xl font-pixel ${stat.color}`}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
                  >
                    {stat.value}
                  </motion.div>
                  <div className="text-xs font-mono text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right - Interactive Swipe Demo */}
          <motion.div
            className="relative pt-8"
            initial={{ opacity: 0, scale: 0.8, rotateY: -15 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <InteractiveSwipeDemo />
          </motion.div>
        </div>
      </div>

      {/* Animated Scroll Indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs font-pixel text-neon-green">SCROLL</span>
          <div className="w-4 h-6 border-2 border-neon-green flex items-start justify-center p-1">
            <motion.div
              className="w-1 h-2 bg-neon-green"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;

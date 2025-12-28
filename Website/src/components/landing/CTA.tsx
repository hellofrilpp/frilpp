import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Star, Sparkles, Trophy } from "lucide-react";

const CTA = () => {
  return (
    <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
      {/* Pixel grid background */}
      <div className="absolute inset-0 bg-grid opacity-20" />
      
      {/* Floating geometric elements instead of emojis */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-8 h-8 border-2 border-background/20 rotate-45 animate-float" />
        <div className="absolute top-20 right-20 w-6 h-6 border-2 border-background/20 animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-20 left-20 w-10 h-10 border-2 border-background/20 rotate-12 animate-float" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-10 right-10 w-8 h-8 border-2 border-background/20 -rotate-12 animate-float" style={{ animationDelay: '1.5s' }} />
        
        {/* Scanlines */}
        <div className="absolute inset-0 scanlines" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-background/10 border-2 border-background/20 mb-8">
            <Sparkles className="w-4 h-4 animate-pulse-neon" />
            <span className="text-xs font-pixel">FINAL_LEVEL</span>
          </div>

          {/* Headline */}
          <h2 className="text-xl md:text-2xl lg:text-3xl font-pixel mb-8 leading-relaxed">
            READY TO
            <br />
            <span className="text-background animate-glitch">LEVEL UP</span>
            <br />
            YOUR MARKETING?
          </h2>

          {/* Subheadline */}
          <p className="text-sm font-mono text-background/70 mb-12 max-w-xl mx-auto leading-relaxed">
            &gt; BUILT FOR LOCAL BUSINESSES + CREATORS (US + INDIA)<br />
            &gt; START MATCHING TODAY<br />
            <span className="text-background">&gt; PRICING_LIVE: TRUE_</span>
          </p>

          {/* Dual CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              className="bg-background text-foreground hover:bg-background/90 text-xs font-pixel px-8 py-6 pixel-btn"
              asChild
            >
              <Link to="/brand/signup">
                <Zap className="w-4 h-4 mr-2" />
                BUSINESS MODE
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button 
              size="lg" 
              className="bg-neon-pink text-background hover:bg-neon-pink/90 text-xs font-pixel px-8 py-6 pixel-btn glow-pink"
              asChild
            >
              <Link to="/influencer/signup">
                <Star className="w-4 h-4 mr-2" />
                CREATOR MODE
              </Link>
            </Button>
          </div>

          {/* Achievement unlocked */}
          <div className="mt-12 inline-flex items-center gap-3 px-6 py-3 border-2 border-dashed border-background/30">
            <Trophy className="w-5 h-5 animate-bounce-pixel" />
            <span className="font-mono text-sm text-background/70">ACHIEVEMENT: READY_TO_START</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;

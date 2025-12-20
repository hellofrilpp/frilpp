import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Gift, 
  Gamepad2, 
  Trophy, 
  Clock,
  ArrowRight,
  Heart,
  Sparkles
} from "lucide-react";

const perks = [
  {
    icon: Gift,
    title: "FREE PRODUCTS",
    description: "Browse hundreds of barter offers from brands you'll love.",
    color: "neon-green",
  },
  {
    icon: Gamepad2,
    title: "SWIPE TO WIN",
    description: "Like a game, but you get real stuff. Swipe right = free loot.",
    color: "neon-pink",
  },
  {
    icon: Trophy,
    title: "LEVEL UP",
    description: "Complete deals to unlock achievements and premium brands.",
    color: "neon-yellow",
  },
  {
    icon: Clock,
    title: "NO HASSLE",
    description: "Everything upfront — product value, requirements, deadlines.",
    color: "neon-purple",
  },
];

const ForInfluencers = () => {
  return (
    <section id="for-influencers" className="py-24 border-t-4 border-border overflow-hidden bg-background relative">
      {/* Grid background */}
      <div className="absolute inset-0 bg-grid opacity-30" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Phone Mockup */}
          <div className="order-2 lg:order-1 relative">
            {/* Phone Frame */}
            <div className="relative mx-auto w-72 md:w-80">
              {/* Phone */}
              <div className="relative border-4 border-neon-pink bg-card overflow-hidden pixel-border-pink">
                {/* Status Bar */}
                <div className="bg-muted px-4 py-3 flex items-center justify-between border-b-4 border-border">
                  <span className="text-xs font-mono text-neon-green">ONLINE</span>
                  <span className="text-xs font-pixel text-foreground">DISCOVER</span>
                  <div className="flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-neon-yellow" />
                    <span className="text-xs font-mono text-neon-yellow">LV.12</span>
                  </div>
                </div>
                
                {/* App Content */}
                <div className="p-4">
                  {/* Swipe Card Stack */}
                  <div className="relative h-64">
                    {/* Background Cards */}
                    <div className="absolute inset-x-3 top-3 h-full bg-muted border-2 border-border transform rotate-3" />
                    <div className="absolute inset-x-1 top-1 h-full bg-card border-2 border-border transform -rotate-2" />
                    
                    {/* Main Card */}
                    <div className="absolute inset-0 bg-card border-4 border-neon-green overflow-hidden">
                      <div className="h-32 bg-muted flex items-center justify-center relative">
                        <div className="w-16 h-16 border-4 border-neon-purple bg-neon-purple/20 flex items-center justify-center">
                          <Sparkles className="w-8 h-8 text-neon-purple" />
                        </div>
                        <span className="absolute top-2 right-2 text-xs font-pixel text-neon-green">[02]</span>
                      </div>
                      <div className="p-3 border-t-4 border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 text-xs font-mono border-2 border-neon-pink text-neon-pink">FASHION</span>
                          <span className="text-xs font-mono text-neon-yellow">$75</span>
                        </div>
                        <h4 className="font-pixel text-sm text-foreground">SUMMER DRESS</h4>
                        <p className="text-xs font-mono text-muted-foreground mt-1">1 REEL + 3 STORIES</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="mt-4 flex items-center justify-center gap-4">
                    <button className="w-12 h-12 border-4 border-destructive bg-destructive/10 flex items-center justify-center pixel-btn">
                      <span className="font-pixel text-destructive text-lg">X</span>
                    </button>
                    <button className="w-14 h-14 bg-neon-green border-4 border-neon-green flex items-center justify-center pixel-btn glow-green">
                      <Heart className="w-6 h-6 text-background" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating Elements - using icons instead of emojis */}
            <div className="absolute -top-2 -right-2 bg-card border-4 border-neon-yellow p-3 animate-float">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-neon-yellow" />
                <div>
                  <p className="text-xs font-pixel text-neon-yellow">NEW BADGE</p>
                  <p className="text-xs font-mono text-muted-foreground">5 Deals Done</p>
                </div>
              </div>
            </div>
            
            <div className="absolute -bottom-2 -left-2 bg-neon-pink p-3 animate-float" style={{ animationDelay: '-2s' }}>
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-background" />
                <div>
                  <p className="text-xs font-pixel text-background">MATCH!</p>
                  <p className="text-xs font-mono text-background/80">GlowSkin Co.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 mb-6">
              <Gamepad2 className="w-4 h-4 text-neon-pink animate-bounce-pixel" />
              <span className="text-xs font-pixel text-neon-pink">[FOR_CREATORS]</span>
            </div>
            
            <h2 className="text-xl md:text-2xl lg:text-3xl font-pixel mb-8 leading-relaxed">
              <span className="text-neon-pink">FREE STUFF</span>
              <br />
              <span className="text-foreground">JUST BY</span>
              <br />
              <span className="text-neon-green">SWIPING</span>
            </h2>
            
            <p className="font-mono text-sm text-muted-foreground mb-10 leading-relaxed max-w-lg">
              &gt; No more cold emails or awkward pitches<br />
              &gt; Browse offers, swipe on what you like<br />
              <span className="text-neon-pink">&gt; GET_PRODUCTS_DELIVERED: TRUE</span>
            </p>

            {/* Perks Grid */}
            <div className="grid sm:grid-cols-2 gap-4 mb-10">
              {perks.map((perk, index) => (
                <div 
                  key={index} 
                  className={`flex gap-3 p-4 border-2 border-border hover:border-${perk.color} transition-all group`}
                >
                  <div className={`w-10 h-10 border-2 border-${perk.color} bg-${perk.color}/10 flex items-center justify-center flex-shrink-0`}>
                    <perk.icon className={`w-5 h-5 text-${perk.color}`} />
                  </div>
                  <div>
                    <h3 className={`font-pixel text-xs mb-1 text-${perk.color}`}>{perk.title}</h3>
                    <p className="text-xs font-mono text-muted-foreground">{perk.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <Button 
              size="lg" 
              className="bg-neon-pink text-background hover:bg-neon-pink/90 text-xs font-pixel px-8 py-6 pixel-btn glow-pink"
              asChild
            >
              <Link to="/influencer/signup">
                START SWIPING
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ForInfluencers;
import Link from "next/link";
import { Package, Heart, Truck, Camera, Star, ArrowRight, Sparkles } from "lucide-react";

const steps = [
  {
    icon: Package,
    title: "BRAND POSTS OFFER",
    description: "Local business posts a deal and sets a local radius.",
    visual: "LOCAL_OFFER",
    color: "neon-green",
  },
  {
    icon: Heart,
    title: "CREATOR SWIPES RIGHT",
    description: "Creator sees the offer, loves the product, swipes right. It's a match!",
    visual: "MATCH!",
    color: "neon-pink",
  },
  {
    icon: Truck,
    title: "FULFILLMENT",
    description: "Pickup, local delivery, or shipping — whichever the brand chooses.",
    visual: "PICKUP/DELIVER/SHIP",
    color: "neon-blue",
  },
  {
    icon: Camera,
    title: "CONTENT CREATED",
    description: "Creator shares to IG/TikTok from the app so the post is verified + tracked.",
    visual: "VERIFIED_POST",
    color: "neon-purple",
  },
];

const colorMap = {
  "neon-green": {
    text: "text-neon-green",
    border: "border-neon-green",
    hoverBorder: "hover:border-neon-green",
    bgSoft: "bg-neon-green/10",
    bgSolid: "bg-neon-green",
  },
  "neon-pink": {
    text: "text-neon-pink",
    border: "border-neon-pink",
    hoverBorder: "hover:border-neon-pink",
    bgSoft: "bg-neon-pink/10",
    bgSolid: "bg-neon-pink",
  },
  "neon-blue": {
    text: "text-neon-blue",
    border: "border-neon-blue",
    hoverBorder: "hover:border-neon-blue",
    bgSoft: "bg-neon-blue/10",
    bgSolid: "bg-neon-blue",
  },
  "neon-purple": {
    text: "text-neon-purple",
    border: "border-neon-purple",
    hoverBorder: "hover:border-neon-purple",
    bgSoft: "bg-neon-purple/10",
    bgSolid: "bg-neon-purple",
  },
};

const floatingParticles = [
  { id: 1, left: "10%", top: "20%" },
  { id: 2, left: "25%", top: "10%" },
  { id: 3, left: "40%", top: "30%" },
  { id: 4, left: "55%", top: "15%" },
  { id: 5, left: "70%", top: "25%" },
  { id: 6, left: "85%", top: "12%" },
  { id: 7, left: "15%", top: "60%" },
  { id: 8, left: "35%", top: "70%" },
  { id: 9, left: "60%", top: "65%" },
  { id: 10, left: "80%", top: "55%" },
  { id: 11, left: "45%", top: "85%" },
  { id: 12, left: "5%", top: "75%" },
];

export default function ProductExplainer() {
  const unit = "km";

  return (
    <section className="py-24 bg-card border-t-4 border-border relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {floatingParticles.map((particle) => (
          <span
            key={particle.id}
            className="absolute w-1 h-1 bg-neon-green/30 animate-pulse"
            style={{ left: particle.left, top: particle.top }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 border-2 border-neon-yellow bg-neon-yellow/10 mb-6">
            <Sparkles className="w-4 h-4 text-neon-yellow animate-pulse-neon" />
            <span className="text-xs font-pixel text-neon-yellow">SEE IT IN ACTION</span>
          </div>
          <h2 className="text-xl md:text-2xl lg:text-3xl font-pixel leading-relaxed mb-4">
            <span className="text-neon-green">FROM SWIPE</span>
            <br />
            <span className="text-foreground">TO CONTENT</span>
            <br />
            <span className="text-neon-pink">IN 4 STEPS</span>
          </h2>
          <p className="font-mono text-sm text-muted-foreground max-w-md mx-auto">
            &gt; A simple local loop ({unit}): offer → match → fulfill → verified post
          </p>
        </div>

        <div className="relative">
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-neon-green via-neon-pink to-neon-purple" />

          {steps.map((step, index) => {
            const c = colorMap[step.color as keyof typeof colorMap];
            return (
              <div
                key={step.title}
                className={`relative flex items-center gap-8 mb-16 last:mb-0 ${
                  index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                }`}
              >
                <div className={`flex-1 ${index % 2 === 0 ? "lg:text-right" : "lg:text-left"}`}>
                  <div className={`inline-block p-6 bg-background border-4 border-border ${c.hoverBorder} transition-colors`}>
                    <div className={`inline-flex items-center gap-2 mb-3 ${index % 2 === 0 ? "lg:flex-row-reverse" : ""}`}>
                      <span className={`text-xs font-pixel ${c.text}`}>STEP {String(index + 1).padStart(2, "0")}</span>
                      <div className={`w-8 h-8 border-2 ${c.border} ${c.bgSoft} flex items-center justify-center`}>
                        <step.icon className={`w-4 h-4 ${c.text}`} />
                      </div>
                    </div>
                    <h3 className={`font-pixel text-sm mb-2 ${c.text}`}>{step.title}</h3>
                    <p className="font-mono text-xs text-muted-foreground max-w-xs">{step.description}</p>
                  </div>
                </div>

                <div className={`hidden lg:flex w-16 h-16 ${c.bgSolid} items-center justify-center z-10 relative`}>
                  <step.icon className="w-6 h-6 text-background" />
                  <span className={`absolute inset-0 border-4 ${c.border} animate-pulse opacity-60`} />
                </div>

                <div className="flex-1 hidden lg:flex justify-center">
                  <div className={`relative px-8 py-4 ${c.bgSoft} border-4 ${c.border}`}>
                    <span className={`font-pixel text-xs ${c.text}`}>{step.visual}</span>
                    {index === 1 && (
                      <div className="absolute -top-2 -right-2 animate-bounce-pixel">
                        <Star className="w-6 h-6 text-neon-yellow fill-neon-yellow" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-16">
          <Link
            href="/brand/auth"
            className="inline-flex items-center gap-3 px-8 py-4 bg-neon-green text-background font-pixel text-xs cursor-pointer pixel-btn glow-green"
          >
            <span>READY TO START?</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

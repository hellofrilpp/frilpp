import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Zap, Crown, Rocket } from "lucide-react";
import { useMarket } from "@/components/landing/market";

const Pricing = () => {
  const { market } = useMarket();
  const currency = market === "IN" ? "₹" : "$";
  const businessPrice = market === "IN" ? 299 : 29;
  const creatorPrice = market === "IN" ? 100 : 10;

  const plans = [
    {
      name: "BUSINESS",
      price: `${currency}${businessPrice}`,
      period: "/MO",
      description: "Local offers for SMBs",
      icon: Zap,
      color: "neon-green",
      features: [
        "Instagram/TikTok onboarding",
        "Local radius + auto-accept threshold",
        "Pickup / local delivery / shipping",
        "Clicks + redemptions ROI",
        "Verified posting + creator streaks",
      ],
      cta: "POST AN OFFER",
      href: "/brand/signup",
      popular: false,
    },
    {
      name: "CREATOR",
      price: `${currency}${creatorPrice}`,
      period: "/MO",
      description: "Claim local drops",
      icon: Rocket,
      color: "neon-pink",
      features: [
        "IG/TikTok-only signup (email optional)",
        "Local deals feed",
        "One-tap claim + share-kit",
        "Achievements + streaks",
        "Performance stats",
      ],
      cta: "JOIN AS CREATOR",
      href: "/influencer/signup",
      popular: true,
    },
    {
      name: "TEAMS",
      price: "CUSTOM",
      description: "For multi-location brands",
      icon: Crown,
      color: "neon-yellow",
      features: [
        "Multiple locations",
        "More roles + permissions",
        "Custom reporting",
        "Integrations (Shopify optional)",
      ],
      cta: "CONTACT",
      href: "mailto:hello@frilpp.com",
      popular: false,
    },
  ] as const;

  const colorClasses = {
    "neon-green": {
      border: "border-neon-green",
      bgSoft: "bg-neon-green/10",
      bgIcon: "bg-neon-green/20",
      bgSolid: "bg-neon-green",
      text: "text-neon-green",
      glow: "glow-green",
    },
    "neon-pink": {
      border: "border-neon-pink",
      bgSoft: "bg-neon-pink/10",
      bgIcon: "bg-neon-pink/20",
      bgSolid: "bg-neon-pink",
      text: "text-neon-pink",
      glow: "glow-pink",
    },
    "neon-yellow": {
      border: "border-neon-yellow",
      bgSoft: "bg-neon-yellow/10",
      bgIcon: "bg-neon-yellow/20",
      bgSolid: "bg-neon-yellow",
      text: "text-neon-yellow",
      glow: "glow-yellow",
    },
  } as const;

  return (
    <section id="pricing" className="py-24 bg-card border-t-4 border-border relative">
      {/* Grid background */}
      <div className="absolute inset-0 bg-grid opacity-20" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 mb-4">
            <Crown className="w-4 h-4 text-neon-yellow" />
            <span className="text-xs font-pixel text-neon-yellow">[PRICING]</span>
          </div>
          <h2 className="text-xl md:text-2xl lg:text-3xl font-pixel mb-6 leading-relaxed">
            <span className="text-neon-green">SIMPLE</span>
            <span className="text-foreground"> PRICING</span>
            <br />
            <span className="text-neon-pink">POWERFUL</span>
            <span className="text-foreground"> RESULTS</span>
          </h2>
          <p className="font-mono text-sm text-muted-foreground">
            &gt; Simple monthly pricing that matches your market. Cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            (() => {
              const c = colorClasses[plan.color];
              return (
            <div 
              key={index} 
              className={`relative p-6 border-4 ${
                plan.popular 
                  ? `${c.border} ${c.bgSoft}` 
                  : 'border-border bg-background'
              } transition-all hover:translate-x-1 hover:translate-y-1`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className={`px-4 py-1 ${c.bgSolid} text-background text-xs font-pixel`}>
                    POPULAR
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6 pt-2">
                <div className={`w-12 h-12 border-4 ${c.border} ${c.bgIcon} flex items-center justify-center mx-auto mb-4`}>
                  <plan.icon className={`w-6 h-6 ${c.text}`} />
                </div>
                <h3 className={`text-sm font-pixel mb-2 ${c.text}`}>{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-2xl font-pixel text-foreground">{plan.price}</span>
                  {plan.period && (
                    <span className="text-xs font-mono text-muted-foreground">{plan.period}</span>
                  )}
                </div>
                <p className="text-xs font-mono text-muted-foreground">{plan.description}</p>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <div className={`w-4 h-4 border-2 ${c.border} ${c.bgSoft} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Check className={`w-2 h-2 ${c.text}`} />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button 
                className={`w-full py-5 text-xs font-pixel ${
                  plan.popular 
                    ? `${c.bgSolid} text-background hover:opacity-90 ${c.glow}` 
                    : 'bg-foreground text-background hover:bg-foreground/90'
                } pixel-btn`}
                asChild
              >
                <Link to={plan.href}>
                  {plan.cta}
                  <ArrowRight className="w-3 h-3 ml-2" />
                </Link>
              </Button>
            </div>
              );
            })()
          ))}
        </div>

      </div>
    </section>
  );
};

export default Pricing;

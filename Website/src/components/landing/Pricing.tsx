import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Zap, Crown, Rocket } from "lucide-react";

const plans = [
  {
    name: "STARTER",
    price: "FREE",
    description: "Test the waters",
    icon: Zap,
    color: "neon-green",
    features: [
      "5 active product listings",
      "Up to 20 matches/month",
      "Basic analytics",
      "Email support",
    ],
    cta: "START FREE",
    popular: false,
  },
  {
    name: "GROWTH",
    price: "$99",
    period: "/MO",
    description: "Scale your seeding",
    icon: Rocket,
    color: "neon-pink",
    features: [
      "Unlimited product listings",
      "Unlimited matches",
      "Advanced analytics + ROI",
      "Priority matching",
      "Auto shipping labels",
      "Content approval flow",
      "Priority support",
    ],
    cta: "START TRIAL",
    popular: true,
  },
  {
    name: "ENTERPRISE",
    price: "CUSTOM",
    description: "Big ambitions",
    icon: Crown,
    color: "neon-yellow",
    features: [
      "Everything in Growth",
      "Dedicated manager",
      "Custom integrations",
      "White-label options",
      "API access",
      "SLA guarantee",
    ],
    cta: "CONTACT",
    popular: false,
  },
];

const Pricing = () => {
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
            &gt; Start free, scale as you grow. No hidden fees.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <div 
              key={index} 
              className={`relative p-6 border-4 ${
                plan.popular 
                  ? `border-${plan.color} bg-${plan.color}/10` 
                  : 'border-border bg-background'
              } transition-all hover:translate-x-1 hover:translate-y-1`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className={`px-4 py-1 bg-${plan.color} text-background text-xs font-pixel`}>
                    POPULAR
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6 pt-2">
                <div className={`w-12 h-12 border-4 border-${plan.color} bg-${plan.color}/20 flex items-center justify-center mx-auto mb-4`}>
                  <plan.icon className={`w-6 h-6 text-${plan.color}`} />
                </div>
                <h3 className={`text-sm font-pixel mb-2 text-${plan.color}`}>{plan.name}</h3>
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
                    <div className={`w-4 h-4 border-2 border-${plan.color} bg-${plan.color}/10 flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Check className={`w-2 h-2 text-${plan.color}`} />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button 
                className={`w-full py-5 text-xs font-pixel ${
                  plan.popular 
                    ? `bg-${plan.color} text-background hover:bg-${plan.color}/90 glow-pink` 
                    : 'bg-foreground text-background hover:bg-foreground/90'
                } pixel-btn`}
                asChild
              >
                <Link to="/brand/signup">
                  {plan.cta}
                  <ArrowRight className="w-3 h-3 ml-2" />
                </Link>
              </Button>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Pricing;

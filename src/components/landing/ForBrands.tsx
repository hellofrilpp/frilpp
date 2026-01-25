import Link from "next/link";
import { 
  Zap,
  Users,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  Check,
  Terminal,
} from "lucide-react";

const benefits = [
  {
    icon: Zap,
    title: "LOCAL, FAST",
    description: "Post a local offer in minutes instead of DMing creators one-by-one.",
    color: "neon-green",
  },
  {
    icon: Users,
    title: "CREATOR FIT",
    description: "Filter by niche and followers — then auto-accept or approve.",
    color: "neon-pink",
  },
  {
    icon: BarChart3,
    title: "SIMPLE ROI",
    description: "Track clicks + in-store/online redemptions per creator.",
    color: "neon-purple",
  },
  {
    icon: ShieldCheck,
    title: "PROOF OF POST",
    description: "Creators share via the app so you can verify delivery and posting.",
    color: "neon-yellow",
  },
];

const features = [
  "IG/TikTok-only signup (email optional)",
  "Local radius + auto-accept threshold",
  "Pickup / local delivery / shipping",
  "Clicks + redemptions ROI",
  "Verified posting + strike rules",
  "Optional integrations",
];

const colorMap = {
  "neon-green": {
    text: "text-neon-green",
    border: "border-neon-green",
    hoverBorder: "hover:border-neon-green",
    bgSoft: "bg-neon-green/10",
  },
  "neon-pink": {
    text: "text-neon-pink",
    border: "border-neon-pink",
    hoverBorder: "hover:border-neon-pink",
    bgSoft: "bg-neon-pink/10",
  },
  "neon-purple": {
    text: "text-neon-purple",
    border: "border-neon-purple",
    hoverBorder: "hover:border-neon-purple",
    bgSoft: "bg-neon-purple/10",
  },
  "neon-yellow": {
    text: "text-neon-yellow",
    border: "border-neon-yellow",
    hoverBorder: "hover:border-neon-yellow",
    bgSoft: "bg-neon-yellow/10",
  },
};

export default function ForBrands() {
  const unit = "km";

  return (
    <section id="for-brands" className="py-24 bg-card border-t-4 border-border relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div>
            <div className="inline-flex items-center gap-2 mb-6">
              <Terminal className="w-4 h-4 text-neon-green" />
              <span className="text-xs font-pixel text-neon-green">[FOR_BRANDS]</span>
            </div>

            <h2 className="text-xl md:text-2xl lg:text-3xl font-pixel mb-8 leading-relaxed">
              <span className="text-neon-green">SEED</span>
              <span className="text-foreground"> AT SCALE</span>
              <br />
              <span className="text-neon-pink">WITHOUT CHAOS</span>
            </h2>

            <p className="font-mono text-sm text-muted-foreground mb-10 leading-relaxed max-w-lg">
              &gt; Built for local + global offers<br />
              &gt; Set a local radius ({unit}) so only nearby creators see the offer<br />
              <span className="text-neon-green">&gt; NOT_A_DELIVERY_SERVICE: TRUE</span>
            </p>

            <div className="grid sm:grid-cols-2 gap-3 mb-10">
              {features.map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-3 p-3 border-2 border-border hover:border-neon-green transition-colors group"
                >
                  <div className="w-5 h-5 border-2 border-neon-green bg-neon-green/10 flex items-center justify-center">
                    <Check className="w-3 h-3 text-neon-green" />
                  </div>
                  <span className="text-xs font-mono group-hover:text-neon-green transition-colors">
                    {feature}
                  </span>
                </div>
              ))}
            </div>

            <Link
              href="/brand/auth"
              className="inline-flex items-center gap-2 bg-neon-green text-background hover:bg-neon-green/90 text-xs font-pixel px-8 py-6 pixel-btn glow-green"
            >
              POST A LOCAL OFFER
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {benefits.map((benefit) => {
              const c = colorMap[benefit.color as keyof typeof colorMap];
              return (
                <div
                  key={benefit.title}
                  className={`p-6 border-4 border-border bg-background ${c.hoverBorder} transition-all group pixel-btn`}
                >
                  <div className={`w-14 h-14 border-4 ${c.border} ${c.bgSoft} flex items-center justify-center mb-4`}>
                    <benefit.icon className={`w-6 h-6 ${c.text}`} />
                  </div>
                  <h3 className={`font-pixel text-sm mb-2 ${c.text}`}>{benefit.title}</h3>
                  <p className="text-xs font-mono text-muted-foreground leading-relaxed">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

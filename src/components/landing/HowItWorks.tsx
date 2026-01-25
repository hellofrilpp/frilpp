import { Package, Sparkles, Camera, ArrowRight, Gamepad2 } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Package,
    title: "POST OFFER",
    description: "Local businesses post an offer, set a radius, and choose pickup/delivery/shipping.",
    color: "neon-green",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "MATCH UP",
    description: "Nearby creators apply. Auto-accept by threshold or approve manually.",
    color: "neon-pink",
  },
  {
    number: "03",
    icon: Camera,
    title: "CREATE WIN",
    description: "Creators share to IG/TikTok from the app so brands can verify + track ROI.",
    color: "neon-yellow",
  },
];

const particles = [
  { left: "8%", top: "10%" },
  { left: "20%", top: "35%" },
  { left: "35%", top: "15%" },
  { left: "55%", top: "25%" },
  { left: "70%", top: "12%" },
  { left: "85%", top: "30%" },
  { left: "10%", top: "70%" },
  { left: "30%", top: "80%" },
  { left: "60%", top: "72%" },
  { left: "80%", top: "65%" },
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
  "neon-yellow": {
    text: "text-neon-yellow",
    border: "border-neon-yellow",
    hoverBorder: "hover:border-neon-yellow",
    bgSoft: "bg-neon-yellow/10",
    bgSolid: "bg-neon-yellow",
  },
};

export default function HowItWorks() {
  const unit = "km";

  return (
    <section id="how-it-works" className="py-24 border-t-4 border-border bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p, i) => (
          <span
            key={`${p.left}-${p.top}-${i}`}
            className="absolute w-2 h-2 bg-neon-purple/20 animate-pulse"
            style={{ left: p.left, top: p.top }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
          <div>
            <div className="inline-flex items-center gap-2 mb-4">
              <Gamepad2 className="w-5 h-5 text-neon-purple" />
              <span className="text-xs font-pixel text-neon-purple">[TUTORIAL]</span>
            </div>
            <h2 className="text-xl md:text-2xl lg:text-3xl font-pixel leading-relaxed">
              <span className="text-neon-green block">THREE</span>
              <span className="text-foreground block">STEPS</span>
              <span className="text-neon-pink block">TO WIN</span>
            </h2>
          </div>
          <p className="text-sm font-mono text-muted-foreground max-w-md">
            &gt; NO_COMPLEX_NEGOTIATIONS<br />
            &gt; LOCAL_DISCOVERY ({unit})<br />
            <span className="text-neon-green">&gt; CLICKS + REDEMPTIONS ROI</span>
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step, index) => {
            const c = colorMap[step.color as keyof typeof colorMap];
            return (
              <div
                key={step.title}
                className={`relative group bg-card border-4 border-border ${c.hoverBorder} transition-colors pixel-btn`}
              >
                <div className={`absolute -top-4 -left-4 w-12 h-12 ${c.bgSolid} flex items-center justify-center font-pixel text-sm text-background z-10`}>
                  {step.number}
                </div>

                <div className="p-8 pt-12">
                  <div className={`w-16 h-16 border-4 ${c.border} ${c.bgSoft} flex items-center justify-center mb-6`}>
                    <step.icon className={`w-8 h-8 ${c.text}`} />
                  </div>

                  <h3 className={`text-base font-pixel mb-4 ${c.text}`}>{step.title}</h3>
                  <p className="text-muted-foreground text-sm font-mono leading-relaxed">{step.description}</p>

                  {index < steps.length - 1 && (
                    <div className="hidden md:flex absolute top-1/2 -right-5 w-10 h-10 bg-muted items-center justify-center z-10">
                      <ArrowRight className="w-5 h-5 text-neon-green" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <span className="inline-flex items-center gap-3 px-6 py-3 border-2 border-dashed border-neon-purple font-mono text-sm">
            <Sparkles className="w-4 h-4 text-neon-yellow animate-bounce-pixel" />
            <span className="text-muted-foreground">PRO TIP: More swipes = More matches = More </span>
            <span className="text-neon-yellow font-pixel">XP!</span>
          </span>
        </div>
      </div>
    </section>
  );
}

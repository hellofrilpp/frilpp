import Link from "next/link";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import InteractiveSwipeDemo from "@/components/landing/InteractiveSwipeDemo";

const floatingElements = [
  { delay: 0, x: "10%", y: "20%", rotate: 45 },
  { delay: 0.5, x: "85%", y: "15%", rotate: 12 },
  { delay: 1, x: "20%", y: "70%", rotate: -12 },
  { delay: 1.5, x: "8%", y: "45%", rotate: 45 },
  { delay: 2, x: "75%", y: "60%", rotate: 0 },
];

export default function Hero() {
  const unit = "km";
  const radiusExample = 8;
  const moneyExample = "50 USD";

  return (
    <section className="relative min-h-screen flex items-center overflow-x-hidden pt-20 pb-16 bg-grid">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {floatingElements.map((el, i) => (
          <div key={i} className="absolute" style={{ left: el.x, top: el.y, transform: `rotate(${el.rotate}deg)` }}>
            <div
              className="w-8 h-8 border-2 border-neon-green/30 animate-float"
              style={{ animationDelay: `${el.delay}s` }}
            />
          </div>
        ))}
        <div className="absolute top-1/4 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-green/40 to-transparent animate-pulse-neon" />
        <div className="absolute bottom-1/3 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-pink/40 to-transparent animate-pulse-neon" />
      </div>

      <div className="container relative z-10 w-full min-w-0 px-4">
        <div className="grid min-w-0 gap-12 items-center lg:grid-cols-2 lg:gap-16">
          <div className="min-w-0 text-center lg:text-left">
            <div className="flex w-fit max-w-[calc(100vw-2rem)] items-center gap-2 px-3 py-2 border-2 border-neon-yellow bg-card mb-8 pixel-btn mx-auto lg:mx-0 animate-fade-in">
              <Sparkles className="w-4 h-4 text-neon-yellow animate-pulse-neon" />
              <span className="text-[10px] sm:text-xs font-mono text-neon-yellow whitespace-normal break-words leading-tight text-left">
                INTERACTIVE DEMO
              </span>
            </div>

            <h1 className="text-2xl md:text-4xl lg:text-5xl font-pixel mb-6 leading-relaxed animate-slide-up">
              <span className="text-neon-green block">STOP</span>
              <span className="text-foreground block">DM CHAOS.</span>
              <span className="text-neon-pink block">START</span>
              <span className="text-foreground inline-block">COLLABS</span>
              <span className="text-neon-yellow inline-block animate-blink">_</span>
            </h1>

            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-10 font-mono leading-relaxed">
              &gt; Local businesses find nearby IG/TikTok creators — without DM chaos
              <br />
              &gt; Post an offer, set a local radius, and track clicks + redemptions.
              <br />
              <span className="text-neon-green">
                &gt; Example: “Free {moneyExample} cake box” within {radiusExample}{unit}
              </span>
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
              <Link
                href="/brand/auth"
                className="inline-flex items-center bg-neon-green text-background hover:bg-neon-green/90 text-xs font-pixel px-8 py-6 pixel-btn glow-green"
              >
                I'M A BUSINESS
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              <Link
                href="/influencer/auth"
                className="inline-flex items-center border-2 border-neon-pink text-neon-pink hover:bg-neon-pink hover:text-background text-xs font-pixel px-8 py-6 pixel-btn"
              >
                I'M A CREATOR
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>

            <div className="mt-8 flex items-center justify-center lg:justify-start gap-3 text-xs font-mono text-muted-foreground">
              <Zap className="w-4 h-4 text-neon-green" />
              <span>Local radius + verified posts baked in.</span>
            </div>
          </div>

          <div className="min-w-0">
            <InteractiveSwipeDemo />
          </div>
        </div>
      </div>
    </section>
  );
}

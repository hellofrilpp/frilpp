import { ShieldCheck, Target, Zap, Lock } from "lucide-react";

export default function Stats() {
  const unit = "km";

  const highlights = [
    {
      icon: Zap,
      title: "FAST SETUP",
      body: "Sign up with TikTok. Add email later in settings.",
    },
    {
      icon: Target,
      title: "LOCAL ONLY",
      body: `Set a local radius (${unit}) so offers stay nearby.`,
    },
    {
      icon: ShieldCheck,
      title: "VERIFIED POSTS",
      body: "Creators share from the app so brands can verify delivery and posting.",
    },
    {
      icon: Lock,
      title: "PRIVACY FIRST",
      body: "We don’t publicly rank or showcase brands without consent.",
    },
  ];

  return (
    <section className="py-16 bg-primary text-primary-foreground border-y-4 border-primary relative overflow-hidden">
      <div className="absolute inset-0 scanlines opacity-50" />
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-background/30 to-transparent opacity-60" />

        {[...Array(8)].map((_, i) => (
          <span
            key={i}
            className="absolute w-4 h-4 border border-background/20 animate-float"
            style={{
              left: `${10 + i * 12}%`,
              top: `${20 + (i % 3) * 30}%`,
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {highlights.map((item) => (
            <div key={item.title} className="border-2 border-background/20 bg-background/10 p-5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 border-2 border-background/40 bg-background/10 flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-background" />
                </div>
                <div className="font-pixel text-xs">{item.title}</div>
              </div>
              <div className="mt-3 text-xs font-mono text-background/70 leading-relaxed">{item.body}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

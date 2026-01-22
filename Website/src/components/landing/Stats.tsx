import { motion } from "framer-motion";
import { ShieldCheck, Target, Zap, Lock } from "lucide-react";
import { useMarket } from "@/components/landing/market";

const Stats = () => {
  const { market } = useMarket();
  const unit = market === "IN" ? "km" : "mi";

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
    <motion.section
      className="py-16 bg-primary text-primary-foreground border-y-4 border-primary relative overflow-hidden"
      viewport={{ once: true, margin: "-100px" }}
    >
      {/* Scanlines effect */}
      <div className="absolute inset-0 scanlines opacity-50" />
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-background/30 to-transparent"
          animate={{ opacity: [0.2, 0.5, 0.2], scaleX: [0.8, 1.2, 0.8] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        
        {/* Floating squares */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-4 h-4 border border-background/20"
            style={{
              left: `${10 + i * 12}%`,
              top: `${20 + (i % 3) * 30}%`,
            }}
            animate={{
              y: [0, -20, 0],
              rotate: [0, 90, 0],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 4,
              delay: i * 0.3,
              repeat: Infinity,
            }}
          />
        ))}
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {highlights.map((item, index) => (
            <motion.div
              key={item.title}
              className="border-2 border-background/20 bg-background/10 p-5"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.4 }}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 border-2 border-background/40 bg-background/10 flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-background" />
                </div>
                <div className="font-pixel text-xs">{item.title}</div>
              </div>
              <div className="mt-3 text-xs font-mono text-background/70 leading-relaxed">
                {item.body}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default Stats;

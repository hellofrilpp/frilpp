import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";

const stats = [
  { value: 50000, suffix: "+", label: "PRODUCTS SEEDED" },
  { value: 12000, suffix: "+", label: "ACTIVE CREATORS" },
  { value: 2500, suffix: "+", label: "BRANDS TRUST US" },
  { value: 94, suffix: "%", label: "MATCH SUCCESS" },
];

const AnimatedNumber = ({ target, suffix, inView }: { target: number; suffix: string; inView: boolean }) => {
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);
  
  useEffect(() => {
    if (!inView || hasAnimated.current) return;
    hasAnimated.current = true;
    
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [target, inView]);
  
  return (
    <span>
      {count.toLocaleString()}{suffix}
    </span>
  );
};

const Stats = () => {
  const [inView, setInView] = useState(false);

  return (
    <motion.section
      className="py-16 bg-primary text-primary-foreground border-y-4 border-primary relative overflow-hidden"
      onViewportEnter={() => setInView(true)}
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              className="text-center p-4 border-l-4 first:border-l-0 border-background/20"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <motion.div
                className="text-2xl md:text-3xl lg:text-4xl font-pixel mb-2"
                animate={{ 
                  textShadow: [
                    "0 0 10px hsl(0 0% 100% / 0.5)",
                    "0 0 20px hsl(0 0% 100% / 0.8)",
                    "0 0 10px hsl(0 0% 100% / 0.5)",
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
              >
                <AnimatedNumber target={stat.value} suffix={stat.suffix} inView={inView} />
              </motion.div>
              <motion.div
                className="text-xs font-mono text-background/60"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                {stat.label}
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
};

export default Stats;

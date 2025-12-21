import { motion } from "framer-motion";
import { Package, Sparkles, Camera, ArrowRight, Gamepad2 } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Package,
    title: "POST OFFER",
    description: "Brands list products to seed. Set requirements, criteria, and let the game begin!",
    color: "neon-green",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "MATCH UP",
    description: "Influencers swipe through offers. Mutual interest = instant match. No awkward DMs!",
    color: "neon-pink",
  },
  {
    number: "03",
    icon: Camera,
    title: "CREATE WIN",
    description: "Products ship, content created, everyone levels up. GG!",
    color: "neon-yellow",
  },
];

const particles = Array.from({ length: 15 }, () => ({
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  duration: 2 + Math.random() * 2,
  delay: Math.random() * 2,
}));

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 50, rotateX: -15 },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: {
      duration: 0.6,
    },
  },
};

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 border-t-4 border-border bg-background relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-grid opacity-50" />
      
      {/* Animated particles */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-neon-purple/20"
            style={{
              left: p.left,
              top: p.top,
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
            }}
          />
        ))}
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <motion.div
              className="inline-flex items-center gap-2 mb-4"
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Gamepad2 className="w-5 h-5 text-neon-purple" />
              <span className="text-xs font-pixel text-neon-purple">[TUTORIAL]</span>
            </motion.div>
            <h2 className="text-xl md:text-2xl lg:text-3xl font-pixel leading-relaxed">
              <motion.span
                className="text-neon-green block"
                initial={{ x: -30, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                THREE
              </motion.span>
              <motion.span
                className="text-foreground block"
                initial={{ x: -30, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                STEPS
              </motion.span>
              <motion.span
                className="text-neon-pink block"
                initial={{ x: -30, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                TO WIN
              </motion.span>
            </h2>
          </div>
          <motion.p
            className="text-sm font-mono text-muted-foreground max-w-md"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
          >
            &gt; NO_COMPLEX_NEGOTIATIONS<br />
            &gt; NO_PAYMENT_HASSLES<br />
            <span className="text-neon-green">&gt; JUST_SWIPE_MATCH_CREATE</span>
          </motion.p>
        </motion.div>

        {/* Steps */}
        <motion.div
          className="grid md:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {steps.map((step, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{ 
                y: -10,
                transition: { duration: 0.2 }
              }}
              className={`relative group bg-card border-4 border-border hover:border-${step.color} transition-colors pixel-btn`}
            >
              {/* Step Number with animation */}
              <motion.div
                className={`absolute -top-4 -left-4 w-12 h-12 bg-${step.color} flex items-center justify-center font-pixel text-sm text-background z-10`}
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
              >
                {step.number}
              </motion.div>
              
              <div className="p-8 pt-12">
                {/* Icon with pulse */}
                <motion.div
                  className={`w-16 h-16 border-4 border-${step.color} bg-${step.color}/10 flex items-center justify-center mb-6`}
                  animate={{ 
                    boxShadow: [
                      `0 0 0 0 hsl(var(--${step.color}) / 0.4)`,
                      `0 0 0 10px hsl(var(--${step.color}) / 0)`,
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <step.icon className={`w-8 h-8 text-${step.color}`} />
                </motion.div>

                {/* Content */}
                <h3 className={`text-base font-pixel mb-4 text-${step.color}`}>{step.title}</h3>
                <p className="text-muted-foreground text-sm font-mono leading-relaxed">{step.description}</p>

                {/* Arrow connector */}
                {index < steps.length - 1 && (
                  <motion.div
                    className="hidden md:flex absolute top-1/2 -right-5 w-10 h-10 bg-muted items-center justify-center z-10"
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="w-5 h-5 text-neon-green" />
                  </motion.div>
                )}
              </div>

              {/* Hover glow effect */}
              <motion.div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ boxShadow: `0 0 30px hsl(var(--${step.color}) / 0.3)` }}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Power-up message */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          <motion.span
            className="inline-flex items-center gap-3 px-6 py-3 border-2 border-dashed border-neon-purple font-mono text-sm"
            animate={{ borderColor: ["hsl(var(--neon-purple))", "hsl(var(--neon-green))", "hsl(var(--neon-purple))"] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <motion.span
              animate={{ rotate: [0, 20, -20, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Sparkles className="w-4 h-4 text-neon-yellow" />
            </motion.span>
            <span className="text-muted-foreground">PRO TIP: More swipes = More matches = More </span>
            <span className="text-neon-yellow font-pixel">XP!</span>
          </motion.span>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;

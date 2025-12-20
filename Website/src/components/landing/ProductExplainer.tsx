import { motion } from "framer-motion";
import { Package, Heart, Truck, Camera, Star, ArrowRight, Sparkles } from "lucide-react";

const steps = [
  {
    icon: Package,
    title: "BRAND POSTS OFFER",
    description: "Skincare brand lists their new serum. No cash needed - just free product for content.",
    visual: "SERUM_OFFER",
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
    title: "PRODUCT SHIPS",
    description: "Brand ships the product directly to the creator. No middlemen.",
    visual: "SHIPPING...",
    color: "neon-blue",
  },
  {
    icon: Camera,
    title: "CONTENT CREATED",
    description: "Creator makes authentic content. Brand gets exposure. Everyone wins!",
    visual: "POSTED!",
    color: "neon-purple",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
    },
  },
};

const ProductExplainer = () => {
  return (
    <section className="py-24 bg-card border-t-4 border-border relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      
      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-neon-green/30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
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
            &gt; Watch how a single swipe turns into authentic brand content
          </p>
        </motion.div>

        {/* Timeline */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="relative"
        >
          {/* Connection line */}
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-neon-green via-neon-pink to-neon-purple" />

          {steps.map((step, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className={`relative flex items-center gap-8 mb-16 last:mb-0 ${
                index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
              }`}
            >
              {/* Content */}
              <div className={`flex-1 ${index % 2 === 0 ? "lg:text-right" : "lg:text-left"}`}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className={`inline-block p-6 bg-background border-4 border-border hover:border-${step.color} transition-colors`}
                >
                  <div className={`inline-flex items-center gap-2 mb-3 ${index % 2 === 0 ? "lg:flex-row-reverse" : ""}`}>
                    <span className={`text-xs font-pixel text-${step.color}`}>STEP {String(index + 1).padStart(2, '0')}</span>
                    <div className={`w-8 h-8 border-2 border-${step.color} bg-${step.color}/10 flex items-center justify-center`}>
                      <step.icon className={`w-4 h-4 text-${step.color}`} />
                    </div>
                  </div>
                  <h3 className={`font-pixel text-sm mb-2 text-${step.color}`}>{step.title}</h3>
                  <p className="font-mono text-xs text-muted-foreground max-w-xs">{step.description}</p>
                </motion.div>
              </div>

              {/* Center node */}
              <motion.div
                whileHover={{ scale: 1.2, rotate: 180 }}
                transition={{ type: "spring", stiffness: 300 }}
                className={`hidden lg:flex w-16 h-16 bg-${step.color} items-center justify-center z-10 relative`}
              >
                <step.icon className="w-6 h-6 text-background" />
                {/* Pulse ring */}
                <motion.div
                  className={`absolute inset-0 border-4 border-${step.color}`}
                  animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>

              {/* Visual */}
              <div className="flex-1 hidden lg:flex justify-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className={`relative px-8 py-4 bg-${step.color}/10 border-4 border-${step.color}`}
                >
                  <span className={`font-pixel text-xs text-${step.color}`}>{step.visual}</span>
                  {index === 1 && (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                      className="absolute -top-2 -right-2"
                    >
                      <Star className="w-6 h-6 text-neon-yellow fill-neon-yellow" />
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-16"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="inline-flex items-center gap-3 px-8 py-4 bg-neon-green text-background font-pixel text-xs cursor-pointer pixel-btn glow-green"
          >
            <span>READY TO START?</span>
            <ArrowRight className="w-4 h-4" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default ProductExplainer;

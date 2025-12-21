import { Star, Quote, MessageSquare } from "lucide-react";

const testimonials = [
  {
    quote: "Frilpp completely transformed our influencer outreach. We went from sending 100+ DMs a week to getting matched with perfect creators in minutes.",
    author: "Sarah Chen",
    role: "Marketing Lead",
    company: "GlowUp Beauty",
    type: "brand",
  },
  {
    quote: "I've gotten over $2,000 worth of free products in just 3 months. The swiping experience is addictive and the brands are actually cool!",
    author: "Maya Rodriguez",
    role: "Lifestyle Creator",
    company: "45K Followers",
    type: "influencer",
  },
  {
    quote: "The ROI tracking and pipeline management saved us hours every week. Finally, a platform that understands D2C brand needs.",
    author: "David Kim",
    role: "Founder",
    company: "VitaBlend Supplements",
    type: "brand",
  },
  {
    quote: "No more awkward negotiations or ghosting. Everything is upfront, and the strike system means brands take you seriously.",
    author: "Aisha Johnson",
    role: "Fashion Influencer",
    company: "120K Followers",
    type: "influencer",
  },
];

const logos = [
  "GLOWUP",
  "VITABLEND",
  "STYLEHAUS",
  "FRESHFACE",
  "TECHWEAR",
  "ECOLIFE",
];

const Testimonials = () => {
  return (
    <section className="py-24 border-t-4 border-border bg-background relative">
      {/* Grid background */}
      <div className="absolute inset-0 bg-grid opacity-20" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
          <div>
            <div className="inline-flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-neon-purple" />
              <span className="text-xs font-pixel text-neon-purple">[TESTIMONIALS]</span>
            </div>
            <h2 className="text-xl md:text-2xl lg:text-3xl font-pixel leading-relaxed">
              <span className="text-neon-green">LOVED BY</span>
              <br />
              <span className="text-foreground">BRANDS &</span>
              <br />
              <span className="text-neon-pink">CREATORS</span>
            </h2>
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className={`p-6 md:p-8 border-4 ${
                testimonial.type === 'brand' ? 'border-neon-green bg-neon-green/5' : 'border-neon-pink bg-neon-pink/5'
              } hover:translate-x-1 hover:translate-y-1 transition-transform`}
            >
              {/* Quote Icon */}
              <Quote className={`w-6 h-6 mb-4 ${
                testimonial.type === 'brand' ? 'text-neon-green' : 'text-neon-pink'
              }`} />
              
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-neon-yellow text-neon-yellow" />
                ))}
              </div>
              
              {/* Quote */}
              <p className="font-mono text-sm leading-relaxed mb-6 text-foreground">
                “{testimonial.quote}”
              </p>
              
              {/* Author */}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 flex items-center justify-center font-pixel text-xs ${
                  testimonial.type === 'brand' 
                    ? 'bg-neon-green text-background' 
                    : 'bg-neon-pink text-background'
                }`}>
                  {testimonial.author.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="font-pixel text-xs text-foreground">{testimonial.author}</p>
                  <p className="text-xs font-mono text-muted-foreground">
                    {testimonial.role} {"//"} {testimonial.company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Brand Logos */}
        <div className="mt-16 pt-12 border-t-2 border-border">
          <p className="text-center text-xs font-pixel text-muted-foreground mb-8">
            [TRUSTED_BY 2500+ BRANDS]
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
            {logos.map((logo, index) => (
              <div 
                key={index} 
                className="text-sm font-pixel text-muted-foreground/40 hover:text-neon-green transition-colors cursor-default"
              >
                {logo}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;

import { Star, Quote, MessageSquare } from "lucide-react";

const highlights = [
  {
    title: "Local discovery that works",
    body: "Businesses set a radius so offers reach creators nearby — no spam.",
    type: "brand",
  },
  {
    title: "One-tap claiming",
    body: "Creators can apply in one click and get accepted by threshold or approval.",
    type: "influencer",
  },
  {
    title: "Proof + ROI",
    body: "Verified posts plus clicks + redemptions make ROI easy to understand.",
    type: "brand",
  },
  {
    title: "Status for creators",
    body: "Achievements and streaks help creators stand out and unlock better deals.",
    type: "influencer",
  },
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
              <span className="text-xs font-pixel text-neon-purple">[HIGHLIGHTS]</span>
            </div>
            <h2 className="text-xl md:text-2xl lg:text-3xl font-pixel leading-relaxed">
              <span className="text-neon-green">BUILT FOR</span>
              <br />
              <span className="text-foreground">BUSINESSES &</span>
              <br />
              <span className="text-neon-pink">CREATORS</span>
            </h2>
          </div>
        </div>

        {/* Highlights Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {highlights.map((item, index) => (
            <div 
              key={index} 
              className={`p-6 md:p-8 border-4 ${
                item.type === 'brand' ? 'border-neon-green bg-neon-green/5' : 'border-neon-pink bg-neon-pink/5'
              } hover:translate-x-1 hover:translate-y-1 transition-transform`}
            >
              {/* Quote Icon */}
              <Quote className={`w-6 h-6 mb-4 ${
                item.type === 'brand' ? 'text-neon-green' : 'text-neon-pink'
              }`} />
              
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-neon-yellow text-neon-yellow" />
                ))}
              </div>
              
              <p className="font-pixel text-xs text-foreground mb-2">
                {item.title}
              </p>
              <p className="font-mono text-sm leading-relaxed text-foreground">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;

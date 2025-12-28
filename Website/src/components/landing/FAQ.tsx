import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How does the barter system work?",
    answer: "Businesses post an offer (usually product-for-content). Creators apply, then get accepted automatically by rules or manually by the business. After fulfillment, creators share to IG/TikTok from Frilpp so the post can be verified and tracked.",
  },
  {
    question: "What happens if an influencer doesn't post?",
    answer: "Creators who don’t fulfill can receive strikes. Brands can see what’s due, what’s submitted, and what’s verified so they don’t have to chase.",
  },
  {
    question: "How are influencers verified?",
    answer: "Creators connect via Instagram or TikTok OAuth so brands can trust account ownership. We also use basic signals to reduce spam and low-quality accounts.",
  },
  {
    question: "Can I choose specific influencers?",
    answer: "Yes! Set criteria like follower count, engagement rate, location, and niche. Only matching creators see your offer.",
  },
  {
    question: "How does shipping work?",
    answer: "Offers can be pickup, local delivery, or shipping. Shipping labels are optional — you can paste your carrier tracking link or use Shopify if connected.",
  },
  {
    question: "Minimum follower requirement?",
    answer: "Brands can set their own minimum follower thresholds. We’re built to work well for small creators and local communities.",
  },
  {
    question: "What products work best?",
    answer: "Physical products that photograph well: skincare, cosmetics, supplements, fashion, home goods, food & beverage, tech accessories. No digital products currently.",
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes. Plans are month-to-month. Cancel anytime from settings; access continues until the billing period ends.",
  },
];

const FAQ = () => {
  return (
    <section id="faq" className="py-24 border-t-4 border-border bg-background relative">
      {/* Grid background */}
      <div className="absolute inset-0 bg-grid opacity-20" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
          <div>
            <div className="inline-flex items-center gap-2 mb-4">
              <HelpCircle className="w-4 h-4 text-neon-blue" />
              <span className="text-xs font-pixel text-neon-blue">[FAQ]</span>
            </div>
            <h2 className="text-xl md:text-2xl lg:text-3xl font-pixel leading-relaxed">
              <span className="text-neon-blue">GOT</span>
              <span className="text-foreground"> QUESTIONS?</span>
              <br />
              <span className="text-neon-green">WE GOT</span>
              <span className="text-foreground"> ANSWERS</span>
            </h2>
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl">
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="border-2 border-border bg-card data-[state=open]:border-neon-green px-4"
              >
                <AccordionTrigger className="text-left font-mono text-sm hover:no-underline py-4 hover:text-neon-green [&[data-state=open]]:text-neon-green">
                  <span className="flex items-center gap-3">
                    <span className="text-xs font-pixel text-muted-foreground">[{String(index + 1).padStart(2, '0')}]</span>
                    {faq.question}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="font-mono text-sm text-muted-foreground pb-4 leading-relaxed pl-10">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* More questions */}
        <div className="mt-12 max-w-3xl">
          <div className="p-4 border-2 border-dashed border-neon-purple flex items-center justify-between">
            <span className="font-mono text-sm text-muted-foreground">
              Still have questions?
            </span>
            <a href="mailto:hello@frilpp.com" className="font-pixel text-xs text-neon-purple hover:underline">
              CONTACT_US →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;

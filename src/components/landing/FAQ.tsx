import { HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "How does the barter system work?",
    answer:
      "Businesses post an offer (usually product-for-content). Creators apply, then the business approves requests. After fulfillment, creators share to TikTok from Frilpp so the post can be verified and tracked.",
  },
  {
    question: "What happens if an influencer doesn't post?",
    answer:
      "Creators who don’t fulfill can receive strikes. Brands can see what’s due, what’s submitted, and what’s verified so they don’t have to chase.",
  },
  {
    question: "How are influencers verified?",
    answer:
      "Creators connect via TikTok OAuth so brands can trust account ownership. We also use basic signals to reduce spam and low-quality accounts.",
  },
  {
    question: "Can I choose specific influencers?",
    answer:
      "Yes! Set criteria like follower count, engagement rate, location, and niche. Only matching creators see your offer.",
  },
  {
    question: "How does shipping work?",
    answer:
      "Offers can be pickup, local delivery, or shipping. Shipping labels are optional — you can paste your carrier tracking link.",
  },
  {
    question: "Minimum follower requirement?",
    answer:
      "Brands can set their own minimum follower thresholds. We’re built to work well for small creators and local communities.",
  },
  {
    question: "What products work best?",
    answer:
      "Physical products that photograph well: skincare, cosmetics, supplements, fashion, home goods, food & beverage, tech accessories. No digital products currently.",
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes. Plans are month-to-month. Cancel anytime from settings; access continues until the billing period ends.",
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="py-24 border-t-4 border-border bg-background relative">
      <div className="absolute inset-0 bg-grid opacity-20" />

      <div className="container mx-auto px-4 relative z-10">
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

        <div className="max-w-3xl space-y-2">
          {faqs.map((faq, index) => (
            <details
              key={faq.question}
              className="border-2 border-border bg-card px-4 group open:border-neon-green"
            >
              <summary className="cursor-pointer list-none py-4 font-mono text-sm flex items-center gap-3 group-open:text-neon-green">
                <span className="text-xs font-pixel text-muted-foreground">[{String(index + 1).padStart(2, "0")}]</span>
                {faq.question}
              </summary>
              <div className="font-mono text-sm text-muted-foreground pb-4 leading-relaxed pl-10">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>

        <div className="mt-12 max-w-3xl">
          <div className="p-4 border-2 border-dashed border-neon-purple flex items-center justify-between">
            <span className="font-mono text-sm text-muted-foreground">Still have questions?</span>
            <a href="mailto:hello@frilpp.com" className="font-pixel text-xs text-neon-purple hover:underline">
              CONTACT_US →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

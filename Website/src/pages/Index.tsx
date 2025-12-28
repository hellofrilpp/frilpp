import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import ProductExplainer from "@/components/landing/ProductExplainer";
import ForBrands from "@/components/landing/ForBrands";
import ForInfluencers from "@/components/landing/ForInfluencers";
import Stats from "@/components/landing/Stats";
import Testimonials from "@/components/landing/Testimonials";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";
import { MarketProvider } from "@/components/landing/market";

const Index = () => {
  return (
    <MarketProvider>
      <div className="min-h-screen bg-background">
        <Header />
        <Hero />
        <ProductExplainer />
        <HowItWorks />
        <ForBrands />
        <Stats />
        <ForInfluencers />
        <Testimonials />
        <Pricing />
        <FAQ />
        <CTA />
        <Footer />
      </div>
    </MarketProvider>
  );
};

export default Index;

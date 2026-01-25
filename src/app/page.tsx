import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import ProductExplainer from "@/components/landing/ProductExplainer";
import HowItWorks from "@/components/landing/HowItWorks";
import ForBrands from "@/components/landing/ForBrands";
import Stats from "@/components/landing/Stats";
import ForInfluencers from "@/components/landing/ForInfluencers";
import Testimonials from "@/components/landing/Testimonials";
import Pricing from "@/components/landing/Pricing";
import FAQ from "@/components/landing/FAQ";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
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
  );
}

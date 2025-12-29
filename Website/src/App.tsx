import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ThemeAccessibilityControls from "@/components/ThemeAccessibilityControls";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Brand Pages
import BrandAuth from "./pages/brand/Auth";
import BrandDashboard from "./pages/brand/Dashboard";
import BrandCampaigns from "./pages/brand/Campaigns";
import BrandCampaignCreator from "./pages/brand/CampaignCreator";
import BrandPipeline from "./pages/brand/Pipeline";
import BrandAnalytics from "./pages/brand/Analytics";
import BrandSettings from "./pages/brand/Settings";

// Influencer Pages
import InfluencerAuth from "./pages/influencer/Auth";
import InfluencerOnboarding from "./pages/influencer/Onboarding";
import InfluencerDiscover from "./pages/influencer/Discover";
import InfluencerDeals from "./pages/influencer/Deals";
import InfluencerProfile from "./pages/influencer/Profile";
import VerifyEmail from "./pages/VerifyEmail";
import LegalTerms from "./pages/LegalTerms";
import LegalPrivacy from "./pages/LegalPrivacy";

// Other Pages
import Leaderboard from "./pages/Leaderboard";
import Achievements from "./pages/Achievements";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="min-h-screen overflow-x-hidden">
          <ThemeAccessibilityControls />
          <Routes>
            <Route path="/" element={<Index />} />

            {/* Brand Routes */}
            <Route path="/brand/auth" element={<BrandAuth />} />
            <Route path="/brand/login" element={<BrandAuth />} />
            <Route path="/brand/signup" element={<BrandAuth />} />
            <Route path="/brand/dashboard" element={<BrandDashboard />} />
            <Route path="/brand/campaigns" element={<BrandCampaigns />} />
            <Route path="/brand/campaigns/new" element={<BrandCampaignCreator />} />
            <Route path="/brand/pipeline" element={<BrandPipeline />} />
            <Route path="/brand/analytics" element={<BrandAnalytics />} />
            <Route path="/brand/settings" element={<BrandSettings />} />

            {/* Influencer Routes */}
            <Route path="/influencer/auth" element={<InfluencerAuth />} />
            <Route path="/influencer/login" element={<InfluencerAuth />} />
            <Route path="/influencer/signup" element={<InfluencerAuth />} />
            <Route path="/influencer/onboarding" element={<InfluencerOnboarding />} />
            <Route path="/influencer/discover" element={<InfluencerDiscover />} />
            <Route path="/influencer/deals" element={<InfluencerDeals />} />
            <Route path="/influencer/profile" element={<InfluencerProfile />} />

            {/* Other Routes */}
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/legal/terms" element={<LegalTerms />} />
            <Route path="/legal/privacy" element={<LegalPrivacy />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

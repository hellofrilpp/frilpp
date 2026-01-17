import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Sparkles } from "lucide-react";
import SocialLoginButtons from "@/components/SocialLoginButtons";
import FrilppLogo from "@/components/FrilppLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccessibilityToggle } from "@/components/AccessibilityToggle";

const InfluencerAuth = () => {
  return (
    <div className="min-h-screen bg-background bg-grid flex flex-col">
      {/* Header */}
      <header className="p-4 border-b-4 border-primary">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-primary flex items-center justify-center animate-pulse-neon">
              <FrilppLogo size="sm" />
            </div>
            <span className="text-sm font-pixel text-neon-green tracking-tight">
              FRI<span className="text-neon-pink">L</span>PP
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/" className="text-xs font-mono text-muted-foreground hover:text-neon-green flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> BACK
            </Link>
            <ThemeToggle />
            <AccessibilityToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md pixel-border-primary bg-card">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-neon-purple/20 border-4 border-neon-purple flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-neon-purple" />
            </div>
            <CardTitle className="text-xl font-pixel text-neon-purple">CREATOR PORTAL</CardTitle>
            <CardDescription className="font-mono text-xs">
              Login with TikTok to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="font-mono text-xs text-muted-foreground mb-4">
                Start by connecting TikTok
              </p>
            </div>
            
            <SocialLoginButtons
              accentColor="purple"
              providers={["tiktok"]}
              role="creator"
              nextPath="/influencer/onboarding"
            />

            <div className="mt-6 text-center">
              <p className="text-xs font-mono text-muted-foreground">
                Are you a brand?{" "}
                <Link to="/brand/auth" className="text-neon-pink hover:underline">
                  Join as Brand →
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default InfluencerAuth;

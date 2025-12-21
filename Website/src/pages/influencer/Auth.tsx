import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Sparkles } from "lucide-react";
import SocialLoginButtons from "@/components/SocialLoginButtons";
import FrilppLogo from "@/components/FrilppLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ApiError, requestMagicLink } from "@/lib/api";

const InfluencerAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleVerifyEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("creator-email") || "").trim();

    try {
      await requestMagicLink(email, "/influencer/onboarding");
      toast({
        title: "CHECK YOUR EMAIL",
        description: "We sent a sign-in link. It expires in 10 minutes.",
      });
    } catch (err) {
      let message = err instanceof ApiError ? err.message : "Verification failed";
      if (err instanceof ApiError && err.code === "SOCIAL_REQUIRED") {
        message = "Connect Instagram or TikTok first, then verify email.";
      }
      if (err instanceof ApiError && err.code === "SOCIAL_EXPIRED") {
        message = "Social connection expired. Please reconnect and try again.";
      }
      toast({ title: "FAILED", description: message });
    } finally {
      setIsLoading(false);
    }
  };

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
          <Link to="/" className="text-xs font-mono text-muted-foreground hover:text-neon-green flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> BACK
          </Link>
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
              Connect your social account, then verify your email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="font-mono text-xs text-muted-foreground mb-4">
                Start by connecting Instagram or TikTok
              </p>
            </div>
            
            <SocialLoginButtons
              accentColor="purple"
              role="creator"
              nextPath="/influencer/onboarding"
            />

            <div className="border-2 border-dashed border-border p-4">
              <p className="text-xs font-mono text-muted-foreground mb-3">
                Already connected? Verify your email to continue.
              </p>
              <form onSubmit={handleVerifyEmail} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="creator-email" className="font-mono text-xs">EMAIL</Label>
                  <Input
                    id="creator-email"
                    name="creator-email"
                    type="email"
                    placeholder="creator@email.com"
                    required
                    className="border-2 border-border bg-background font-mono"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-neon-purple text-background font-pixel pixel-btn"
                  disabled={isLoading}
                >
                  {isLoading ? "SENDING..." : "SEND MAGIC LINK →"}
                </Button>
              </form>
            </div>

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

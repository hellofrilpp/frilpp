import { Link } from "react-router-dom";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2 } from "lucide-react";
import SocialLoginButtons from "@/components/SocialLoginButtons";
import FrilppLogo from "@/components/FrilppLogo";
import { useToast } from "@/hooks/use-toast";
import { ApiError, requestMagicLink } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccessibilityToggle } from "@/components/AccessibilityToggle";

const BrandAuth = () => {
  const [signupCompany, setSignupCompany] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleVerifyEmail = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("verify-email") || "").trim();
    try {
      const name = signupCompany.trim();
      if (name) localStorage.setItem("pendingBrandName", name);
      await requestMagicLink(email, "/brand/dashboard");
      toast({
        title: "CHECK YOUR EMAIL",
        description: "We sent a sign-in link. It expires in 10 minutes.",
      });
    } catch (err) {
      let message = err instanceof ApiError ? err.message : "Verification failed";
      if (err instanceof ApiError && err.status === 403) {
        message = "Email login is disabled right now. Use TikTok instead.";
      }
      if (err instanceof ApiError && err.message.toLowerCase().includes("email not configured")) {
        message = "Email login isn’t configured yet. Use TikTok instead.";
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
            <div className="mx-auto mb-4 w-16 h-16 bg-neon-green/20 border-4 border-neon-green flex items-center justify-center">
              <Building2 className="w-8 h-8 text-neon-green" />
            </div>
            <CardTitle className="text-xl font-pixel text-portal-green">BRAND PORTAL</CardTitle>
            <CardDescription className="font-mono text-xs">
              Login with TikTok to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="signup-company" className="font-mono text-xs">BRAND NAME</Label>
                <Input
                  id="signup-company"
                  name="signup-company"
                  type="text"
                  placeholder="Awesome Brand Inc."
                  value={signupCompany}
                  onChange={(event) => setSignupCompany(event.target.value)}
                  className="border-2 border-border bg-background font-mono"
                />
              </div>

              <SocialLoginButtons
                accentColor="green"
                providers={["tiktok"]}
                primaryVariant="filled"
                role="brand"
                nextPath="/brand/dashboard"
                beforeAuth={() => {
                  const name = signupCompany.trim();
                  if (name) localStorage.setItem("pendingBrandName", name);
                }}
              />

              <div className="border-2 border-dashed border-border p-4">
                <p className="text-xs font-mono text-muted-foreground mb-3">
                  Prefer email? Get a magic sign-in link.
                </p>
                <form onSubmit={handleVerifyEmail} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="verify-email" className="font-mono text-xs">EMAIL</Label>
                    <Input
                      id="verify-email"
                      name="verify-email"
                      type="email"
                      placeholder="brand@company.com"
                      required
                      className="border-2 border-border bg-background font-mono"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-neon-green text-background font-pixel pixel-btn"
                    disabled={isLoading}
                  >
                    {isLoading ? "SENDING..." : "SEND MAGIC LINK →"}
                  </Button>
                </form>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs font-mono text-muted-foreground">
                Are you a creator?{" "}
                <Link to="/influencer/auth" className="text-neon-green hover:underline">
                  Join as Creator →
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default BrandAuth;

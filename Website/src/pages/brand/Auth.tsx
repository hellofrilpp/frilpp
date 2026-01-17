import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2 } from "lucide-react";
import SocialLoginButtons from "@/components/SocialLoginButtons";
import FrilppLogo from "@/components/FrilppLogo";
import { useState } from "react";

const BrandAuth = () => {
  const [signupCompany, setSignupCompany] = useState("");

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
            <div className="mx-auto mb-4 w-16 h-16 bg-neon-pink/20 border-4 border-neon-pink flex items-center justify-center">
              <Building2 className="w-8 h-8 text-neon-pink" />
            </div>
            <CardTitle className="text-xl font-pixel text-neon-pink">BRAND PORTAL</CardTitle>
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
                accentColor="pink"
                providers={["tiktok"]}
                role="brand"
                nextPath="/brand/dashboard"
                beforeAuth={() => {
                  const name = signupCompany.trim();
                  if (name) localStorage.setItem("pendingBrandName", name);
                }}
              />
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

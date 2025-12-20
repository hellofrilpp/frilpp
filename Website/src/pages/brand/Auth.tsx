import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SocialLoginButtons from "@/components/SocialLoginButtons";
import FrilppLogo from "@/components/FrilppLogo";
import { ApiError, requestMagicLink } from "@/lib/api";
const BrandAuth = () => {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("mode") === "signup" ? "signup" : "login";
  const [isLoading, setIsLoading] = useState(false);
  const [signupCompany, setSignupCompany] = useState("");
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("login-email") || "").trim();

    try {
      const res = await requestMagicLink(email, "/brand/dashboard");
      toast({
        title: "CHECK YOUR EMAIL",
        description: res.debug
          ? "Dev link opened in this tab."
          : "We sent a sign-in link. It expires in 10 minutes.",
      });
      if (res.debug) window.location.href = res.debug;
    } catch (err) {
      let message = err instanceof ApiError ? err.message : "Login failed";
      if (err instanceof ApiError && err.code === "SOCIAL_REQUIRED") {
        message = "Connect Instagram or TikTok first, then verify email.";
      }
      if (err instanceof ApiError && err.code === "SOCIAL_EXPIRED") {
        message = "Social connection expired. Please reconnect and try again.";
      }
      toast({ title: "LOGIN FAILED", description: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const form = new FormData(e.currentTarget);
    const name = String(form.get("signup-company") || "").trim();
    const email = String(form.get("signup-email") || "").trim();
    if (name) {
      localStorage.setItem("pendingBrandName", name);
    }

    try {
      const res = await requestMagicLink(email, "/brand/dashboard");
      toast({
        title: "CHECK YOUR EMAIL",
        description: res.debug
          ? "Dev link opened in this tab."
          : "We sent a sign-in link to finish setup.",
      });
      if (res.debug) window.location.href = res.debug;
    } catch (err) {
      let message = err instanceof ApiError ? err.message : "Signup failed";
      if (err instanceof ApiError && err.code === "SOCIAL_REQUIRED") {
        message = "Connect Instagram or TikTok first, then verify email.";
      }
      if (err instanceof ApiError && err.code === "SOCIAL_EXPIRED") {
        message = "Social connection expired. Please reconnect and try again.";
      }
      toast({ title: "SIGNUP FAILED", description: message });
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
            <div className="mx-auto mb-4 w-16 h-16 bg-neon-pink/20 border-4 border-neon-pink flex items-center justify-center">
              <Building2 className="w-8 h-8 text-neon-pink" />
            </div>
            <CardTitle className="text-xl font-pixel text-neon-pink">BRAND PORTAL</CardTitle>
            <CardDescription className="font-mono text-xs">
              Connect your social account, then verify your email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted">
                <TabsTrigger value="login" className="font-pixel text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  LOGIN
                </TabsTrigger>
                <TabsTrigger value="signup" className="font-pixel text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  SIGN UP
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="font-mono text-xs">EMAIL</Label>
                    <Input
                      id="login-email"
                      name="login-email"
                      type="email"
                      placeholder="brand@company.com"
                      required
                      className="border-2 border-border bg-background font-mono"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-neon-pink text-primary-foreground font-pixel pixel-btn"
                    disabled={isLoading}
                  >
                    {isLoading ? "LOADING..." : "LOGIN →"}
                  </Button>
                  <SocialLoginButtons
                    accentColor="pink"
                    role="brand"
                    nextPath="/brand/dashboard"
                  />
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-company" className="font-mono text-xs">COMPANY NAME</Label>
                    <Input
                      id="signup-company"
                      name="signup-company"
                      type="text"
                      placeholder="Awesome Brand Inc."
                      required
                      value={signupCompany}
                      onChange={(event) => setSignupCompany(event.target.value)}
                      className="border-2 border-border bg-background font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="font-mono text-xs">EMAIL</Label>
                    <Input
                      id="signup-email"
                      name="signup-email"
                      type="email"
                      placeholder="brand@company.com"
                      required
                      className="border-2 border-border bg-background font-mono"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-neon-pink text-primary-foreground font-pixel pixel-btn"
                    disabled={isLoading}
                  >
                    {isLoading ? "CREATING..." : "CREATE ACCOUNT →"}
                  </Button>
                  <SocialLoginButtons
                    accentColor="pink"
                    role="brand"
                    nextPath="/brand/dashboard"
                    beforeAuth={() => {
                      const name = signupCompany.trim();
                      if (name) localStorage.setItem("pendingBrandName", name);
                    }}
                  />
                </form>
              </TabsContent>
            </Tabs>

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

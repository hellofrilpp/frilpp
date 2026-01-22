import { Link } from "react-router-dom";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2, Lock } from "lucide-react";
import FrilppLogo from "@/components/FrilppLogo";
import { useToast } from "@/hooks/use-toast";
import { ApiError, continuePasswordAuth, loginWithPassword, requestMagicLink } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccessibilityToggle } from "@/components/AccessibilityToggle";

const BrandAuth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"email" | "password" | "sent">("email");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleEmailContinue = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const res = await continuePasswordAuth(email.trim());
      if (res.allowPassword) {
        setStep("password");
      } else {
        await requestMagicLink(email.trim(), "/brand/setup?mode=signup");
        setStep("sent");
        toast({
          title: "CHECK YOUR EMAIL",
          description: "We sent a sign-in link. It expires in 10 minutes.",
        });
      }
    } catch (err) {
      let message = err instanceof ApiError ? err.message : "Verification failed";
      if (err instanceof ApiError && err.code === "RATE_LIMITED") {
        message = "Too many attempts. Try again shortly.";
      }
      toast({ title: "FAILED", description: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const res = await loginWithPassword(email.trim(), password, "/brand/dashboard");
      window.location.href = res.nextPath;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Login failed";
      toast({ title: "FAILED", description: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast({ title: "ENTER EMAIL", description: "Add your email first." });
      return;
    }
    setIsLoading(true);
    try {
      await requestMagicLink(email.trim(), "/brand/setup?mode=reset");
      setStep("sent");
      toast({
        title: "CHECK YOUR EMAIL",
        description: "We sent a reset link. It expires in 10 minutes.",
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Reset failed";
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
              Sign in with email + password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {step === "email" ? (
                <form onSubmit={handleEmailContinue} className="space-y-3 border-2 border-dashed border-border p-4">
                  <p className="text-xs font-mono text-muted-foreground">
                    Enter your work email to continue.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="brand-email" className="font-mono text-xs">EMAIL</Label>
                    <Input
                      id="brand-email"
                      name="brand-email"
                      type="email"
                      placeholder="brand@company.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      className="border-2 border-border bg-background font-mono"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-neon-green text-background font-pixel pixel-btn"
                    disabled={isLoading}
                  >
                    {isLoading ? "CONTINUING..." : "CONTINUE →"}
                  </Button>
                </form>
              ) : null}

              {step === "password" ? (
                <form onSubmit={handlePasswordLogin} className="space-y-3 border-2 border-dashed border-border p-4">
                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    Enter your password to sign in.
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand-password" className="font-mono text-xs">PASSWORD</Label>
                    <Input
                      id="brand-password"
                      name="brand-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      className="border-2 border-border bg-background font-mono"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-neon-green text-background font-pixel pixel-btn"
                    disabled={isLoading}
                  >
                    {isLoading ? "SIGNING IN..." : "SIGN IN →"}
                  </Button>
                  <button
                    type="button"
                    className="w-full text-xs font-mono text-muted-foreground hover:text-neon-green"
                    onClick={handleForgotPassword}
                  >
                    Forgot password?
                  </button>
                </form>
              ) : null}

              {step === "sent" ? (
                <div className="border-2 border-border bg-muted/40 p-4 text-center">
                  <p className="text-xs font-mono text-muted-foreground">
                    Check your email for a secure link. We’ll take you to set your password and location.
                  </p>
                </div>
              ) : null}
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

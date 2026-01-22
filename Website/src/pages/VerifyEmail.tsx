import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail } from "lucide-react";
import FrilppLogo from "@/components/FrilppLogo";
import { ApiError, requestMagicLink } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccessibilityToggle } from "@/components/AccessibilityToggle";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const nextPath = searchParams.get("next") || "/onboarding";
  const provider = searchParams.get("provider");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      await requestMagicLink(email.trim(), nextPath);
      toast({
        title: "CHECK YOUR EMAIL",
        description: "We sent a sign-in link. It expires in 10 minutes.",
      });
    } catch (err) {
      let message = err instanceof ApiError ? err.message : "Verification failed";
      if (err instanceof ApiError && err.code === "SOCIAL_REQUIRED") {
        message = "Connect TikTok first, then verify email.";
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

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md pixel-border-primary bg-card">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-neon-green/20 border-4 border-neon-green flex items-center justify-center">
              <Mail className="w-8 h-8 text-neon-green" />
            </div>
            <CardTitle className="text-xl font-pixel text-neon-green">VERIFY EMAIL</CardTitle>
            <CardDescription className="font-mono text-xs">
              {provider ? `Connected ${provider.toUpperCase()}.` : "Social connected."} Verify your email to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verify-email" className="font-mono text-xs">EMAIL</Label>
                <Input
                  id="verify-email"
                  name="verify-email"
                  type="email"
                  placeholder="you@brand.com"
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
                {isLoading ? "SENDING..." : "SEND MAGIC LINK →"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default VerifyEmail;

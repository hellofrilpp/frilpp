"use client";

import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import FrilppLogo from "@/components/frilpp-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccessibilityToggle } from "@/components/accessibility-toggle";

export default function InfluencerAuthPage() {
  const handleSocialLogin = () => {
    const params = new URLSearchParams();
    params.set("role", "creator");
    params.set("next", "/influencer/discover");
    window.location.href = `/api/auth/social/tiktok/connect?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-background bg-grid flex flex-col">
      <header className="p-4 border-b-4 border-primary">
        <div className="container mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-primary flex items-center justify-center animate-pulse-neon">
              <FrilppLogo size="sm" />
            </div>
            <span className="text-sm font-pixel text-neon-green tracking-tight">
              FRI<span className="text-neon-pink">L</span>PP
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs font-mono text-muted-foreground hover:text-neon-green flex items-center gap-2"
            >
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
            <div className="mx-auto mb-4 w-16 h-16 bg-neon-pink/20 border-4 border-neon-pink flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-neon-pink" />
            </div>
            <CardTitle className="text-xl font-pixel text-portal-pink">CREATOR PORTAL</CardTitle>
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

            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-2 font-mono text-muted-foreground">
                    LOGIN WITH TIKTOK
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleSocialLogin}
                className="w-full border-2 border-border bg-background font-mono text-xs transition-all hover:border-neon-pink hover:text-neon-pink border-neon-pink bg-neon-pink/8"
              >
                <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                </svg>
                TIKTOK
              </Button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs font-mono text-muted-foreground">
                Are you a brand?{" "}
                <Link href="/brand/auth" className="text-neon-pink hover:underline">
                  Join as Brand →
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Building2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FrilppLogo from "@/components/frilpp-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccessibilityToggle } from "@/components/accessibility-toggle";

type ApiError = Error & { status?: number; code?: string };

type Notice = { kind: "success" | "error"; text: string };

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  const data = (await res.json().catch(() => null)) as T & {
    error?: string;
    code?: string;
  };
  if (!res.ok) {
    const err = new Error(data?.error ?? "Request failed") as ApiError;
    err.status = res.status;
    err.code = data?.code;
    throw err;
  }
  return data;
}

export default function BrandAuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"email" | "password" | "sent">("email");
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const showNotice = (kind: Notice["kind"], text: string) => {
    setNotice({ kind, text });
    setTimeout(() => setNotice(null), 3500);
  };

  const handleEmailContinue = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setNotice(null);
    try {
      const res = await fetchJson<{ ok: boolean; allowPassword?: boolean }>(
        "/api/auth/password/continue",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: email.trim(), lane: "brand" }),
        },
      );
      if (res.allowPassword) {
        setStep("password");
        return;
      }
      await fetchJson("/api/auth/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          next: "/brand/setup?mode=signup",
          acceptTerms: true,
          acceptPrivacy: true,
        }),
      });
      setStep("sent");
      showNotice("success", "We sent a sign-in link. It expires in 10 minutes.");
    } catch (err) {
      const apiErr = err as ApiError;
      let message = apiErr?.message ?? "Verification failed";
      if (apiErr?.code === "RATE_LIMITED") {
        message = "Too many attempts. Try again shortly.";
      }
      showNotice("error", message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    setNotice(null);
    try {
      const res = await fetchJson<{ ok: boolean; nextPath: string }>(
        "/api/auth/password/login",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            password,
            next: "/brand/dashboard",
            lane: "brand",
          }),
        },
      );
      window.location.href = res.nextPath;
    } catch (err) {
      const apiErr = err as ApiError;
      const message = apiErr?.message ?? "Login failed";
      showNotice("error", message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      showNotice("error", "Add your email first.");
      return;
    }
    if (isLoading) return;
    setIsLoading(true);
    setNotice(null);
    try {
      await fetchJson("/api/auth/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          next: "/brand/setup?mode=reset",
          acceptTerms: true,
          acceptPrivacy: true,
        }),
      });
      setStep("sent");
      showNotice("success", "We sent a reset link. It expires in 10 minutes.");
    } catch (err) {
      const apiErr = err as ApiError;
      const message = apiErr?.message ?? "Reset failed";
      showNotice("error", message);
    } finally {
      setIsLoading(false);
    }
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
            <div className="mx-auto mb-4 w-16 h-16 bg-neon-green/20 border-4 border-neon-green flex items-center justify-center">
              <Building2 className="w-8 h-8 text-neon-green" />
            </div>
            <CardTitle className="text-xl font-pixel text-portal-green">BRAND PORTAL</CardTitle>
            <CardDescription className="font-mono text-xs">
              Sign in with email + password
            </CardDescription>
          </CardHeader>
          <CardContent>
            {notice ? (
              <div
                className={`mb-4 border-2 px-3 py-2 text-xs font-mono ${
                  notice.kind === "success"
                    ? "border-neon-green text-neon-green"
                    : "border-neon-pink text-neon-pink"
                }`}
              >
                {notice.text}
              </div>
            ) : null}
            <div className="space-y-6">
              {step === "email" ? (
                <form onSubmit={handleEmailContinue} className="space-y-3 border-2 border-dashed border-border p-4">
                  <p className="text-xs font-mono text-muted-foreground">
                    Enter your work email to continue.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="brand-email" className="font-mono text-xs">
                      EMAIL
                    </Label>
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
                    <Label htmlFor="brand-password" className="font-mono text-xs">
                      PASSWORD
                    </Label>
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
                <Link href="/influencer/auth" className="text-neon-green hover:underline">
                  Join as Creator →
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

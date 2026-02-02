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

            {/* Google OAuth Button */}
            <div className="mb-6 border-2 border-dashed border-border p-4">
              <a
                href="/api/auth/social/google/connect?role=brand&next=/brand/dashboard"
                className="flex w-full items-center justify-center gap-3 bg-neon-green text-background font-pixel pixel-btn px-4 py-3 hover:brightness-110 transition-all"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>GOOGLE SIGN IN</span>
              </a>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-dashed border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-3 font-pixel text-muted-foreground">OR EMAIL</span>
              </div>
            </div>

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
                    Check your email for a secure link. We’ll take you to set your password.
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

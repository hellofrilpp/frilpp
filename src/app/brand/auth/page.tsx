"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthStep = "email" | "password" | "sent";

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  const data = (await res.json().catch(() => null)) as T & { error?: string };
  if (!res.ok) {
    const message = data && typeof data.error === "string" ? data.error : "Request failed";
    const err = new Error(message);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return data;
}

export default function BrandAuthPage() {
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleEmailContinue = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      const res = await postJson<{ ok: boolean; allowPassword: boolean }>(
        "/api/auth/password/continue",
        { email: email.trim(), lane: "brand" },
      );
      if (res.allowPassword) {
        setStep("password");
        return;
      }
      await postJson("/api/auth/request", {
        email: email.trim(),
        next: "/brand/setup?mode=signup",
        acceptTerms: true,
        acceptPrivacy: true,
      });
      setStep("sent");
      setMessage("We sent a sign-in link. It expires in 10 minutes.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setStatus("idle");
    }
  };

  const handlePasswordLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      const res = await postJson<{ ok: boolean; nextPath: string }>("/api/auth/password/login", {
        email: email.trim(),
        password,
        next: "/brand/dashboard",
        lane: "brand",
      });
      window.location.href = res.nextPath;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Login failed");
    } finally {
      setStatus("idle");
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setMessage("Add your email first.");
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      await postJson("/api/auth/request", {
        email: email.trim(),
        next: "/brand/setup?mode=reset",
        acceptTerms: true,
        acceptPrivacy: true,
      });
      setStep("sent");
      setMessage("We sent a reset link. It expires in 10 minutes.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-md px-4 py-10 md:px-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Brand</Badge>
              <Badge variant="secondary">Sign in</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
              Brand portal
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in with email and password or request a magic link.
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">Home</Button>
          </Link>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Continue</CardTitle>
            <CardDescription>Use your work email for secure access.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {message ? (
              <div className="rounded-lg border bg-muted p-3 text-xs text-muted-foreground">
                {message}
              </div>
            ) : null}

            {step === "email" ? (
              <form className="grid gap-3" onSubmit={handleEmailContinue}>
                <div className="grid gap-2">
                  <Label htmlFor="brand-email">Email</Label>
                  <Input
                    id="brand-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={status === "loading"}>
                  {status === "loading" ? "Checking..." : "Continue"}
                </Button>
              </form>
            ) : null}

            {step === "password" ? (
              <form className="grid gap-3" onSubmit={handlePasswordLogin}>
                <div className="grid gap-2">
                  <Label htmlFor="brand-email-login">Email</Label>
                  <Input
                    id="brand-email-login"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="brand-password">Password</Label>
                  <Input
                    id="brand-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Button type="submit" disabled={status === "loading"}>
                    {status === "loading" ? "Signing in..." : "Sign in"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleForgotPassword}
                    disabled={status === "loading"}
                  >
                    Forgot password
                  </Button>
                </div>
              </form>
            ) : null}

            {step === "sent" ? (
              <div className="grid gap-2">
                <p className="text-sm text-muted-foreground">
                  Check your inbox for the sign-in link.
                </p>
                <Button variant="outline" onClick={() => setStep("email")}>
                  Send another link
                </Button>
              </div>
            ) : null}

            <div className="text-center text-xs text-muted-foreground">
              Not a brand?{" "}
              <Link className="underline" href="/influencer/auth">
                Creator login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

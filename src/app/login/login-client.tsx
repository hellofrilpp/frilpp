"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitizeNextPath } from "@/lib/redirects";

export default function LoginClient() {
  const [email, setEmail] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const search = useSearchParams();
  const nextPath = sanitizeNextPath(search.get("next"), "/onboarding");

  async function submit() {
    setStatus("sending");
    try {
      const res = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, next: nextPath, acceptTerms, acceptPrivacy }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; sent: boolean }
        | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(
          data && "error" in data && typeof data.error === "string" ? data.error : "Failed",
        );
      }
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-md px-4 py-10 md:px-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Frilpp</Badge>
              <Badge variant="secondary">Sign in</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
              Magic link login
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your email and we’ll send a sign-in link (valid for 10 minutes).
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">Home</Button>
          </Link>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              {status === "sent"
                ? "Check your email for the link."
                : status === "error"
                  ? "Something went wrong. Try again."
                  : "No password required."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="you@brand.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <label className="flex items-start gap-3 rounded-lg border bg-card p-4">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold">Terms of Service</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  I agree to the{" "}
                  <Link className="underline" href="/legal/terms" target="_blank">
                    Terms
                  </Link>
                  .
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-lg border bg-card p-4">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={acceptPrivacy}
                onChange={(e) => setAcceptPrivacy(e.target.checked)}
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold">Privacy Policy</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  I agree to the{" "}
                  <Link className="underline" href="/legal/privacy" target="_blank">
                    Privacy Policy
                  </Link>
                  .
                </div>
              </div>
            </label>

            <Button
              onClick={submit}
              disabled={status === "sending" || !email.trim() || !acceptTerms || !acceptPrivacy}
            >
              {status === "sending" ? "Sending..." : "Send sign-in link"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

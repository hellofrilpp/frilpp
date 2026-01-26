"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sanitizeNextPath } from "@/lib/redirects";

type MeUser = {
  id: string;
  email: string | null;
  tosAcceptedAt: string | null;
  privacyAcceptedAt: string | null;
};

export default function AcceptClient() {
  const search = useSearchParams();
  const router = useRouter();
  const lane = (() => {
    if (typeof document === "undefined") return null;
    const match = document.cookie
      .split(/;\s*/g)
      .map((part) => part.split("="))
      .find(([key]) => key === "frilpp_lane");
    const value = match?.[1] ? decodeURIComponent(match[1]) : null;
    return value === "brand" || value === "creator" ? value : null;
  })();
  const fallback =
    lane === "brand" ? "/brand/dashboard" : lane === "creator" ? "/influencer/discover" : "/";
  const nextPath = sanitizeNextPath(search.get("next"), fallback);
  const nextLabel = (() => {
    switch (nextPath) {
      case "/influencer/discover":
        return "Discover";
      case "/influencer/deals":
        return "Deals";
      case "/influencer/profile":
        return "Profile";
      case "/influencer/onboarding":
        return "Onboarding";
      case "/brand/dashboard":
        return "Dashboard";
      case "/brand/campaigns":
        return "Campaigns";
      case "/brand/settings":
        return "Settings";
      case "/brand/pipeline":
        return "Pipeline";
      case "/brand/analytics":
        return "Analytics";
      case "/brand/offers":
        return "Offers";
      case "/":
        return "Home";
      default:
        return null;
    }
  })();

  const [me, setMe] = useState<MeUser | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  const needsTerms = me ? !me.tosAcceptedAt : true;
  const needsPrivacy = me ? !me.privacyAcceptedAt : true;

  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus("loading");
      try {
        const res = await fetch("/api/auth/me");
        const data = (await res.json().catch(() => null)) as
          | { ok: true; user: MeUser | null }
          | { ok: false; error?: string };
        if (!res.ok || !data || !("ok" in data) || data.ok !== true) throw new Error("Failed to load session");
        if (cancelled) return;
        const user = data.user ?? null;
        setMe(user);
        setAcceptTerms(Boolean(user?.tosAcceptedAt));
        setAcceptPrivacy(Boolean(user?.privacyAcceptedAt));
        setStatus("idle");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed");
          setStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit() {
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/legal/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          acceptTerms,
          acceptPrivacy,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok: true } | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(
          data && "error" in data && typeof data.error === "string" ? data.error : "Failed to save",
        );
      }
      router.replace(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl px-4 py-10 md:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Legal</Badge>
              <Badge variant="secondary">Required</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
              Accept terms to continue
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {me ? (me.email ? `Signed in as ${me.email}.` : "Signed in.") : "Sign in to accept legal terms."}
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">Home</Button>
          </Link>
        </div>

        {error ? (
          <div className="mt-6 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
            {error}
          </div>
        ) : null}

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Agreements</CardTitle>
            <CardDescription>
              {status === "loading"
                ? "Loading…"
                : "You must accept Terms and Privacy to use Frilpp."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
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
                    Terms of Service
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

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                {needsTerms || needsPrivacy
                  ? nextLabel
                    ? `You will return to ${nextLabel}.`
                    : "Continue to finish."
                  : "All set."}
              </div>
              <Button
                variant="secondary"
                onClick={submit}
                disabled={status === "saving" || !acceptTerms || !acceptPrivacy}
              >
                {status === "saving" ? "Saving..." : nextLabel ? `Continue to ${nextLabel}` : "Continue"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

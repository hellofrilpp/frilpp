"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Status = "loading" | "error";

const errorCopy: Record<string, string> = {
  missing: "This sign-in link is missing a token. Request a new link and try again.",
  invalid: "This sign-in link is invalid or expired. Request a new link and try again.",
  server: "We hit a server error while signing you in. Try again in a moment.",
  default: "We could not sign you in with that link. Please request a new one.",
};

function mapError(value?: string | null) {
  if (!value) return errorCopy.default;
  const key = value.toLowerCase();
  if (key.includes("missing")) return errorCopy.missing;
  if (key.includes("invalid") || key.includes("expired")) return errorCopy.invalid;
  if (key.includes("database") || key.includes("server")) return errorCopy.server;
  return value;
}

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const searchParams = new URLSearchParams(window.location.search);
      const token = hashParams.get("token") ?? searchParams.get("token");
      const errorParam = searchParams.get("error");

      if (token || errorParam) {
        window.history.replaceState({}, document.title, "/auth/callback");
      }

      if (!token) {
        if (!cancelled) {
          setStatus("error");
          setMessage(mapError(errorParam));
        }
        return;
      }

      try {
        const res = await fetch("/api/auth/callback", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json().catch(() => null)) as
          | { ok: true; nextPath?: string }
          | { ok: false; error?: string };

        if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
          if (!cancelled) {
            setStatus("error");
            setMessage(mapError(data && "error" in data ? data.error : null));
          }
          return;
        }

        const nextPath = data.nextPath && data.nextPath.startsWith("/") ? data.nextPath : "/brand/dashboard";
        window.location.assign(nextPath);
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setMessage(mapError(err instanceof Error ? err.message : null));
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const subtitle = useMemo(() => {
    if (status === "loading") return "Verifying your link…";
    return "Let’s get you back into your brand workspace.";
  }, [status]);

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
              {status === "loading" ? "Signing you in" : "Link expired"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          <Link href="/">
            <Button variant="outline">Home</Button>
          </Link>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>{status === "loading" ? "Hold on" : "Action needed"}</CardTitle>
            <CardDescription>{status === "loading" ? "This should take just a moment." : message}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {status === "loading" ? (
              <Button className="w-full" variant="secondary" disabled>
                Checking link…
              </Button>
            ) : (
              <>
                <Link href="/brand/auth">
                  <Button className="w-full" variant="secondary">
                    Back to brand sign-in
                  </Button>
                </Link>
                <Link href="/login">
                  <Button className="w-full" variant="outline">
                    Use another sign-in option
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

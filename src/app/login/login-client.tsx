"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sanitizeNextPath } from "@/lib/redirects";

export default function LoginClient() {
  const search = useSearchParams();
  const nextPath = sanitizeNextPath(search.get("next"), "/onboarding");

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
              Sign in
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Continue with social login. You’ll add an email after signing in.
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">Home</Button>
          </Link>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Continue</CardTitle>
            <CardDescription>
              Choose how you want to sign in. You can link the other platform later in settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <a href={`/api/auth/social/tiktok/connect?next=${encodeURIComponent(nextPath)}`}>
                <Button className="w-full" variant="secondary" type="button">
                  Continue
                </Button>
              </a>
            </div>

            <div className="text-center text-xs text-muted-foreground">
              Looking for role-specific entry?{" "}
              <Link className="underline" href="/brand/auth">
                Brand
              </Link>{" "}
              ·{" "}
              <Link className="underline" href="/influencer/auth">
                Creator
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

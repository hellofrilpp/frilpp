"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sanitizeNextPath } from "@/lib/redirects";

export default function TikTokUnavailableClient() {
  const router = useRouter();
  const search = useSearchParams();

  const nextPath = sanitizeNextPath(search.get("next"), "/onboarding");
  const role = search.get("role");
  const instagramHref = `/api/auth/social/instagram/connect?next=${encodeURIComponent(nextPath)}${
    role ? `&role=${encodeURIComponent(role)}` : ""
  }`;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-md px-4 py-10 md:px-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Frilpp</Badge>
              <Badge variant="secondary">Sign in</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-balance">
              OOPS! TikTok login is only available in the US
            </h1>
          </div>
          <Link href="/">
            <Button variant="outline">Home</Button>
          </Link>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Try a different option</CardTitle>
            <CardDescription>
              You can still continue with Instagram and connect TikTok later when it becomes
              available.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <a href={instagramHref}>
              <Button className="w-full" variant="secondary" type="button">
                Continue with Instagram
              </Button>
            </a>
            <Button className="w-full" variant="outline" type="button" onClick={() => router.back()}>
              Go back
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

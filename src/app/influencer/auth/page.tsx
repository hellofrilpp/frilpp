"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function InfluencerAuthPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-md px-4 py-10 md:px-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Creator</Badge>
              <Badge variant="secondary">Sign in</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Creator portal</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Login with TikTok to continue.
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">Home</Button>
          </Link>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Continue with</CardTitle>
            <CardDescription>Connect TikTok to start matching with brands.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <a href="/api/auth/social/tiktok/connect?next=%2Finfluencer%2Fdiscover&role=creator">
              <Button className="w-full" variant="secondary">
                TikTok
              </Button>
            </a>
            <div className="text-center text-xs text-muted-foreground">
              Are you a brand?{" "}
              <Link className="underline" href="/brand/auth">
                Join as brand
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

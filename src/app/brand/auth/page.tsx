"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BrandAuthPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-md px-4 py-10 md:px-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Brand</Badge>
              <Badge variant="secondary">Sign in</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Get started</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in with TikTok to get started.
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">Home</Button>
          </Link>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Continue with</CardTitle>
            <CardDescription>Fast onboarding for local SMBs.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <a href="/api/auth/social/tiktok/connect?next=%2Fonboarding&role=brand">
              <Button className="w-full" variant="secondary">
                TikTok
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

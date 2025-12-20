import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const runtime = "nodejs";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-10 md:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Legal</Badge>
              <Badge variant="secondary">Privacy</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
              Privacy Policy
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Replace this template with your final policy before public launch.
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">Home</Button>
          </Link>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Template</CardTitle>
            <CardDescription>What we collect and why</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm text-foreground">
            <div className="text-sm font-semibold">Data we collect</div>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Account data: email, session identifiers.</li>
              <li>Creator profile data: shipping address, phone (optional), country.</li>
              <li>
                Instagram data (only after explicit consent): username, follower count, and recent
                media metadata used for deliverable verification.
              </li>
              <li>Offer/match/deliverable data to operate the seeding workflow.</li>
              <li>Click and conversion attribution data (hashed IP, order totals).</li>
            </ul>
            <div className="text-sm font-semibold">How we use data</div>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>To facilitate offers, shipping, and deliverable tracking.</li>
              <li>To verify required Reels/Feed posts and enforce strikes.</li>
              <li>To provide brands with performance analytics and attribution.</li>
            </ul>
            <div className="text-sm font-semibold">Security</div>
            <p className="text-muted-foreground">
              OAuth tokens are stored encrypted at rest; access is limited to required services.
            </p>
            <p className="text-muted-foreground">
              This is not legal advice. Finalize with counsel before making the service publicly
              available.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const runtime = "nodejs";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-10 md:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Legal</Badge>
              <Badge variant="secondary">Terms</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
              Terms of Service
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Replace this template with your final terms before public launch.
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">Home</Button>
          </Link>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Template</CardTitle>
            <CardDescription>High-level terms placeholder</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm text-foreground">
            <p className="text-muted-foreground">
              Frilpp is a platform that facilitates product seeding (“barter offers”) between
              brands and creators. These terms govern your use of the product.
            </p>
            <div className="text-sm font-semibold">Key points</div>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Creators agree to deliver the specified content or UGC by the deadline.</li>
              <li>Brands agree to provide the offered product in exchange for deliverables.</li>
              <li>
                Strikes may be issued for missed deadlines or invalid deliverables, limiting future
                claims.
              </li>
              <li>
                Usage rights (when required) are granted only when the creator explicitly consents
                for that deliverable.
              </li>
            </ul>
            <div className="text-sm font-semibold">Disclaimer</div>
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

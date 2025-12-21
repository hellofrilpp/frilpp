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
              These terms govern your access to and use of Frilpp.
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">Home</Button>
          </Link>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Terms</CardTitle>
            <CardDescription>By using Frilpp, you agree to these terms.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm text-foreground">
            <p className="text-muted-foreground">
              Frilpp is a platform that facilitates product seeding (barter offers) between
              brands and creators. By accessing or using the service, you agree to these Terms
              and our Privacy Policy.
            </p>

            <div className="text-sm font-semibold">Eligibility</div>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>You must be at least 18 years old to use Frilpp.</li>
              <li>You must have authority to act on behalf of a brand or creator you represent.</li>
              <li>Frilpp is currently available only in the United States and India.</li>
            </ul>

            <div className="text-sm font-semibold">Accounts and security</div>
            <p className="text-muted-foreground">
              You are responsible for the accuracy of your account information and for all
              activity that occurs under your account. Keep your login credentials secure.
            </p>

            <div className="text-sm font-semibold">Offers and deliverables</div>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Brands publish offers that define requirements, timelines, and usage rights.</li>
              <li>Creators who claim an offer agree to deliver the requested content by the due date.</li>
              <li>
                Frilpp is not a party to the agreement between brands and creators; we facilitate
                matching, tracking, and communication.
              </li>
              <li>
                Brands are responsible for product fulfillment, shipping details, and any applicable
                taxes or compliance.
              </li>
            </ul>

            <div className="text-sm font-semibold">Usage rights and content</div>
            <p className="text-muted-foreground">
              Creators retain ownership of their content. If an offer requires usage rights, the
              creator grants the brand the rights specified in the offer once consent is given. If
              usage rights are not granted, brands may not reuse creator content outside the
              platform.
            </p>

            <div className="text-sm font-semibold">Acceptable use</div>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>No fraud, impersonation, or manipulation of performance metrics.</li>
              <li>No harassment, abuse, or unlawful activity.</li>
              <li>No attempts to access accounts or data that are not yours.</li>
            </ul>

            <div className="text-sm font-semibold">Third-party services</div>
            <p className="text-muted-foreground">
              Frilpp integrates with third-party services (for example, Shopify, Instagram, and
              TikTok). Your use of those services is governed by their terms.
            </p>

            <div className="text-sm font-semibold">Termination</div>
            <p className="text-muted-foreground">
              We may suspend or terminate access if you violate these Terms or if required to
              protect the platform, users, or third parties.
            </p>

            <div className="text-sm font-semibold">Disclaimers and limitation of liability</div>
            <p className="text-muted-foreground">
              The service is provided on an &quot;as is&quot; and &quot;as available&quot; basis. To the maximum
              extent permitted by law, Frilpp disclaims all warranties and limits liability for
              indirect or consequential damages.
            </p>

            <div className="text-sm font-semibold">Changes to these terms</div>
            <p className="text-muted-foreground">
              We may update these Terms from time to time. Continued use of the service after
              changes become effective constitutes acceptance.
            </p>

            <div className="text-sm font-semibold">Contact</div>
            <p className="text-muted-foreground">
              Questions about these Terms? Email us at hello@frilpp.com.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

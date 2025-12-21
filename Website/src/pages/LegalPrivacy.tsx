import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const LegalPrivacy = () => {
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
              This policy explains what we collect and how we use it.
            </p>
          </div>
          <Link to="/">
            <Button variant="outline">Home</Button>
          </Link>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Privacy Policy</CardTitle>
            <CardDescription>How Frilpp handles your information.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm text-foreground">
            <p className="text-muted-foreground">
              We collect information to operate the Frilpp platform, verify deliverables, and
              provide analytics to brands. This policy describes the types of data we process.
            </p>

            <div className="text-sm font-semibold">Information we collect</div>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Account data: email, authentication tokens, and session identifiers.</li>
              <li>Creator profile data: name, shipping address, phone (optional), and country.</li>
              <li>
                Social account data (with your consent): username, follower count, and recent media
                metadata used for deliverable verification.
              </li>
              <li>Offer, match, and deliverable data used to operate the workflow.</li>
              <li>Click and conversion attribution data (for example, order totals).</li>
              <li>Usage data such as IP address, device data, and logs for security and rate limiting.</li>
            </ul>

            <div className="text-sm font-semibold">How we use information</div>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Operate the platform, including matching, shipping, and deliverable tracking.</li>
              <li>Verify required posts and enforce policy thresholds.</li>
              <li>Provide performance analytics and attribution to brands.</li>
              <li>Send transactional messages (for example, magic links and alerts).</li>
            </ul>

            <div className="text-sm font-semibold">Sharing</div>
            <p className="text-muted-foreground">
              We share data with service providers who help us run the platform (for example,
              email, SMS, analytics, hosting, and payment or commerce partners). We may also share
              information to comply with legal obligations or to protect the rights and safety of
              Frilpp and its users.
            </p>

            <div className="text-sm font-semibold">Data retention</div>
            <p className="text-muted-foreground">
              We retain data as long as your account is active or as needed to provide the service.
              You can request deletion by contacting us. Some information may be retained to comply
              with legal obligations or to resolve disputes.
            </p>

            <div className="text-sm font-semibold">International processing</div>
            <p className="text-muted-foreground">
              Frilpp currently serves users in the United States and India. If you use the service,
              you understand that your information may be processed in those countries.
            </p>

            <div className="text-sm font-semibold">Security</div>
            <p className="text-muted-foreground">
              OAuth tokens are stored encrypted at rest; access is limited to required services.
            </p>

            <div className="text-sm font-semibold">Your choices</div>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>Update or correct your profile information in your account settings.</li>
              <li>Opt out of marketing messages; transactional messages are still required.</li>
              <li>Request account deletion by emailing hello@frilpp.com.</li>
            </ul>

            <div className="text-sm font-semibold">Contact</div>
            <p className="text-muted-foreground">
              Questions about this policy? Email us at hello@frilpp.com.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LegalPrivacy;

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function BillingSuccessPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await props.searchParams) ?? {};
  const lane = sp.lane === "creator" ? "creator" : "brand";
  const next = lane === "creator" ? "/influencer/discover" : "/brand/offers";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-md px-4 py-10 md:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Billing</Badge>
          <Badge variant="success">Success</Badge>
        </div>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">You’re subscribed</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Thanks! You can now unlock full access in your lane.
        </p>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Next</CardTitle>
            <CardDescription>Continue to the app.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={next}>
              <Button className="w-full" variant="secondary">
                Continue
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


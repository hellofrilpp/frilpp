import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function BillingCancelPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await props.searchParams) ?? {};
  const lane = sp.lane === "creator" ? "creator" : "brand";
  const next = lane === "creator" ? "/influencer/billing" : "/brand/billing";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-md px-4 py-10 md:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Billing</Badge>
          <Badge variant="warning">Canceled</Badge>
        </div>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Checkout canceled</h1>
        <p className="mt-2 text-sm text-muted-foreground">No worries — you can try again anytime.</p>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Try again</CardTitle>
            <CardDescription>Return to billing.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={next}>
              <Button className="w-full" variant="secondary">
                Back to billing
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


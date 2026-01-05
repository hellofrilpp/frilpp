import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DataDeletionPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await props.searchParams) ?? {};
  const code = typeof sp.code === "string" ? sp.code : "unknown";
  const status = typeof sp.status === "string" ? sp.status : "deleted";
  const statusMessage =
    status === "deleted"
      ? "We have processed your data deletion request."
      : "We could not find any data for this account. If you believe this is an error, contact support.";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl px-4 py-12 md:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Data deletion request</CardTitle>
            <CardDescription>{statusMessage}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-md border bg-muted px-4 py-3 text-sm text-muted-foreground">
              Confirmation code: <span className="font-mono text-foreground">{code}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/">
                <Button variant="outline">Return home</Button>
              </Link>
              <a href="mailto:hello@frilpp.com">
                <Button variant="ghost">Contact support</Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

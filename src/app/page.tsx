import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 py-14 md:px-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Product seeding</Badge>
              <Badge variant="secondary">Shopify automation</Badge>
              <Badge variant="secondary">Meta verification</Badge>
              <Badge variant="secondary">US + India</Badge>
            </div>
            <h1 className="font-display text-5xl font-bold tracking-tight text-balance">
              A Tinder-like CRM for product seeding.
            </h1>
            <p className="max-w-2xl text-xl text-primary-foreground/90">
              Brands publish barter offers. Creators swipe to claim. We auto-create Shopify
              orders and verify deliverables using a unique campaign code in the caption.
            </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href="/onboarding">
                <Button size="lg" variant="secondary">
                  Get started
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">
                  Login
                </Button>
              </Link>
              <Link href="/brand/offers">
                <Button size="lg" variant="outline">
                  Offer library
                </Button>
              </Link>
              <Link href="/brand/offers/new">
                <Button size="lg" variant="outline">
                  New offer
                </Button>
              </Link>
              <Link href="/brand/analytics">
                <Button size="lg" variant="outline">
                  Analytics
                </Button>
              </Link>
              <Link href="/brand/matches">
                <Button size="lg" variant="outline">
                  Approvals
                </Button>
              </Link>
              <Link href="/influencer/feed">
                <Button size="lg" variant="outline">
                  View creator feed
                </Button>
              </Link>
              <Link href="/brand/settings/acceptance">
                <Button size="lg" variant="ghost" className="text-primary-foreground hover:text-primary-foreground">
                  Acceptance policy
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 md:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="transition-shadow hover:shadow-card-hover">
            <CardHeader>
              <CardTitle>Automation-first</CardTitle>
              <CardDescription>
                No spreadsheets: claim → order → shipment → verification → strikes.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge>Shopify draft orders</Badge>
              <Badge>Fulfillment webhooks</Badge>
              <Badge>Verification jobs</Badge>
            </CardContent>
          </Card>

          <Card className="transition-shadow hover:shadow-card-hover">
            <CardHeader>
              <CardTitle>Reliable verification</CardTitle>
              <CardDescription>
                Stories tag verification isn’t reliable via APIs, so enforcement uses caption
                codes on Reels/Feed.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge>Reels</Badge>
              <Badge>Feed posts</Badge>
              <Badge>Caption code</Badge>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t bg-background">
        <div className="container mx-auto flex flex-col items-start justify-between gap-3 px-4 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:px-8">
          <div>© {new Date().getFullYear()} Frilpp</div>
          <div className="flex flex-wrap gap-4">
            <Link className="underline" href="/legal/terms">
              Terms
            </Link>
            <Link className="underline" href="/legal/privacy">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

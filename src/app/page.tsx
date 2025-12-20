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

const pixelHeart = [
  "0011100",
  "0111110",
  "1111111",
  "1111111",
  "0111110",
  "0011100",
  "0001000",
];

const mosaicBlocks = [
  { className: "left-6 top-16 h-8 w-8 bg-primary/10", delay: "0s" },
  { className: "left-20 top-28 h-4 w-4 bg-accent/20", delay: "0.6s" },
  { className: "right-20 top-24 h-10 w-10 bg-primary/10", delay: "0.3s" },
  { className: "right-32 top-40 h-5 w-5 bg-accent/20", delay: "0.9s" },
  { className: "left-10 bottom-28 h-6 w-6 bg-accent/20", delay: "0.4s" },
  { className: "right-12 bottom-20 h-9 w-9 bg-primary/10", delay: "0.1s" },
];

const heroStats = [
  { label: "Publish time", value: "Under 2 minutes" },
  { label: "Auto-ship", value: "Shopify draft orders" },
  { label: "Verification", value: "Caption code checks" },
];

const queue = [
  { name: "Aisha", followers: "3.4k", status: "Active now" },
  { name: "Riya", followers: "2.2k", status: "Auto-accept" },
  { name: "Mina", followers: "4.8k", status: "Awaiting post" },
  { name: "Sana", followers: "1.9k", status: "Needs approval" },
];

const swipeOffers = [
  {
    title: "Free $50 skincare set",
    detail: "1 Reel + caption code",
    region: "US + India",
    followers: "2k+",
  },
  {
    title: "Coffee sampler pack",
    detail: "2 Stories + tag",
    region: "US",
    followers: "1k+",
  },
  {
    title: "Haircare trio",
    detail: "1 Feed post",
    region: "India",
    followers: "3k+",
  },
];

const workflow = [
  {
    title: "Publish",
    body: "Post barter offers with templates, thresholds, and auto-accept rules.",
    tags: ["Offer wizard", "Follower rule", "Usage rights"],
  },
  {
    title: "Ship",
    body: "Shopify draft order creation, tracking updates, and delivery reminders.",
    tags: ["Draft orders", "Tracking", "Reminders"],
  },
  {
    title: "Verify",
    body: "Reels and Feed verification with caption codes and strike enforcement.",
    tags: ["Meta API", "Caption code", "Strike policy"],
  },
];

const attributionStats = [
  { label: "Clicks", value: "142" },
  { label: "Orders", value: "19" },
  { label: "Revenue", value: "$1,420" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 hero-wash" />
        <div className="absolute inset-0 pixel-grid opacity-35" />
        <div className="absolute -top-24 right-10 h-60 w-60 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute bottom-0 left-16 h-52 w-52 rounded-full bg-primary/10 blur-3xl" />
        {mosaicBlocks.map((block) => (
          <span
            key={`${block.className}-${block.delay}`}
            aria-hidden
            className={`absolute hidden rounded-md md:block ${block.className} animate-pixel-flicker`}
            style={{ animationDelay: block.delay }}
          />
        ))}

        <div className="container relative mx-auto px-4 py-10 md:px-8 lg:py-16">
          <nav className="flex items-center justify-between text-xs font-mono uppercase tracking-[0.32em] text-foreground/70">
            <div className="flex items-center gap-3">
              <div className="grid grid-cols-7 gap-0.5 rounded-md border border-border bg-card p-2 shadow-sm">
                {pixelHeart.map((row, rowIdx) =>
                  row.split("").map((cell, colIdx) => (
                    <span
                      key={`${rowIdx}-${colIdx}`}
                      className={[
                        "block h-1.5 w-1.5",
                        cell === "1" ? "bg-accent" : "bg-transparent",
                      ].join(" ")}
                    />
                  )),
                )}
              </div>
              <span>Frilpp</span>
            </div>
            <div className="hidden items-center gap-4 md:flex">
              <Link className="underline underline-offset-4" href="/login">
                Login
              </Link>
              <Link className="underline underline-offset-4" href="/brand/offers/new">
                Brand
              </Link>
              <Link className="underline underline-offset-4" href="/influencer/feed">
                Creator
              </Link>
            </div>
          </nav>

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                <Badge variant="outline" className="border-border bg-card text-foreground">
                  Product seeding
                </Badge>
                <Badge variant="outline" className="border-border bg-card text-foreground">
                  Shopify automation
                </Badge>
                <Badge variant="outline" className="border-border bg-card text-foreground">
                  Meta verification
                </Badge>
              </div>

              <h1 className="font-display text-5xl font-bold tracking-tight text-balance md:text-6xl">
                A swipe-first CRM for product seeding.
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground md:text-xl">
                Launch barter offers, auto-ship with Shopify, and verify creator posts with unique
                campaign codes. Stop the spreadsheets and start scaling.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link href="/onboarding">
                  <Button size="lg">Get started</Button>
                </Link>
                <Link href="/brand/offers/new">
                  <Button size="lg" variant="outline">
                    Create an offer
                  </Button>
                </Link>
                <Link href="/brand/analytics">
                  <Button size="lg" variant="outline">
                    View attribution
                  </Button>
                </Link>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {heroStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-border bg-card/90 p-4 shadow-sm"
                  >
                    <div className="text-xs font-mono uppercase text-muted-foreground">
                      {stat.label}
                    </div>
                    <div className="mt-2 text-base font-semibold">{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-6 top-6 hidden h-12 w-12 rounded-xl border border-border bg-card shadow-sm lg:block" />
              <div className="absolute -right-6 bottom-10 hidden h-12 w-12 rounded-xl border border-border bg-card shadow-sm lg:block" />
              <div className="absolute -left-12 top-32 hidden text-5xl font-mono text-muted-foreground/30 lg:block">
                LIKE
              </div>
              <div className="absolute -right-10 bottom-12 hidden text-5xl font-mono text-muted-foreground/30 lg:block">
                SHIP
              </div>

              <div className="animate-fade-rise rounded-3xl border border-border bg-card/95 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.6)]">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">Live seeding room</Badge>
                  <div className="text-xs font-mono uppercase text-muted-foreground">
                    Auto-accept on
                  </div>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Rule: auto-approve creators with 2k+ followers, else brand review.
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                  <div className="rounded-2xl border border-border bg-background/80 p-4">
                    <div className="text-xs font-mono uppercase text-muted-foreground">
                      Creator card
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-accent/20" />
                      <div>
                        <div className="text-base font-semibold">Aisha, 3.4k followers</div>
                        <div className="text-xs text-muted-foreground">Beauty + wellness</div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full border border-border bg-card px-2 py-1">
                        US + India
                      </span>
                      <span className="rounded-full border border-border bg-card px-2 py-1">
                        Reels preferred
                      </span>
                      <span className="rounded-full border border-border bg-card px-2 py-1">
                        Usage rights granted
                      </span>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <Button size="sm">Claim</Button>
                      <Button size="sm" variant="outline">
                        Skip
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/80 p-4">
                    <div className="text-xs font-mono uppercase text-muted-foreground">Queue</div>
                    <div className="mt-4 space-y-3">
                      {queue.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm"
                        >
                          <div>
                            <div className="font-semibold">{item.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.followers} followers
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">{item.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-2 text-xs sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-background px-3 py-2 text-center">
                    142 clicks
                  </div>
                  <div className="rounded-lg border border-border bg-background px-3 py-2 text-center">
                    19 orders
                  </div>
                  <div className="rounded-lg border border-border bg-background px-3 py-2 text-center">
                    $1.4k revenue
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-border bg-card p-4 text-sm shadow-sm">
                  Attribution: clicks + Shopify discount codes tied to every claim.
                </div>
                <div className="rounded-2xl border border-border bg-card p-4 text-sm shadow-sm">
                  Comms automation: email, SMS, and WhatsApp reminders for shipping and posting.
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="space-y-16">
        <section className="container mx-auto px-4 py-12 md:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="relative h-[360px]">
              <div className="absolute left-4 top-6 h-72 w-60 -rotate-6 rounded-3xl border border-border bg-card p-4 shadow-lg transition-transform duration-300 hover:-translate-y-1">
                <div className="text-xs font-mono uppercase text-muted-foreground">Offer 01</div>
                <div className="mt-3 text-lg font-semibold">{swipeOffers[0].title}</div>
                <div className="mt-2 text-sm text-muted-foreground">{swipeOffers[0].detail}</div>
                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                  <div>Region: {swipeOffers[0].region}</div>
                  <div>Min followers: {swipeOffers[0].followers}</div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm">Claim</Button>
                  <Button size="sm" variant="outline">
                    Skip
                  </Button>
                </div>
              </div>
              <div className="absolute left-12 top-10 h-72 w-60 rounded-3xl border border-border bg-card p-4 shadow-md transition-transform duration-300 hover:-translate-y-1">
                <div className="text-xs font-mono uppercase text-muted-foreground">Offer 02</div>
                <div className="mt-3 text-lg font-semibold">{swipeOffers[1].title}</div>
                <div className="mt-2 text-sm text-muted-foreground">{swipeOffers[1].detail}</div>
                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                  <div>Region: {swipeOffers[1].region}</div>
                  <div>Min followers: {swipeOffers[1].followers}</div>
                </div>
              </div>
              <div className="absolute left-20 top-14 h-72 w-60 rotate-6 rounded-3xl border border-border bg-card p-4 shadow-xl transition-transform duration-300 hover:-translate-y-1 animate-float-slow">
                <div className="text-xs font-mono uppercase text-muted-foreground">Offer 03</div>
                <div className="mt-3 text-lg font-semibold">{swipeOffers[2].title}</div>
                <div className="mt-2 text-sm text-muted-foreground">{swipeOffers[2].detail}</div>
                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                  <div>Region: {swipeOffers[2].region}</div>
                  <div>Min followers: {swipeOffers[2].followers}</div>
                </div>
                <div className="mt-4 text-xs text-muted-foreground">Auto-accept enabled</div>
              </div>
            </div>

            <div className="space-y-5">
              <Badge variant="outline" className="border-border bg-card text-foreground">
                Swipe CRM
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight">
                Tinder-like claiming built for nano-creators.
              </h2>
              <p className="text-sm text-muted-foreground">
                Creators swipe to accept, brands stay in control with auto-accept thresholds and
                approval gates. Your team never touches a spreadsheet again.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-4 text-sm">
                  Auto-accept on follower count or engagement rate.
                </div>
                <div className="rounded-2xl border border-border bg-card p-4 text-sm">
                  Claims lock inventory and trigger Shopify orders instantly.
                </div>
                <div className="rounded-2xl border border-border bg-card p-4 text-sm">
                  Creator strike system keeps your seeding pipeline clean.
                </div>
                <div className="rounded-2xl border border-border bg-card p-4 text-sm">
                  Stories are best-effort, Reels and Feed are verified.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-secondary/70">
          <div className="container mx-auto px-4 py-12 md:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <Badge variant="outline" className="border-border bg-card text-foreground">
                  Workflow
                </Badge>
                <h2 className="mt-3 text-3xl font-bold tracking-tight">
                  Publish, ship, verify. All in one board.
                </h2>
              </div>
              <Link href="/brand/offers">
                <Button variant="outline">Explore offers</Button>
              </Link>
            </div>

            <div className="relative mt-8 grid gap-6 lg:grid-cols-3">
              <div className="pointer-events-none absolute -left-8 top-6 hidden text-5xl font-mono text-muted-foreground/30 lg:block">
                PUBLISH
              </div>
              <div className="pointer-events-none absolute right-8 top-24 hidden text-5xl font-mono text-muted-foreground/30 lg:block">
                VERIFY
              </div>
              {workflow.map((item) => (
                <Card key={item.title} className="border-border bg-card shadow-sm">
                  <CardHeader>
                    <CardTitle>{item.title}</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {item.body}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {item.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="border-border bg-card text-foreground">
                        {tag}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12 md:px-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <Badge variant="outline" className="border-border bg-card text-foreground">
                Attribution
              </Badge>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">
                Track what actually converts.
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Every claim gets a unique campaign code. We track clicks through the share link and
                attribute Shopify orders using discount codes or campaign IDs.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Badge variant="outline" className="border-border bg-card text-foreground">
                  Click tracking
                </Badge>
                <Badge variant="outline" className="border-border bg-card text-foreground">
                  Discount attribution
                </Badge>
                <Badge variant="outline" className="border-border bg-card text-foreground">
                  Revenue and EPC
                </Badge>
              </div>
            </div>
            <div className="grid gap-4">
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="text-xs uppercase text-muted-foreground">Offer performance</div>
                <div className="mt-3 grid gap-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">GlowBar seeding</span>
                    <span className="font-mono text-muted-foreground">FRILP-A1B2C3</span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {attributionStats.map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-lg border border-border bg-background p-3"
                      >
                        <div className="text-xs text-muted-foreground">{stat.label}</div>
                        <div className="text-lg font-semibold">{stat.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="text-xs uppercase text-muted-foreground">Compliance ready</div>
                <div className="mt-2 text-sm text-muted-foreground">
                  Terms and privacy acceptance are enforced. Instagram access is explicit and
                  logged for every creator.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-16 md:px-8">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-sm md:p-12">
            <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-center">
              <div>
                <Badge variant="outline" className="border-border bg-card text-foreground">
                  Ready to ship
                </Badge>
                <h2 className="mt-3 text-3xl font-bold tracking-tight">
                  World-class seeding without agency fees.
                </h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  Build your creator flywheel with automation, verified deliverables, and revenue
                  attribution baked in.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Link href="/onboarding">
                  <Button size="lg">Start onboarding</Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline">
                    Sign in
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background">
        <div className="container mx-auto flex flex-col items-start justify-between gap-3 px-4 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:px-8">
          <div>© {new Date().getFullYear()} Frilpp</div>
          <div className="flex flex-wrap gap-4">
            <Link className="underline underline-offset-4" href="/legal/terms">
              Terms
            </Link>
            <Link className="underline underline-offset-4" href="/legal/privacy">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

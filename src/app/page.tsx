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
  { label: "On-time posts", value: "92%" },
  { label: "Seeding ROI", value: "4.6x" },
  { label: "Hours saved weekly", value: "6" },
];

const leaderboard = [
  { name: "Aisha", badge: "Top creator", detail: "3.4k followers" },
  { name: "Riya", badge: "Fastest post", detail: "2.2k followers" },
  { name: "Mina", badge: "Best CTR", detail: "4.8k followers" },
  { name: "Sana", badge: "Rising star", detail: "1.9k followers" },
];

const offerCards = [
  {
    title: "Free $50 skincare set",
    detail: "1 Reel + tag",
    region: "US + India",
    followers: "2k+",
  },
  {
    title: "Coffee sampler pack",
    detail: "2 Stories",
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

const creatorHighlights = [
  {
    title: "Get featured",
    body: "Leaderboards and streaks keep your name in front of brands.",
  },
  {
    title: "Claim drops fast",
    body: "Swipe to accept the deals you want. No awkward DMs.",
  },
  {
    title: "Build status",
    body: "Consistent posts unlock priority offers and faster approvals.",
  },
  {
    title: "Shipments handled",
    body: "Brands auto-ship so you can focus on content.",
  },
];

const brandHighlights = [
  {
    title: "Launch in minutes",
    body: "Post a deal once. Creators start claiming right away.",
  },
  {
    title: "Spend stays low",
    body: "No agency fees. Pay in product and track ROI.",
  },
  {
    title: "Verified posts",
    body: "Know who delivered and who did not without chasing.",
  },
  {
    title: "See what sells",
    body: "Track orders per creator and repeat the winners.",
  },
];

const workflow = [
  {
    title: "Post offers fast",
    body: "Drop a deal, set your auto-accept rule, and go live.",
    tags: ["One minute setup", "Auto-accept", "Usage rights"],
  },
  {
    title: "Ship without chasing",
    body: "Orders go out on autopilot with delivery nudges built in.",
    tags: ["Auto-ship", "Tracking", "Reminders"],
  },
  {
    title: "Get proof, not excuses",
    body: "Verified posts and strike rules keep the pipeline clean.",
    tags: ["Verified posts", "Strike rules", "Disputes"],
  },
];

const founderMetrics = [
  { label: "Cost per verified post", value: "$18" },
  { label: "Time saved per week", value: "6 hours" },
  { label: "Repeat creator rate", value: "61%" },
];

const offerPerformance = [
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

        <div className="container relative mx-auto px-4 py-8 md:px-8 lg:py-14">
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

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                <Badge variant="outline" className="border-border bg-card text-foreground">
                  For creators
                </Badge>
                <Badge variant="outline" className="border-border bg-card text-foreground">
                  For small brands
                </Badge>
                <Badge variant="outline" className="border-border bg-card text-foreground">
                  Free product drops
                </Badge>
              </div>

              <h1 className="font-display text-5xl font-bold tracking-tight text-balance md:text-6xl">
                Make creators feel famous. Make founders feel in control.
              </h1>
              <p className="max-w-2xl text-lg text-muted-foreground md:text-xl">
                Frilpp is the swipe-first seeding marketplace. Creators claim drops and build
                status. Brands ship fast and see what sells.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link href="/influencer/feed">
                  <Button size="lg">Join as creator</Button>
                </Link>
                <Link href="/brand/offers/new">
                  <Button size="lg" variant="outline">
                    Start as brand
                  </Button>
                </Link>
                <Link href="/brand/offers">
                  <Button size="lg" variant="outline">
                    Browse offers
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
              <div className="absolute -left-10 top-16 hidden text-5xl font-mono text-muted-foreground/30 lg:block">
                CLAIM
              </div>
              <div className="absolute -right-10 bottom-20 hidden text-5xl font-mono text-muted-foreground/30 lg:block">
                SELL
              </div>

              <div className="rounded-[32px] border border-border bg-card shadow-[0_30px_70px_-45px_rgba(15,23,42,0.65)]">
                <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-xs text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full bg-danger/40" />
                  <span className="h-2.5 w-2.5 rounded-full bg-warning/40" />
                  <span className="h-2.5 w-2.5 rounded-full bg-success/40" />
                  <span className="ml-auto font-mono uppercase tracking-widest">frilpp</span>
                </div>
                <div className="relative hero-browser p-6">
                  <span className="absolute left-6 top-6 hero-ghost font-mono">FAME</span>
                  <span className="absolute right-6 top-10 hero-ring animate-float-slow" />
                  <div className="hero-word">CLAIM</div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Claim drops, build streaks, and keep your name in the room.
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border bg-card/90 p-4 shadow-sm">
                      <div className="text-xs font-mono uppercase text-muted-foreground">
                        Creator streak
                      </div>
                      <div className="mt-2 text-lg font-semibold">5 weeks</div>
                      <div className="text-xs text-muted-foreground">
                        Priority offers unlocked
                      </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-card/90 p-4 shadow-sm">
                      <div className="text-xs font-mono uppercase text-muted-foreground">
                        Brand lift
                      </div>
                      <div className="mt-2 text-lg font-semibold">+32% orders</div>
                      <div className="text-xs text-muted-foreground">
                        Top creator week
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-border bg-background/90 p-4">
                    <div className="flex items-center justify-between text-xs uppercase text-muted-foreground">
                      <span>Creator leaderboard</span>
                      <span>Weekly highlights</span>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {leaderboard.map((creator) => (
                        <div
                          key={creator.name}
                          className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm"
                        >
                          <div>
                            <div className="font-semibold">{creator.name}</div>
                            <div className="text-xs text-muted-foreground">{creator.detail}</div>
                          </div>
                          <span className="text-xs text-muted-foreground">{creator.badge}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="space-y-12">
        <section className="border-y border-border bg-card/80">
          <div className="container mx-auto flex flex-wrap items-center gap-4 px-4 py-4 text-xs text-muted-foreground md:px-8">
            <span className="font-mono uppercase tracking-widest text-foreground/70">
              Live feed
            </span>
            <span>Aisha claimed GlowBar · 2 minutes ago</span>
            <span>3 creators shipped today</span>
            <span>12 posts verified this week</span>
            <span>US + India offers open</span>
          </div>
        </section>

        <section className="container mx-auto px-4 py-10 md:px-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="border-border bg-card text-foreground">
                  Creator lane
                </Badge>
                <span className="text-xs font-mono uppercase text-muted-foreground">
                  Swipe to claim
                </span>
              </div>
              <div className="mt-5 grid gap-4">
                {offerCards.map((offer, index) => (
                  <div
                    key={offer.title}
                    className={`rounded-2xl border border-border bg-background p-4 shadow-sm ${
                      index === 0 ? "animate-fade-rise" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">{offer.title}</span>
                      <span className="text-xs text-muted-foreground">{offer.region}</span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">{offer.detail}</div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Min followers: {offer.followers}</span>
                      <span>Auto-accept</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <Badge variant="outline" className="border-border bg-card text-foreground">
                Creators get the spotlight
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight">
                Designed to boost your status.
              </h2>
              <p className="text-sm text-muted-foreground">
                Build streaks, climb leaderboards, and get your name in front of brands who ship.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {creatorHighlights.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-border bg-card p-4 text-sm">
                    <div className="font-semibold">{item.title}</div>
                    <div className="mt-2 text-xs text-muted-foreground">{item.body}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-secondary/70">
          <div className="container mx-auto px-4 py-10 md:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <Badge variant="outline" className="border-border bg-card text-foreground">
                  Brand lane
                </Badge>
                <h2 className="mt-3 text-3xl font-bold tracking-tight">
                  Small brands, big seeding energy.
                </h2>
              </div>
              <Link href="/brand/offers">
                <Button variant="outline">Explore offers</Button>
              </Link>
            </div>

            <div className="relative mt-6 grid gap-5 lg:grid-cols-3">
              <div className="pointer-events-none absolute -left-8 top-6 hidden text-5xl font-mono text-muted-foreground/30 lg:block">
                POST
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

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {brandHighlights.map((item) => (
                <div key={item.title} className="rounded-2xl border border-border bg-card p-4 text-sm shadow-sm">
                  <div className="font-semibold">{item.title}</div>
                  <div className="mt-2 text-xs text-muted-foreground">{item.body}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-10 md:px-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <Badge variant="outline" className="border-border bg-card text-foreground">
                Business outcomes
              </Badge>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">
                Know which creators move product.
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Track revenue per creator and see which offers actually sell. Simple, clear, and
                built for busy founders.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Badge variant="outline" className="border-border bg-card text-foreground">
                  Creator ROI
                </Badge>
                <Badge variant="outline" className="border-border bg-card text-foreground">
                  Revenue per post
                </Badge>
                <Badge variant="outline" className="border-border bg-card text-foreground">
                  Repeat creator rate
                </Badge>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {founderMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-2xl border border-border bg-card p-4 text-sm shadow-sm"
                  >
                    <div className="text-xs uppercase text-muted-foreground">{metric.label}</div>
                    <div className="mt-2 text-base font-semibold">{metric.value}</div>
                  </div>
                ))}
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
                    {offerPerformance.map((stat) => (
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
                <div className="text-xs uppercase text-muted-foreground">Founder shortcuts</div>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                    <span>Creators auto-approved over 2k</span>
                    <span className="font-semibold text-foreground">On</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                    <span>Automated fulfillment</span>
                    <span className="font-semibold text-foreground">Live</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                    <span>Reminders and strike rules</span>
                    <span className="font-semibold text-foreground">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-12 md:px-8">
          <div className="rounded-3xl border border-border bg-card p-8 shadow-sm md:p-12">
            <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-center">
              <div>
                <Badge variant="outline" className="border-border bg-card text-foreground">
                  Ready to ship
                </Badge>
                <h2 className="mt-3 text-3xl font-bold tracking-tight">
                  Seeding made simple for both sides.
                </h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  Creators build clout. Brands get customers. Frilpp keeps the process fast,
                  clean, and repeatable.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Link href="/influencer/feed">
                  <Button size="lg">Join as creator</Button>
                </Link>
                <Link href="/brand/offers/new">
                  <Button size="lg" variant="outline">
                    Start as brand
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

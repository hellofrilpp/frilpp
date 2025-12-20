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

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f6f1e7] text-[#111111]">
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-70 pixel-grid" />
        <div className="absolute -top-16 -right-10 h-40 w-40 rounded-3xl bg-[#ff9bb0]/40 blur-2xl" />
        <div className="absolute bottom-0 left-8 h-40 w-40 rounded-3xl bg-[#ff9bb0]/30 blur-2xl" />

        <div className="container relative mx-auto px-4 py-12 md:px-8 lg:py-20">
          <nav className="flex items-center justify-between text-xs font-mono uppercase tracking-[0.32em] text-[#222222]">
            <div className="flex items-center gap-3">
              <div className="grid grid-cols-7 gap-0.5 rounded-md border border-[#111111] bg-white/60 p-2">
                {pixelHeart.map((row, rowIdx) =>
                  row.split("").map((cell, colIdx) => (
                    <span
                      key={`${rowIdx}-${colIdx}`}
                      className={[
                        "block h-1.5 w-1.5",
                        cell === "1" ? "bg-[#ff6f8e]" : "bg-transparent",
                      ].join(" ")}
                    />
                  )),
                )}
              </div>
              <span>FRILPP</span>
            </div>
            <div className="hidden items-center gap-3 md:flex">
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

          <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#444444]">
                <Badge variant="outline" className="border-[#111111] bg-white/70 text-[#111111]">
                  Product seeding
                </Badge>
                <Badge variant="outline" className="border-[#111111] bg-white/70 text-[#111111]">
                  Shopify automation
                </Badge>
                <Badge variant="outline" className="border-[#111111] bg-white/70 text-[#111111]">
                  Meta verification
                </Badge>
              </div>

              <h1 className="font-display text-5xl font-bold tracking-tight text-balance md:text-6xl">
                Tinder-like seeding CRM built for small brands.
              </h1>
              <p className="max-w-2xl text-lg text-[#333333] md:text-xl">
                Post barter offers, ship automatically via Shopify, and verify creator posts with
                a unique campaign code. No spreadsheets. No ghosting.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link href="/onboarding">
                  <Button
                    size="lg"
                    className="border-2 border-[#111111] bg-[#ff9bb0] text-[#111111] hover:bg-[#ff7f9d]"
                  >
                    Get started
                  </Button>
                </Link>
                <Link href="/brand/offers/new">
                  <Button
                    size="lg"
                    className="border-2 border-[#111111] bg-white text-[#111111] hover:bg-[#fff4e9]"
                    variant="outline"
                  >
                    Create an offer
                  </Button>
                </Link>
                <Link href="/brand/analytics">
                  <Button size="lg" variant="outline" className="border-2 border-[#111111]">
                    Attribution
                  </Button>
                </Link>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {[
                  { label: "Publish time", value: "Under 2 minutes" },
                  { label: "Auto-ship", value: "Shopify draft orders" },
                  { label: "Verification", value: "Reels / Feed caption codes" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border-2 border-[#111111] bg-white/80 p-4 shadow-[6px_6px_0_rgba(17,17,17,0.12)]"
                  >
                    <div className="text-xs font-mono uppercase text-[#555555]">{stat.label}</div>
                    <div className="mt-2 text-base font-semibold">{stat.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-6 top-8 h-12 w-12 rounded-md bg-[#ff9bb0]" />
              <div className="absolute -right-6 bottom-8 h-12 w-12 rounded-md bg-[#ff9bb0]" />

              <div className="animate-fade-rise rounded-3xl border-2 border-[#111111] bg-[#fff8ee] p-6 shadow-[12px_12px_0_rgba(17,17,17,0.16)]">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="border-[#111111] bg-white/70 text-[#111111]">
                    Live offer
                  </Badge>
                  <div className="text-xs font-mono uppercase text-[#444444]">Auto-accept</div>
                </div>
                <h3 className="mt-4 text-xl font-semibold">Free $50 skincare set for 1 Reel</h3>
                <p className="mt-2 text-sm text-[#555555]">
                  Ships in 24h · US + India · Due 7 days after delivery
                </p>

                <div className="mt-5 grid gap-3 text-xs">
                  <div className="rounded-xl border border-[#111111]/30 bg-white p-3">
                    Step 1: Creator swipes and accepts
                  </div>
                  <div className="rounded-xl border border-[#111111]/30 bg-white p-3">
                    Step 2: Shopify order created + tracking sent
                  </div>
                  <div className="rounded-xl border border-[#111111]/30 bg-white p-3">
                    Step 3: Caption code verified, strike if missed
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg border border-[#111111]/30 bg-white px-3 py-2 text-center">
                    142 clicks
                  </div>
                  <div className="rounded-lg border border-[#111111]/30 bg-white px-3 py-2 text-center">
                    19 orders
                  </div>
                  <div className="rounded-lg border border-[#111111]/30 bg-white px-3 py-2 text-center">
                    $1.4k revenue
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border-2 border-[#111111] bg-white/80 p-4 text-sm shadow-[6px_6px_0_rgba(17,17,17,0.12)]">
                  ROI tracking: clicks + Shopify discount attribution
                </div>
                <div className="rounded-2xl border-2 border-[#111111] bg-white/80 p-4 text-sm shadow-[6px_6px_0_rgba(17,17,17,0.12)]">
                  Comms automation: email + SMS + WhatsApp reminders
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="space-y-16">
        <section className="container mx-auto px-4 py-12 md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <Badge variant="outline" className="border-[#111111] bg-white/70 text-[#111111]">
                Workflow
              </Badge>
              <h2 className="mt-3 text-3xl font-bold tracking-tight">
                From offer to verified content
              </h2>
            </div>
            <Link href="/brand/offers">
              <Button variant="outline" className="border-2 border-[#111111]">
                Explore offers
              </Button>
            </Link>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {[
              {
                title: "Publish",
                body: "Pick a template, select Shopify products, and set auto-accept rules.",
                tags: ["Offer wizard", "Followers threshold"],
              },
              {
                title: "Ship",
                body: "Auto-create draft orders and track fulfillment in a single queue.",
                tags: ["Shopify order", "Tracking updates"],
              },
              {
                title: "Verify",
                body: "Caption codes verify Reels/Feed. Missed deliverables get strikes.",
                tags: ["Meta API", "Strike policy"],
              },
            ].map((item) => (
              <Card
                key={item.title}
                className="border-2 border-[#111111] bg-white/80 shadow-[6px_6px_0_rgba(17,17,17,0.12)]"
              >
                <CardHeader>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription className="text-[#555555]">{item.body}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {item.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="border-[#111111] bg-white text-[#111111]">
                      {tag}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="bg-[#efe7d8]">
          <div className="container mx-auto px-4 py-12 md:px-8">
            <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
              <div>
                <Badge variant="outline" className="border-[#111111] bg-white/70 text-[#111111]">
                  Attribution
                </Badge>
                <h2 className="mt-3 text-3xl font-bold tracking-tight">
                  Track what actually converts
                </h2>
                <p className="mt-3 text-sm text-[#555555]">
                  Every match generates a unique campaign code. Frilpp tracks clicks through the
                  share link and attributes Shopify orders using that code.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-[#111111] bg-white text-[#111111]">
                    Click tracking
                  </Badge>
                  <Badge variant="outline" className="border-[#111111] bg-white text-[#111111]">
                    Discount attribution
                  </Badge>
                  <Badge variant="outline" className="border-[#111111] bg-white text-[#111111]">
                    Revenue + EPC
                  </Badge>
                </div>
              </div>
              <div className="grid gap-4">
                <div className="rounded-2xl border-2 border-[#111111] bg-white/80 p-5 shadow-[6px_6px_0_rgba(17,17,17,0.12)]">
                  <div className="text-xs uppercase text-[#666666]">Offer performance</div>
                  <div className="mt-3 grid gap-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">GlowBar seeding</span>
                      <span className="font-mono text-[#777777]">FRILP-A1B2C3</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div className="rounded-lg border border-[#111111]/30 bg-[#fef9f0] p-3">
                        <div className="text-xs text-[#666666]">Clicks</div>
                        <div className="text-lg font-semibold">142</div>
                      </div>
                      <div className="rounded-lg border border-[#111111]/30 bg-[#fef9f0] p-3">
                        <div className="text-xs text-[#666666]">Orders</div>
                        <div className="text-lg font-semibold">19</div>
                      </div>
                      <div className="rounded-lg border border-[#111111]/30 bg-[#fef9f0] p-3">
                        <div className="text-xs text-[#666666]">Revenue</div>
                        <div className="text-lg font-semibold">$1,420</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border-2 border-[#111111] bg-white/80 p-5 shadow-[6px_6px_0_rgba(17,17,17,0.12)]">
                  <div className="text-xs uppercase text-[#666666]">Compliance ready</div>
                  <div className="mt-2 text-sm text-[#555555]">
                    Terms + privacy acceptance are enforced. Instagram access is explicit and logged.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 pb-16 md:px-8">
          <div className="rounded-3xl border-2 border-[#111111] bg-white/80 p-8 shadow-[8px_8px_0_rgba(17,17,17,0.12)] md:p-12">
            <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-center">
              <div>
                <Badge variant="outline" className="border-[#111111] bg-white text-[#111111]">
                  Ready to ship
                </Badge>
                <h2 className="mt-3 text-3xl font-bold tracking-tight">
                  World-class seeding without agency fees
                </h2>
                <p className="mt-3 text-sm text-[#555555]">
                  Build your creator flywheel with automation, verified deliverables, and revenue
                  attribution baked in.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Link href="/onboarding">
                  <Button size="lg" className="border-2 border-[#111111] bg-[#ff9bb0] text-[#111111] hover:bg-[#ff7f9d]">
                    Start onboarding
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="border-2 border-[#111111]">
                    Sign in
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#111111] bg-[#f6f1e7]">
        <div className="container mx-auto flex flex-col items-start justify-between gap-3 px-4 py-6 text-sm text-[#555555] md:flex-row md:items-center md:px-8">
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

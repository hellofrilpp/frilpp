"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type OfferCard } from "@/lib/demo-data";
import { formatUsageRightsScope } from "@/lib/usage-rights";

function deliverableLabel(deliverable: OfferCard["deliverable"]) {
  if (deliverable === "REELS") return "Reel";
  if (deliverable === "FEED") return "Feed post";
  return "UGC only";
}

function formatDistance(distance: number | null | undefined, unit: OfferCard["unit"] | undefined) {
  if (distance === null || distance === undefined) return null;
  if (!Number.isFinite(distance)) return null;
  const u = unit === "KM" ? "km" : "mi";
  if (distance < 0.1) return `<0.1 ${u}`;
  return `${Math.round(distance * 10) / 10} ${u}`;
}

function formatFulfillment(current: OfferCard | null) {
  if (!current) return null;
  if (current.fulfillmentType === "SHOPIFY") return "Shipping";
  if (current.fulfillmentType === "MANUAL") {
    if (current.manualFulfillmentMethod === "LOCAL_DELIVERY") return "Local delivery";
    if (current.manualFulfillmentMethod === "PICKUP") return "Pickup";
    return "Manual";
  }
  return null;
}

export default function InfluencerFeedPage() {
  const [offers, setOffers] = useState<OfferCard[]>([]);
  const [index, setIndex] = useState(0);
  const [acceptedIds, setAcceptedIds] = useState<string[]>([]);
  const [skippedIds, setSkippedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [source, setSource] = useState<"db" | "demo">("db");
  const [claimMessage, setClaimMessage] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [gate, setGate] = useState<
    | null
    | { type: "login"; message: string }
    | { type: "onboarding"; message: string }
    | { type: "blocked"; message: string }
  >(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/billing/status");
        const data = (await res.json().catch(() => null)) as
          | { ok: true; creator: { subscribed: boolean } | null }
          | { ok: false };
        if (cancelled) return;
        if (res.ok && data && "ok" in data && data.ok === true) {
          setIsSubscribed(Boolean(data.creator?.subscribed));
        } else {
          setIsSubscribed(null);
        }
      } catch {
        if (!cancelled) setIsSubscribed(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/creator/feed", { method: "GET" });
        const data = (await res.json().catch(() => null)) as
          | { ok: true; offers: OfferCard[]; blocked?: boolean; reason?: string }
          | { ok: false; error?: string; code?: string };

        if (!res.ok) {
          if (res.status === 401) {
            setGate({ type: "login", message: "Login required to claim offers." });
          } else if (res.status === 409) {
            setGate({
              type: "onboarding",
              message: "Create your creator profile to see eligible offers.",
            });
          } else {
            setGate({ type: "onboarding", message: "Unable to load offers." });
          }
          setOffers([]);
          setSource("db");
          setIndex(0);
          setAcceptedIds([]);
          setSkippedIds([]);
          return;
        }

        if (!data || !("ok" in data) || data.ok !== true) return;
        if (cancelled) return;
        if ("blocked" in data && data.blocked) {
          setGate({
            type: "blocked",
            message:
              typeof data.reason === "string" ? data.reason : "You’re not eligible right now.",
          });
          setOffers([]);
          setSource("db");
          setIndex(0);
          setAcceptedIds([]);
          setSkippedIds([]);
          return;
        }

        setGate(null);
        setOffers(data.offers);
        setSource("db");
        setIndex(0);
        setAcceptedIds([]);
        setSkippedIds([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const current = offers[index] ?? null;
  const remaining = Math.max(0, offers.length - index);
  const distanceLabel = useMemo(
    () => formatDistance(current?.distance ?? null, current?.unit),
    [current?.distance, current?.unit],
  );
  const radiusLabel = useMemo(
    () => formatDistance(current?.locationRadius ?? null, current?.unit),
    [current?.locationRadius, current?.unit],
  );
  const fulfillmentLabel = useMemo(() => formatFulfillment(current), [current]);

  const summary = useMemo(
    () => ({
      accepted: acceptedIds.length,
      skipped: skippedIds.length,
    }),
    [acceptedIds.length, skippedIds.length],
  );

  function onAccept() {
    if (!current) return;
    if (isSubscribed === false) {
      setClaimMessage("Subscription required to claim offers. Go to Billing to subscribe.");
      return;
    }
    (async () => {
      try {
        setClaimMessage(null);
        const res = await fetch(`/api/creator/offers/${encodeURIComponent(current.id)}/claim`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = (await res.json().catch(() => null)) as
          | {
              ok: true;
              match: {
                id: string;
                status: string;
                campaignCode: string;
                shareUrlPath: string;
                discountCreated?: boolean;
                orderCreated?: boolean;
              };
            }
          | { ok: false; error?: string; code?: string };
        if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
          const code = data && "code" in data && typeof data.code === "string" ? data.code : null;
          const msg =
            data && "error" in data && typeof data.error === "string"
              ? data.error
              : "Claim failed";
          if (res.status === 402 && code === "PAYWALL") {
            throw new Error("Subscription required to claim offers. Go to Billing to subscribe.");
          }
          if (code === "NEEDS_LOCATION") {
            throw new Error(`${msg}. Go to Profile → set your location and try again.`);
          }
          if (code === "NEEDS_ADDRESS") {
            throw new Error(`${msg}. Go to Profile → add your delivery address and try again.`);
          }
          throw new Error(msg);
        }
        setClaimMessage(
          `Claimed (${data.match.status}). Code: ${data.match.campaignCode}. Link: ${data.match.shareUrlPath}. Discount: ${
            data.match.discountCreated ? "created" : "not created"
          }. Order: ${data.match.orderCreated ? "created" : "pending"}.`,
        );
        setAcceptedIds((ids) => [...ids, current.id]);
        setIndex((i) => i + 1);
      } catch (err) {
        setClaimMessage(err instanceof Error ? err.message : "Claim failed");
      }
    })();
  }

  function onSkip() {
    if (!current) return;
    setSkippedIds((ids) => [...ids, current.id]);
    setIndex((i) => i + 1);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 md:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Creator</Badge>
              <Badge variant="secondary">Swipe feed</Badge>
              <Badge variant="secondary">US + India</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
              Claim offers
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Swipe to claim. Some posting offers require a connected social account for verification.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/influencer/settings">
              <Button variant="secondary">Profile</Button>
            </Link>
            <Link href="/influencer/billing">
              <Button variant="outline">Billing</Button>
            </Link>
            <Link href="/influencer/deals">
              <Button variant="outline">Deals</Button>
            </Link>
            <Link href="/influencer/deliverables">
              <Button variant="outline">Deliverables</Button>
            </Link>
            <Link href="/influencer/performance">
              <Button variant="outline">Performance</Button>
            </Link>
            <Link href="/influencer/achievements">
              <Button variant="outline">Achievements</Button>
            </Link>
            <Link href="/onboarding">
              <Button variant="outline">Onboarding</Button>
            </Link>
            <Link href="/">
              <Button variant="outline">Home</Button>
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-[1fr_320px]">
          <Card>
            {current ? (
              <>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-xl">{current.brandName}</CardTitle>
                      <CardDescription>{current.title}</CardDescription>
                    </div>
                    <Badge variant="secondary">${current.valueUsd} value</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {claimMessage ? (
                    <div className="mb-4 rounded-lg border bg-muted p-3 text-xs text-muted-foreground">
                      {claimMessage}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Badge>Deliverable: {deliverableLabel(current.deliverable)}</Badge>
                    <Badge>Due: {current.deadlineDaysAfterDelivery}d after delivery</Badge>
                    <Badge>Countries: {current.countriesAllowed.join(", ")}</Badge>
                    {distanceLabel ? <Badge variant="secondary">Distance: {distanceLabel}</Badge> : null}
                    {radiusLabel ? <Badge variant="secondary">Local radius: {radiusLabel}</Badge> : null}
                    {fulfillmentLabel ? (
                      <Badge variant="secondary">Fulfillment: {fulfillmentLabel}</Badge>
                    ) : null}
                    {current.usageRightsRequired ? (
                      <Badge variant="secondary">
                        Usage rights: {formatUsageRightsScope(current.usageRightsScope)}
                      </Badge>
                    ) : null}
                  </div>
                  {current.manualFulfillmentNotes ? (
                    <div className="mt-3 rounded-lg border bg-muted p-3 text-xs text-muted-foreground">
                      Instructions: {current.manualFulfillmentNotes}
                    </div>
                  ) : null}

                  <div className="mt-5 rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
                    You’ll get a unique code + share link after claiming. Put the code in your caption
                    so brands can verify the post and track redemptions.
                  </div>

                  <div className="mt-6 flex gap-3">
                    <Button variant="outline" onClick={onSkip}>
                      Skip
                    </Button>
                    {isSubscribed === false ? (
                      <Link href="/influencer/billing">
                        <Button variant="secondary">Subscribe to claim</Button>
                      </Link>
                    ) : (
                      <Button onClick={onAccept}>Claim</Button>
                    )}
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="py-12 text-center">
                <div className="font-display text-lg font-bold">
                  {gate ? "Action required" : "You’re done for now"}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {gate
                    ? gate.message
                    : `Accepted ${summary.accepted}, skipped ${summary.skipped}.`}
                </p>
                <div className="mt-6 flex justify-center">
                  {gate?.type === "login" ? (
                    <Link href="/influencer/auth">
                      <Button variant="secondary">Login</Button>
                    </Link>
                  ) : gate?.type === "onboarding" ? (
                    <Link href="/onboarding">
                      <Button variant="secondary">Go to onboarding</Button>
                    </Link>
                  ) : gate?.type === "blocked" ? (
                    <Link href="/influencer/deliverables">
                      <Button variant="secondary">View deliverables</Button>
                    </Link>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setIndex(0);
                        setAcceptedIds([]);
                        setSkippedIds([]);
                      }}
                    >
                      Restart
                    </Button>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Session</CardTitle>
              <CardDescription>
                {isLoading ? "Loading..." : source === "db" ? "Live" : "Demo data"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Remaining</span>
                  <span className="font-mono">{remaining}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Claimed</span>
                  <span className="font-mono">{summary.accepted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Skipped</span>
                  <span className="font-mono">{summary.skipped}</span>
                </div>
              </div>

              <div className="mt-6 text-xs leading-5 text-muted-foreground">
                Next: connect Meta OAuth, filter by country, and enforce strike policy.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

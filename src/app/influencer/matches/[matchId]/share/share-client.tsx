"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ShareKit = {
  match: { id: string; status: string; campaignCode: string };
  offer: {
    id: string;
    title: string;
    deliverableType: string;
    platforms: Array<"INSTAGRAM" | "TIKTOK" | "YOUTUBE">;
    fulfillmentType: "SHOPIFY" | "MANUAL" | null;
    manualFulfillmentMethod: "PICKUP" | "LOCAL_DELIVERY" | null;
    manualFulfillmentNotes: string | null;
    ctaUrl: string | null;
  };
  brand: { name: string; instagramHandle: string | null; address: string | null; mapsUrl: string | null; website: string | null };
  deliverable: { status: string | null; dueAt: string } | null;
  shareUrl: string;
  caption: string;
};

function deliverableLabel(deliverableType: string) {
  if (deliverableType === "REELS") return "Reel";
  if (deliverableType === "FEED") return "Feed post";
  if (deliverableType === "UGC_ONLY") return "UGC only";
  return deliverableType;
}

function fulfillmentLabel(kit: ShareKit) {
  if (kit.offer.fulfillmentType === "SHOPIFY") return "Shipping";
  if (kit.offer.fulfillmentType === "MANUAL") {
    if (kit.offer.manualFulfillmentMethod === "LOCAL_DELIVERY") return "Local delivery";
    if (kit.offer.manualFulfillmentMethod === "PICKUP") return "Pickup";
    return "Manual";
  }
  return "—";
}

export default function ShareKitClient(props: { matchId: string }) {
  const [kit, setKit] = useState<ShareKit | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus("loading");
      setMessage(null);
      try {
        const res = await fetch(`/api/creator/matches/${encodeURIComponent(props.matchId)}/share`, {
          method: "GET",
        });
        const data = (await res.json().catch(() => null)) as
          | { ok: true } & ShareKit
          | { ok: false; error?: string };
        if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
          throw new Error(
            data && "error" in data && typeof data.error === "string"
              ? data.error
              : "Failed to load share kit",
          );
        }
        if (cancelled) return;
        setKit(data);
        setStatus("idle");
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Failed to load share kit");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.matchId]);

  const dueLabel = useMemo(() => {
    if (!kit?.deliverable?.dueAt) return null;
    const date = new Date(kit.deliverable.dueAt);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleString();
  }, [kit?.deliverable?.dueAt]);

  async function copy(value: string, okMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(okMessage);
    } catch {
      setMessage("Copy failed (check browser permissions).");
    }
  }

  const canShareInstagram = kit?.offer.platforms.includes("INSTAGRAM") ?? true;
  const canShareTikTok = kit?.offer.platforms.includes("TIKTOK") ?? true;
  const canShareYouTube = kit?.offer.platforms.includes("YOUTUBE") ?? true;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-10 md:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Creator</Badge>
              <Badge variant="secondary">Share kit</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Post + track ROI</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Use the link + code so clicks and redemptions get attributed to you.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/influencer/deliverables">
              <Button variant="secondary">Deliverables</Button>
            </Link>
            <Link href="/influencer/feed">
              <Button variant="outline">Feed</Button>
            </Link>
          </div>
        </div>

        {message ? (
          <div className="mt-6 rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
            {message}
          </div>
        ) : null}

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>
              {status === "loading" ? "Loading…" : kit ? kit.offer.title : "Share kit"}
            </CardTitle>
            <CardDescription>
              {status === "loading"
                ? "Fetching your match details."
                : status === "error"
                  ? "Error (check login + match access)."
                  : kit
                    ? `${kit.brand.name} · ${deliverableLabel(kit.offer.deliverableType)}`
                    : "Ready."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {!kit ? (
              <div className="text-sm text-muted-foreground">
                {status === "error" ? "Unable to load this share kit." : "Loading…"}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Code: {kit.match.campaignCode}</Badge>
                  <Badge variant="secondary">Link: /r/{kit.match.campaignCode}</Badge>
                  {dueLabel ? <Badge>Due: {dueLabel}</Badge> : null}
                  {kit.deliverable?.status ? (
                    <Badge variant={kit.deliverable.status === "VERIFIED" ? "success" : "outline"}>
                      {kit.deliverable.status}
                    </Badge>
                  ) : null}
                  <Badge variant="secondary">Fulfillment: {fulfillmentLabel(kit)}</Badge>
                </div>

                <div className="rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
                  {kit.offer.fulfillmentType === "MANUAL" && kit.offer.manualFulfillmentMethod === "PICKUP" ? (
                    <>
                      Pickup:{" "}
                      {kit.brand.address ? (
                        <span className="text-foreground">{kit.brand.address}</span>
                      ) : (
                        <span>Brand hasn’t set an address yet.</span>
                      )}
                      {kit.brand.mapsUrl ? (
                        <>
                          {" "}
                          <a className="underline" href={kit.brand.mapsUrl} target="_blank" rel="noreferrer">
                            Open map
                          </a>
                        </>
                      ) : null}
                    </>
                  ) : kit.offer.fulfillmentType === "MANUAL" &&
                    kit.offer.manualFulfillmentMethod === "LOCAL_DELIVERY" ? (
                    <>
                      Local delivery: add your delivery address in{" "}
                      <Link className="underline" href="/influencer/settings">
                        Profile
                      </Link>{" "}
                      before claiming (required).
                    </>
                  ) : (
                    <>
                      Use the link + code so clicks and redemptions get attributed to you and the brand.
                    </>
                  )}
                  {kit.offer.manualFulfillmentNotes ? (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Notes: {kit.offer.manualFulfillmentNotes}
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-3">
                  <div className="rounded-lg border bg-card p-4">
                    <div className="text-xs font-semibold text-muted-foreground">Share link</div>
                    <div className="mt-2 break-all text-sm font-mono">{kit.shareUrl}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" type="button" onClick={() => copy(kit.shareUrl, "Link copied.")}>
                        Copy link
                      </Button>
                      <a href={kit.shareUrl} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" type="button">
                          Open link
                        </Button>
                      </a>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-card p-4">
                    <div className="text-xs font-semibold text-muted-foreground">Caption (suggested)</div>
                    <pre className="mt-2 whitespace-pre-wrap break-words rounded-md border bg-muted p-3 text-sm">
                      {kit.caption}
                    </pre>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" type="button" onClick={() => copy(kit.caption, "Caption copied.")}>
                        Copy caption
                      </Button>
                      <Button size="sm" variant="outline" type="button" onClick={() => copy(kit.match.campaignCode, "Code copied.")}>
                        Copy code
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-card p-4">
                    <div className="text-xs font-semibold text-muted-foreground">Post now</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a href="https://www.instagram.com/" target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" type="button" disabled={!canShareInstagram}>
                          Open Instagram
                        </Button>
                      </a>
                      <a href="https://www.tiktok.com/" target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" type="button" disabled={!canShareTikTok}>
                          Open TikTok
                        </Button>
                      </a>
                      <a href="https://www.youtube.com/upload" target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" type="button" disabled={!canShareYouTube}>
                          Upload YouTube Short
                        </Button>
                      </a>
                      <Link href="/influencer/performance">
                        <Button size="sm" variant="secondary" type="button">
                          View performance
                        </Button>
                      </Link>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Tip: paste the link in your bio or video description for the best tracking.
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

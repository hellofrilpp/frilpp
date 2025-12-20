"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUsageRightsScope } from "@/lib/usage-rights";

type OfferDetails = {
  id: string;
  title: string;
  template: string;
  countriesAllowed: string[];
  maxClaims: number;
  deadlineDaysAfterDelivery: number;
  deliverableType: "REELS" | "FEED" | "UGC_ONLY";
  usageRightsRequired: boolean;
  usageRightsScope: string | null;
  publishedAt: string | null;
  brandName: string;
};

function deliverableLabel(type: OfferDetails["deliverableType"]) {
  if (type === "REELS") return "1 Reel (enforced)";
  if (type === "FEED") return "1 Feed post (enforced)";
  return "UGC only (no posting)";
}

export default function OfferShareClient(props: { offerId: string }) {
  const [offer, setOffer] = useState<OfferDetails | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [claimStatus, setClaimStatus] = useState<"idle" | "claiming" | "claimed" | "error">(
    "idle",
  );
  const [claimMessage, setClaimMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus("loading");
      try {
        const res = await fetch(`/api/offers/${encodeURIComponent(props.offerId)}`);
        const data = (await res.json().catch(() => null)) as
          | { ok: true; offer: OfferDetails }
          | { ok: false; error?: string };
        if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
          throw new Error(
            data && "error" in data && typeof data.error === "string"
              ? data.error
              : "Failed to load offer",
          );
        }
        if (cancelled) return;
        setOffer(data.offer);
        setStatus("idle");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.offerId]);

  const shareTitle = useMemo(() => {
    if (!offer) return "Barter offer";
    return `${offer.brandName} barter offer`;
  }, [offer]);

  async function claim() {
    if (!offer) return;
    setClaimStatus("claiming");
    setClaimMessage(null);
    try {
      const res = await fetch(`/api/creator/offers/${encodeURIComponent(offer.id)}/claim`, {
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
              dueAt?: string | null;
            };
          }
        | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        const msg =
          data && "error" in data && typeof data.error === "string" ? data.error : "Claim failed";
        throw new Error(msg);
      }

      const message =
        data.match.status === "ACCEPTED"
          ? `Accepted. Your code is ${data.match.campaignCode}. Share link: ${data.match.shareUrlPath}.`
          : `Requested. Waiting for brand approval. Your code is ${data.match.campaignCode}.`;

      setClaimMessage(message);
      setClaimStatus("claimed");
    } catch (err) {
      setClaimStatus("error");
      setClaimMessage(err instanceof Error ? err.message : "Claim failed");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-10 md:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Creator</Badge>
              <Badge variant="secondary">Offer link</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">{shareTitle}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Claim in one click. If you’re approved, we auto-create the Shopify shipment order.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/influencer/feed">
              <Button variant="secondary" size="sm">
                Feed
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm">
                Home
              </Button>
            </Link>
          </div>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Offer</CardTitle>
            <CardDescription>
              {status === "loading"
                ? "Loading…"
                : status === "error"
                  ? "Failed to load (check DATABASE_URL + migrations)."
                  : offer
                    ? offer.title
                    : "Offer not found."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!offer ? null : (
              <div className="grid gap-4">
                <div className="flex flex-wrap gap-2">
                  <Badge>Brand: {offer.brandName}</Badge>
                  <Badge>Deliverable: {deliverableLabel(offer.deliverableType)}</Badge>
                  <Badge>Countries: {offer.countriesAllowed.join(", ")}</Badge>
                  <Badge>Due: {offer.deadlineDaysAfterDelivery}d after delivery</Badge>
                  {offer.usageRightsRequired ? (
                    <Badge variant="secondary">Usage rights required</Badge>
                  ) : null}
                </div>

                <div className="rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
                  If this offer requires posting, you’ll get a unique code after claiming. Include
                  it in your caption so Frilpp can attribute purchases.
                </div>

                {offer.usageRightsRequired ? (
                  <div className="rounded-lg border bg-card p-4 text-sm">
                    Usage rights required: {formatUsageRightsScope(offer.usageRightsScope)}
                  </div>
                ) : null}

                {claimMessage ? (
                  <div className="rounded-lg border bg-card p-4 text-sm">{claimMessage}</div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={claim} disabled={claimStatus === "claiming" || status !== "idle"}>
                    {claimStatus === "claiming" ? "Claiming..." : "Claim offer"}
                  </Button>
                  <Link href="/influencer/settings">
                    <Button variant="outline">Update shipping</Button>
                  </Link>
                  {claimStatus === "claimed" ? <Badge variant="success">Claimed</Badge> : null}
                  {claimStatus === "error" ? <Badge variant="danger">Error</Badge> : null}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

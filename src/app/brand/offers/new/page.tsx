"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatUsageRightsScope } from "@/lib/usage-rights";

type TemplateId = "REEL" | "FEED" | "REEL_PLUS_STORY" | "UGC_ONLY";
type WizardStep = 0 | 1 | 2 | 3;

const SHOPIFY_ENABLED = false;

type OfferDraft = {
  template: TemplateId;
  title: string;
  countriesAllowed: Array<"US" | "IN">;
  maxClaims: number;
  deadlineDaysAfterDelivery: number;
  followersThreshold: number;
  aboveThresholdAutoAccept: boolean;
  usageRightsRequired: boolean;
  usageRightsScope: "PAID_ADS_12MO" | "PAID_ADS_6MO" | "PAID_ADS_UNLIMITED" | "ORGANIC_ONLY";
  fulfillmentType: "SHOPIFY" | "MANUAL";
  manualFulfillmentMethod: "PICKUP" | "LOCAL_DELIVERY";
  manualFulfillmentNotes: string;
  locationRadiusKm: number | null;
  ctaUrl: string;
  platforms: Array<"TIKTOK" | "YOUTUBE">;
};

type ShopifyProduct = {
  id: string;
  title: string;
  imageUrl: string | null;
  variants: Array<{ id: string; title: string }>;
};

type SelectedProduct = {
  shopifyProductId: string;
  shopifyVariantId: string;
  quantity: number;
  title: string;
  variantTitle: string;
};

type NearbyCreator = {
  id: string;
  username: string;
  followersCount: number;
  distanceKm: number;
};

const templatePresets: Record<
  TemplateId,
  Pick<OfferDraft, "template" | "maxClaims" | "deadlineDaysAfterDelivery">
> = {
  REEL: { template: "REEL", maxClaims: 50, deadlineDaysAfterDelivery: 7 },
  FEED: { template: "FEED", maxClaims: 25, deadlineDaysAfterDelivery: 10 },
  REEL_PLUS_STORY: {
    template: "REEL_PLUS_STORY",
    maxClaims: 30,
    deadlineDaysAfterDelivery: 7,
  },
  UGC_ONLY: { template: "UGC_ONLY", maxClaims: 30, deadlineDaysAfterDelivery: 10 },
};

const templateLabels: Record<TemplateId, string> = {
  REEL: "1 Reel (enforced)",
  FEED: "1 Feed post (enforced)",
  REEL_PLUS_STORY: "Reel + Story (Story is bonus)",
  UGC_ONLY: "UGC only (no posting)",
};

function StepPill(props: {
  index: number;
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={[
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-left text-xs font-semibold transition-colors",
        props.active
          ? "border-ring bg-card text-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-accent/10",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
          props.active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        ].join(" ")}
      >
        {props.index + 1}
      </span>
      <span className="truncate">{props.title}</span>
    </button>
  );
}

export default function NewOfferPage() {
  const [step, setStep] = useState<WizardStep>(SHOPIFY_ENABLED ? 0 : 1);
  const [origin, setOrigin] = useState("");

  const [draft, setDraft] = useState<OfferDraft>(() => ({
    title: "Free $50 skincare set for 1 Reel",
    countriesAllowed: [],
    followersThreshold: 5000,
    aboveThresholdAutoAccept: true,
    usageRightsRequired: false,
    usageRightsScope: "PAID_ADS_12MO",
    fulfillmentType: "MANUAL",
    manualFulfillmentMethod: "PICKUP",
    manualFulfillmentNotes: "",
    locationRadiusKm: 25 * 1.609344,
    ctaUrl: "",
    platforms: ["TIKTOK"],
    ...templatePresets.REEL,
  }));

  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedOfferId, setPublishedOfferId] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishPaywall, setPublishPaywall] = useState(false);

  const [shopifyConnected, setShopifyConnected] = useState(false);
  const [shopifyShopDomain, setShopifyShopDomain] = useState<string | null>(null);
  const [shopInput, setShopInput] = useState("");
  const [webhookStatus, setWebhookStatus] = useState<"idle" | "ok" | "error">("idle");
  const [isRegisteringWebhook, setIsRegisteringWebhook] = useState(false);

  const [productQuery, setProductQuery] = useState("");
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [variantDraftByProductId, setVariantDraftByProductId] = useState<Record<string, string>>(
    {},
  );
  const [quantityDraftByProductId, setQuantityDraftByProductId] = useState<Record<string, number>>(
    {},
  );

  const [nearby, setNearby] = useState<{
    radiusKm: number;
    creatorCount: number;
    creators: NearbyCreator[];
  } | null>(null);
  const [nearbyStatus, setNearbyStatus] = useState<"idle" | "loading" | "error">("idle");
  const [nearbyError, setNearbyError] = useState<string | null>(null);

  const campaignCodeExample = useMemo(() => "FRILP-A1B2C3", []);
  const productsSelectedCount = useMemo(
    () => selectedProducts.reduce((acc, p) => acc + (p.quantity || 0), 0),
    [selectedProducts],
  );

  useEffect(() => {
    const radiusKm = draft.locationRadiusKm ?? null;
    if (!radiusKm || radiusKm <= 0) {
      setNearby(null);
      setNearbyStatus("idle");
      setNearbyError(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setNearbyStatus("loading");
      setNearbyError(null);
      try {
        const res = await fetch(
          `/api/brand/creators/nearby?radiusKm=${encodeURIComponent(radiusKm)}&limit=6`,
          { signal: controller.signal },
        );
        const data = (await res.json().catch(() => null)) as
          | {
              ok: true;
              radiusKm: number;
              creatorCount: number;
              creators: NearbyCreator[];
            }
          | { ok: false; error?: string };

        if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
          throw new Error(
            data && "error" in data && typeof data.error === "string"
              ? data.error
              : "Failed to load creators near you",
          );
        }

        setNearby({
          radiusKm: data.radiusKm,
          creatorCount: data.creatorCount,
          creators: data.creators,
        });
        setNearbyStatus("idle");
      } catch (err) {
        if (controller.signal.aborted) return;
        setNearby(null);
        setNearbyStatus("error");
        setNearbyError(err instanceof Error ? err.message : "Failed to load creators near you");
      }
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [draft.locationRadiusKm]);

  const stepOrder = useMemo<WizardStep[]>(
    () => (SHOPIFY_ENABLED ? [0, 1, 2, 3] : [1, 2, 3]),
    [],
  );

  const steps = useMemo(
    () =>
      SHOPIFY_ENABLED
        ? [
            { title: "Products", description: "Pick products (optional)." },
            { title: "Template", description: "Pick the deliverable type." },
            { title: "Details", description: "Local radius, tracking link, and acceptance rules." },
            { title: "Review + publish", description: "One-click publish and share." },
          ]
        : [
            { title: "Template", description: "Pick the deliverable type." },
            { title: "Details", description: "Local radius, tracking link, and acceptance rules." },
            { title: "Review + publish", description: "One-click publish and share." },
          ],
    [],
  );

  const activeIndex = stepOrder.indexOf(step);
  const displayStepNumber = (target: WizardStep) => stepOrder.indexOf(target) + 1;

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/shopify/status", { method: "GET" });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; connected: boolean; shopDomain: string | null }
        | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) return;
      if (cancelled) return;
      setShopifyConnected(Boolean(data.connected));
      setShopifyShopDomain(data.shopDomain ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadProducts() {
    setIsLoadingProducts(true);
    setProductsError(null);
    try {
      const url = new URL("/api/shopify/products", window.location.origin);
      url.searchParams.set("limit", "10");
      if (productQuery.trim()) url.searchParams.set("query", productQuery.trim());
      const res = await fetch(url.toString(), { method: "GET" });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; products: ShopifyProduct[] }
        | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error((data && "error" in data && data.error) || "Failed to load products");
      }
      setProducts(data.products);
      setVariantDraftByProductId((prev) => {
        const next = { ...prev };
        for (const p of data.products) {
          if (!next[p.id]) next[p.id] = p.variants[0]?.id ?? "";
        }
        return next;
      });
      setQuantityDraftByProductId((prev) => {
        const next = { ...prev };
        for (const p of data.products) {
          if (!next[p.id]) next[p.id] = 1;
        }
        return next;
      });
    } catch (err) {
      setProductsError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setIsLoadingProducts(false);
    }
  }

  async function registerWebhook() {
    setIsRegisteringWebhook(true);
    setWebhookStatus("idle");
    try {
      const res = await fetch("/api/shopify/webhooks/register", { method: "POST" });
      const data = (await res.json().catch(() => null)) as { ok: true } | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(
          data && "error" in data && typeof data.error === "string"
            ? data.error
            : "Webhook registration failed",
        );
      }
      setWebhookStatus("ok");
    } catch {
      setWebhookStatus("error");
    } finally {
      setIsRegisteringWebhook(false);
    }
  }

  const hasMinimumDetails =
    draft.title.trim().length >= 3 &&
    Number.isFinite(draft.maxClaims) &&
    draft.maxClaims >= 1 &&
    Number.isFinite(draft.deadlineDaysAfterDelivery) &&
    draft.deadlineDaysAfterDelivery >= 1;

  async function publishOffer() {
    setIsPublishing(true);
    setPublishError(null);
    setPublishPaywall(false);
    setPublishedOfferId(null);
    try {
      const res = await fetch("/api/brand/offers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          template: draft.template,
          countriesAllowed: draft.countriesAllowed,
          maxClaims: draft.maxClaims,
          deadlineDaysAfterDelivery: draft.deadlineDaysAfterDelivery,
          followersThreshold: draft.followersThreshold,
          aboveThresholdAutoAccept: draft.aboveThresholdAutoAccept,
          usageRightsRequired: draft.usageRightsRequired,
          usageRightsScope: draft.usageRightsScope,
          products: selectedProducts.map((p) => ({
            shopifyProductId: p.shopifyProductId,
            shopifyVariantId: p.shopifyVariantId,
            quantity: p.quantity,
          })),
          metadata: {
            fulfillmentType: draft.fulfillmentType,
            manualFulfillmentMethod: draft.fulfillmentType === "MANUAL" ? draft.manualFulfillmentMethod : null,
            manualFulfillmentNotes:
              draft.fulfillmentType === "MANUAL" && draft.manualFulfillmentNotes.trim()
                ? draft.manualFulfillmentNotes.trim()
                : null,
            locationRadiusKm: draft.locationRadiusKm,
            ctaUrl: draft.ctaUrl.trim() ? draft.ctaUrl.trim() : null,
            platforms: draft.platforms,
          },
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; offerId: string }
        | { ok: false; error?: string; code?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        const message =
          data && "error" in data && typeof data.error === "string"
            ? data.error
            : "Failed to publish offer";
        const code = data && "code" in data && typeof data.code === "string" ? data.code : null;
        if (res.status === 402 && code === "PAYWALL") {
          setPublishPaywall(true);
          throw new Error("Subscription required to publish offers.");
        }
        throw new Error(message);
      }
      setPublishedOfferId(data.offerId);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Failed to publish offer");
    } finally {
      setIsPublishing(false);
    }
  }

  function nextStep() {
    setStep((s) => {
      const index = stepOrder.indexOf(s);
      if (index < 0) return stepOrder[0] ?? s;
      return index < stepOrder.length - 1 ? stepOrder[index + 1] : s;
    });
  }

  function prevStep() {
    setStep((s) => {
      const index = stepOrder.indexOf(s);
      if (index <= 0) return s;
      return stepOrder[index - 1];
    });
  }

  async function copyOfferLink(offerId: string) {
    const url = origin ? `${origin}/o/${offerId}` : `/o/${offerId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // ignore
    }
  }

  const dmTemplate = useMemo(() => {
    if (!publishedOfferId) return "";
    const link = origin ? `${origin}/o/${publishedOfferId}` : `/o/${publishedOfferId}`;
    const fulfillmentLine =
      draft.fulfillmentType === "MANUAL"
        ? draft.manualFulfillmentMethod === "LOCAL_DELIVERY"
          ? "- This is local delivery: add your delivery address in Profile before claiming."
          : "- This is pickup: your location is used for eligibility."
        : "- Fulfillment details will be shared after you claim.";
    return [
      "Hey! We’d love to send you a free product in exchange for content.",
      "",
      `Claim here: ${link}`,
      "",
      "Notes:",
      "- If the offer is local, make sure your location is set in settings before claiming.",
      fulfillmentLine,
      "- If posting is required, include the unique code in your caption.",
    ].join("\n");
  }, [draft.fulfillmentType, draft.manualFulfillmentMethod, origin, publishedOfferId]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 md:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Brand</Badge>
              <Badge variant="secondary">Offer Builder</Badge>
              <Badge variant="secondary">Local</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
              Create a barter offer
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Publish in ~2 minutes. Creators can claim via a link; Frilpp automates approvals,
              tracking, and ROI reporting.
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">Home</Button>
          </Link>
        </div>

        <div className="mt-8 grid gap-6">
          <div className="flex flex-wrap gap-2">
            <Link href="/brand/offers">
              <Button size="sm" variant="outline">
                Offer library
              </Button>
            </Link>
            <Link href="/brand/deliverables">
              <Button size="sm" variant="outline">
                Deliverables
              </Button>
            </Link>
            <Link href="/brand/matches">
              <Button size="sm" variant="outline">
                Approvals
              </Button>
            </Link>
            <Link href="/brand/shipments">
              <Button size="sm" variant="outline">
                Shipments
              </Button>
            </Link>
            <Link href="/brand/analytics">
              <Button size="sm" variant="outline">
                Analytics
              </Button>
            </Link>
            <Link href="/brand/settings/profile">
              <Button size="sm" variant="outline">
                Profile
              </Button>
            </Link>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
              <CardDescription>{steps[Math.max(0, activeIndex)].description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {steps.map((s, i) => (
                <StepPill
                  key={s.title}
                  index={i}
                  title={s.title}
                  active={activeIndex === i}
                  onClick={() => setStep(stepOrder[i] ?? step)}
                />
              ))}
            </CardContent>
          </Card>

          {publishedOfferId ? (
            <Card>
              <CardHeader>
                <CardTitle>Offer published</CardTitle>
                <CardDescription>
                  Share this link with creators (DM template friendly).
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted p-4">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-muted-foreground">Offer link</div>
                    <div className="mt-1 truncate font-mono text-sm">
                      {origin ? `${origin}/o/${publishedOfferId}` : `/o/${publishedOfferId}`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/o/${encodeURIComponent(publishedOfferId)}`}>
                      <Button size="sm" variant="secondary">
                        Open
                      </Button>
                    </Link>
                    <Button size="sm" variant="outline" onClick={() => copyOfferLink(publishedOfferId)}>
                      Copy
                    </Button>
                  </div>
                </div>
                <div className="grid gap-2 rounded-lg border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold">DM template</div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(dmTemplate);
                        } catch {
                          // ignore
                        }
                      }}
                    >
                      Copy DM
                    </Button>
                  </div>
                  <Textarea value={dmTemplate} readOnly className="min-h-[140px] font-mono text-xs" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/brand/matches">
                    <Button variant="outline" size="sm">
                      Approvals
                    </Button>
                  </Link>
                  <Link href="/brand/analytics">
                    <Button variant="outline" size="sm">
                      Analytics
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {publishError ? (
            <Card>
              <CardHeader>
                <CardTitle>Publish failed</CardTitle>
                <CardDescription>{publishError}</CardDescription>
              </CardHeader>
              {publishPaywall ? (
                <CardContent className="flex flex-wrap gap-2">
                  <Link href="/brand/billing">
                    <Button variant="secondary">Subscribe</Button>
                  </Link>
                </CardContent>
              ) : null}
            </Card>
          ) : null}

          {SHOPIFY_ENABLED && step === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>1) Products (optional)</CardTitle>
                <CardDescription>
                  Pick products (optional).
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {shopifyConnected ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Connected:</span>{" "}
                      <span className="font-mono">{shopifyShopDomain}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={registerWebhook}
                        disabled={isRegisteringWebhook}
                      >
                        {isRegisteringWebhook ? "Registering..." : "Register webhooks"}
                      </Button>
                      {webhookStatus === "ok" ? (
                        <Badge variant="success">Webhook ready</Badge>
                      ) : webhookStatus === "error" ? (
                        <Badge variant="danger">Webhook error</Badge>
                      ) : (
                        <Badge variant="success">Connected</Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <div className="grid gap-2">
                      <Label htmlFor="shopDomain">Shop domain</Label>
                      <Input
                        id="shopDomain"
                        placeholder="your-store.example.com"
                        value={shopInput}
                        onChange={(e) => setShopInput(e.target.value)}
                      />
                      <div className="text-xs text-muted-foreground">
                        This integration requires a public app URL; on localhost use a tunnel (ngrok/cloudflared) and set the integration app URL.
                      </div>
                    </div>
                    <a href={`/api/shopify/install?shop=${encodeURIComponent(shopInput || "")}`}>
                      <Button disabled={!shopInput.trim()}>Connect store</Button>
                    </a>
                  </div>
                )}

                <div className="rounded-lg border bg-muted p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm font-semibold">Products</div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Search by title"
                        value={productQuery}
                        onChange={(e) => setProductQuery(e.target.value)}
                      />
                      <Button
                        variant="secondary"
                        onClick={loadProducts}
                        disabled={!shopifyConnected || isLoadingProducts}
                      >
                        {isLoadingProducts ? "Loading..." : "Load"}
                      </Button>
                    </div>
                  </div>

                  {productsError ? (
                    <div className="mt-3 text-sm text-danger">{productsError}</div>
                  ) : null}

                  <div className="mt-3 grid gap-3">
                    {products.map((p) => {
                      const selected = selectedProducts.find((x) => x.shopifyProductId === p.id);
                      return (
                        <div key={p.id} className="rounded-lg border bg-background p-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-sm font-medium">{p.title}</div>
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                value={variantDraftByProductId[p.id] ?? ""}
                                onChange={(e) =>
                                  setVariantDraftByProductId((prev) => ({
                                    ...prev,
                                    [p.id]: e.target.value,
                                  }))
                                }
                              >
                                {p.variants.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.title}
                                  </option>
                                ))}
                              </select>
                              <Input
                                type="number"
                                min={1}
                                className="h-9 w-24"
                                value={quantityDraftByProductId[p.id] ?? 1}
                                onChange={(e) =>
                                  setQuantityDraftByProductId((prev) => ({
                                    ...prev,
                                    [p.id]: Number(e.target.value),
                                  }))
                                }
                              />
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  const variantId = variantDraftByProductId[p.id];
                                  const variantTitle =
                                    p.variants.find((v) => v.id === variantId)?.title ?? "";
                                  const qty = quantityDraftByProductId[p.id] ?? 1;
                                  if (!variantId) return;
                                  setSelectedProducts((prev) => {
                                    const existingIndex = prev.findIndex((x) => x.shopifyProductId === p.id);
                                    const next: SelectedProduct = {
                                      shopifyProductId: p.id,
                                      shopifyVariantId: variantId,
                                      quantity: qty,
                                      title: p.title,
                                      variantTitle,
                                    };
                                    if (existingIndex >= 0) {
                                      const copy = prev.slice();
                                      copy[existingIndex] = next;
                                      return copy;
                                    }
                                    return [...prev, next];
                                  });
                                }}
                              >
                                {selected ? "Update" : "Add"}
                              </Button>
                            </div>
                          </div>
                          {selected ? (
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted px-3 py-2 text-xs">
                              <div className="text-muted-foreground">
                                Selected:{" "}
                                <span className="font-mono text-foreground">{selected.variantTitle}</span> ×{" "}
                                <span className="font-mono text-foreground">{selected.quantity}</span>
                              </div>
                              <button
                                type="button"
                                className="text-danger hover:underline"
                                onClick={() =>
                                  setSelectedProducts((prev) => prev.filter((x) => x.shopifyProductId !== p.id))
                                }
                              >
                                Remove
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background p-3">
                    <div className="text-xs text-muted-foreground">
                      Selected items:{" "}
                      <span className="font-mono text-foreground">{productsSelectedCount}</span>
                    </div>
                    {productsSelectedCount > 0 ? (
                      <Badge variant="success">Ready for auto-ship</Badge>
                    ) : (
                      <Badge variant="warning">Select a product to auto-ship</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {step === 1 ? (
            <Card>
              <CardHeader>
                <CardTitle>{displayStepNumber(1)}) Template</CardTitle>
                <CardDescription>
                  Reels/Feed templates use a unique caption code for verification. UGC-only is for content collection.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(templateLabels) as TemplateId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={[
                      "rounded-lg border p-4 text-left transition-colors",
                      draft.template === id ? "border-ring bg-card" : "border-border bg-card hover:bg-accent/10",
                    ].join(" ")}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        ...templatePresets[id],
                        usageRightsRequired: id === "UGC_ONLY" ? true : d.usageRightsRequired,
                      }))
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-semibold text-foreground">{templateLabels[id]}</div>
                      {draft.template === id ? <Badge variant="success">Selected</Badge> : null}
                    </div>
                    <div className="mt-2 text-xs leading-5 text-muted-foreground">
                      {id === "UGC_ONLY"
                        ? "No public posting required. Great for collecting content you can run as ads."
                        : "Enforced via unique caption code; stories are treated as bonus."}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {step === 2 ? (
            <Card>
              <CardHeader>
                <CardTitle>{displayStepNumber(2)}) Details</CardTitle>
                <CardDescription>
                  Keep it concrete (what you ship + what you want in return).
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={draft.title}
                      onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="maxClaims">Max claims</Label>
                    <Input
                      id="maxClaims"
                      type="number"
                      min={1}
                      value={draft.maxClaims}
                      onChange={(e) => setDraft((d) => ({ ...d, maxClaims: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="deadline">Due (days after delivery)</Label>
                  <Input
                    id="deadline"
                    type="number"
                    min={1}
                    value={draft.deadlineDaysAfterDelivery}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        deadlineDaysAfterDelivery: Number(e.target.value),
                      }))
                    }
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="followersThreshold">Auto-accept threshold (followers)</Label>
                    <Input
                      id="followersThreshold"
                      type="number"
                      min={0}
                      value={draft.followersThreshold}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          followersThreshold: Number(e.target.value),
                        }))
                      }
                    />
                    <div className="text-xs text-muted-foreground">
                      If a creator has ≥ this many followers, they can be auto-accepted.
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Above threshold</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={draft.aboveThresholdAutoAccept ? "default" : "outline"}
                        type="button"
                        onClick={() => setDraft((d) => ({ ...d, aboveThresholdAutoAccept: true }))}
                      >
                        Auto-accept
                      </Button>
                      <Button
                        size="sm"
                        variant={!draft.aboveThresholdAutoAccept ? "default" : "outline"}
                        type="button"
                        onClick={() => setDraft((d) => ({ ...d, aboveThresholdAutoAccept: false }))}
                      >
                        Manual review
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Below threshold always requires brand approval.
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted p-4">
                  <div className="text-sm font-semibold text-foreground">
                    Local targeting + tracking
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    If you set a radius, creators must be within that distance when claiming.
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="radius">Max distance (miles)</Label>
                      <Input
                        id="radius"
                        type="number"
                        min={1}
                        placeholder="25"
                        value={(() => {
                          const km = draft.locationRadiusKm;
                          if (!km) return "";
                          const value = km / 1.609344;
                          return Math.round(value * 10) / 10;
                        })()}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const value = raw.trim() ? Number(raw) : null;
                          setDraft((d) => ({
                            ...d,
                            locationRadiusKm:
                              value && Number.isFinite(value)
                                ? value * 1.609344
                                : null,
                          }));
                        }}
                      />
                      <div className="text-xs text-muted-foreground">
                        Leave blank for global visibility.
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="ctaUrl">Where should the link go?</Label>
                      <Input
                        id="ctaUrl"
                        placeholder="https://your-site.com/order (optional)"
                        value={draft.ctaUrl}
                        onChange={(e) => setDraft((d) => ({ ...d, ctaUrl: e.target.value }))}
                      />
                      <div className="text-xs text-muted-foreground">
                        If empty, we fall back to your brand website (or Maps search).
                      </div>
                    </div>
                  </div>

                  {draft.locationRadiusKm ? (
                    <div className="mt-4 rounded-lg border bg-card p-3">
                      <div className="text-xs font-semibold text-foreground">
                        Creators near you
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Based on creators who have set their location (nano range).
                      </div>
                      {nearbyStatus === "loading" ? (
                        <div className="mt-2 text-xs text-muted-foreground">Loading…</div>
                      ) : nearbyStatus === "error" ? (
                        <div className="mt-2 text-xs text-danger">
                          {nearbyError ?? "Failed to load."}{" "}
                          <Link className="underline" href="/brand/settings/profile">
                            Set brand location
                          </Link>
                          .
                        </div>
                      ) : nearby ? (
                        <div className="mt-2 grid gap-2 text-xs text-muted-foreground">
                          <div>
                            {(() => {
                              const radius = nearby.radiusKm / 1.609344;
                              return `~${nearby.creatorCount} creators within ${Math.round(radius * 10) / 10} mi`;
                            })()}
                          </div>
                          {nearby.creators.length ? (
                            <div className="grid gap-1">
                              {nearby.creators.map((c) => (
                                <div key={c.id} className="flex items-center justify-between gap-3">
                                  <div className="min-w-0 truncate">
                                    {c.username} · {c.followersCount.toLocaleString()} followers
                                  </div>
                                  <div className="shrink-0">
                                    {(() => {
                                      const distance = c.distanceKm / 1.609344;
                                      return `${Math.round(distance * 10) / 10} mi`;
                                    })()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div>No creators found in this radius yet.</div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Set your brand location to estimate nearby creators.
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground">Platforms</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(["TIKTOK", "YOUTUBE"] as const).map((p) => {
                          const active = draft.platforms.includes(p);
                          return (
                            <Button
                              key={p}
                              size="sm"
                              type="button"
                              variant={active ? "default" : "outline"}
                              onClick={() =>
                                setDraft((d) => ({
                                  ...d,
                                  platforms: active
                                    ? d.platforms.filter((x) => x !== p)
                                    : [...d.platforms, p],
                                }))
                              }
                            >
                              {p}
                            </Button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-muted-foreground">Fulfillment</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          type="button"
                          variant={draft.fulfillmentType === "MANUAL" ? "default" : "outline"}
                          onClick={() => setDraft((d) => ({ ...d, fulfillmentType: "MANUAL" }))}
                        >
                          Manual
                        </Button>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Manual works for local delivery/pickup.
                      </div>

                      {draft.fulfillmentType === "MANUAL" ? (
                        <div className="mt-3 grid gap-3 rounded-lg border bg-card p-3">
                          <div>
                            <div className="text-xs font-semibold text-muted-foreground">
                              Manual mode
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                type="button"
                                variant={draft.manualFulfillmentMethod === "PICKUP" ? "default" : "outline"}
                                onClick={() => setDraft((d) => ({ ...d, manualFulfillmentMethod: "PICKUP" }))}
                              >
                                Pickup
                              </Button>
                              <Button
                                size="sm"
                                type="button"
                                variant={draft.manualFulfillmentMethod === "LOCAL_DELIVERY" ? "default" : "outline"}
                                onClick={() => setDraft((d) => ({ ...d, manualFulfillmentMethod: "LOCAL_DELIVERY" }))}
                              >
                                Local delivery
                              </Button>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              Pickup uses your brand address. Local delivery asks creators for an address at claim time.
                            </div>
                          </div>

                          <div className="grid gap-2">
                            <Label htmlFor="manualNotes">Instructions (optional)</Label>
                            <Input
                              id="manualNotes"
                              placeholder="Pickup window / delivery notes…"
                              value={draft.manualFulfillmentNotes}
                              onChange={(e) => setDraft((d) => ({ ...d, manualFulfillmentNotes: e.target.value }))}
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted p-4">
                  <div className="text-sm font-semibold text-foreground">Usage rights (optional)</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    If enabled, creators must grant usage rights so you can run their content as ads.
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      type="button"
                      variant={draft.usageRightsRequired ? "default" : "outline"}
                      onClick={() => setDraft((d) => ({ ...d, usageRightsRequired: true }))}
                    >
                      Require rights
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      variant={!draft.usageRightsRequired ? "default" : "outline"}
                      onClick={() => setDraft((d) => ({ ...d, usageRightsRequired: false }))}
                    >
                      No rights needed
                    </Button>
                  </div>
                  {draft.usageRightsRequired ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(
                        ["PAID_ADS_12MO", "PAID_ADS_6MO", "PAID_ADS_UNLIMITED", "ORGANIC_ONLY"] as const
                      ).map((scope) => (
                        <Button
                          key={scope}
                          size="sm"
                          type="button"
                          variant={draft.usageRightsScope === scope ? "secondary" : "outline"}
                          onClick={() => setDraft((d) => ({ ...d, usageRightsScope: scope }))}
                        >
                          {scope === "PAID_ADS_12MO"
                            ? "Paid ads · 12mo"
                            : scope === "PAID_ADS_6MO"
                              ? "Paid ads · 6mo"
                              : scope === "PAID_ADS_UNLIMITED"
                                ? "Paid ads · unlimited"
                                : "Organic only"}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {step === 3 ? (
            <Card>
              <CardHeader>
                <CardTitle>{displayStepNumber(3)}) Review + publish</CardTitle>
                <CardDescription>
                  Publish and share. Under-the-hood: auto-approve rules, auto-ship, and ROI tracking.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-3 rounded-lg border bg-muted p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-foreground">{draft.title}</div>
                    <Badge variant="secondary">{templateLabels[draft.template]}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>Max claims: {draft.maxClaims}</Badge>
                    <Badge>Due: {draft.deadlineDaysAfterDelivery}d after delivery</Badge>
                    {draft.usageRightsRequired ? (
                      <Badge variant="secondary">Usage rights: {formatUsageRightsScope(draft.usageRightsScope)}</Badge>
                    ) : null}
                  </div>
                  {SHOPIFY_ENABLED ? (
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={shopifyConnected ? "success" : "warning"}>
                        {shopifyConnected ? "Store connected" : "Store not connected"}
                      </Badge>
                      <Badge variant={productsSelectedCount > 0 ? "success" : "warning"}>
                        Products selected: {productsSelectedCount}
                      </Badge>
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-3 rounded-lg border bg-card p-4 text-sm">
                  <div className="font-semibold">Acceptance policy</div>
                  <div className="text-muted-foreground">
                    Auto-accept creators with followers ≥{" "}
                    <span className="font-mono text-foreground">{draft.followersThreshold}</span>.
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={draft.aboveThresholdAutoAccept ? "default" : "outline"}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, aboveThresholdAutoAccept: true }))}
                    >
                      Auto-accept
                    </Button>
                    <Button
                      size="sm"
                      variant={!draft.aboveThresholdAutoAccept ? "default" : "outline"}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, aboveThresholdAutoAccept: false }))}
                    >
                      Manual review
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted p-4 text-sm">
                  Caption code example:{" "}
                  <span className="font-mono font-semibold text-foreground">{campaignCodeExample}</span>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Reels/Feed: attribution is via tracked link clicks and redemptions. Stories are best-effort.
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
            <div className="text-sm text-muted-foreground">
              {activeIndex < stepOrder.length - 1
                ? `Step ${Math.max(0, activeIndex) + 1} of ${stepOrder.length}`
                : hasMinimumDetails
                  ? "Ready to publish"
                  : "Complete required fields to publish"}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={prevStep} disabled={activeIndex <= 0 || isPublishing}>
                Back
              </Button>
              {activeIndex < stepOrder.length - 1 ? (
                <Button variant="secondary" onClick={nextStep} disabled={isPublishing}>
                  Next
                </Button>
              ) : (
                <Button onClick={publishOffer} disabled={isPublishing || !hasMinimumDetails}>
                  {isPublishing ? "Publishing..." : "Publish offer"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ShipmentRow = {
  id: string;
  status: "PENDING" | "DRAFT_CREATED" | "COMPLETED" | "FULFILLED" | "CANCELED" | "ERROR";
  shopDomain: string;
  shopifyOrderId: string | null;
  shopifyOrderName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  error: string | null;
  updatedAt: string;
  match: { id: string; campaignCode: string };
  offer: { title: string };
  creator: { id: string; username: string | null; email: string | null; country: string | null };
};

type Filter = "ALL" | ShipmentRow["status"];

export default function BrandShipmentsPage() {
  const [rows, setRows] = useState<ShipmentRow[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async (nextFilter: Filter) => {
    setStatus("loading");
    setMessage(null);
    try {
      const url = new URL("/api/brand/shipments", window.location.origin);
      if (nextFilter !== "ALL") url.searchParams.set("status", nextFilter);
      const res = await fetch(url.toString(), { method: "GET" });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; shipments: ShipmentRow[] }
        | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(
          data && "error" in data && typeof data.error === "string" ? data.error : "Failed to load",
        );
      }
      setRows(data.shipments);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      return (
        r.offer.title.toLowerCase().includes(q) ||
        (r.creator.username ?? "").toLowerCase().includes(q) ||
        (r.shopifyOrderName ?? "").toLowerCase().includes(q) ||
        (r.trackingNumber ?? "").toLowerCase().includes(q) ||
        r.match.campaignCode.toLowerCase().includes(q)
      );
    });
  }, [query, rows]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 md:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Brand</Badge>
              <Badge variant="secondary">Shipments</Badge>
              <Badge variant="secondary">Shopify</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Shipments</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Track order creation status, fulfillment, and tracking links.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/brand/matches">
              <Button variant="outline">Approvals</Button>
            </Link>
            <Link href="/brand/deliverables">
              <Button variant="outline">Deliverables</Button>
            </Link>
            <Link href="/brand/offers">
              <Button variant="outline">Offers</Button>
            </Link>
            <Link href="/brand/analytics">
              <Button variant="outline">Analytics</Button>
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
            <CardTitle>Queue</CardTitle>
            <CardDescription>
              {status === "loading"
                ? "Loading…"
                : status === "error"
                  ? "Error (check login + brand selection)."
                  : `${visible.length} shipments.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <Input
                placeholder="Search offer, creator, code, tracking…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    "ALL",
                    "PENDING",
                    "DRAFT_CREATED",
                    "COMPLETED",
                    "FULFILLED",
                    "ERROR",
                    "CANCELED",
                  ] as const
                ).map((f) => (
                  <Button
                    key={f}
                    size="sm"
                    variant={filter === f ? "default" : "outline"}
                    onClick={() => setFilter(f)}
                  >
                    {f}
                  </Button>
                ))}
                <Button size="sm" variant="secondary" onClick={() => load(filter)}>
                  Refresh
                </Button>
              </div>
            </div>

            {!visible.length ? (
              <div className="text-sm text-muted-foreground">No shipments yet.</div>
            ) : (
              <div className="grid gap-3">
                {visible.map((r) => (
                  <div key={r.id} className="rounded-lg border bg-card p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-balance">{r.offer.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Creator:{" "}
                          <span className="font-mono text-foreground">
                            {r.creator.username ?? r.creator.id}
                          </span>{" "}
                          · Code:{" "}
                          <span className="font-mono text-foreground">{r.match.campaignCode}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge
                            variant={
                              r.status === "FULFILLED"
                                ? "success"
                                : r.status === "ERROR"
                                  ? "danger"
                                  : r.status === "PENDING"
                                    ? "warning"
                                    : "outline"
                            }
                          >
                            {r.status}
                          </Badge>
                          {r.shopifyOrderName ? (
                            <Badge variant="secondary">Order: {r.shopifyOrderName}</Badge>
                          ) : null}
                          {r.trackingNumber ? (
                            <Badge variant="secondary">Tracking: {r.trackingNumber}</Badge>
                          ) : null}
                        </div>
                        {r.error ? (
                          <div className="mt-3 text-sm text-danger">{r.error}</div>
                        ) : null}
                        {r.trackingUrl ? (
                          <a
                            className="mt-3 block break-all text-xs underline"
                            href={r.trackingUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {r.trackingUrl}
                          </a>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                        {r.trackingUrl ? (
                          <a href={r.trackingUrl} target="_blank" rel="noreferrer">
                            <Button size="sm" variant="secondary">
                              Open tracking
                            </Button>
                          </a>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const text = r.trackingUrl ?? r.trackingNumber ?? "";
                            if (!text) return;
                            try {
                              await navigator.clipboard.writeText(text);
                              setMessage("Copied.");
                            } catch {
                              setMessage("Failed to copy.");
                            }
                          }}
                          disabled={!r.trackingUrl && !r.trackingNumber}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

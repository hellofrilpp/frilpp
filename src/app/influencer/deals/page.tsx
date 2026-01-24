"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Deal = {
  id: string;
  brand: string;
  product: string;
  valueUsd: number | null;
  status: "pending" | "approved" | "shipped" | "post_required" | "complete";
  matchDate: string;
  deadline: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  carrier: string | null;
};

const statusLabel: Record<Deal["status"], string> = {
  pending: "Pending approval",
  approved: "Approved",
  shipped: "Ready (delivered/pickup)",
  post_required: "Post required",
  complete: "Complete",
};

const statusVariant: Record<Deal["status"], "outline" | "secondary" | "warning" | "success"> = {
  pending: "warning",
  approved: "secondary",
  shipped: "secondary",
  post_required: "warning",
  complete: "success",
};

export default function CreatorDealsPage() {
  const [rows, setRows] = useState<Deal[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  async function load() {
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/creator/deals", { method: "GET" });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; deals: Deal[] }
        | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(
          data && "error" in data && typeof data.error === "string" ? data.error : "Failed to load",
        );
      }
      setRows(data.deals);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to load");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      return (
        row.brand.toLowerCase().includes(q) ||
        row.product.toLowerCase().includes(q) ||
        row.status.toLowerCase().includes(q) ||
        (row.trackingNumber ?? "").toLowerCase().includes(q) ||
        (row.trackingUrl ?? "").toLowerCase().includes(q) ||
        (row.carrier ?? "").toLowerCase().includes(q)
      );
    });
  }, [query, rows]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-10 md:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Creator</Badge>
              <Badge variant="secondary">Deals</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Your deals</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Track approvals, handoffs, and what you need to post.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/influencer/feed">
              <Button variant="secondary">Feed</Button>
            </Link>
            <Link href="/influencer/deliverables">
              <Button variant="outline">Deliverables</Button>
            </Link>
            <Link href="/influencer/performance">
              <Button variant="outline">Performance</Button>
            </Link>
            <Link href="/influencer/settings">
              <Button variant="outline">Profile</Button>
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
            <CardTitle>Pipeline</CardTitle>
            <CardDescription>
              {status === "loading"
                ? "Loading…"
                : status === "error"
                  ? "Error (check login + creator profile)."
                  : `${visible.length} deals.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <Input
                placeholder="Search brand, offer, status, tracking…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Button size="sm" variant="secondary" onClick={load}>
                Refresh
              </Button>
            </div>

            {!visible.length ? (
              <div className="text-sm text-muted-foreground">No deals yet.</div>
            ) : (
              <div className="grid gap-3">
                {visible.map((deal) => {
                  const deadlineLabel = deal.deadline
                    ? new Date(deal.deadline).toLocaleString()
                    : null;
                  return (
                    <div key={deal.id} className="rounded-lg border bg-card p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-balance">{deal.product}</div>
                          <div className="mt-1 text-xs text-muted-foreground">{deal.brand}</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant={statusVariant[deal.status]}>{statusLabel[deal.status]}</Badge>
                            {deadlineLabel ? <Badge variant="secondary">Due: {deadlineLabel}</Badge> : null}
                            {deal.carrier ? <Badge variant="secondary">Carrier: {deal.carrier}</Badge> : null}
                            {deal.trackingNumber ? (
                              <Badge variant="secondary">Tracking: {deal.trackingNumber}</Badge>
                            ) : null}
                            {deal.trackingUrl ? (
                              <a href={deal.trackingUrl} target="_blank" rel="noreferrer">
                                <Badge variant="secondary">Open tracking</Badge>
                              </a>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Link href={`/influencer/matches/${encodeURIComponent(deal.id)}/share`}>
                            <Button size="sm" variant="secondary" type="button">
                              Share kit
                            </Button>
                          </Link>
                          <Link href="/influencer/performance">
                            <Button size="sm" variant="outline" type="button">
                              ROI
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

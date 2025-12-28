"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type MatchRow = {
  matchId: string;
  status: string;
  campaignCode: string;
  createdAt: string;
  acceptedAt: string | null;
  offer: { id: string; title: string };
  creator: {
    id: string;
    username: string | null;
    followersCount: number | null;
    country: string | null;
    shippingReady: boolean;
  };
};

type MatchStatusFilter = "PENDING_APPROVAL" | "ACCEPTED";

export default function BrandMatchesPage() {
  const [filter, setFilter] = useState<MatchStatusFilter>("PENDING_APPROVAL");
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [actionError, setActionError] = useState<string | null>(null);

  const title = useMemo(
    () => (filter === "PENDING_APPROVAL" ? "Pending approvals" : "Accepted matches"),
    [filter],
  );

  async function load() {
    setStatus("loading");
    setActionError(null);
    try {
      const url = new URL("/api/brand/matches", window.location.origin);
      url.searchParams.set("status", filter);
      const res = await fetch(url.toString());
      const data = (await res.json().catch(() => null)) as
        | { ok: true; matches: MatchRow[] }
        | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(
          data && "error" in data && typeof data.error === "string"
            ? data.error
            : "Failed to load matches",
        );
      }
      setRows(data.matches);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function approve(matchId: string) {
    setActionError(null);
    try {
      const res = await fetch(`/api/brand/matches/${encodeURIComponent(matchId)}/approve`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; errors?: string[] }
        | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(
          data && "error" in data && typeof data.error === "string"
            ? data.error
            : "Approval failed",
        );
      }
      if ("errors" in data && Array.isArray(data.errors) && data.errors.length) {
        setActionError(data.errors.join(" · "));
      }
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Approval failed");
    }
  }

  async function reject(matchId: string) {
    setActionError(null);
    try {
      const res = await fetch(`/api/brand/matches/${encodeURIComponent(matchId)}/reject`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(
          data && "error" in data && typeof data.error === "string"
            ? data.error
            : "Reject failed",
        );
      }
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Reject failed");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 md:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Brand</Badge>
              <Badge variant="secondary">Approvals</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Approve creators that fall below your auto-accept threshold. On approve, Frilpp
              activates tracking and (optionally) Shopify automation if you’ve connected a store.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={filter === "PENDING_APPROVAL" ? "default" : "outline"}
              onClick={() => setFilter("PENDING_APPROVAL")}
            >
              Pending
            </Button>
            <Button
              size="sm"
              variant={filter === "ACCEPTED" ? "default" : "outline"}
              onClick={() => setFilter("ACCEPTED")}
            >
              Accepted
            </Button>
            <Link href="/brand/deliverables">
              <Button size="sm" variant="outline">
                Deliverables
              </Button>
            </Link>
            <Link href="/brand/shipments">
              <Button size="sm" variant="outline">
                Shipments
              </Button>
            </Link>
            <Link href="/brand/redemptions">
              <Button size="sm" variant="outline">
                Redemptions
              </Button>
            </Link>
            <Button size="sm" variant="secondary" onClick={load}>
              Refresh
            </Button>
            <Link href="/">
              <Button size="sm" variant="outline">
                Home
              </Button>
            </Link>
          </div>
        </div>

        {actionError ? (
          <div className="mt-6 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
            {actionError}
          </div>
        ) : null}

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Matches</CardTitle>
            <CardDescription>
              {status === "loading"
                ? "Loading…"
                : status === "error"
                  ? "Failed to load (check DATABASE_URL + migrations)."
                  : `${rows.length} results.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!rows.length ? (
              <div className="text-sm text-muted-foreground">No matches for this filter.</div>
            ) : (
              <div className="grid gap-3">
                {rows.map((r) => (
                  <div key={r.matchId} className="rounded-lg border bg-card p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-balance">{r.offer.title}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            Creator:{" "}
                            <span className="font-mono text-foreground">
                              {r.creator.username ?? r.creator.id}
                            </span>
                          </span>
                          <span className="text-muted-foreground/40">•</span>
                          <span>
                            Followers:{" "}
                            <span className="font-mono text-foreground">
                              {r.creator.followersCount ?? "—"}
                            </span>
                          </span>
                          <span className="text-muted-foreground/40">•</span>
                          <span>
                            Country:{" "}
                            <span className="font-mono text-foreground">
                              {r.creator.country ?? "—"}
                            </span>
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">Code: {r.campaignCode}</Badge>
                          <Badge variant={r.creator.shippingReady ? "success" : "warning"}>
                            {r.creator.shippingReady ? "Shipping ready" : "Needs shipping address"}
                          </Badge>
                          <Badge variant="outline">Status: {r.status}</Badge>
                        </div>
                      </div>
                      {filter === "PENDING_APPROVAL" ? (
                        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                          <Button variant="success" size="sm" onClick={() => approve(r.matchId)}>
                            Approve
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => reject(r.matchId)}>
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                          <Link href={`/r/${encodeURIComponent(r.campaignCode)}`}>
                            <Button variant="outline" size="sm">
                              Open link
                            </Button>
                          </Link>
                        </div>
                      )}
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

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatUsageRightsScope } from "@/lib/usage-rights";

type Row = {
  deliverableId: string;
  status: string;
  expectedType: string;
  dueAt: string;
  submittedPermalink: string | null;
  submittedNotes: string | null;
  usageRightsGrantedAt: string | null;
  usageRightsScope: string | null;
  verifiedPermalink: string | null;
  failureReason: string | null;
  match: { id: string; campaignCode: string };
  offer: { title: string; usageRightsRequired: boolean; usageRightsScope: string | null };
  creator: { id: string; username: string | null; followersCount: number | null; email: string | null };
};

type Filter = "DUE" | "VERIFIED" | "FAILED";

export default function BrandDeliverablesPage() {
  const [filter, setFilter] = useState<Filter>("DUE");
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [permalinkByDeliverableId, setPermalinkByDeliverableId] = useState<Record<string, string>>({});

  async function load(nextFilter: Filter) {
    setStatus("loading");
    setMessage(null);
    try {
      const url = new URL("/api/brand/deliverables", window.location.origin);
      url.searchParams.set("status", nextFilter);
      const res = await fetch(url.toString(), { method: "GET" });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; deliverables: Row[] }
        | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(
          data && "error" in data && typeof data.error === "string"
            ? data.error
            : "Failed to load",
        );
      }
      setRows(data.deliverables);
      setPermalinkByDeliverableId((prev) => {
        const next = { ...prev };
        for (const r of data.deliverables) {
          if (r.submittedPermalink && !next[r.deliverableId]) next[r.deliverableId] = r.submittedPermalink;
        }
        return next;
      });
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to load");
    }
  }

  useEffect(() => {
    void load(filter);
  }, [filter]);

  async function verify(deliverableId: string) {
    setMessage(null);
    try {
      const permalink = (permalinkByDeliverableId[deliverableId] ?? "").trim();
      const res = await fetch(
        `/api/brand/deliverables/${encodeURIComponent(deliverableId)}/verify`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ permalink: permalink || undefined }),
        },
      );
      const data = (await res.json().catch(() => null)) as { ok: true } | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(
          data && "error" in data && typeof data.error === "string" ? data.error : "Verify failed",
        );
      }
      setMessage("Verified.");
      await load(filter);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Verify failed");
    }
  }

  async function fail(deliverableId: string) {
    setMessage(null);
    try {
      const res = await fetch(`/api/brand/deliverables/${encodeURIComponent(deliverableId)}/fail`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "Rejected by brand" }),
      });
      const data = (await res.json().catch(() => null)) as { ok: true } | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) throw new Error("Fail failed");
      setMessage("Marked as failed (strike issued if not already).");
      await load(filter);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Fail failed");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 md:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Brand</Badge>
              <Badge variant="secondary">Deliverables</Badge>
              <Badge variant="secondary">Verification</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
              Verification queue
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Automated verification runs via connected social accounts; creators can submit a link for manual review.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/brand/matches">
              <Button variant="outline">Approvals</Button>
            </Link>
            <Link href="/brand/shipments">
              <Button variant="outline">Shipments</Button>
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
                  : `${rows.length} results.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-wrap gap-2">
              {(["DUE", "VERIFIED", "FAILED"] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? "default" : "outline"}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </Button>
              ))}
            </div>

            {!rows.length ? (
              <div className="text-sm text-muted-foreground">No deliverables for this filter.</div>
            ) : (
              <div className="grid gap-3">
                {rows.map((r) => (
                  <div key={r.deliverableId} className="rounded-lg border bg-card p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-balance">{r.offer.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Creator:{" "}
                          <span className="font-mono text-foreground">
                            {r.creator.username ?? r.creator.id}
                          </span>{" "}
                          · Code: <span className="font-mono text-foreground">{r.match.campaignCode}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant={r.status === "VERIFIED" ? "success" : r.status === "FAILED" ? "danger" : "outline"}>
                            {r.status}
                          </Badge>
                          <Badge variant="secondary">Type: {r.expectedType}</Badge>
                          <Badge variant="secondary">
                            Followers: {r.creator.followersCount ?? "—"}
                          </Badge>
                          {r.offer.usageRightsRequired ? (
                            <Badge variant={r.usageRightsGrantedAt ? "success" : "warning"}>
                              Rights:{" "}
                              {r.usageRightsGrantedAt
                                ? formatUsageRightsScope(r.usageRightsScope ?? r.offer.usageRightsScope)
                                : "not granted"}
                            </Badge>
                          ) : null}
                        </div>

                        {r.submittedPermalink ? (
                          <a className="mt-3 block break-all text-xs underline" href={r.submittedPermalink} target="_blank" rel="noreferrer">
                            Submitted link
                          </a>
                        ) : null}
                        {r.submittedNotes ? (
                          <div className="mt-2 rounded-lg border bg-muted p-3 text-xs text-muted-foreground">
                            {r.submittedNotes}
                          </div>
                        ) : null}
                        {r.verifiedPermalink ? (
                          <a className="mt-2 block break-all text-xs underline" href={r.verifiedPermalink} target="_blank" rel="noreferrer">
                            Verified link
                          </a>
                        ) : null}
                        {r.failureReason ? (
                          <div className="mt-2 text-sm text-danger">{r.failureReason}</div>
                        ) : null}
                      </div>

                      {filter === "DUE" ? (
                        <div className="w-full max-w-md rounded-lg border bg-muted p-3">
                          <div className="text-xs font-semibold text-muted-foreground">Manual verify</div>
                          <div className="mt-2 flex gap-2">
                            <Input
                              placeholder={
                                r.expectedType === "UGC_ONLY"
                                  ? "https://drive.google.com/..."
                                  : "https://www.tiktok.com/..."
                              }
                              value={permalinkByDeliverableId[r.deliverableId] ?? ""}
                              onChange={(e) =>
                                setPermalinkByDeliverableId((prev) => ({
                                  ...prev,
                                  [r.deliverableId]: e.target.value,
                                }))
                              }
                            />
                            <Button size="sm" variant="success" onClick={() => verify(r.deliverableId)}>
                              Verify
                            </Button>
                          </div>
                          <div className="mt-2 flex justify-end">
                            <Button size="sm" variant="danger" onClick={() => fail(r.deliverableId)}>
                              Fail
                            </Button>
                          </div>
                        </div>
                      ) : null}
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

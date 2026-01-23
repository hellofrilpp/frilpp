"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type OfferRow = {
  id: string;
  title: string;
  template: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  countriesAllowed: string[];
  maxClaims: number;
  deadlineDaysAfterDelivery: number;
  deliverableType: "REELS" | "FEED" | "UGC_ONLY";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  brandName: string;
};

type Filter = "ALL" | "PUBLISHED" | "ARCHIVED";

function deliverableLabel(type: OfferRow["deliverableType"]) {
  if (type === "REELS") return "Reel";
  if (type === "FEED") return "Feed";
  return "UGC only";
}

export default function BrandOffersPage() {
  const [origin, setOrigin] = useState("");
  const [rows, setRows] = useState<OfferRow[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    title: string;
    maxClaims: number;
    deadlineDaysAfterDelivery: number;
  } | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function load() {
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/brand/offers", { method: "GET" });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; offers: OfferRow[] }
        | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(
          data && "error" in data && typeof data.error === "string"
            ? data.error
            : "Failed to load offers",
        );
      }
      setRows(data.offers);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to load offers");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "ALL" && r.status !== filter) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.deliverableType.toLowerCase().includes(q)
      );
    });
  }, [filter, rows, search]);

  function offerLink(offerId: string) {
    return origin ? `${origin}/o/${offerId}` : `/o/${offerId}`;
  }

  function dmTemplate(r: OfferRow) {
    return [
      "Hey! We’d love to send you a free product in exchange for content.",
      "",
      `Offer: ${r.title}`,
      `Claim here: ${offerLink(r.id)}`,
      "",
      "Notes:",
      "- Please keep your shipping info updated in the claim flow.",
      "- If posting is required, you’ll receive a unique caption code after claiming.",
    ].join("\n");
  }

  async function archive(offerId: string) {
    setMessage(null);
    try {
      const res = await fetch(`/api/brand/offers/${encodeURIComponent(offerId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      });
      const data = (await res.json().catch(() => null)) as { ok: true } | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(
          data && "error" in data && typeof data.error === "string" ? data.error : "Archive failed",
        );
      }
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Archive failed");
    }
  }

  async function unarchive(offerId: string) {
    setMessage(null);
    try {
      const res = await fetch(`/api/brand/offers/${encodeURIComponent(offerId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "PUBLISHED" }),
      });
      const data = (await res.json().catch(() => null)) as { ok: true } | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(
          data && "error" in data && typeof data.error === "string" ? data.error : "Unarchive failed",
        );
      }
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unarchive failed");
    }
  }

  async function duplicate(offerId: string) {
    setMessage(null);
    try {
      const res = await fetch(`/api/brand/offers/${encodeURIComponent(offerId)}/duplicate`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; offerId: string }
        | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(
          data && "error" in data && typeof data.error === "string"
            ? data.error
            : "Duplicate failed",
        );
      }
      const url = offerLink(data.offerId);
      setMessage(`Duplicated + published. Link: ${url}`);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Duplicate failed");
    }
  }

  function startEdit(r: OfferRow) {
    setEditingId(r.id);
    setEditDraft({
      title: r.title,
      maxClaims: r.maxClaims,
      deadlineDaysAfterDelivery: r.deadlineDaysAfterDelivery,
    });
    setMessage(null);
  }

  async function saveEdit() {
    if (!editingId || !editDraft) return;
    setMessage(null);
    try {
      const res = await fetch(`/api/brand/offers/${encodeURIComponent(editingId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: editDraft.title,
          maxClaims: editDraft.maxClaims,
          deadlineDaysAfterDelivery: editDraft.deadlineDaysAfterDelivery,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok: true } | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(
          data && "error" in data && typeof data.error === "string" ? data.error : "Save failed",
        );
      }
      setEditingId(null);
      setEditDraft(null);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 md:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Brand</Badge>
              <Badge variant="secondary">Offers</Badge>
              <Badge variant="secondary">Library</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Offer library</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Duplicate an offer, tweak the title/limits, and copy a DM template + claim link in seconds.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/brand/offers/new">
              <Button variant="secondary">New offer</Button>
            </Link>
            <Link href="/brand/billing">
              <Button variant="outline">Billing</Button>
            </Link>
            <Link href="/brand/deliverables">
              <Button variant="outline">Deliverables</Button>
            </Link>
            <Link href="/brand/shipments">
              <Button variant="outline">Shipments</Button>
            </Link>
            <Link href="/brand/analytics">
              <Button variant="outline">Analytics</Button>
            </Link>
            <Link href="/">
              <Button variant="outline">Home</Button>
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
            <CardTitle>Browse</CardTitle>
            <CardDescription>
              {status === "loading"
                ? "Loading…"
                : status === "error"
                  ? "Failed to load (check DATABASE_URL + migrations)."
                  : `${visibleRows.length} offers.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="grid gap-2 sm:max-w-sm">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Title, offer id, deliverable…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={filter === "ALL" ? "default" : "outline"}
                  onClick={() => setFilter("ALL")}
                >
                  All
                </Button>
                <Button
                  size="sm"
                  variant={filter === "PUBLISHED" ? "default" : "outline"}
                  onClick={() => setFilter("PUBLISHED")}
                >
                  Published
                </Button>
                <Button
                  size="sm"
                  variant={filter === "ARCHIVED" ? "default" : "outline"}
                  onClick={() => setFilter("ARCHIVED")}
                >
                  Archived
                </Button>
                <Button size="sm" variant="secondary" onClick={load}>
                  Refresh
                </Button>
              </div>
            </div>

            {!visibleRows.length ? (
              <div className="text-sm text-muted-foreground">No offers match this filter.</div>
            ) : (
              <div className="grid gap-3">
                {visibleRows.map((r) => {
                  const isEditing = editingId === r.id;
                  const link = offerLink(r.id);
                  return (
                    <div key={r.id} className="rounded-lg border bg-card p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-balance">{r.title}</div>
                            <Badge variant={r.status === "PUBLISHED" ? "success" : r.status === "ARCHIVED" ? "secondary" : "outline"}>
                              {r.status}
                            </Badge>
                            <Badge variant="outline">{deliverableLabel(r.deliverableType)}</Badge>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>
                              Offer: <span className="font-mono text-foreground">{r.id}</span>
                            </span>
                            <span className="text-muted-foreground/40">•</span>
                            <span>
                              Max claims:{" "}
                              <span className="font-mono text-foreground">{r.maxClaims}</span>
                            </span>
                            <span className="text-muted-foreground/40">•</span>
                            <span>
                              Due:{" "}
                              <span className="font-mono text-foreground">
                                {r.deadlineDaysAfterDelivery}d
                              </span>
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant="secondary">Claim link</Badge>
                            <span className="truncate font-mono text-xs text-muted-foreground">{link}</span>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                          <Button size="sm" variant="secondary" onClick={() => duplicate(r.id)}>
                            Duplicate
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(link);
                                setMessage("Copied claim link.");
                              } catch {
                                setMessage("Failed to copy.");
                              }
                            }}
                          >
                            Copy link
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(dmTemplate(r));
                                setMessage("Copied DM template.");
                              } catch {
                                setMessage("Failed to copy.");
                              }
                            }}
                          >
                            Copy DM
                          </Button>
                          {isEditing ? (
                            <>
                              <Button size="sm" variant="success" onClick={saveEdit}>
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditDraft(null);
                                }}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => startEdit(r)}>
                              Edit
                            </Button>
                          )}
                          {r.status === "ARCHIVED" ? (
                            <Button size="sm" variant="outline" onClick={() => unarchive(r.id)}>
                              Unarchive
                            </Button>
                          ) : (
                            <Button size="sm" variant="danger" onClick={() => archive(r.id)}>
                              Archive
                            </Button>
                          )}
                        </div>
                      </div>

                      {isEditing && editDraft ? (
                        <div className="mt-4 grid gap-3 rounded-lg border bg-muted p-4">
                          <div className="text-sm font-semibold">Quick edit</div>
                          <div className="grid gap-4 sm:grid-cols-3">
                            <div className="grid gap-2 sm:col-span-3">
                              <Label htmlFor={`title-${r.id}`}>Title</Label>
                              <Input
                                id={`title-${r.id}`}
                                value={editDraft.title}
                                onChange={(e) =>
                                  setEditDraft((d) => (d ? { ...d, title: e.target.value } : d))
                                }
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor={`claims-${r.id}`}>Max claims</Label>
                              <Input
                                id={`claims-${r.id}`}
                                type="number"
                                min={1}
                                value={editDraft.maxClaims}
                                onChange={(e) =>
                                  setEditDraft((d) =>
                                    d ? { ...d, maxClaims: Number(e.target.value) } : d,
                                  )
                                }
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor={`due-${r.id}`}>Due (days)</Label>
                              <Input
                                id={`due-${r.id}`}
                                type="number"
                                min={1}
                                value={editDraft.deadlineDaysAfterDelivery}
                                onChange={(e) =>
                                  setEditDraft((d) =>
                                    d
                                      ? { ...d, deadlineDaysAfterDelivery: Number(e.target.value) }
                                      : d,
                                  )
                                }
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label>DM template</Label>
                              <Textarea value={dmTemplate(r)} readOnly className="min-h-[110px] font-mono text-xs" />
                            </div>
                          </div>
                        </div>
                      ) : null}
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

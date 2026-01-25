"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type BrandOffer = {
  id: string;
  title: string;
  template: "REEL" | "FEED" | "REEL_PLUS_STORY" | "UGC_ONLY";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

type BrandMatch = {
  matchId: string;
  offer: { id: string; title: string };
};

type BrandDeliverable = {
  deliverableId: string;
  offer: { title: string };
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  const data = (await res.json().catch(() => null)) as T;
  if (!res.ok) {
    const err = new Error("Request failed");
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return data;
}

export default function BrandCampaignsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [offers, setOffers] = useState<BrandOffer[]>([]);
  const [pendingMatches, setPendingMatches] = useState<BrandMatch[]>([]);
  const [acceptedMatches, setAcceptedMatches] = useState<BrandMatch[]>([]);
  const [verifiedDeliverables, setVerifiedDeliverables] = useState<BrandDeliverable[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMessage(null);
      try {
        const [offersRes, pendingRes, acceptedRes, verifiedRes] = await Promise.all([
          fetchJson<{ ok: boolean; offers: BrandOffer[] }>("/api/brand/offers"),
          fetchJson<{ ok: boolean; matches: BrandMatch[] }>(
            "/api/brand/matches?status=PENDING_APPROVAL",
          ),
          fetchJson<{ ok: boolean; matches: BrandMatch[] }>(
            "/api/brand/matches?status=ACCEPTED",
          ),
          fetchJson<{ ok: boolean; deliverables: BrandDeliverable[] }>(
            "/api/brand/deliverables?status=VERIFIED",
          ),
        ]);

        if (cancelled) return;
        setOffers(offersRes.offers ?? []);
        setPendingMatches(pendingRes.matches ?? []);
        setAcceptedMatches(acceptedRes.matches ?? []);
        setVerifiedDeliverables(verifiedRes.deliverables ?? []);
      } catch (err) {
        const statusCode = err && typeof err === "object" && "status" in err ? (err as { status?: number }).status : undefined;
        if (statusCode === 401) {
          window.location.href = "/brand/auth";
          return;
        }
        if (!cancelled) setMessage("Failed to load campaigns.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const statusLabel = (status: BrandOffer["status"]) => {
    if (status === "PUBLISHED") return "active";
    if (status === "ARCHIVED") return "paused";
    return "draft";
  };

  const templateLabel = (template: BrandOffer["template"]) => {
    switch (template) {
      case "REEL_PLUS_STORY":
        return "1 Reel + Story";
      case "REEL":
        return "1 Reel";
      case "FEED":
        return "1 Feed post";
      default:
        return "UGC only";
    }
  };

  const campaigns = useMemo(() => {
    const pendingByOffer = pendingMatches.reduce<Record<string, number>>((acc, match) => {
      acc[match.offer.id] = (acc[match.offer.id] ?? 0) + 1;
      return acc;
    }, {});

    const acceptedByOffer = acceptedMatches.reduce<Record<string, number>>((acc, match) => {
      acc[match.offer.id] = (acc[match.offer.id] ?? 0) + 1;
      return acc;
    }, {});

    const completeByOffer = verifiedDeliverables.reduce<Record<string, number>>((acc, deliverable) => {
      const offerId = offers.find((offer) => offer.title === deliverable.offer.title)?.id;
      if (!offerId) return acc;
      acc[offerId] = (acc[offerId] ?? 0) + 1;
      return acc;
    }, {});

    return offers.map((offer) => ({
      id: offer.id,
      name: offer.title,
      product: offer.title,
      value: "$0",
      requirements: templateLabel(offer.template),
      status: statusLabel(offer.status),
      matches: acceptedByOffer[offer.id] ?? 0,
      pending: pendingByOffer[offer.id] ?? 0,
      complete: completeByOffer[offer.id] ?? 0,
      rawStatus: offer.status,
    }));
  }, [offers, pendingMatches, acceptedMatches, verifiedDeliverables]);

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === "all" || campaign.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleStatusChange = async (offerId: string, status: "PUBLISHED" | "ARCHIVED") => {
    try {
      await fetchJson(`/api/brand/offers/${offerId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const refreshed = await fetchJson<{ ok: boolean; offers: BrandOffer[] }>("/api/brand/offers");
      setOffers(refreshed.offers ?? []);
    } catch {
      setMessage("Update failed.");
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteTarget || deleteConfirm.trim() !== "DELETE") return;
    try {
      await fetchJson(`/api/brand/offers/${deleteTarget.id}`, { method: "DELETE" });
      const refreshed = await fetchJson<{ ok: boolean; offers: BrandOffer[] }>("/api/brand/offers");
      setOffers(refreshed.offers ?? []);
    } catch {
      setMessage("Delete failed.");
    } finally {
      setDeleteConfirm("");
      setDeleteTarget(null);
      setDeleteOpen(false);
    }
  };

  const handleDuplicate = async (offerId: string) => {
    try {
      await fetchJson(`/api/brand/offers/${offerId}/duplicate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const refreshed = await fetchJson<{ ok: boolean; offers: BrandOffer[] }>("/api/brand/offers");
      setOffers(refreshed.offers ?? []);
    } catch {
      setMessage("Duplicate failed.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Brand</Badge>
              <Badge variant="secondary">Campaigns</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
              Your offers
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage product seeding campaigns.
            </p>
          </div>
          <Link href="/brand/campaigns/new">
            <Button>New campaign</Button>
          </Link>
        </div>

        {message ? (
          <div className="mt-6 rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
            {message}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative max-w-md flex-1">
            <Input
              placeholder="Search campaigns…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["all", "active", "paused", "draft"].map((status) => (
              <Button
                key={status}
                variant={filter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(status)}
              >
                {status.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCampaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle>{campaign.name}</CardTitle>
                  <CardDescription>{campaign.requirements}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={campaign.status === "active" ? "success" : campaign.status === "paused" ? "warning" : "secondary"}>
                    {campaign.status.toUpperCase()}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        …
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/brand/campaigns/${campaign.id}`}>View</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault();
                          handleStatusChange(
                            campaign.id,
                            campaign.rawStatus === "ARCHIVED" ? "PUBLISHED" : "ARCHIVED",
                          );
                        }}
                      >
                        {campaign.status === "paused" ? "Resume" : "Pause"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault();
                          handleDuplicate(campaign.id);
                        }}
                      >
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(event) => {
                          event.preventDefault();
                          handleStatusChange(campaign.id, "ARCHIVED");
                        }}
                      >
                        Archive
                      </DropdownMenuItem>
                      {campaign.rawStatus === "DRAFT" ? (
                        <DropdownMenuItem
                          onSelect={(event) => {
                            event.preventDefault();
                            setDeleteTarget({ id: campaign.id, name: campaign.name });
                            setDeleteConfirm("");
                            setDeleteOpen(true);
                          }}
                        >
                          Delete permanently
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{campaign.matches} match</span>
                  <span>{campaign.pending} pending</span>
                  <span>{campaign.complete} done</span>
                </div>
                <div className="mt-3 h-2 rounded bg-muted">
                  <div
                    className="h-full rounded bg-primary"
                    style={{
                      width: `${(campaign.complete / Math.max(campaign.matches, 1)) * 100}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete draft campaign</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes {deleteTarget?.name ?? "this draft"}. Type DELETE to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-3">
            <Input
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value)}
              placeholder="DELETE"
            />
          </div>
          <AlertDialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirm("");
                setDeleteTarget(null);
                setDeleteOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handlePermanentDelete}
              disabled={deleteConfirm.trim() !== "DELETE"}
            >
              Delete permanently
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

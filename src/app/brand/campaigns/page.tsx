"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  MoreVertical,
  Eye,
  Pause,
  Copy,
  Trash2,
  Package,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const router = useRouter();

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

  const statusLabel = (
    status: BrandOffer["status"],
    stats: { accepted: number; complete: number; pending: number },
  ) => {
    if (status === "ARCHIVED") return "paused";
    if (status === "DRAFT") return "draft";
    const hasNoPending = stats.pending === 0;
    const hasAllAcceptedComplete = stats.accepted > 0 && stats.complete >= stats.accepted;
    const hasCompletedOnly = stats.complete > 0 && stats.accepted === 0 && hasNoPending;
    if (hasNoPending && (hasAllAcceptedComplete || hasCompletedOnly)) return "complete";
    return "active";
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

    const offerIdByTitle = offers.reduce<Record<string, string>>((acc, offer) => {
      acc[offer.title] = offer.id;
      return acc;
    }, {});

    const completeByOffer = verifiedDeliverables.reduce<Record<string, number>>((acc, deliverable) => {
      const offerId = offerIdByTitle[deliverable.offer.title];
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
      status: statusLabel(offer.status, {
        accepted: acceptedByOffer[offer.id] ?? 0,
        complete: completeByOffer[offer.id] ?? 0,
        pending: pendingByOffer[offer.id] ?? 0,
      }),
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-neon-green text-background";
      case "complete":
        return "bg-neon-green/20 text-neon-green border-2 border-neon-green";
      case "paused":
        return "bg-neon-yellow/20 text-neon-yellow border-2 border-neon-yellow";
      case "draft":
        return "border-2 border-border text-muted-foreground";
      default:
        return "";
    }
  };

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
      <div className="p-6 md:p-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5 text-neon-pink" />
              <span className="text-xs font-pixel text-neon-pink">[CAMPAIGNS]</span>
            </div>
            <h1 className="text-xl md:text-2xl font-pixel text-foreground">YOUR OFFERS</h1>
            <p className="font-mono text-sm text-muted-foreground mt-1">
              &gt; Manage product seeding campaigns
            </p>
          </div>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-pixel text-xs px-6 pixel-btn glow-green"
            onClick={() => router.push("/brand/campaigns/new")}
          >
            <Plus className="w-4 h-4 mr-2" />
            NEW CAMPAIGN
          </Button>
        </div>

        {message ? (
          <div className="mb-6 border-2 border-border bg-muted p-4 text-xs font-mono text-muted-foreground">
            {message}
          </div>
        ) : null}

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="SEARCH_CAMPAIGNS..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-10 border-2 border-border font-mono text-sm focus:border-primary"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["all", "active", "complete", "paused", "draft"].map((status) => (
              <Button
                key={status}
                variant="outline"
                size="sm"
                onClick={() => setFilter(status)}
                className={`font-mono text-xs border-2 ${
                  filter === status
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:border-primary"
                }`}
              >
                {status.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="border-4 border-border bg-card p-5 hover:border-neon-pink transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 border-4 border-neon-purple bg-neon-purple/10 flex items-center justify-center">
                  <Package className="w-7 h-7 text-neon-purple" />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-pixel ${getStatusColor(campaign.status)}`}>
                    {campaign.status.toUpperCase()}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 border-2 border-transparent hover:border-border">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="border-2 border-border">
                      <DropdownMenuItem
                        className="font-mono text-xs"
                        onSelect={(event) => {
                          event.preventDefault();
                          router.push(`/brand/campaigns/${campaign.id}`);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        VIEW
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="font-mono text-xs"
                        onSelect={(event) => {
                          event.preventDefault();
                          if (campaign.rawStatus === "ARCHIVED") {
                            handleStatusChange(campaign.id, "PUBLISHED");
                          } else {
                            handleStatusChange(campaign.id, "ARCHIVED");
                          }
                        }}
                      >
                        {campaign.status === "paused" ? (
                          <Play className="w-4 h-4 mr-2" />
                        ) : (
                          <Pause className="w-4 h-4 mr-2" />
                        )}
                        {campaign.status === "paused" ? "RESUME" : "PAUSE"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="font-mono text-xs"
                        onSelect={(event) => {
                          event.preventDefault();
                          handleDuplicate(campaign.id);
                        }}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        DUPLICATE
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="font-mono text-xs text-destructive"
                        onSelect={(event) => {
                          event.preventDefault();
                          const confirmed = window.confirm("Archive campaign?");
                          if (!confirmed) return;
                          handleStatusChange(campaign.id, "ARCHIVED");
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        ARCHIVE
                      </DropdownMenuItem>
                      {campaign.rawStatus === "DRAFT" ? (
                        <DropdownMenuItem
                          className="font-mono text-xs text-destructive"
                          onSelect={(event) => {
                            event.preventDefault();
                            setDeleteTarget({ id: campaign.id, name: campaign.name });
                            setDeleteConfirm("");
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          DELETE PERMANENTLY
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <h3 className="font-pixel text-sm mb-1 text-foreground group-hover:text-neon-pink transition-colors">
                {campaign.name}
              </h3>
              <p className="text-xs font-mono text-muted-foreground mb-4">{campaign.product}</p>

              <div className="flex gap-3 text-xs font-mono text-muted-foreground mb-4">
                <span className="text-neon-yellow">{campaign.value}</span>
                <span>|</span>
                <span>{campaign.requirements}</span>
              </div>

              <div className="flex gap-4 text-xs font-mono">
                <div>
                  <span className="text-lg font-pixel text-neon-green">{campaign.matches}</span>
                  <span className="text-muted-foreground ml-1">match</span>
                </div>
                <div>
                  <span className="text-lg font-pixel text-neon-yellow">{campaign.pending}</span>
                  <span className="text-muted-foreground ml-1">pend</span>
                </div>
                <div>
                  <span className="text-lg font-pixel text-neon-pink">{campaign.complete}</span>
                  <span className="text-muted-foreground ml-1">done</span>
                </div>
              </div>

              <div className="mt-4 h-2 bg-muted flex overflow-hidden">
                <div
                  className="h-full bg-neon-green"
                  style={{ width: `${(campaign.complete / Math.max(campaign.matches, 1)) * 100}%` }}
                />
                <div
                  className="h-full bg-neon-yellow"
                  style={{ width: `${(campaign.pending / Math.max(campaign.matches, 1)) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="border-4 border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-pixel text-sm text-neon-pink">
              DELETE DRAFT CAMPAIGN
            </AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-xs">
              This permanently deletes{" "}
              <span className="text-foreground">{deleteTarget?.name ?? "this draft"}</span>. Type
              DELETE to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-3">
            <Input
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value)}
              placeholder="DELETE"
              className="border-2 border-border font-mono text-xs"
            />
          </div>
          <AlertDialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="border-2 font-mono text-xs"
              onClick={() => {
                setDeleteConfirm("");
                setDeleteTarget(null);
                setDeleteOpen(false);
              }}
            >
              CANCEL
            </Button>
            <Button
              variant="outline"
              className="border-2 font-mono text-xs text-destructive"
              onClick={handlePermanentDelete}
              disabled={deleteConfirm.trim() !== "DELETE"}
            >
              DELETE PERMANENTLY
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const filters = ["ALL", "PUBLISHED", "DRAFT", "ARCHIVED"] as const;

type ApiError = Error & { status?: number; code?: string };

type CampaignRow = {
  id: string;
  title: string;
  status: "PUBLISHED" | "DRAFT" | "ARCHIVED";
  template: string;
  brandName: string;
  createdAt: string;
  publishedAt: string | null;
  matchCount: number;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  const data = (await res.json().catch(() => null)) as T & { error?: string; code?: string };
  if (!res.ok) {
    const err = new Error(data?.error ?? "Request failed") as ApiError;
    err.status = res.status;
    err.code = data?.code;
    throw err;
  }
  return data;
}

export default function AdminCampaignsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("ALL");
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchJson<{ ok: boolean; campaigns: CampaignRow[] }>(
          "/api/admin/campaigns",
        );
        if (cancelled) return;
        setCampaigns(res.campaigns ?? []);
      } catch (err) {
        const apiErr = err as ApiError;
        if (apiErr?.status === 401 || apiErr?.status === 403) {
          router.replace("/idiot");
          return;
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return campaigns.filter((campaign) => {
      const matchesQuery =
        campaign.title.toLowerCase().includes(q) ||
        campaign.brandName.toLowerCase().includes(q);
      const matchesFilter = filter === "ALL" || campaign.status === filter;
      return matchesQuery && matchesFilter;
    });
  }, [campaigns, query, filter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Campaigns</h1>
        <p className="text-sm text-muted-foreground">
          Full campaign inventory across the platform.
        </p>
      </div>

      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="text-base">Search & filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by campaign or brand"
            className="border-2 border-border font-mono"
          />
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <Button
                key={item}
                size="sm"
                variant={filter === item ? "default" : "outline"}
                className="text-xs font-mono"
                onClick={() => setFilter(item)}
              >
                {item}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="text-base">Campaign list</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-xs font-mono text-muted-foreground">Loading campaigns...</p>
          ) : filtered.length ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr className="border-b-2 border-border">
                    <th className="py-2 pr-4">Campaign</th>
                    <th className="py-2 pr-4">Brand</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Matches</th>
                    <th className="py-2 pr-4">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((campaign) => (
                    <tr key={campaign.id} className="border-b border-border/60">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/idiot/campaigns/${campaign.id}`}
                          className="font-medium hover:underline"
                        >
                          {campaign.title}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {campaign.template}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-sm">{campaign.brandName}</td>
                      <td className="py-3 pr-4">
                        <span className="rounded-full border border-border px-2 py-1 text-xs">
                          {campaign.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-sm">{campaign.matchCount}</td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        {new Date(campaign.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs font-mono text-muted-foreground">No campaigns found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

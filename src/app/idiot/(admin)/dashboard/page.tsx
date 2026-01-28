"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Briefcase, Megaphone, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ADMIN_EMAIL = "hello@frilpp.com";

type ApiError = Error & { status?: number; code?: string };

type OverviewResponse = {
  ok: boolean;
  totals: {
    brands: number;
    creators: number;
    users: number;
    campaigns: number;
    campaignsActive: number;
    matches: number;
    deliverables: number;
  };
};

type CampaignRow = {
  id: string;
  title: string;
  status: string;
  template: string;
  brandName: string;
  createdAt: string;
  matchCount: number;
};

type CreatorRow = {
  id: string;
  username: string | null;
  fullName: string | null;
  country: string | null;
  followersCount: number | null;
  createdAt: string;
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

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [creators, setCreators] = useState<CreatorRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [overviewRes, campaignsRes, creatorsRes] = await Promise.all([
          fetchJson<OverviewResponse>("/api/admin/overview"),
          fetchJson<{ ok: boolean; campaigns: CampaignRow[] }>("/api/admin/campaigns"),
          fetchJson<{ ok: boolean; creators: CreatorRow[] }>("/api/admin/creators"),
        ]);
        if (cancelled) return;
        setOverview(overviewRes);
        setCampaigns(campaignsRes.campaigns ?? []);
        setCreators(creatorsRes.creators ?? []);
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

  const recentCampaigns = useMemo(() => campaigns.slice(0, 6), [campaigns]);
  const recentCreators = useMemo(() => creators.slice(0, 6), [creators]);

  if (loading) {
    return (
      <div className="border-2 border-border bg-card p-6 text-xs font-mono text-muted-foreground">
        Loading dashboard...
      </div>
    );
  }

  const totals = overview?.totals;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <BadgeCheck className="h-4 w-4 text-primary" />
          ADMIN OVERVIEW
        </div>
        <h1 className="mt-2 text-2xl font-semibold">Platform snapshot</h1>
        <p className="text-sm text-muted-foreground">
          High-level totals across businesses, creators, and campaigns.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-2 border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Businesses</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totals?.brands ?? 0}</div>
            <p className="text-xs text-muted-foreground">Registered campaign owners</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Creators</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totals?.creators ?? 0}</div>
            <p className="text-xs text-muted-foreground">Active creator profiles</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Campaigns</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totals?.campaigns ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {totals?.campaignsActive ?? 0} active
            </p>
          </CardContent>
        </Card>
        <Card className="border-2 border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Matches</CardTitle>
            <BadgeCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totals?.matches ?? 0}</div>
            <p className="text-xs text-muted-foreground">Creator-to-campaign joins</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-2 border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent campaigns</CardTitle>
              <p className="text-xs text-muted-foreground">Latest 6 campaigns</p>
            </div>
            <Link href="/idiot/campaigns">
              <Button size="sm" variant="outline" className="text-xs font-mono">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentCampaigns.length ? (
                recentCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between border-2 border-border bg-card/60 px-3 py-2 text-sm"
                  >
                    <div>
                      <Link href={`/idiot/campaigns/${campaign.id}`} className="font-medium">
                        {campaign.title}
                      </Link>
                      <div className="text-xs text-muted-foreground">{campaign.brandName}</div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>{campaign.status}</div>
                      <div>{campaign.matchCount} matches</div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No campaigns found.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent creators</CardTitle>
              <p className="text-xs text-muted-foreground">Latest 6 creators</p>
            </div>
            <Link href="/idiot/creators">
              <Button size="sm" variant="outline" className="text-xs font-mono">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentCreators.length ? (
                recentCreators.map((creator) => (
                  <div
                    key={creator.id}
                    className="flex items-center justify-between border-2 border-border bg-card/60 px-3 py-2 text-sm"
                  >
                    <div>
                      <Link href={`/idiot/creators/${creator.id}`} className="font-medium">
                        {creator.fullName || creator.username || "Unnamed"}
                      </Link>
                      <div className="text-xs text-muted-foreground">
                        {creator.username ? `@${creator.username}` : creator.country ?? "N/A"}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>{creator.matchCount} matches</div>
                      <div>{creator.followersCount ?? 0} followers</div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No creators found.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="text-base">Admin notes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Logged in as {ADMIN_EMAIL}. Use the sections above to drill into campaign and creator data.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

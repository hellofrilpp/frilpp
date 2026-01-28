"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ADMIN_EMAIL = "hello@frilpp.com";

type ApiError = Error & { status?: number; code?: string };

type CampaignDetail = {
  id: string;
  title: string;
  status: string;
  template: string;
  deliverableType: string;
  createdAt: string;
  publishedAt: string | null;
  maxClaims: number;
  deadlineDaysAfterDelivery: number;
  metadata: Record<string, unknown>;
  brandId: string;
  brandName: string;
  matchCounts: Array<{ status: string; total: number }>;
  deliverableCounts: Array<{ status: string; total: number }>;
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

export default function CampaignDetailClient({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchJson<{ ok: boolean; campaign: CampaignDetail }>(
          `/api/admin/campaigns/${offerId}`,
        );
        if (!cancelled) setCampaign(res.campaign);
      } catch (err) {
        const apiErr = err as ApiError;
        if (apiErr?.status === 401 || apiErr?.status === 403) {
          router.replace("/idiot");
          return;
        }
        if (apiErr?.status === 404) {
          router.replace("/idiot/campaigns");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [offerId, router]);

  if (loading) {
    return (
      <div className="border-2 border-border bg-card p-6 text-xs font-mono text-muted-foreground">
        Loading campaign...
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="border-2 border-border bg-card p-6 text-xs font-mono text-muted-foreground">
        Campaign not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/idiot/campaigns" className="text-xs font-mono text-muted-foreground">
          <- Back to campaigns
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{campaign.title}</h1>
        <p className="text-sm text-muted-foreground">
          {campaign.brandName} - {campaign.status}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-2 border-border">
          <CardHeader>
            <CardTitle className="text-base">Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>Template: {campaign.template}</div>
            <div>Deliverable type: {campaign.deliverableType}</div>
            <div>Max claims: {campaign.maxClaims}</div>
            <div>Deadline days: {campaign.deadlineDaysAfterDelivery}</div>
            <div>Created: {new Date(campaign.createdAt).toLocaleString()}</div>
            <div>
              Published: {campaign.publishedAt ? new Date(campaign.publishedAt).toLocaleString() : "N/A"}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-border">
          <CardHeader>
            <CardTitle className="text-base">Match status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {campaign.matchCounts.length ? (
              campaign.matchCounts.map((row) => (
                <div key={row.status} className="flex items-center justify-between">
                  <span>{row.status}</span>
                  <span>{row.total}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground">No matches yet.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="text-base">Deliverables</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {campaign.deliverableCounts.length ? (
            campaign.deliverableCounts.map((row) => (
              <div key={row.status} className="flex items-center justify-between">
                <span>{row.status}</span>
                <span>{row.total}</span>
              </div>
            ))
          ) : (
            <div className="text-xs text-muted-foreground">No deliverables yet.</div>
          )}
        </CardContent>
      </Card>

      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="text-base">Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap rounded border border-border bg-muted/40 p-4 text-xs">
            {JSON.stringify(campaign.metadata, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">Logged in as {ADMIN_EMAIL}.</p>
    </div>
  );
}

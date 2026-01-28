"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ADMIN_EMAIL = "hello@frilpp.com";

type ApiError = Error & { status?: number; code?: string };

type MatchRow = {
  matchId: string;
  status: string;
  createdAt: string;
  offerId: string;
  offerTitle: string;
  brandId: string;
  brandName: string;
};

type CreatorDetail = {
  id: string;
  username: string | null;
  fullName: string | null;
  email: string | null;
  followersCount: number | null;
  country: string | null;
  categories: string[] | null;
  categoriesOther: string | null;
  phone: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  zip: string | null;
  createdAt: string;
  matches: MatchRow[];
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

export default function CreatorDetailClient({ creatorId }: { creatorId: string }) {
  const router = useRouter();
  const [creator, setCreator] = useState<CreatorDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchJson<{ ok: boolean; creator: CreatorDetail }>(
          `/api/admin/creators/${creatorId}`,
        );
        if (!cancelled) setCreator(res.creator);
      } catch (err) {
        const apiErr = err as ApiError;
        if (apiErr?.status === 401 || apiErr?.status === 403) {
          router.replace("/idiot");
          return;
        }
        if (apiErr?.status === 404) {
          router.replace("/idiot/creators");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [creatorId, router]);

  if (loading) {
    return (
      <div className="border-2 border-border bg-card p-6 text-xs font-mono text-muted-foreground">
        Loading creator...
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="border-2 border-border bg-card p-6 text-xs font-mono text-muted-foreground">
        Creator not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/idiot/creators" className="text-xs font-mono text-muted-foreground">
          <- Back to creators
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">
          {creator.fullName || creator.username || "Unnamed creator"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {creator.username ? `@${creator.username}` : "N/A"} - {creator.email ?? "No email"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-2 border-border">
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>Followers: {creator.followersCount ?? 0}</div>
            <div>Country: {creator.country ?? "N/A"}</div>
            <div>Phone: {creator.phone ?? "N/A"}</div>
            <div>
              Categories: {creator.categories?.length ? creator.categories.join(", ") : "N/A"}
            </div>
            <div>Other: {creator.categoriesOther ?? "N/A"}</div>
            <div>Joined: {new Date(creator.createdAt).toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="border-2 border-border">
          <CardHeader>
            <CardTitle className="text-base">Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>{creator.address1 ?? "N/A"}</div>
            <div>{creator.address2 ?? ""}</div>
            <div>
              {creator.city ?? ""} {creator.province ?? ""} {creator.zip ?? ""}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="text-base">Recent matches</CardTitle>
        </CardHeader>
        <CardContent>
          {creator.matches.length ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr className="border-b-2 border-border">
                    <th className="py-2 pr-4">Campaign</th>
                    <th className="py-2 pr-4">Brand</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {creator.matches.map((match) => (
                    <tr key={match.matchId} className="border-b border-border/60">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/idiot/campaigns/${match.offerId}`}
                          className="font-medium hover:underline"
                        >
                          {match.offerTitle}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-sm">{match.brandName}</td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        {match.status}
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        {new Date(match.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No matches yet.</p>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">Logged in as {ADMIN_EMAIL}.</p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const filters = ["ALL", "US", "IN", "OTHER"] as const;

type ApiError = Error & { status?: number; code?: string };

type CreatorRow = {
  id: string;
  username: string | null;
  fullName: string | null;
  email: string | null;
  followersCount: number | null;
  country: string | null;
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

export default function AdminCreatorsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]>("ALL");
  const [creators, setCreators] = useState<CreatorRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchJson<{ ok: boolean; creators: CreatorRow[] }>("/api/admin/creators");
        if (cancelled) return;
        setCreators(res.creators ?? []);
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
    return creators.filter((creator) => {
      const name = creator.fullName ?? "";
      const username = creator.username ?? "";
      const email = creator.email ?? "";
      const matchesQuery =
        name.toLowerCase().includes(q) ||
        username.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q);
      const country = creator.country?.toUpperCase() ?? "OTHER";
      const matchesFilter =
        filter === "ALL" ||
        (filter === "OTHER" && country !== "US" && country !== "IN") ||
        country === filter;
      return matchesQuery && matchesFilter;
    });
  }, [creators, query, filter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Creators</h1>
        <p className="text-sm text-muted-foreground">All creator profiles on the platform.</p>
      </div>

      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="text-base">Search & filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, username, or email"
            className="border-2 border-border font-mono"
          />
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`rounded border-2 px-3 py-1 text-xs font-mono ${
                  filter === item ? "border-primary bg-primary text-primary-foreground" : "border-border"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="text-base">Creator list</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-xs font-mono text-muted-foreground">Loading creators...</p>
          ) : filtered.length ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr className="border-b-2 border-border">
                    <th className="py-2 pr-4">Creator</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Country</th>
                    <th className="py-2 pr-4">Followers</th>
                    <th className="py-2 pr-4">Matches</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((creator) => (
                    <tr key={creator.id} className="border-b border-border/60">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/idiot/creators/${creator.id}`}
                          className="font-medium hover:underline"
                        >
                          {creator.fullName || creator.username || "Unnamed"}
                        </Link>
                        <div className="text-xs text-muted-foreground">
                          {creator.username ? `@${creator.username}` : "N/A"}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        {creator.email ?? "N/A"}
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        {creator.country ?? "N/A"}
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        {creator.followersCount ?? 0}
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        {creator.matchCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs font-mono text-muted-foreground">No creators found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

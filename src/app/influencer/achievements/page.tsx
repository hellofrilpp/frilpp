"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
  rarity: "common" | "rare" | "epic" | "legendary";
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
};

type AchievementsResponse = {
  achievements: Achievement[];
  totalXp: number;
  unlockedCount: number;
  level: number;
  activeStrikes: number;
  generatedAt: string;
};

const rarityVariant: Record<Achievement["rarity"], "secondary" | "outline" | "warning" | "success"> = {
  common: "outline",
  rare: "secondary",
  epic: "warning",
  legendary: "success",
};

export default function CreatorAchievementsPage() {
  const [data, setData] = useState<AchievementsResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus("loading");
      setMessage(null);
      try {
        const res = await fetch("/api/creator/achievements", { method: "GET" });
        const json = (await res.json().catch(() => null)) as
          | ({ ok: true } & AchievementsResponse)
          | { ok: false; error?: string };
        if (!res.ok || !json || !("ok" in json) || json.ok !== true) {
          throw new Error(
            json && "error" in json && typeof json.error === "string" ? json.error : "Failed",
          );
        }
        if (cancelled) return;
        setData({
          achievements: json.achievements,
          totalXp: json.totalXp,
          unlockedCount: json.unlockedCount,
          level: json.level,
          activeStrikes: json.activeStrikes,
          generatedAt: json.generatedAt,
        });
        setStatus("idle");
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Failed to load achievements");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const unlocked = useMemo(() => {
    return (data?.achievements ?? []).filter((a) => a.unlocked);
  }, [data?.achievements]);

  const locked = useMemo(() => {
    return (data?.achievements ?? []).filter((a) => !a.unlocked);
  }, [data?.achievements]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-4 py-10 md:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Creator</Badge>
              <Badge variant="secondary">Achievements</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Build your status</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Consistency unlocks priority offers and faster approvals.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/influencer/feed">
              <Button variant="secondary">Feed</Button>
            </Link>
            <Link href="/influencer/deals">
              <Button variant="outline">Deals</Button>
            </Link>
            <Link href="/influencer/performance">
              <Button variant="outline">Performance</Button>
            </Link>
            <Link href="/influencer/settings">
              <Button variant="outline">Profile</Button>
            </Link>
          </div>
        </div>

        {message ? (
          <div className="mt-6 rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
            {message}
          </div>
        ) : null}

        <div className="mt-8 grid gap-3 sm:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Level</CardTitle>
              <CardDescription>Your creator rank</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{data?.level ?? "—"}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>XP</CardTitle>
              <CardDescription>Total</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{data?.totalXp ?? "—"}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Unlocked</CardTitle>
              <CardDescription>Badges</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{data?.unlockedCount ?? "—"}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Strikes</CardTitle>
              <CardDescription>Active</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{data?.activeStrikes ?? "—"}</CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Unlocked</CardTitle>
            <CardDescription>
              {status === "loading"
                ? "Loading…"
                : status === "error"
                  ? "Error (check login + creator profile)."
                  : `${unlocked.length} unlocked.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!unlocked.length ? (
              <div className="text-sm text-muted-foreground">No achievements yet.</div>
            ) : (
              <div className="grid gap-3">
                {unlocked.map((a) => (
                  <div key={a.id} className="rounded-lg border bg-card p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">
                          <span className="mr-2">{a.icon}</span>
                          {a.name}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{a.description}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant={rarityVariant[a.rarity]}>{a.rarity}</Badge>
                          <Badge variant="secondary">{a.xp} XP</Badge>
                        </div>
                      </div>
                      <Badge variant="success">Unlocked</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Next up</CardTitle>
            <CardDescription>{locked.length} remaining.</CardDescription>
          </CardHeader>
          <CardContent>
            {!locked.length ? (
              <div className="text-sm text-muted-foreground">All achievements unlocked.</div>
            ) : (
              <div className="grid gap-3">
                {locked.map((a) => (
                  <div key={a.id} className="rounded-lg border bg-card p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">
                          <span className="mr-2">{a.icon}</span>
                          {a.name}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{a.description}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant={rarityVariant[a.rarity]}>{a.rarity}</Badge>
                          <Badge variant="secondary">{a.xp} XP</Badge>
                          {typeof a.progress === "number" && typeof a.maxProgress === "number" ? (
                            <Badge variant="outline">
                              {Math.min(a.progress, a.maxProgress)}/{a.maxProgress}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                      <Badge variant="outline">Locked</Badge>
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


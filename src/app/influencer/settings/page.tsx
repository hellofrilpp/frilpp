"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CreatorProfile = {
  id: string;
  username: string | null;
  followersCount: number | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  zip: string | null;
  lat?: number | null;
  lng?: number | null;
};

export default function InfluencerSettingsPage() {
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "saved" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<
    Array<{ provider: string; username: string | null; providerUserId: string }>
  >([]);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "deleting" | "done" | "error">("idle");
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatus("loading");
      setError(null);
      try {
        const res = await fetch("/api/creator/profile", { method: "GET" });
        const data = (await res.json().catch(() => null)) as
          | { ok: true; creator: CreatorProfile }
          | { ok: false; error?: string };
        if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
          throw new Error(
            data && "error" in data && typeof data.error === "string"
              ? data.error
              : "Failed to load profile",
          );
        }
        if (cancelled) return;
        setProfile(data.creator);
        setStatus("idle");
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "Failed to load profile");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/social/accounts", { method: "GET" });
        const data = (await res.json().catch(() => null)) as
          | { ok: true; accounts: Array<{ provider: string; username: string | null; providerUserId: string }> }
          | { ok: false };
        if (!res.ok || !data || !("ok" in data) || data.ok !== true) return;
        if (cancelled) return;
        setSocialAccounts(data.accounts);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    if (!profile) return;
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/creator/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; creator: CreatorProfile }
        | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(
          data && "error" in data && typeof data.error === "string"
            ? data.error
            : "Save failed",
        );
      }
      setProfile(data.creator);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1200);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  const deliveryReady = Boolean(profile?.address1 && profile?.city && profile?.zip);

  async function deleteAccount() {
    if (deleteConfirm.trim() !== "DELETE") return;
    setDeleteStatus("deleting");
    setDeleteMessage(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const data = (await res.json().catch(() => null)) as { ok: true } | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(
          data && "error" in data && typeof data.error === "string"
            ? data.error
            : "Account deletion failed",
        );
      }
      setDeleteStatus("done");
      setDeleteMessage("Account deleted. Redirecting...");
      setTimeout(() => {
        window.location.href = "/";
      }, 800);
    } catch (err) {
      setDeleteStatus("error");
      setDeleteMessage(err instanceof Error ? err.message : "Account deletion failed");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-10 md:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Creator</Badge>
              <Badge variant="secondary">Profile</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
              Profile + eligibility
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Used for eligibility, local matching, and pickup/local delivery coordination.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/influencer/feed">
              <Button variant="secondary" size="sm">
                Back to feed
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="sm">
                Home
              </Button>
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
            {error}
          </div>
        ) : null}

        {profile && !profile.email ? (
          <div className="mt-6 rounded-lg border border-border bg-muted p-4 text-sm text-muted-foreground">
            Add an email to enable billing, receipts, and account recovery.
          </div>
        ) : null}

        <Card className="mt-8">
          <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                {status === "loading"
                  ? "Loading…"
                  : status === "saving"
                    ? "Saving…"
                    : status === "saved"
                      ? "Saved."
                      : status === "error"
                        ? "Error (check auth + DB)."
                        : deliveryReady
                          ? "Shipping profile ready."
                          : "Add shipping address to enable delivery offers."}
              </CardDescription>
            </CardHeader>
          <CardContent>
            {!profile ? (
              <div className="text-sm text-muted-foreground">No profile loaded.</div>
            ) : (
              <div className="grid gap-6">
                <div className="rounded-lg border bg-muted p-4">
                  <div className="text-sm font-semibold">Connected accounts</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Connect TikTok (and YouTube if needed).
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {socialAccounts.length ? (
                      socialAccounts.map((a) => (
                        <Badge key={`${a.provider}:${a.providerUserId}`} variant="secondary">
                          {a.provider}
                          {a.username ? `: ${a.username}` : ""}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="warning">None connected</Badge>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a href="/api/auth/social/tiktok/connect?next=%2Finfluencer%2Fsettings">
                      <Button size="sm" variant="outline" type="button">
                        Connect TikTok
                      </Button>
                    </a>
                    <a href="/api/auth/social/youtube/connect?next=%2Finfluencer%2Fsettings&role=creator">
                      <Button size="sm" variant="outline" type="button">
                        Connect YouTube
                      </Button>
                    </a>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={profile.username ?? ""}
                      onChange={(e) => setProfile((p) => (p ? { ...p, username: e.target.value } : p))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="followers">Followers</Label>
                    <Input
                      id="followers"
                      type="number"
                      min={0}
                      value={profile.followersCount ?? 0}
                      onChange={(e) =>
                        setProfile((p) =>
                          p ? { ...p, followersCount: Number(e.target.value) } : p,
                        )
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input
                      id="fullName"
                      value={profile.fullName ?? ""}
                      onChange={(e) => setProfile((p) => (p ? { ...p, fullName: e.target.value } : p))}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={profile.email ?? ""}
                      onChange={(e) => setProfile((p) => (p ? { ...p, email: e.target.value } : p))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={profile.phone ?? ""}
                      onChange={(e) => setProfile((p) => (p ? { ...p, phone: e.target.value } : p))}
                    />
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="address1">Address line 1</Label>
                    <Input
                      id="address1"
                      value={profile.address1 ?? ""}
                      onChange={(e) => setProfile((p) => (p ? { ...p, address1: e.target.value } : p))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address2">Address line 2 (optional)</Label>
                    <Input
                      id="address2"
                      value={profile.address2 ?? ""}
                      onChange={(e) => setProfile((p) => (p ? { ...p, address2: e.target.value } : p))}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={profile.city ?? ""}
                      onChange={(e) => setProfile((p) => (p ? { ...p, city: e.target.value } : p))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="province">State / Province</Label>
                    <Input
                      id="province"
                      value={profile.province ?? ""}
                      onChange={(e) => setProfile((p) => (p ? { ...p, province: e.target.value } : p))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="zip">ZIP / PIN</Label>
                    <Input
                      id="zip"
                      value={profile.zip ?? ""}
                      onChange={(e) => setProfile((p) => (p ? { ...p, zip: e.target.value } : p))}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="lat">Latitude</Label>
                    <Input
                      id="lat"
                      placeholder="37.77"
                      value={profile.lat ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const value = raw.trim() ? Number(raw) : null;
                        setProfile((p) =>
                          p
                            ? {
                                ...p,
                                lat: value && Number.isFinite(value) ? value : null,
                              }
                            : p,
                        );
                      }}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lng">Longitude</Label>
                    <Input
                      id="lng"
                      placeholder="-122.41"
                      value={profile.lng ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const value = raw.trim() ? Number(raw) : null;
                        setProfile((p) =>
                          p
                            ? {
                                ...p,
                                lng: value && Number.isFinite(value) ? value : null,
                              }
                            : p,
                        );
                      }}
                    />
                  </div>
                </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={deliveryReady ? "success" : "secondary"}>
                      {deliveryReady ? "Delivery address ready" : "Pickup-only (no address)"}
                    </Badge>
                  </div>
                  <Button onClick={save} disabled={status === "saving" || status === "loading"}>
                    {status === "saving" ? "Saving..." : "Save profile"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-8 border-danger/40">
          <CardHeader>
            <CardTitle>Delete account</CardTitle>
            <CardDescription>
              Permanently deletes your account and creator data (profile, linked social accounts, and deliverables).
              Shared brand workspaces are not removed.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {deleteMessage ? (
              <div
                className={`rounded-md border px-3 py-2 text-sm ${
                  deleteStatus === "error"
                    ? "border-danger/40 bg-danger/10 text-danger"
                    : "border-border bg-muted text-muted-foreground"
                }`}
              >
                {deleteMessage}
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="deleteConfirm">Type DELETE to confirm</Label>
              <Input
                id="deleteConfirm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
              />
            </div>
            <Button
              variant="danger"
              onClick={deleteAccount}
              disabled={deleteStatus === "deleting" || deleteConfirm.trim() !== "DELETE"}
            >
              {deleteStatus === "deleting" ? "Deleting..." : "Delete account"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

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
  country: "US" | "IN" | null;
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
  const [isLocating, setIsLocating] = useState(false);
  const [socialAccounts, setSocialAccounts] = useState<
    Array<{ provider: string; username: string | null; providerUserId: string }>
  >([]);
  const [igStatus, setIgStatus] = useState<{
    connected: boolean;
    igUserId: string | null;
    expiresAt: string | null;
    accountType: string | null;
    profileSyncedAt: string | null;
    profileError: string | null;
  } | null>(null);
  const [isSyncingIg, setIsSyncingIg] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/meta/instagram/status", { method: "GET" });
        const data = (await res.json().catch(() => null)) as
          | {
              ok: true;
              connected: boolean;
              igUserId: string | null;
              expiresAt: string | null;
              accountType: string | null;
              profileSyncedAt: string | null;
              profileError: string | null;
            }
          | { ok: false };
        if (!res.ok || !data || !("ok" in data) || data.ok !== true) return;
        if (cancelled) return;
        setIgStatus({
          connected: data.connected,
          igUserId: data.igUserId,
          expiresAt: data.expiresAt ?? null,
          accountType: data.accountType ?? null,
          profileSyncedAt: data.profileSyncedAt ?? null,
          profileError: data.profileError ?? null,
        });
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function syncInstagramProfile() {
    setIsSyncingIg(true);
    setError(null);
    try {
      const res = await fetch("/api/meta/instagram/sync", { method: "POST" });
      const data = (await res.json().catch(() => null)) as { ok: true } | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(
          data && "error" in data && typeof data.error === "string"
            ? data.error
            : "Instagram sync failed",
        );
      }

      const [profileRes, statusRes] = await Promise.all([
        fetch("/api/creator/profile", { method: "GET" }),
        fetch("/api/meta/instagram/status", { method: "GET" }),
      ]);
      const profileData = (await profileRes.json().catch(() => null)) as
        | { ok: true; creator: CreatorProfile }
        | { ok: false; error?: string };
      const statusData = (await statusRes.json().catch(() => null)) as
        | {
            ok: true;
            connected: boolean;
            igUserId: string | null;
            expiresAt: string | null;
            accountType: string | null;
            profileSyncedAt: string | null;
            profileError: string | null;
          }
        | { ok: false };

      if (profileRes.ok && profileData && "ok" in profileData && profileData.ok === true) {
        setProfile(profileData.creator);
      }
      if (statusRes.ok && statusData && "ok" in statusData && statusData.ok === true) {
        setIgStatus({
          connected: statusData.connected,
          igUserId: statusData.igUserId,
          expiresAt: statusData.expiresAt ?? null,
          accountType: statusData.accountType ?? null,
          profileSyncedAt: statusData.profileSyncedAt ?? null,
          profileError: statusData.profileError ?? null,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Instagram sync failed");
    } finally {
      setIsSyncingIg(false);
    }
  }

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

  const shippingReady = Boolean(profile?.address1 && profile?.city && profile?.zip && profile?.country);
  const igConnected = Boolean(igStatus?.connected);
  const locationReady = profile?.lat !== null && profile?.lat !== undefined && profile?.lng !== null && profile?.lng !== undefined;

  async function useMyLocation() {
    if (!profile) return;
    setIsLocating(true);
    setError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10_000,
        });
      });
      setProfile((p) =>
        p
          ? {
              ...p,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }
          : p,
      );
    } catch {
      setError("Failed to get location (check browser permissions).");
    } finally {
      setIsLocating(false);
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
              Shipping + eligibility
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Used for eligibility, local matching, and fulfillment coordination.
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
                    : shippingReady
                      ? locationReady
                        ? "Ready to claim."
                        : "Set location to claim local offers."
                      : "Complete the basics so brands can fulfill offers."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!profile ? (
              <div className="text-sm text-muted-foreground">No profile loaded.</div>
            ) : (
              <div className="grid gap-6">
                <div className="rounded-lg border bg-muted p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold">Location</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Required to claim local offers (distance-based).
                      </div>
                      {locationReady ? (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Lat/Lng:{" "}
                          <span className="font-mono">
                            {profile.lat?.toFixed(5)}, {profile.lng?.toFixed(5)}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-muted-foreground">Not set.</div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={useMyLocation}
                      disabled={isLocating}
                    >
                      {isLocating ? "Locating..." : "Use my location"}
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold">Instagram connect</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Needed for automated Reel/Feed verification. Stories are best-effort.
                      </div>
                      {igStatus?.profileError ? (
                        <div className="mt-2 text-xs text-danger">{igStatus.profileError}</div>
                      ) : null}
                      {igConnected ? (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {igStatus?.accountType ? `Account: ${igStatus.accountType}. ` : ""}
                          {igStatus?.profileSyncedAt
                            ? `Last sync: ${new Date(igStatus.profileSyncedAt).toLocaleString()}. `
                            : ""}
                          {igStatus?.expiresAt
                            ? `Token expires: ${new Date(igStatus.expiresAt).toLocaleDateString()}.`
                            : ""}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      {igConnected ? (
                        <Badge variant="success">
                          Connected{igStatus?.igUserId ? ` (${igStatus.igUserId})` : ""}
                        </Badge>
                      ) : (
                        <Badge variant="warning">Not connected</Badge>
                      )}
                      <a href="/api/meta/instagram/connect">
                        <Button size="sm" variant="outline">
                          Connect
                        </Button>
                      </a>
                      {igConnected ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={syncInstagramProfile}
                          disabled={isSyncingIg}
                        >
                          {isSyncingIg ? "Syncing..." : "Sync now"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted p-4">
                  <div className="text-sm font-semibold">Connected accounts</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Connect Instagram or TikTok now, link the other later.
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
                    <a href="/api/auth/social/instagram/connect?next=%2Finfluencer%2Fsettings">
                      <Button size="sm" variant="outline" type="button">
                        Connect Instagram
                      </Button>
                    </a>
                    <a href="/api/auth/social/tiktok/connect?next=%2Finfluencer%2Fsettings">
                      <Button size="sm" variant="outline" type="button">
                        Connect TikTok
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
                      disabled={igConnected}
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
                      disabled={igConnected}
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
                    <Label>Country</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={profile.country === "US" ? "default" : "outline"}
                        onClick={() => setProfile((p) => (p ? { ...p, country: "US" } : p))}
                      >
                        United States
                      </Button>
                      <Button
                        size="sm"
                        variant={profile.country === "IN" ? "default" : "outline"}
                        onClick={() => setProfile((p) => (p ? { ...p, country: "IN" } : p))}
                      >
                        India
                      </Button>
                    </div>
                  </div>
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

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={shippingReady ? "success" : "warning"}>
                      {shippingReady ? "Shipping ready" : "Shipping incomplete"}
                    </Badge>
                    {profile.country ? (
                      <Badge variant="secondary">{profile.country === "US" ? "US" : "IN"}</Badge>
                    ) : null}
                  </div>
                  <Button onClick={save} disabled={status === "saving" || status === "loading"}>
                    {status === "saving" ? "Saving..." : "Save profile"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

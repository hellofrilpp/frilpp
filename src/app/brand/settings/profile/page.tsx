"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BrandProfile = {
  name: string;
  website: string | null;
  location: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  zip: string | null;
  country: "US" | "IN" | null;
  lat: number | null;
  lng: number | null;
  logoUrl: string | null;
};

export default function BrandProfileSettingsPage() {
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "saved" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "deleting" | "done" | "error">("idle");
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [brandDeleteConfirm, setBrandDeleteConfirm] = useState("");
  const [brandDeleteStatus, setBrandDeleteStatus] = useState<"idle" | "deleting" | "done" | "error">(
    "idle",
  );
  const [brandDeleteMessage, setBrandDeleteMessage] = useState<string | null>(null);

  async function load() {
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/brand/profile", { method: "GET" });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; profile: BrandProfile }
        | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(
          data && "error" in data && typeof data.error === "string"
            ? data.error
            : "Failed to load profile",
        );
      }
      setProfile(data.profile);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to load");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    if (!profile) return;
    setStatus("saving");
    setMessage(null);
    try {
      const res = await fetch("/api/brand/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; profile: BrandProfile }
        | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(
          data && "error" in data && typeof data.error === "string" ? data.error : "Save failed",
        );
      }
      setProfile(data.profile);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1200);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Save failed");
    }
  }

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

  async function deleteBrandWorkspace() {
    if (!profile) return;
    const target = `DELETE ${profile.name}`;
    if (brandDeleteConfirm.trim().toLowerCase() !== target.toLowerCase()) return;

    setBrandDeleteStatus("deleting");
    setBrandDeleteMessage(null);
    try {
      const res = await fetch("/api/brand/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: brandDeleteConfirm }),
      });
      const data = (await res.json().catch(() => null)) as { ok: true } | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(
          data && "error" in data && typeof data.error === "string"
            ? data.error
            : "Workspace deletion failed",
        );
      }
      setBrandDeleteStatus("done");
      setBrandDeleteMessage("Brand workspace deleted. Redirecting...");
      setTimeout(() => {
        window.location.href = "/onboarding";
      }, 900);
    } catch (err) {
      setBrandDeleteStatus("error");
      setBrandDeleteMessage(err instanceof Error ? err.message : "Workspace deletion failed");
    }
  }

  const locationReady = profile?.lat !== null && profile?.lat !== undefined && profile?.lng !== null && profile?.lng !== undefined;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-10 md:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Brand</Badge>
              <Badge variant="secondary">Settings</Badge>
              <Badge variant="secondary">Profile</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Brand profile</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Set your shop location for local offer targeting and a website/Maps destination for share links.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/brand/settings/acceptance">
              <Button variant="outline">Acceptance</Button>
            </Link>
            <Link href="/brand/offers">
              <Button variant="outline">Offers</Button>
            </Link>
          </div>
        </div>

        {message ? (
          <div className="mt-6 rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
            {message}
          </div>
        ) : null}

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Location</CardTitle>
            <CardDescription>
              {status === "loading"
                ? "Loading…"
                : status === "saving"
                  ? "Saving…"
                  : status === "saved"
                    ? "Saved."
                    : status === "error"
                      ? "Error (check auth + DB)."
                      : locationReady
                        ? "Location is set."
                        : "Set location to enable local radius matching."}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {!profile ? (
              <div className="text-sm text-muted-foreground">No profile loaded.</div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Brand name</Label>
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) => setProfile((p) => (p ? { ...p, name: e.target.value } : p))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="website">Website (optional)</Label>
                    <Input
                      id="website"
                      placeholder="https://example.com"
                      value={profile.website ?? ""}
                      onChange={(e) =>
                        setProfile((p) => (p ? { ...p, website: e.target.value || null } : p))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="address1">Address line 1</Label>
                    <Input
                      id="address1"
                      placeholder="123 Main St"
                      value={profile.address1 ?? ""}
                      onChange={(e) =>
                        setProfile((p) => (p ? { ...p, address1: e.target.value || null } : p))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="address2">Address line 2 (optional)</Label>
                    <Input
                      id="address2"
                      placeholder="Suite 200"
                      value={profile.address2 ?? ""}
                      onChange={(e) =>
                        setProfile((p) => (p ? { ...p, address2: e.target.value || null } : p))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="grid gap-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="San Francisco"
                      value={profile.city ?? ""}
                      onChange={(e) =>
                        setProfile((p) => (p ? { ...p, city: e.target.value || null } : p))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="province">State / Province</Label>
                    <Input
                      id="province"
                      placeholder="CA"
                      value={profile.province ?? ""}
                      onChange={(e) =>
                        setProfile((p) => (p ? { ...p, province: e.target.value || null } : p))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="zip">ZIP / PIN</Label>
                    <Input
                      id="zip"
                      placeholder="94103"
                      value={profile.zip ?? ""}
                      onChange={(e) =>
                        setProfile((p) => (p ? { ...p, zip: e.target.value || null } : p))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="locationLabel">Location label (optional)</Label>
                    <Input
                      id="locationLabel"
                      placeholder="Downtown"
                      value={profile.location ?? ""}
                      onChange={(e) =>
                        setProfile((p) => (p ? { ...p, location: e.target.value || null } : p))
                      }
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

                <div className="flex flex-wrap gap-2">
                  <Button onClick={save} disabled={status === "saving"}>
                    Save
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="mt-8 border-danger/40">
          <CardHeader>
            <CardTitle>Delete account</CardTitle>
            <CardDescription>
              Permanently deletes your account and removes your access to brand workspaces. Shared brand data
              stays available to other team members.
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

        <Card className="mt-8 border-danger/60">
          <CardHeader>
            <CardTitle>Delete brand workspace</CardTitle>
            <CardDescription>
              Permanently removes this brand, its offers, matches, and analytics for all team members.
              This cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {brandDeleteMessage ? (
              <div
                className={`rounded-md border px-3 py-2 text-sm ${
                  brandDeleteStatus === "error"
                    ? "border-danger/40 bg-danger/10 text-danger"
                    : "border-border bg-muted text-muted-foreground"
                }`}
              >
                {brandDeleteMessage}
              </div>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="brandDeleteConfirm">Type DELETE {profile?.name ?? "brand"} to confirm</Label>
              <Input
                id="brandDeleteConfirm"
                value={brandDeleteConfirm}
                onChange={(e) => setBrandDeleteConfirm(e.target.value)}
                placeholder={profile ? `DELETE ${profile.name}` : "DELETE"}
                disabled={!profile}
              />
            </div>
            <Button
              variant="danger"
              onClick={deleteBrandWorkspace}
              disabled={
                brandDeleteStatus === "deleting" ||
                !profile ||
                brandDeleteConfirm.trim().toLowerCase() !== `DELETE ${profile?.name ?? ""}`.toLowerCase()
              }
            >
              {brandDeleteStatus === "deleting" ? "Deleting..." : "Delete brand workspace"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

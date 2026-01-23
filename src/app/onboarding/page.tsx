"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitizeNextPath } from "@/lib/redirects";

type Me = {
  id: string;
  email: string | null;
  name: string | null;
  activeBrandId: string | null;
  tosAcceptedAt: string | null;
  privacyAcceptedAt: string | null;
  igDataAccessAcceptedAt: string | null;
  hasCreatorProfile: boolean;
  memberships: Array<{ brandId: string; brandName: string; role: string }>;
};

export default function OnboardingPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [lane, setLane] = useState<"brand" | "creator" | null>(null);
  const [requestedNextPath, setRequestedNextPath] = useState<string | null>(null);

  const [brandName, setBrandName] = useState("My brand");
  const [brandCountries] = useState<Array<"US" | "IN">>(["US", "IN"]);

  const [creatorForm, setCreatorForm] = useState({
    username: "",
    phone: "",
    lat: null as number | null,
    lng: null as number | null,
  });
  const [locStatus, setLocStatus] = useState<"idle" | "locating" | "error">("idle");

  const isAuthed = Boolean(me);
  const hasBrand = Boolean(me?.memberships?.length);
  const hasCreator = Boolean(me?.hasCreatorProfile);
  const legalOk = Boolean(me?.tosAcceptedAt && me?.privacyAcceptedAt);

  const showBrandOnboarding = lane === null || lane === "brand";
  const showCreatorOnboarding = lane === null || lane === "creator";
  const showBrandCreate = showBrandOnboarding && !hasBrand;
  const showCreatorCreate = showCreatorOnboarding && !hasCreator;

  useEffect(() => {
    try {
      const raw = new URLSearchParams(window.location.search).get("next");
      if (!raw) {
        setRequestedNextPath(null);
        return;
      }
      setRequestedNextPath(sanitizeNextPath(raw, "/"));
    } catch {
      setRequestedNextPath(null);
    }
  }, []);

  const primaryNextLink = useMemo(() => {
    const laneAllows = (path: string) => {
      if (lane === "brand") return path.startsWith("/brand/");
      if (lane === "creator") return path.startsWith("/influencer/");
      return true;
    };

    if (requestedNextPath && laneAllows(requestedNextPath)) return requestedNextPath;
    if (hasBrand) return "/brand/dashboard";
    if (hasCreator) return "/influencer/discover";
    return "/";
  }, [hasBrand, hasCreator, lane, requestedNextPath]);

  async function loadMe() {
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/auth/me");
      const data = (await res.json().catch(() => null)) as
        | { ok: true; user: Me | null }
        | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) throw new Error("Failed");
      setMe(data.user);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to load");
    }
  }

  useEffect(() => {
    void loadMe();
  }, []);

  useEffect(() => {
    try {
      const raw = document.cookie ?? "";
      const match = raw
        .split(/;\s*/g)
        .map((part) => part.split("="))
        .find(([key]) => key === "frilpp_lane");
      const value = match?.[1] ? decodeURIComponent(match[1]) : null;
      if (value === "brand" || value === "creator") {
        setLane(value);
      } else {
        setLane(null);
      }
    } catch {
      setLane(null);
    }
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    await loadMe();
  }

  async function createBrand() {
    setMessage(null);
    try {
      const res = await fetch("/api/onboarding/brand", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: brandName, countriesDefault: brandCountries }),
      });
      const data = (await res.json().catch(() => null)) as { ok: true } | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(
          data && "error" in data && typeof data.error === "string" ? data.error : "Failed",
        );
      }
      setMessage("Brand created.");
      await loadMe();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Brand create failed");
    }
  }

  async function createCreator() {
    setMessage(null);
    try {
      const res = await fetch("/api/onboarding/creator", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: creatorForm.username || undefined,
          phone: creatorForm.phone || undefined,
          lat: creatorForm.lat ?? undefined,
          lng: creatorForm.lng ?? undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok: true } | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(
          data && "error" in data && typeof data.error === "string" ? data.error : "Failed",
        );
      }
      setMessage("Creator profile created.");
      await loadMe();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Creator create failed");
    }
  }

  async function useMyLocation() {
    setLocStatus("locating");
    setMessage(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10_000,
        });
      });
      setCreatorForm((p) => ({
        ...p,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      }));
      setLocStatus("idle");
      setMessage("Location captured.");
    } catch {
      setLocStatus("error");
      setMessage("Failed to get location (check browser permissions).");
    }
  }

  async function setActiveBrand(brandId: string) {
    setMessage(null);
    try {
      const res = await fetch("/api/brand/active", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ brandId }),
      });
      const data = (await res.json().catch(() => null)) as { ok: true } | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) throw new Error("Failed");
      await loadMe();
    } catch {
      setMessage("Failed to switch brand.");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-10 md:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Frilpp</Badge>
              <Badge variant="secondary">Onboarding</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Get set up</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {lane === "brand"
                ? "Create your brand workspace."
                : lane === "creator"
                  ? "Create your creator profile."
                  : "Create a brand workspace, a creator profile, or both."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/">
              <Button variant="outline">Home</Button>
            </Link>
            {isAuthed ? (
              <Button variant="outline" onClick={logout}>
                Logout
              </Button>
            ) : (
              <Link href="/login">
                <Button variant="secondary">Login</Button>
              </Link>
            )}
          </div>
        </div>

        {message ? (
          <div className="mt-6 rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
            {message}
          </div>
        ) : null}

        {me && !legalOk ? (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Legal required</CardTitle>
              <CardDescription>
                Accept Terms and Privacy to use Frilpp.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/legal/accept?next=%2Fonboarding">
                <Button variant="secondary">Review & accept</Button>
              </Link>
            </CardContent>
          </Card>
        ) : null}

        {status === "loading" ? (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Loading…</CardTitle>
              <CardDescription>Fetching your session.</CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {status === "idle" && !me ? (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Sign in required</CardTitle>
              <CardDescription>Login to create a brand or creator profile.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login">
                <Button>Go to login</Button>
              </Link>
            </CardContent>
          </Card>
        ) : null}

        {me ? (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>
                Signed in as <span className="font-mono">{me.email}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex flex-wrap gap-2">
                {me.memberships.map((m) => (
                  <Button
                    key={m.brandId}
                    size="sm"
                    variant={m.brandId === me.activeBrandId ? "default" : "outline"}
                    onClick={() => setActiveBrand(m.brandId)}
                  >
                    {m.brandName} ({m.role})
                  </Button>
                ))}
                {!me.memberships.length ? <Badge variant="warning">No brand yet</Badge> : null}
                {me.hasCreatorProfile ? <Badge variant="success">Creator profile ready</Badge> : <Badge variant="warning">No creator profile yet</Badge>}
              </div>

              {(hasBrand || hasCreator) ? (
                <Link href={primaryNextLink}>
                  <Button variant="secondary">Continue</Button>
                </Link>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {me && legalOk ? (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {showBrandCreate ? (
              <Card>
              <CardHeader>
                <CardTitle>Create a brand workspace</CardTitle>
                <CardDescription>For D2C teams publishing offers.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="brandName">Brand name</Label>
                  <Input
                    id="brandName"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                  />
                </div>
                <Button onClick={createBrand} disabled={!brandName.trim()}>
                  Create brand
                </Button>
              </CardContent>
              </Card>
            ) : null}

            {showCreatorCreate ? (
              <Card>
              <CardHeader>
                <CardTitle>Create a creator profile</CardTitle>
                <CardDescription>Required to claim offers (pickup/local delivery supported).</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="creatorUsername">Username</Label>
                    <Input
                      id="creatorUsername"
                      value={creatorForm.username}
                      onChange={(e) => setCreatorForm((p) => ({ ...p, username: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="creatorPhone">Phone (optional)</Label>
                    <Input
                      id="creatorPhone"
                      value={creatorForm.phone}
                      onChange={(e) => setCreatorForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+1 555… / +91…"
                    />
                  </div>
                </div>

                <div className="rounded-lg border bg-muted p-4">
                  <div className="text-sm font-semibold">Location</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Required for local offers (nearby matching). You can also set it later in Profile.
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button size="sm" variant="secondary" type="button" onClick={useMyLocation} disabled={locStatus === "locating"}>
                      {locStatus === "locating" ? "Locating…" : "Use my location"}
                    </Button>
                    {creatorForm.lat !== null && creatorForm.lng !== null ? (
                      <span className="text-xs text-muted-foreground">
                        Set: <span className="font-mono">{creatorForm.lat.toFixed(5)}, {creatorForm.lng.toFixed(5)}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not set.</span>
                    )}
                  </div>
                </div>

                <Button
                  onClick={createCreator}
                >
                  Create creator profile
                </Button>
                {me ? (
                  <div className="text-xs text-muted-foreground">
                    Email on file: <span className="font-mono">{me.email}</span> (used for notifications).
                  </div>
                ) : null}
              </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

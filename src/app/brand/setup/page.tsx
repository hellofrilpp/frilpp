"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, MapPin, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FrilppLogo from "@/components/frilpp-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccessibilityToggle } from "@/components/accessibility-toggle";
import LocationPicker from "@/components/LocationPicker";

type ApiError = Error & { status?: number; code?: string };

type Notice = { kind: "success" | "error"; text: string };

type ProfileState = {
  name: string;
  location: string;
  address1: string;
  address2: string;
  city: string;
  province: string;
  zip: string;
  lat: number | null;
  lng: number | null;
};

type AuthMe = {
  ok: boolean;
  user: {
    id: string;
    memberships?: Array<{ brandId: string; role: string; brandName: string | null }>;
  } | null;
};

type BrandProfileResponse = {
  ok: boolean;
  profile: {
    name: string | null;
    location: string | null;
    address1: string | null;
    address2: string | null;
    city: string | null;
    province: string | null;
    zip: string | null;
    lat: number | null;
    lng: number | null;
  };
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  const data = (await res.json().catch(() => null)) as T & {
    error?: string;
    code?: string;
  };
  if (!res.ok) {
    const err = new Error(data?.error ?? "Request failed") as ApiError;
    err.status = res.status;
    err.code = data?.code;
    throw err;
  }
  return data;
}

function SetupShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background bg-grid flex flex-col">
      <header className="p-4 border-b-4 border-primary">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary flex items-center justify-center animate-pulse-neon">
              <FrilppLogo size="sm" />
            </div>
            <span className="text-sm font-pixel text-neon-green tracking-tight">
              FRI<span className="text-neon-pink">L</span>PP
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AccessibilityToggle />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

function BrandSetupClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "signup";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [profile, setProfile] = useState<ProfileState>({
    name: "",
    location: "",
    address1: "",
    address2: "",
    city: "",
    province: "",
    zip: "",
    lat: null,
    lng: null,
  });
  const [brandName, setBrandName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasBrand, setHasBrand] = useState(false);

  const showNotice = (kind: Notice["kind"], text: string) => {
    setNotice({ kind, text });
    setTimeout(() => setNotice(null), 3500);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const me = await fetchJson<AuthMe>("/api/auth/me");
        if (!me.user) {
          router.push("/brand/auth");
          return;
        }
        const membership = Boolean(me.user.memberships?.length);
        if (cancelled) return;
        setHasBrand(membership);
        if (membership) {
          const profileRes = await fetchJson<BrandProfileResponse>("/api/brand/profile");
          if (cancelled) return;
          setProfile({
            name: profileRes.profile.name ?? "",
            location: profileRes.profile.location ?? "",
            address1: profileRes.profile.address1 ?? "",
            address2: profileRes.profile.address2 ?? "",
            city: profileRes.profile.city ?? "",
            province: profileRes.profile.province ?? "",
            zip: profileRes.profile.zip ?? "",
            lat: profileRes.profile.lat ?? null,
            lng: profileRes.profile.lng ?? null,
          });
        }
      } catch (err) {
        const apiErr = err as ApiError;
        if (apiErr?.status === 401) {
          router.push("/brand/auth");
          return;
        }
        showNotice("error", apiErr?.message ?? "Failed to load setup.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const locationReady = useMemo(() => profile.lat !== null && profile.lng !== null, [
    profile.lat,
    profile.lng,
  ]);
  const needsLocation = !locationReady;

  const handleSave = async () => {
    if (saving) return;
    if (password.trim().length < 8) {
      showNotice("error", "Use at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      showNotice("error", "Passwords do not match.");
      return;
    }
    if (!hasBrand && !brandName.trim()) {
      showNotice("error", "Enter your brand name.");
      return;
    }
    if (needsLocation) {
      showNotice("error", "Select your brand location.");
      return;
    }

    setSaving(true);
    try {
      if (!hasBrand) {
        await fetchJson("/api/onboarding/brand", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: brandName.trim() }),
        });
      }

      await fetchJson("/api/brand/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: hasBrand ? profile.name || undefined : brandName.trim(),
          location: profile.location || undefined,
          address1: profile.address1 || undefined,
          address2: profile.address2 || undefined,
          city: profile.city || undefined,
          province: profile.province || undefined,
          zip: profile.zip || undefined,
          lat: profile.lat ?? null,
          lng: profile.lng ?? null,
        }),
      });

      await fetchJson("/api/auth/password/set", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });

      showNotice("success", "Welcome to Frilpp.");
      router.push("/brand/dashboard");
    } catch (err) {
      const apiErr = err as ApiError;
      showNotice("error", apiErr?.message ?? "Setup failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SetupShell>
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="border-2 border-border bg-card p-6 text-xs font-mono text-muted-foreground">
            Loading setup...
          </div>
        </main>
      </SetupShell>
    );
  }

  return (
    <SetupShell>
      <main className="flex-1 p-6 md:p-10 max-w-3xl mx-auto w-full">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-neon-green" />
            <span className="text-xs font-pixel text-neon-green">[SECURE_SETUP]</span>
          </div>
          <h1 className="text-xl md:text-2xl font-pixel">
            {mode === "reset" ? "RESET PASSWORD" : "FINISH SETUP"}
          </h1>
          <p className="font-mono text-sm text-muted-foreground mt-1">
            {mode === "reset"
              ? "Set a new password and confirm your location."
              : "Create a password and confirm your location to launch campaigns."}
          </p>
        </div>

        {notice ? (
          <div
            className={`mb-6 border-2 px-4 py-3 text-xs font-mono ${
              notice.kind === "success"
                ? "border-neon-green text-neon-green"
                : "border-neon-pink text-neon-pink"
            }`}
          >
            {notice.text}
          </div>
        ) : null}

        <Card className="mb-6 border-4 border-neon-green">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-neon-green" /> Brand details
            </CardTitle>
            <CardDescription>We use this for local matching and delivery routing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasBrand ? (
              <div className="space-y-4">
                <div>
                  <Label className="font-mono text-xs">BRAND NAME</Label>
                  <Input
                    value={brandName}
                    onChange={(event) => setBrandName(event.target.value)}
                    className="mt-2 border-2 border-border font-mono"
                    placeholder="Awesome Brand Inc."
                  />
                </div>
              </div>
            ) : null}

            <LocationPicker
              label="Address"
              showUseMyLocation={false}
              onSelect={(location) =>
                setProfile((prev) => ({
                  ...prev,
                  location: location.label,
                  address1: location.address1,
                  city: location.city,
                  province: location.province,
                  zip: location.zip,
                  lat: location.lat,
                  lng: location.lng,
                }))
              }
            />

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="font-mono text-xs">ADDRESS LINE 1</Label>
                <Input
                  value={profile.address1}
                  onChange={(event) =>
                    setProfile((prev) => ({ ...prev, address1: event.target.value }))
                  }
                  className="mt-2 border-2 border-border font-mono"
                />
              </div>
              <div>
                <Label className="font-mono text-xs">ADDRESS LINE 2</Label>
                <Input
                  value={profile.address2}
                  onChange={(event) =>
                    setProfile((prev) => ({ ...prev, address2: event.target.value }))
                  }
                  className="mt-2 border-2 border-border font-mono"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="font-mono text-xs">CITY</Label>
                <Input
                  value={profile.city}
                  onChange={(event) => setProfile((prev) => ({ ...prev, city: event.target.value }))}
                  className="mt-2 border-2 border-border font-mono"
                />
              </div>
              <div>
                <Label className="font-mono text-xs">STATE</Label>
                <Input
                  value={profile.province}
                  onChange={(event) =>
                    setProfile((prev) => ({ ...prev, province: event.target.value }))
                  }
                  className="mt-2 border-2 border-border font-mono"
                />
              </div>
              <div>
                <Label className="font-mono text-xs">ZIP</Label>
                <Input
                  value={profile.zip}
                  onChange={(event) => setProfile((prev) => ({ ...prev, zip: event.target.value }))}
                  className="mt-2 border-2 border-border font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <MapPin className="w-4 h-4" />
              {locationReady ? "Location locked." : "Pick a location to enable radius matching."}
            </div>
          </CardContent>
        </Card>

        <Card className="border-4 border-neon-yellow">
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Use at least 8 characters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="font-mono text-xs">PASSWORD</Label>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 border-2 border-border font-mono"
                placeholder="••••••••"
              />
            </div>
            <div>
              <Label className="font-mono text-xs">CONFIRM PASSWORD</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-2 border-2 border-border font-mono"
                placeholder="••••••••"
              />
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-neon-green text-background font-pixel pixel-btn"
          >
            {saving ? "SAVING..." : "FINISH SETUP"}
          </Button>
        </div>
      </main>
    </SetupShell>
  );
}

export default function BrandSetupPage() {
  return (
    <Suspense
      fallback={
        <SetupShell>
          <main className="flex-1 flex items-center justify-center p-4">
            <div className="border-2 border-border bg-card p-6 text-xs font-mono text-muted-foreground">
              Loading setup...
            </div>
          </main>
        </SetupShell>
      }
    >
      <BrandSetupClient />
    </Suspense>
  );
}

"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Bell,
  Link as LinkIcon,
  CreditCard,
  Save,
  Settings,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import LocationPicker from "@/components/LocationPicker";

type ApiError = Error & { status?: number; code?: string };

type BrandProfile = {
  name: string;
  website: string | null;
  description: string | null;
  industry: string | null;
  location: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  logoUrl: string | null;
};

type Notifications = {
  newMatch: boolean;
  contentReceived: boolean;
  weeklyDigest: boolean;
  marketing: boolean;
};

type SocialAccount = {
  provider: "TIKTOK" | "YOUTUBE";
  username: string | null;
  providerUserId: string;
};

type BillingStatus = {
  ok: boolean;
  billingEnabled?: boolean;
  brand: { id: string; name: string | null; subscribed: boolean } | null;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  const data = (await res.json().catch(() => null)) as T & { error?: string; code?: string };
  if (!res.ok) {
    const err = new Error((data as { error?: string })?.error ?? "Request failed") as ApiError;
    err.status = res.status;
    err.code = (data as { code?: string })?.code;
    throw err;
  }
  return data;
}

export default function BrandSettingsPage() {
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const [profile, setProfile] = useState({
    name: "",
    website: "",
    description: "",
    industry: "",
    location: "",
    address1: "",
    address2: "",
    city: "",
    province: "",
    zip: "",
    lat: null as number | null,
    lng: null as number | null,
    logoUrl: "",
  });
  const [notifications, setNotifications] = useState<Notifications>({
    newMatch: true,
    contentReceived: true,
    weeklyDigest: false,
    marketing: false,
  });
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [billing, setBilling] = useState<BillingStatus | null>(null);

  const showNotice = (kind: "success" | "error", text: string) => {
    setNotice({ kind, text });
    setTimeout(() => setNotice(null), 3500);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [profileRes, notificationsRes, socialRes, billingRes] =
          await Promise.all([
            fetchJson<{ ok: boolean; profile: BrandProfile }>("/api/brand/profile"),
            fetchJson<{ ok: boolean; notifications: Notifications }>("/api/brand/notifications"),
            fetchJson<{ ok: boolean; accounts: SocialAccount[] }>("/api/auth/social/accounts"),
            fetchJson<BillingStatus>("/api/billing/status").catch(() => ({
              ok: true,
              billingEnabled: true,
              brand: null,
            })),
          ]);
        if (cancelled) return;
        const profileData = profileRes.profile;
        setProfile({
          name: profileData.name ?? "",
          website: profileData.website ?? "",
          description: profileData.description ?? "",
          industry: profileData.industry ?? "",
          location: profileData.location ?? "",
          address1: profileData.address1 ?? "",
          address2: profileData.address2 ?? "",
          city: profileData.city ?? "",
          province: profileData.province ?? "",
          zip: profileData.zip ?? "",
          lat: profileData.lat ?? null,
          lng: profileData.lng ?? null,
          logoUrl: profileData.logoUrl ?? "",
        });
        setNotifications(notificationsRes.notifications);
        setSocialAccounts(socialRes.accounts ?? []);
        setBilling(billingRes);
      } catch (err) {
        const status = err instanceof Error && "status" in err ? (err as ApiError).status : undefined;
        if (status === 401) {
          window.location.href = "/brand/auth";
          return;
        }
        showNotice("error", "Failed to load settings.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const subscribed = billing?.brand?.subscribed ?? false;
  const billingEnabled = billing?.billingEnabled ?? true;

  const handleDeleteAccount = async () => {
    if (deleteConfirm.trim() !== "DELETE") return;
    setDeleting(true);
    try {
      await fetchJson("/api/account/delete", { method: "POST" });
      showNotice("success", "Account deleted.");
      window.location.href = "/";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Account deletion failed";
      showNotice("error", message);
    } finally {
      setDeleting(false);
      setDeleteConfirm("");
      setDeleteOpen(false);
    }
  };

  const noticeStyles = useMemo(() => {
    if (!notice) return "";
    return notice.kind === "success"
      ? "border-neon-green bg-neon-green/10 text-neon-green"
      : "border-neon-pink bg-neon-pink/10 text-neon-pink";
  }, [notice]);

  return (
    <div className="p-6 md:p-10 max-w-4xl">
      {notice ? (
        <div className={`mb-6 border-2 px-4 py-3 text-xs font-mono ${noticeStyles}`}>
          {notice.text}
        </div>
      ) : null}

      <div className="mb-10">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="w-5 h-5 text-neon-yellow" />
          <span className="text-xs font-pixel text-neon-yellow">[SETTINGS]</span>
        </div>
        <h1 className="text-xl md:text-2xl font-pixel text-foreground">CONFIG</h1>
        <p className="font-mono text-sm text-muted-foreground mt-1">
          &gt; Manage account preferences
        </p>
      </div>

      <section className="mb-8 border-4 border-border bg-card">
        <div className="p-4 border-b-4 border-border flex items-center gap-3">
          <Building2 className="w-5 h-5 text-neon-green" />
          <h2 className="font-pixel text-sm text-neon-green">[BRAND_PROFILE]</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-neon-green text-background flex items-center justify-center text-xl font-pixel">
              {profile.name
                ? profile.name
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")
                    .toUpperCase()
                : "BR"}
            </div>
            <div className="flex-1">
              <Button variant="outline" size="sm" className="border-2 border-border font-mono text-xs">
                CHANGE_LOGO
              </Button>
              <p className="text-xs font-mono text-muted-foreground mt-2">JPG, PNG, SVG. Max 2MB.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="font-mono text-xs">BRAND_NAME</Label>
              <Input
                value={profile.name}
                onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-2 border-2 border-border font-mono"
              />
            </div>
            <div>
              <Label className="font-mono text-xs">WEBSITE</Label>
              <Input
                type="url"
                value={profile.website}
                onChange={(event) => setProfile((prev) => ({ ...prev, website: event.target.value }))}
                className="mt-2 border-2 border-border font-mono"
              />
            </div>
          </div>

          <div>
            <Label className="font-mono text-xs">DESCRIPTION</Label>
            <Textarea
              value={profile.description}
              onChange={(event) =>
                setProfile((prev) => ({ ...prev, description: event.target.value }))
              }
              className="mt-2 border-2 border-border font-mono"
              rows={3}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="font-mono text-xs">INDUSTRY</Label>
              <Input
                value={profile.industry}
                onChange={(event) => setProfile((prev) => ({ ...prev, industry: event.target.value }))}
                className="mt-2 border-2 border-border font-mono"
              />
            </div>
          </div>

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
              <Label className="font-mono text-xs">ADDRESS_LINE_1</Label>
              <Input
                value={profile.address1}
                onChange={(event) => setProfile((prev) => ({ ...prev, address1: event.target.value }))}
                className="mt-2 border-2 border-border font-mono"
              />
            </div>
            <div>
              <Label className="font-mono text-xs">ADDRESS_LINE_2</Label>
              <Input
                value={profile.address2}
                onChange={(event) => setProfile((prev) => ({ ...prev, address2: event.target.value }))}
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
                onChange={(event) => setProfile((prev) => ({ ...prev, province: event.target.value }))}
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

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="font-mono text-xs">LOGO_URL</Label>
              <Input
                type="url"
                value={profile.logoUrl}
                onChange={(event) => setProfile((prev) => ({ ...prev, logoUrl: event.target.value }))}
                className="mt-2 border-2 border-border font-mono"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8 border-4 border-border bg-card">
        <div className="p-4 border-b-4 border-border flex items-center gap-3">
          <LinkIcon className="w-5 h-5 text-neon-purple" />
          <h2 className="font-pixel text-sm text-neon-purple">[SOCIAL_LINKS]</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex flex-col gap-3">
            {(["TIKTOK"] as const).map((provider) => {
              const connected = socialAccounts.some((account) => account.provider === provider);
              const label = "TikTok";
              return (
                <div key={provider} className="flex items-center justify-between border-2 border-border p-4">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{label}</p>
                    <p className="font-pixel text-xs text-foreground">
                      {connected ? "CONNECTED" : "NOT_CONNECTED"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-neon-purple text-background font-pixel text-xs pixel-btn"
                    onClick={() => {
                      window.location.href = `/api/auth/social/${provider.toLowerCase()}/connect?role=brand&next=/brand/settings`;
                    }}
                  >
                    {connected ? "RECONNECT" : "CONNECT"}
                  </Button>
                </div>
              );
            })}
          </div>
          <p className="text-xs font-mono text-muted-foreground">
            Link your TikTok to verify your official channel.
          </p>
        </div>
      </section>

      <section className="mb-8 border-4 border-border bg-card">
        <div className="p-4 border-b-4 border-border flex items-center gap-3">
          <Bell className="w-5 h-5 text-neon-pink" />
          <h2 className="font-pixel text-sm text-neon-pink">[NOTIFICATIONS]</h2>
        </div>
        <div className="divide-y-2 divide-border">
          {[
            { key: "newMatch", label: "NEW_MATCH_ALERTS", description: "Get notified when creators swipe right" },
            { key: "contentReceived", label: "CONTENT_RECEIVED", description: "Notified when content is submitted" },
            { key: "weeklyDigest", label: "WEEKLY_DIGEST", description: "Weekly campaign performance summary" },
            { key: "marketing", label: "MARKETING", description: "Tips, updates, and offers" },
          ].map((item) => (
            <div key={item.key} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div>
                <p className="font-mono text-sm">{item.label}</p>
                <p className="text-xs font-mono text-muted-foreground">{item.description}</p>
              </div>
              <Switch
                checked={notifications[item.key as keyof Notifications]}
                onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, [item.key]: checked }))}
              />
            </div>
          ))}
        </div>
      </section>

      {billingEnabled ? (
        <section className="mb-8 border-4 border-border bg-card">
          <div className="p-4 border-b-4 border-border flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-neon-yellow" />
            <h2 className="font-pixel text-sm text-neon-yellow">[BILLING]</h2>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-pixel text-sm text-neon-green">GROWTH_PLAN</p>
                <p className="text-xs font-mono text-muted-foreground">
                  {subscribed ? "ACTIVE" : "NOT_SUBSCRIBED"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-2 border-border font-mono text-xs"
                onClick={() => {
                  window.location.href = "/brand/billing";
                }}
              >
                {subscribed ? "MANAGE" : "SUBSCRIBE"}
              </Button>
            </div>
            <div className="p-3 bg-muted border-2 border-border">
              <p className="text-xs font-mono">
                <span className="text-neon-green">STATUS:</span> {subscribed ? "UNLOCKED" : "LOCKED"}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mb-8 border-4 border-border bg-card">
        <div className="p-4 border-b-4 border-border flex items-center gap-3">
          <Trash2 className="w-5 h-5 text-destructive" />
          <h2 className="font-pixel text-sm text-destructive">[DELETE_ACCOUNT]</h2>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-xs font-mono text-muted-foreground">
            This permanently deletes your account and removes access to all brand workspaces.
          </p>
          <Button
            variant="outline"
            className="border-2 font-mono text-xs text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            DELETE_ACCOUNT
          </Button>
        </div>
      </section>

      <div className="flex justify-end">
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-pixel text-xs px-8 pixel-btn glow-green"
          disabled={saving}
          onClick={async () => {
            try {
              setSaving(true);
              await fetchJson("/api/brand/profile", {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ ...profile }),
              });
              await fetchJson("/api/brand/notifications", {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(notifications),
              });
              showNotice("success", "Settings updated.");
            } catch (err) {
              const message = err instanceof Error ? err.message : "Failed to save settings";
              showNotice("error", message);
            } finally {
              setSaving(false);
            }
          }}
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "SAVING..." : "SAVE_CHANGES"}
        </Button>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="border-4 border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-pixel text-sm text-neon-pink">
              DELETE ACCOUNT
            </AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-xs">
              This permanently deletes your account and removes access to all brand workspaces. Type DELETE to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-3">
            <Input
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value)}
              placeholder="DELETE"
              className="border-2 border-border font-mono text-xs"
            />
          </div>
          <AlertDialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="border-2 font-mono text-xs"
              onClick={() => {
                setDeleteConfirm("");
                setDeleteOpen(false);
              }}
            >
              CANCEL
            </Button>
            <Button
              variant="outline"
              className="border-2 font-mono text-xs text-destructive"
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirm.trim() !== "DELETE"}
            >
              {deleting ? "DELETING..." : "DELETE PERMANENTLY"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

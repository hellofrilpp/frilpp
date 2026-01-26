"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Star,
  Trophy,
  Package,
  Camera,
  AlertTriangle,
  Settings,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import InfluencerLayout from "@/components/influencer/InfluencerLayout";
import LocationPicker from "@/components/LocationPicker";
import { getCreatorProfileMissingFields } from "@/lib/creator-profile";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAchievements } from "@/hooks/use-achievements";

type ApiError = Error & { status?: number; code?: string };

type CreatorProfile = {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  username: string | null;
  followersCount: number | null;
};

type ProfileResponse = {
  ok: boolean;
  creator: CreatorProfile;
};

type SocialAccount = { provider: string; username: string | null };

type SocialResponse = { ok: boolean; accounts: SocialAccount[] };

type CreatorDeal = { status: string; valueUsd: number | null };

type DealsResponse = { ok: boolean; deals: CreatorDeal[] };

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

const STAT_STYLES = {
  "neon-green": {
    border: "border-neon-green",
    bg: "bg-neon-green/10",
    text: "text-neon-green",
  },
  "neon-pink": {
    border: "border-neon-pink",
    bg: "bg-neon-pink/10",
    text: "text-neon-pink",
  },
  "neon-yellow": {
    border: "border-neon-yellow",
    bg: "bg-neon-yellow/10",
    text: "text-neon-yellow",
  },
};

export default function InfluencerProfilePage() {
  const [savingProfile, setSavingProfile] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string }>({});
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    province: "",
    zip: "",
    lat: null as number | null,
    lng: null as number | null,
  });
  const [profileData, setProfileData] = useState<CreatorProfile | null>(null);
  const [deals, setDeals] = useState<CreatorDeal[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);

  const { achievements, getTotalXP, level, activeStrikes, isLoading: achievementsLoading } =
    useAchievements();

  const showNotice = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(null), 3500);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [profileRes, dealsRes, socialRes] = await Promise.all([
          fetchJson<ProfileResponse>("/api/creator/profile"),
          fetchJson<DealsResponse>("/api/creator/deals"),
          fetchJson<SocialResponse>("/api/auth/social/accounts"),
        ]);
        if (cancelled) return;
        setProfileData(profileRes.creator);
        setDeals(dealsRes.deals ?? []);
        setSocialAccounts(socialRes.accounts ?? []);
        setProfileForm({
          fullName: profileRes.creator.fullName ?? "",
          email: profileRes.creator.email ?? "",
          phone: profileRes.creator.phone ?? "",
          address1: profileRes.creator.address1 ?? "",
          address2: profileRes.creator.address2 ?? "",
          city: profileRes.creator.city ?? "",
          province: profileRes.creator.province ?? "",
          zip: profileRes.creator.zip ?? "",
          lat: profileRes.creator.lat ?? null,
          lng: profileRes.creator.lng ?? null,
        });
      } catch (err) {
        const apiErr = err as ApiError;
        if (apiErr?.code === "NEEDS_CREATOR_PROFILE") {
          window.location.href = "/influencer/onboarding";
          return;
        }
        if (apiErr?.code === "NEEDS_LEGAL_ACCEPTANCE") {
          window.location.href = "/legal/accept?next=/influencer/profile";
          return;
        }
        if (apiErr?.status === 401) {
          window.location.href = "/influencer/auth";
          return;
        }
        showNotice(apiErr?.message ?? "Failed to load profile.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalDeals = deals.length;
  const completedDeals = deals.filter((deal) => deal.status === "complete").length;
  const totalValue = deals.reduce((sum, deal) => sum + (deal.valueUsd ?? 0), 0);

  const stats = useMemo(
    () =>
      [
        { label: "DEALS", value: `${totalDeals}`, icon: Package, color: "neon-green" },
        { label: "CONTENT", value: `${completedDeals}`, icon: Camera, color: "neon-pink" },
        { label: "VALUE", value: `$${totalValue}`, icon: Star, color: "neon-yellow" },
      ] as const,
    [totalDeals, completedDeals, totalValue],
  );

  const nextLevel = Math.max(1, level + 1);
  const currentDeals = completedDeals;
  const levelProgress = nextLevel ? (currentDeals / nextLevel) * 100 : 0;

  const displayName = profileData?.fullName || profileData?.username || "CREATOR";
  const handle = profileData?.username ? `@${profileData.username}` : "@handle";
  const followers = profileData?.followersCount
    ? `${profileData.followersCount} followers`
    : "followers";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const featuredAchievements = achievements.slice(0, 6);
  const missingFields = useMemo(
    () => (profileData ? getCreatorProfileMissingFields(profileData) : []),
    [profileData],
  );
  const profileComplete = missingFields.length === 0;
  const emailRequiredMessage =
    "Add an email below to enable billing, receipts, and account recovery.";
  const showEmailRequirement =
    Boolean(profileData && !profileData.email) && profileForm.email.trim().length === 0;
  const emailFieldMessage = fieldErrors.email ?? (showEmailRequirement ? emailRequiredMessage : null);

  const handleDeleteAccount = async () => {
    if (deleteConfirm.trim() !== "DELETE") return;
    setDeleting(true);
    try {
      await fetch("/api/account/delete", { method: "POST" });
      showNotice("Your account has been removed.");
      window.location.href = "/";
    } catch (err) {
      const apiErr = err as ApiError;
      showNotice(apiErr?.message ?? "Account deletion failed");
    } finally {
      setDeleting(false);
      setDeleteConfirm("");
      setDeleteOpen(false);
    }
  };

  return (
    <InfluencerLayout>
      <div className="p-6 md:p-10 pb-24 md:pb-10 max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="w-24 h-24 mx-auto bg-neon-pink text-background flex items-center justify-center text-xl font-pixel mb-4 border-4 border-neon-pink">
            {initials || "CR"}
          </div>
          <h1 className="text-lg font-pixel text-foreground mb-1">{displayName}</h1>
          <p className="font-mono text-xs text-muted-foreground mb-4">
            {handle} {"//"} {followers}
          </p>
        </div>

        {!profileComplete ? (
          <div className="mb-6 border-2 border-neon-yellow bg-neon-yellow/10 p-4 text-xs font-mono text-neon-yellow">
            Complete your profile before accepting deals. Missing: {missingFields.join(", ")}.
          </div>
        ) : null}

        {notice ? (
          <div className="border-2 border-neon-pink text-neon-pink p-3 mb-6 text-xs font-mono">
            {notice}
          </div>
        ) : null}

        <div className="border-4 border-neon-yellow bg-neon-yellow/10 p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-pixel text-sm text-neon-yellow">LV.{level} POWER CREATOR</h2>
              <p className="font-mono text-xs text-muted-foreground">
                {currentDeals}/{nextLevel} to LV.{nextLevel}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Trophy className="w-5 h-5 text-neon-yellow" />
              <span className="font-pixel text-lg text-neon-yellow">
                {getTotalXP().toLocaleString()}
              </span>
            </div>
          </div>
          <div className="h-3 bg-muted border-2 border-neon-yellow">
            <div className="h-full bg-neon-yellow transition-all" style={{ width: `${levelProgress}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {stats.map((stat, index) => {
            const style = STAT_STYLES[stat.color];
            return (
              <div key={index} className={`p-4 text-center border-4 ${style.border} ${style.bg}`}>
                <stat.icon className={`w-5 h-5 mx-auto mb-2 ${style.text}`} />
                <p className={`text-xl font-pixel ${style.text}`}>{stat.value}</p>
                <p className="text-xs font-mono text-muted-foreground">{stat.label}</p>
              </div>
            );
          })}
        </div>

        <div className="border-4 border-border bg-card p-5 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-neon-purple" />
            <span className="font-pixel text-xs text-neon-purple">[LINKED_SOCIALS]</span>
          </div>
          <div className="space-y-3">
            {(["TIKTOK"] as const).map((provider) => {
              const connected = socialAccounts.some((account) => account.provider === provider);
              const label = "TikTok";
              return (
                <div key={provider} className="flex items-center justify-between border-2 border-border p-3">
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
                      window.location.href = `/api/auth/social/${provider.toLowerCase()}/connect?role=creator&next=/influencer/profile`;
                    }}
                  >
                    {connected ? "RECONNECT" : "CONNECT"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`border-4 p-4 mb-8 ${activeStrikes > 0 ? "border-destructive bg-destructive/10" : "border-neon-green bg-neon-green/10"}`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className={`w-5 h-5 ${activeStrikes > 0 ? "text-destructive" : "text-neon-green"}`} />
            <div>
              <p className="font-pixel text-xs">STRIKES: {activeStrikes}/3</p>
              <p className="font-mono text-xs text-muted-foreground">
                {activeStrikes === 0 ? "GOOD STANDING // KEEP IT UP!" : `${3 - activeStrikes} strikes remaining`}
              </p>
            </div>
          </div>
        </div>

        <div className="border-4 border-border mb-8 bg-card">
          <div className="p-4 border-b-4 border-border flex items-center gap-2">
            <Trophy className="w-5 h-5 text-neon-purple" />
            <h2 className="font-pixel text-sm text-neon-purple">[ACHIEVEMENTS]</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3">
            {achievementsLoading ? (
              <div className="p-4 text-xs font-mono text-muted-foreground">Loading achievements...</div>
            ) : (
              featuredAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`p-4 border-b-2 border-r-2 border-border ${
                    !achievement.unlocked ? "opacity-40" : ""
                  }`}
                >
                  <div
                    className={`w-10 h-10 mb-2 border-2 flex items-center justify-center text-lg ${
                      achievement.unlocked
                        ? "border-neon-yellow bg-neon-yellow/10"
                        : "border-border bg-muted"
                    }`}
                  >
                    {achievement.icon}
                  </div>
                  <p className="font-pixel text-xs">{achievement.name.toUpperCase()}</p>
                  <p className="font-mono text-xs text-muted-foreground">{achievement.description}</p>
                  {!achievement.unlocked && achievement.progress !== undefined && achievement.maxProgress ? (
                    <div className="mt-2 h-1 bg-muted">
                      <div
                        className="h-full bg-neon-purple"
                        style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                      />
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div id="settings" className="border-4 border-border bg-card">
          <div className="p-4 border-b-4 border-border flex items-center gap-2">
            <Settings className="w-5 h-5 text-neon-blue" />
            <h2 className="font-pixel text-sm text-neon-blue">[ACCOUNT_SETTINGS]</h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="font-mono text-xs">FULL_NAME</Label>
                <Input
                  value={profileForm.fullName}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  className="mt-2 border-2 border-border font-mono"
                />
              </div>
              <div>
                <Label className="font-mono text-xs">EMAIL</Label>
                <Input
                  type="email"
                  value={profileForm.email}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setProfileForm((prev) => ({ ...prev, email: nextValue }));
                    if (fieldErrors.email) {
                      setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    }
                  }}
                  className={`mt-2 border-2 font-mono ${
                    emailFieldMessage ? "border-neon-yellow" : "border-border"
                  }`}
                />
                {emailFieldMessage ? (
                  <p className="mt-2 flex items-center gap-2 font-mono text-[11px] text-neon-yellow">
                    <AlertTriangle className="h-3 w-3 text-neon-yellow" />
                    <span>{emailFieldMessage}</span>
                  </p>
                ) : null}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="font-mono text-xs">PHONE</Label>
                <Input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
                  className="mt-2 border-2 border-border font-mono"
                />
              </div>
            </div>
            <LocationPicker
              label="Address"
              showUseMyLocation={false}
              onSelect={(location) =>
                setProfileForm((prev) => ({
                  ...prev,
                  address1: location.address1,
                  city: location.city,
                  province: location.province,
                  zip: location.zip,
                  lat: location.lat,
                  lng: location.lng,
                }))
              }
            />
            <div>
              <Label className="font-mono text-xs">ADDRESS_LINE_1</Label>
              <Input
                value={profileForm.address1}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, address1: event.target.value }))}
                className="mt-2 border-2 border-border font-mono"
              />
            </div>
            <div>
              <Label className="font-mono text-xs">ADDRESS_LINE_2</Label>
              <Input
                value={profileForm.address2}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, address2: event.target.value }))}
                className="mt-2 border-2 border-border font-mono"
              />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="font-mono text-xs">CITY</Label>
                <Input
                  value={profileForm.city}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, city: event.target.value }))}
                  className="mt-2 border-2 border-border font-mono"
                />
              </div>
              <div>
                <Label className="font-mono text-xs">STATE</Label>
                <Input
                  value={profileForm.province}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, province: event.target.value }))}
                  className="mt-2 border-2 border-border font-mono"
                />
              </div>
              <div>
                <Label className="font-mono text-xs">ZIP</Label>
                <Input
                  value={profileForm.zip}
                  onChange={(event) => setProfileForm((prev) => ({ ...prev, zip: event.target.value }))}
                  className="mt-2 border-2 border-border font-mono"
                />
              </div>
            </div>
            <Button
              className="w-full bg-neon-green text-background font-pixel text-xs pixel-btn glow-green"
              disabled={savingProfile}
              onClick={async () => {
                try {
                  setFieldErrors({});
                  setSavingProfile(true);
                  const normalizeOptional = (value: string) => {
                    const trimmed = value.trim();
                    return trimmed.length ? trimmed : null;
                  };
                  const response = await fetchJson<ProfileResponse>("/api/creator/profile", {
                    method: "PATCH",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                      fullName: normalizeOptional(profileForm.fullName),
                      email: normalizeOptional(profileForm.email),
                      phone: normalizeOptional(profileForm.phone),
                      address1: normalizeOptional(profileForm.address1),
                      address2: normalizeOptional(profileForm.address2),
                      city: normalizeOptional(profileForm.city),
                      province: normalizeOptional(profileForm.province),
                      zip: normalizeOptional(profileForm.zip),
                      lat: profileForm.lat,
                      lng: profileForm.lng,
                    }),
                  });
                  setProfileData(response.creator);
                  setProfileForm({
                    fullName: response.creator.fullName ?? "",
                    email: response.creator.email ?? "",
                    phone: response.creator.phone ?? "",
                    address1: response.creator.address1 ?? "",
                    address2: response.creator.address2 ?? "",
                    city: response.creator.city ?? "",
                    province: response.creator.province ?? "",
                    zip: response.creator.zip ?? "",
                    lat: response.creator.lat ?? null,
                    lng: response.creator.lng ?? null,
                  });
                  showNotice("Shipping profile updated.");
                } catch (err) {
                  const apiErr = err as ApiError;
                  const message = apiErr?.message ?? "Failed to save profile";
                  if (message.toLowerCase().includes("email")) {
                    setFieldErrors({ email: message });
                  } else {
                    showNotice(message);
                  }
                  if (apiErr?.code === "NEEDS_LEGAL_ACCEPTANCE") {
                    window.location.href = "/legal/accept?next=/influencer/profile";
                  }
                } finally {
                  setSavingProfile(false);
                }
              }}
            >
              {savingProfile ? "SAVING..." : "SAVE PROFILE"}
            </Button>
            <div className="mt-6 border-t-2 border-border pt-4">
              <p className="text-xs font-mono text-muted-foreground mb-3">
                Permanently delete your account and remove access to all deals.
              </p>
              <Button
                variant="outline"
                className="w-full border-2 font-mono text-xs text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                DELETE ACCOUNT
              </Button>
            </div>
          </div>
        </div>
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent className="border-4 border-border bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-pixel text-sm text-neon-pink">
                DELETE ACCOUNT
              </AlertDialogTitle>
              <AlertDialogDescription className="font-mono text-xs">
                This permanently deletes your account and removes access to all deals. Type DELETE to
                confirm.
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
    </InfluencerLayout>
  );
}

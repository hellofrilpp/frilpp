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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, CreatorDeal, apiUrl, getCreatorDeals, getCreatorProfile, getSocialAccounts, updateCreatorProfile } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import { useAchievements } from "@/hooks/useAchievements";
import { useToast } from "@/hooks/use-toast";

const InfluencerProfile = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [savingProfile, setSavingProfile] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
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
  const { data: profileData, error: profileError } = useQuery({
    queryKey: ["creator-profile"],
    queryFn: getCreatorProfile,
  });
  const { data: dealsData } = useQuery({
    queryKey: ["creator-deals"],
    queryFn: getCreatorDeals,
  });
  const { data: socialData } = useQuery({
    queryKey: ["social-accounts"],
    queryFn: getSocialAccounts,
  });
  const { achievements, getTotalXP, level, activeStrikes, isLoading: achievementsLoading } = useAchievements();

  useEffect(() => {
    if (profileError instanceof ApiError && profileError.code === "NEEDS_CREATOR_PROFILE") {
      window.location.href = "/influencer/onboarding";
    }
    if (profileError instanceof ApiError && profileError.code === "NEEDS_LEGAL_ACCEPTANCE") {
      window.location.href = apiUrl("/legal/accept?next=/influencer/profile");
    }
  }, [profileError]);

  useEffect(() => {
    if (!profileData?.creator) return;
    setProfileForm({
      fullName: profileData.creator.fullName ?? "",
      email: profileData.creator.email ?? "",
      phone: profileData.creator.phone ?? "",
      address1: profileData.creator.address1 ?? "",
      address2: profileData.creator.address2 ?? "",
      city: profileData.creator.city ?? "",
      province: profileData.creator.province ?? "",
      zip: profileData.creator.zip ?? "",
      lat: profileData.creator.lat ?? null,
      lng: profileData.creator.lng ?? null,
    });
  }, [profileData]);

  const deals = dealsData?.deals ?? [];
  const totalDeals = deals.length;
  const completedDeals = deals.filter((deal: CreatorDeal) => deal.status === "complete").length;
  const totalValue = deals.reduce((sum: number, deal: CreatorDeal) => sum + (deal.valueUsd ?? 0), 0);

  const stats = useMemo(
    () => [
      { label: "DEALS", value: `${totalDeals}`, icon: Package, color: "neon-green" },
      { label: "CONTENT", value: `${completedDeals}`, icon: Camera, color: "neon-pink" },
      { label: "VALUE", value: `$${totalValue}`, icon: Star, color: "neon-yellow" },
    ],
    [totalDeals, completedDeals, totalValue],
  );

  const nextLevel = Math.max(1, level + 1);
  const currentDeals = completedDeals;
  const levelProgress = nextLevel ? (currentDeals / nextLevel) * 100 : 0;

  const profile = profileData?.creator;
  const displayName = profile?.fullName || profile?.username || "CREATOR";
  const handle = profile?.username ? `@${profile.username}` : "@handle";
  const followers = profile?.followersCount ? `${profile.followersCount} followers` : "followers";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const featuredAchievements = achievements.slice(0, 6);

  const handleDeleteAccount = async () => {
    if (deleteConfirm.trim() !== "DELETE") return;
    setDeleting(true);
    try {
      await fetch(apiUrl("/api/account/delete"), { method: "POST", credentials: "include" });
      toast({ title: "ACCOUNT DELETED", description: "Your account has been removed." });
      window.location.href = "/";
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Account deletion failed";
      toast({ title: "FAILED", description: message });
    } finally {
      setDeleting(false);
      setDeleteConfirm("");
      setDeleteOpen(false);
    }
  };

  return (
    <InfluencerLayout>
      <div className="p-6 md:p-10 pb-24 md:pb-10 max-w-2xl mx-auto">
        {/* Profile Header */}
        <div className="text-center mb-10">
          <div className="w-24 h-24 mx-auto bg-neon-pink text-background flex items-center justify-center text-xl font-pixel mb-4 border-4 border-neon-pink">
            {initials || "CR"}
          </div>
          <h1 className="text-lg font-pixel text-foreground mb-1">{displayName}</h1>
          <p className="font-mono text-xs text-muted-foreground mb-4">
            {handle} {"//"} {followers}
          </p>
        </div>

        {profile && !profile.email ? (
          <div className="border-2 border-neon-yellow bg-neon-yellow/10 p-4 mb-8">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-neon-yellow" />
              <span className="font-pixel text-xs text-neon-yellow">EMAIL_REQUIRED</span>
            </div>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              Add an email below to enable billing, receipts, and account recovery.
            </p>
          </div>
        ) : null}

        {/* Level Progress */}
        <div className="border-4 border-neon-yellow bg-neon-yellow/10 p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-pixel text-sm text-neon-yellow">LV.{level} POWER CREATOR</h2>
              <p className="font-mono text-xs text-muted-foreground">{currentDeals}/{nextLevel} to LV.{nextLevel}</p>
            </div>
            <div className="flex items-center gap-1">
              <Trophy className="w-5 h-5 text-neon-yellow" />
              <span className="font-pixel text-lg text-neon-yellow">{getTotalXP().toLocaleString()}</span>
            </div>
          </div>
          <div className="h-3 bg-muted border-2 border-neon-yellow">
            <div 
              className="h-full bg-neon-yellow transition-all" 
              style={{ width: `${levelProgress}%` }} 
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className={`p-4 text-center border-4 border-${stat.color} bg-${stat.color}/10`}>
              <stat.icon className={`w-5 h-5 mx-auto mb-2 text-${stat.color}`} />
              <p className={`text-xl font-pixel text-${stat.color}`}>{stat.value}</p>
              <p className="text-xs font-mono text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Linked Socials */}
        <div className="border-4 border-border bg-card p-5 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-neon-purple" />
            <span className="font-pixel text-xs text-neon-purple">[LINKED_SOCIALS]</span>
          </div>
          <div className="space-y-3">
            {(["TIKTOK"] as const).map((provider) => {
              const connected = socialData?.accounts?.some(
                (account) => account.provider === provider,
              );
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
                    asChild
                    size="sm"
                    className="bg-neon-purple text-background font-pixel text-xs pixel-btn"
                  >
                    <a
                      href={apiUrl(
                        `/api/auth/social/${provider.toLowerCase()}/connect?role=creator&next=/influencer/profile`,
                      )}
                    >
                      {connected ? "RECONNECT" : "CONNECT"}
                    </a>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Strikes Warning */}
        <div className={`border-4 p-4 mb-8 ${activeStrikes > 0 ? 'border-destructive bg-destructive/10' : 'border-neon-green bg-neon-green/10'}`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className={`w-5 h-5 ${activeStrikes > 0 ? 'text-destructive' : 'text-neon-green'}`} />
            <div>
              <p className="font-pixel text-xs">STRIKES: {activeStrikes}/3</p>
              <p className="font-mono text-xs text-muted-foreground">
                {activeStrikes === 0 
                  ? "GOOD STANDING // KEEP IT UP!"
                  : `${3 - activeStrikes} strikes remaining`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Badges */}
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
                  {!achievement.unlocked && achievement.progress !== undefined && achievement.maxProgress && (
                    <div className="mt-2 h-1 bg-muted">
                      <div
                        className="h-full bg-neon-purple"
                        style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Account Settings */}
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
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, fullName: event.target.value }))
                  }
                  className="mt-2 border-2 border-border font-mono"
                />
              </div>
              <div>
                <Label className="font-mono text-xs">EMAIL</Label>
                <Input
                  type="email"
                  value={profileForm.email}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  className="mt-2 border-2 border-border font-mono"
                />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="font-mono text-xs">PHONE</Label>
                <Input
                  type="tel"
                  value={profileForm.phone}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, phone: event.target.value }))
                  }
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
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, address1: event.target.value }))
                }
                className="mt-2 border-2 border-border font-mono"
              />
            </div>
            <div>
              <Label className="font-mono text-xs">ADDRESS_LINE_2</Label>
              <Input
                value={profileForm.address2}
                onChange={(event) =>
                  setProfileForm((prev) => ({ ...prev, address2: event.target.value }))
                }
                className="mt-2 border-2 border-border font-mono"
              />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="font-mono text-xs">CITY</Label>
                <Input
                  value={profileForm.city}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, city: event.target.value }))
                  }
                  className="mt-2 border-2 border-border font-mono"
                />
              </div>
              <div>
                <Label className="font-mono text-xs">STATE</Label>
                <Input
                  value={profileForm.province}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, province: event.target.value }))
                  }
                  className="mt-2 border-2 border-border font-mono"
                />
              </div>
              <div>
                <Label className="font-mono text-xs">ZIP</Label>
                <Input
                  value={profileForm.zip}
                  onChange={(event) =>
                    setProfileForm((prev) => ({ ...prev, zip: event.target.value }))
                  }
                  className="mt-2 border-2 border-border font-mono"
                />
              </div>
            </div>
            <Button
              className="w-full bg-neon-green text-background font-pixel text-xs pixel-btn glow-green"
              disabled={savingProfile}
              onClick={async () => {
                try {
                  setSavingProfile(true);
                  const normalizeOptional = (value: string) => {
                    const trimmed = value.trim();
                    return trimmed.length ? trimmed : null;
                  };
                  await updateCreatorProfile({
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
                  });
                  await queryClient.invalidateQueries({ queryKey: ["creator-profile"] });
                  toast({ title: "SAVED", description: "Shipping profile updated." });
                } catch (err) {
                  const message = err instanceof ApiError ? err.message : "Failed to save profile";
                  toast({ title: "SAVE FAILED", description: message });
                  if (err instanceof ApiError && err.code === "NEEDS_LEGAL_ACCEPTANCE") {
                    window.location.href = apiUrl("/legal/accept?next=/influencer/profile");
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
                This permanently deletes your account and removes access to all deals. Type DELETE to confirm.
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
};

export default InfluencerProfile;
